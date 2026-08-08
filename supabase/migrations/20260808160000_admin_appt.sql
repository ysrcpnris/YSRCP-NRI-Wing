-- =====================================================================
-- 20260808160000 — Appointments with Jagananna (a-appt)
--
-- RANGES — checked with the user: real table, materialized into slots
--   appointment_slots was always one row per specific date/time; the
--   mock's core object is a RANGE — a recurring weekday pattern over a
--   date span sharing one cap/mode, with an aggregate "booked / cap"
--   count. Rather than reimplement capacity enforcement at the range
--   level, publish_range() below inserts one appointment_ranges row
--   and materializes one appointment_slots row per matching calendar
--   date — each with its own copy of cap/mode/venue — so book_slot()/
--   decide_booking()'s already-proven per-slot capacity locking runs
--   completely unchanged. A slot's range_id points back to its range;
--   ranges_i_manage() sums across the children for the aggregate.
--
--   Time of day: the mock collects only calendar dates, never an hour.
--   Each materialized slot is treated as an all-day window — midnight
--   to midnight UTC of that date — rather than inventing a time the
--   mock never asked for.
--
--   "Edit" in the mock's Published-ranges table is simplified to
--   Unpublish/Republish (set_range_published()) rather than a full
--   edit-every-field form: a range that already has materialized,
--   possibly-booked slots can't have its weekday pattern or date span
--   changed after the fact without reconciling existing bookings, and
--   the mock doesn't specify enough about that reconciliation to build
--   it confidently. Stopping new bookings on a range is real and
--   simple; rewriting one in place is not, so it isn't built.
--
-- VISITORS PER BOOKING — checked with the user: added for real
--   appointment_bookings never had a visitor-count column — every
--   capacity check counted booking ROWS, one seat each. The mock's
--   Visitors column (2, 4, 1, 3) and "visitors per date" cap need a
--   real column and a real change to the capacity math, not a cosmetic
--   one: book_slot(), decide_booking() and open_slots() are ALL
--   touched below, because all three do capacity arithmetic today.
--   Each is a faithful diff — same authorization, same row-locking,
--   same error messages — with count(*) replaced by sum(visitors).
--   This is live, member-facing logic; MyProfile.tsx's sibling,
--   Appointments.tsx, gets a visitor-count input in the same commit so
--   the column is actually reachable by a member, not dead weight only
--   the admin side can set.
--
-- "PURPOSE" — not a new field
--   slot_bookings()/the member booking form already carry a free-text
--   answer to whatever prompt the range's notes_label sets — that IS
--   the mock's Purpose column. pending_bookings_i_manage() below just
--   surfaces b.member_note under that name; nothing new to collect.
--
-- BULK APPROVE/DECLINE — a thin, faithful wrapper
--   decide_bookings() loops decide_booking() per id in the SAME
--   transaction, so a later id in the batch sees confirmed counts from
--   an earlier one — approving 10 requests against a cap-5 slot
--   correctly confirms 5 and reports the rest as full, not silently
--   over-books. No new authorization or capacity logic is written;
--   this only calls the existing, already-tested function repeatedly.
--
-- WingManagement.tsx's AppointmentsTab (single-slot creation + one-at-
-- a-time decide_booking()) is NOT retired in this migration. Unlike
-- a-digital/a-abroad's supersession of CampaignsTab and pieces of the
-- Chapters/Handles tabs, ranges are additive on top of the existing
-- single-slot model, not a replacement of it — a coordinator who wants
-- one specific one-off meeting still has a real, simpler path there.
-- =====================================================================

-- ── visitors: real column, not cosmetic ───────────────────────────
ALTER TABLE public.appointment_bookings
  ADD COLUMN IF NOT EXISTS visitors int NOT NULL DEFAULT 1;
ALTER TABLE public.appointment_bookings
  ADD CONSTRAINT appointment_bookings_visitors_positive CHECK (visitors >= 1);

-- ── ranges ─────────────────────────────────────────────────────────
CREATE TABLE public.appointment_ranges (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text NOT NULL,
  description    text,
  venue          text,
  virtual_link   text,
  starts_on      date NOT NULL,
  ends_on        date NOT NULL,
  -- ISO weekday numbers: 1=Monday .. 7=Sunday, matching extract(isodow from ...).
  weekdays       int[] NOT NULL,
  visitors_cap   int NOT NULL DEFAULT 1,
  mode           public.slot_mode NOT NULL DEFAULT 'manual',
  country        text,
  chapter_id     uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  notes_label    text,
  is_published   boolean NOT NULL DEFAULT true,
  created_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT range_ends_after_start   CHECK (ends_on >= starts_on),
  CONSTRAINT range_span_reasonable    CHECK (ends_on - starts_on <= 366),
  CONSTRAINT range_cap_positive       CHECK (visitors_cap >= 1),
  CONSTRAINT range_weekdays_valid     CHECK (weekdays <@ ARRAY[1,2,3,4,5,6,7] AND cardinality(weekdays) > 0),
  CONSTRAINT range_chapter_needs_country CHECK (chapter_id IS NULL OR country IS NOT NULL)
);

ALTER TABLE public.appointment_slots
  ADD COLUMN IF NOT EXISTS range_id uuid REFERENCES public.appointment_ranges(id) ON DELETE CASCADE;

ALTER TABLE public.appointment_ranges ENABLE ROW LEVEL SECURITY;
-- No policies, no grants — every access to this table goes through a
-- SECURITY DEFINER RPC below, same pattern as the column-privilege
-- funnels used elsewhere for privileged data this session.
REVOKE ALL ON public.appointment_ranges FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.can_manage_range(p_range_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.appointment_ranges r
     WHERE r.id = p_range_id
       AND (
         public.has_global_scope()
         OR (r.chapter_id IS NOT NULL AND public.can_write_chapter(r.chapter_id))
         OR (r.chapter_id IS NULL AND r.country IS NOT NULL AND public.can_write_country(r.country))
       )
  );
$$;

REVOKE ALL ON FUNCTION public.can_manage_range(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_range(uuid) TO authenticated;

-- ── publish a range: insert + materialize matching-weekday slots ────
CREATE OR REPLACE FUNCTION public.publish_range(
  p_title        text,
  p_starts_on    date,
  p_ends_on      date,
  p_weekdays     int[],
  p_visitors_cap int,
  p_mode         text,
  p_venue        text DEFAULT NULL,
  p_virtual_link text DEFAULT NULL,
  p_description  text DEFAULT NULL,
  p_notes_label  text DEFAULT NULL,
  p_country      text DEFAULT NULL,
  p_chapter_id   uuid DEFAULT NULL
)
RETURNS TABLE (ok boolean, message text, range_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_range_id  uuid;
  v_day       date;
  v_count     int := 0;
  v_can       boolean;
BEGIN
  IF p_mode NOT IN ('auto', 'manual') THEN
    RETURN QUERY SELECT false, 'Mode must be auto or manual.', NULL::uuid; RETURN;
  END IF;
  IF p_ends_on < p_starts_on THEN
    RETURN QUERY SELECT false, 'The range must end on or after it starts.', NULL::uuid; RETURN;
  END IF;
  IF p_ends_on - p_starts_on > 366 THEN
    RETURN QUERY SELECT false, 'A range can span at most a year.', NULL::uuid; RETURN;
  END IF;
  IF p_weekdays IS NULL OR cardinality(p_weekdays) = 0 OR NOT (p_weekdays <@ ARRAY[1,2,3,4,5,6,7]) THEN
    RETURN QUERY SELECT false, 'Choose at least one weekday.', NULL::uuid; RETURN;
  END IF;
  IF coalesce(p_visitors_cap, 0) < 1 THEN
    RETURN QUERY SELECT false, 'Visitors per date must be at least 1.', NULL::uuid; RETURN;
  END IF;
  IF p_chapter_id IS NOT NULL AND p_country IS NULL THEN
    RETURN QUERY SELECT false, 'A chapter-scoped range needs a country.', NULL::uuid; RETURN;
  END IF;

  v_can := public.has_global_scope()
    OR (p_chapter_id IS NOT NULL AND public.can_write_chapter(p_chapter_id))
    OR (p_chapter_id IS NULL AND p_country IS NOT NULL AND public.can_write_country(p_country))
    OR (p_country IS NULL AND public.has_global_scope());
  IF NOT v_can THEN
    RETURN QUERY SELECT false, 'You are not authorized to publish a range there.', NULL::uuid; RETURN;
  END IF;

  INSERT INTO public.appointment_ranges (
    title, description, venue, virtual_link, starts_on, ends_on, weekdays,
    visitors_cap, mode, country, chapter_id, notes_label, is_published, created_by
  ) VALUES (
    btrim(p_title), nullif(btrim(coalesce(p_description, '')), ''),
    nullif(btrim(coalesce(p_venue, '')), ''), nullif(btrim(coalesce(p_virtual_link, '')), ''),
    p_starts_on, p_ends_on, p_weekdays, p_visitors_cap, p_mode::public.slot_mode,
    p_country, p_chapter_id, nullif(btrim(coalesce(p_notes_label, '')), ''), true, auth.uid()
  ) RETURNING id INTO v_range_id;

  FOR v_day IN SELECT d::date FROM generate_series(p_starts_on, p_ends_on, interval '1 day') d LOOP
    IF extract(isodow FROM v_day)::int = ANY (p_weekdays) THEN
      INSERT INTO public.appointment_slots (
        title, description, venue, virtual_link, starts_at, ends_at,
        capacity, mode, country, chapter_id, notes_label, is_published,
        created_by, range_id
      ) VALUES (
        btrim(p_title), nullif(btrim(coalesce(p_description, '')), ''),
        nullif(btrim(coalesce(p_venue, '')), ''), nullif(btrim(coalesce(p_virtual_link, '')), ''),
        (v_day::timestamp AT TIME ZONE 'UTC'), ((v_day + 1)::timestamp AT TIME ZONE 'UTC'),
        p_visitors_cap, p_mode::public.slot_mode, p_country, p_chapter_id,
        nullif(btrim(coalesce(p_notes_label, '')), ''), true, auth.uid(), v_range_id
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  IF v_count = 0 THEN
    RETURN QUERY SELECT false, 'No dates in that span match the chosen weekdays.', NULL::uuid; RETURN;
  END IF;

  RETURN QUERY SELECT true, format('Published %s date%s.', v_count, CASE WHEN v_count = 1 THEN '' ELSE 's' END), v_range_id;
END $$;

REVOKE ALL ON FUNCTION public.publish_range(text, date, date, int[], int, text, text, text, text, text, text, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.publish_range(text, date, date, int[], int, text, text, text, text, text, text, uuid) TO authenticated;

-- ── list ranges the caller manages, with real aggregates ────────────
CREATE OR REPLACE FUNCTION public.ranges_i_manage()
RETURNS TABLE (
  id            uuid,
  title         text,
  venue         text,
  starts_on     date,
  ends_on       date,
  weekdays      int[],
  visitors_cap  int,
  mode          text,
  country       text,
  is_published  boolean,
  slots_total   bigint,
  booked        bigint,
  cap_total     bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.id, r.title, r.venue, r.starts_on, r.ends_on, r.weekdays,
         r.visitors_cap, r.mode::text, r.country, r.is_published,
         count(s.id),
         coalesce(sum(s.confirmed_visitors), 0),
         count(s.id) * r.visitors_cap
    FROM public.appointment_ranges r
    LEFT JOIN LATERAL (
      SELECT sl.id,
             (SELECT coalesce(sum(b.visitors), 0) FROM public.appointment_bookings b
               WHERE b.slot_id = sl.id AND b.status = 'confirmed') AS confirmed_visitors
        FROM public.appointment_slots sl WHERE sl.range_id = r.id
    ) s ON true
   WHERE public.can_manage_range(r.id)
   GROUP BY r.id
   ORDER BY r.starts_on DESC;
$$;

REVOKE ALL ON FUNCTION public.ranges_i_manage() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ranges_i_manage() TO authenticated;

-- ── stop or resume new bookings on a range (the mock's "Edit") ──────
CREATE OR REPLACE FUNCTION public.set_range_published(p_range_id uuid, p_is_published boolean)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.can_manage_range(p_range_id) THEN
    RETURN false;
  END IF;
  UPDATE public.appointment_ranges SET is_published = p_is_published, updated_at = now() WHERE id = p_range_id;
  UPDATE public.appointment_slots SET is_published = p_is_published, updated_at = now() WHERE range_id = p_range_id;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.set_range_published(uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_range_published(uuid, boolean) TO authenticated;

-- ── every pending request across every slot/range the caller manages ─
CREATE OR REPLACE FUNCTION public.pending_bookings_i_manage()
RETURNS TABLE (
  booking_id     uuid,
  slot_id        uuid,
  range_id       uuid,
  member_name    text,
  member_country text,
  visitors       int,
  purpose        text,
  starts_at      timestamptz,
  created_at     timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT b.id, b.slot_id, s.range_id, p.full_name, p.country_of_residence,
         b.visitors, b.member_note, s.starts_at, b.created_at
    FROM public.appointment_bookings b
    JOIN public.appointment_slots s ON s.id = b.slot_id
    JOIN public.profiles p ON p.id = b.profile_id
   WHERE b.status = 'pending'
     AND public.can_manage_slot(s.id)
   ORDER BY b.created_at;
$$;

REVOKE ALL ON FUNCTION public.pending_bookings_i_manage() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pending_bookings_i_manage() TO authenticated;

-- ── bulk approve/decline: a loop over the real, already-tested RPC ──
CREATE OR REPLACE FUNCTION public.decide_bookings(p_booking_ids uuid[], p_decision text)
RETURNS TABLE (booking_id uuid, ok boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid; v_ok boolean; v_msg text;
BEGIN
  FOREACH v_id IN ARRAY coalesce(p_booking_ids, '{}') LOOP
    SELECT d.ok, d.message INTO v_ok, v_msg FROM public.decide_booking(v_id, p_decision) d;
    booking_id := v_id; ok := v_ok; message := v_msg;
    RETURN NEXT;
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.decide_bookings(uuid[], text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.decide_bookings(uuid[], text) TO authenticated;

-- ── book_slot(): +p_visitors, capacity by seats not rows ────────────
-- New signature (extra trailing param) — CREATE OR REPLACE would add a
-- second overload rather than replace the old (uuid, text) one, and
-- PostgREST calling with only {p_slot_id, p_note} would then hit
-- "function is not unique". Drop the old signature first.
DROP FUNCTION IF EXISTS public.book_slot(uuid, text);
CREATE OR REPLACE FUNCTION public.book_slot(
  p_slot_id  uuid,
  p_note     text DEFAULT NULL,
  p_visitors int  DEFAULT 1
)
RETURNS TABLE (ok boolean, status text, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  s          public.appointment_slots;
  v_taken    int;
  v_country  text;
  v_city     text;
  v_chapter  uuid;
  v_status   public.booking_status;
BEGIN
  IF coalesce(p_visitors, 0) < 1 THEN
    RETURN QUERY SELECT false, NULL::text, 'Visitors must be at least 1.';
    RETURN;
  END IF;

  SELECT * INTO s FROM public.appointment_slots
   WHERE appointment_slots.id = p_slot_id FOR UPDATE;

  IF s.id IS NULL OR NOT s.is_published THEN
    RETURN QUERY SELECT false, NULL::text, 'That appointment is not available.';
    RETURN;
  END IF;

  IF s.starts_at <= now() THEN
    RETURN QUERY SELECT false, NULL::text, 'That appointment has already started.';
    RETURN;
  END IF;

  SELECT p.country_of_residence, p.city_abroad INTO v_country, v_city
    FROM public.profiles p WHERE p.id = auth.uid();
  v_chapter := public.chapter_for_city(v_country, v_city);

  IF s.country IS NOT NULL AND s.country IS DISTINCT FROM v_country THEN
    RETURN QUERY SELECT false, NULL::text, 'That appointment is not open to your country.';
    RETURN;
  END IF;

  IF s.chapter_id IS NOT NULL AND s.chapter_id IS DISTINCT FROM v_chapter THEN
    RETURN QUERY SELECT false, NULL::text, 'That appointment is not open to your chapter.';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.appointment_bookings b
     WHERE b.slot_id = p_slot_id AND b.profile_id = auth.uid()
       AND b.status IN ('pending', 'confirmed')
  ) THEN
    RETURN QUERY SELECT false, NULL::text, 'You have already booked this one.';
    RETURN;
  END IF;

  -- Capacity is visitor seats, not booking rows.
  SELECT coalesce(sum(b.visitors), 0) INTO v_taken
    FROM public.appointment_bookings b
   WHERE b.slot_id = p_slot_id AND b.status = 'confirmed';

  IF s.mode = 'auto' THEN
    IF v_taken + p_visitors > s.capacity THEN
      RETURN QUERY SELECT false, NULL::text, 'That appointment is now full.';
      RETURN;
    END IF;
    v_status := 'confirmed';
  ELSE
    v_status := 'pending';
  END IF;

  INSERT INTO public.appointment_bookings (slot_id, profile_id, status, member_note, visitors)
  VALUES (p_slot_id, auth.uid(), v_status, nullif(btrim(p_note), ''), p_visitors);

  RETURN QUERY SELECT true, v_status::text,
    CASE WHEN v_status = 'confirmed'
         THEN 'Your appointment is confirmed.'
         ELSE 'Your request has been sent for approval.' END;
END $$;

REVOKE ALL ON FUNCTION public.book_slot(uuid, text, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.book_slot(uuid, text, int) TO authenticated;

-- ── decide_booking(): capacity by seats not rows ─────────────────────
CREATE OR REPLACE FUNCTION public.decide_booking(
  p_booking_id uuid, p_decision text, p_note text DEFAULT NULL
)
RETURNS TABLE (ok boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE s public.appointment_slots; b public.appointment_bookings; v_taken int;
BEGIN
  IF p_decision NOT IN ('confirmed', 'declined') THEN
    RAISE EXCEPTION 'decision must be confirmed or declined, got %', p_decision;
  END IF;

  SELECT * INTO b FROM public.appointment_bookings ab WHERE ab.id = p_booking_id;
  IF b.id IS NULL THEN
    RETURN QUERY SELECT false, 'No such booking.'; RETURN;
  END IF;

  IF NOT public.can_manage_slot(b.slot_id) THEN
    RETURN QUERY SELECT false, 'That appointment is outside the ones you manage.';
    RETURN;
  END IF;

  SELECT * INTO s FROM public.appointment_slots aslot
   WHERE aslot.id = b.slot_id FOR UPDATE;

  IF p_decision = 'confirmed' THEN
    SELECT coalesce(sum(ab.visitors), 0) INTO v_taken
      FROM public.appointment_bookings ab
     WHERE ab.slot_id = b.slot_id AND ab.status = 'confirmed' AND ab.id <> p_booking_id;
    IF v_taken + b.visitors > s.capacity THEN
      RETURN QUERY SELECT false,
        format('That slot is full (%s of %s seats confirmed).', v_taken, s.capacity);
      RETURN;
    END IF;
  END IF;

  UPDATE public.appointment_bookings ab
     SET status = p_decision::public.booking_status,
         admin_note = coalesce(nullif(btrim(p_note), ''), ab.admin_note),
         decided_by = auth.uid(), decided_at = now()
   WHERE ab.id = p_booking_id;

  RETURN QUERY SELECT true,
    CASE WHEN p_decision = 'confirmed' THEN 'Booking confirmed.' ELSE 'Booking declined.' END;
END $$;

REVOKE ALL ON FUNCTION public.decide_booking(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.decide_booking(uuid, text, text) TO authenticated;

-- ── open_slots(): seats_left by seats not rows ───────────────────────
CREATE OR REPLACE FUNCTION public.open_slots()
RETURNS TABLE (
  id uuid, title text, description text, host_name text, venue text,
  virtual_link text, starts_at timestamptz, ends_at timestamptz,
  capacity int, confirmed bigint, seats_left int, mode text,
  notes_label text, country text, my_status text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.title, s.description, s.host_name, s.venue,
         CASE WHEN max(b.status::text) FILTER (
                WHERE b.profile_id = auth.uid() AND b.status = 'confirmed'
              ) IS NOT NULL
              THEN s.virtual_link END,
         s.starts_at, s.ends_at, s.capacity,
         coalesce(sum(b.visitors) FILTER (WHERE b.status = 'confirmed'), 0),
         greatest(0, s.capacity - coalesce(sum(b.visitors) FILTER (WHERE b.status = 'confirmed'), 0)::int),
         s.mode::text, s.notes_label, s.country,
         max(b.status::text) FILTER (WHERE b.profile_id = auth.uid()
                                       AND b.status IN ('pending', 'confirmed'))
    FROM public.appointment_slots s
    LEFT JOIN public.appointment_bookings b ON b.slot_id = s.id
   WHERE s.is_published
     AND s.starts_at > now()
     AND (
       CASE WHEN s.chapter_id IS NOT NULL THEN
         s.chapter_id = (
           SELECT public.chapter_for_city(p.country_of_residence, p.city_abroad)
             FROM public.profiles p WHERE p.id = auth.uid())
       WHEN s.country IS NOT NULL THEN
         s.country = (SELECT p.country_of_residence FROM public.profiles p WHERE p.id = auth.uid())
       ELSE true
       END
     )
   GROUP BY s.id
   ORDER BY s.starts_at;
$$;

REVOKE ALL ON FUNCTION public.open_slots() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.open_slots() TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'appointment ranges + visitors created; book_slot/decide_booking/open_slots updated for seat-based capacity';
END $$;
