-- =====================================================================
-- 20260804280000 — appointment slots and bookings
--
-- WHY NOT REUSE events / event_applications
--   event_applications is four columns: id, event_id, user_id,
--   applied_at. There is no approval state and no notion of a slot. An
--   event is one thing many people attend; an appointment is a specific
--   time window with its own capacity, which may be one. Bolting slots
--   onto events would mean every existing event query has to start
--   caring about capacity semantics it has never needed.
--
-- THE TWO ADMISSION MODES, AS SPECIFIED
--   'auto'   — first come, first served up to the slot's capacity.
--              Booking is confirmed immediately.
--   'manual' — every request lands as 'pending' and a human decides.
--              Capacity still caps CONFIRMED bookings, so approving
--              past the cap is refused rather than silently allowed.
--
--   The mode lives on the slot, not on a global setting, because a
--   coordinator's open-door hour and a leadership appointment are
--   genuinely different and will coexist.
--
-- CAPACITY IS ENFORCED IN THE DATABASE
--   Two members clicking "book" at the same moment is the ordinary
--   case, not the exotic one. A count-then-insert in application code
--   races and oversells. book_slot() takes a row lock on the slot, so
--   the check and the insert cannot interleave.
-- =====================================================================

CREATE TYPE public.slot_mode        AS ENUM ('auto', 'manual');
CREATE TYPE public.booking_status   AS ENUM ('pending', 'confirmed', 'declined', 'cancelled', 'attended', 'no_show');

CREATE TABLE public.appointment_slots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  description   text,
  host_name     text,
  -- Where the appointment happens. Either is optional: a phone slot has
  -- neither, an online one has a link, an in-person one has a venue.
  venue         text,
  virtual_link  text,
  starts_at     timestamptz NOT NULL,
  ends_at       timestamptz NOT NULL,
  capacity      int NOT NULL DEFAULT 1,
  mode          public.slot_mode NOT NULL DEFAULT 'manual',
  -- Null = open to every member. Set = only members of that country.
  country       text,
  cluster_id    uuid REFERENCES public.clusters(id) ON DELETE SET NULL,
  is_published  boolean NOT NULL DEFAULT false,
  notes_label   text,          -- what to ask the member for, if anything
  created_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT slot_ends_after_start CHECK (ends_at > starts_at),
  CONSTRAINT slot_capacity_positive CHECK (capacity >= 1)
);

CREATE INDEX appointment_slots_open_idx
  ON public.appointment_slots (starts_at)
  WHERE is_published;

CREATE TABLE public.appointment_bookings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id      uuid NOT NULL REFERENCES public.appointment_slots(id) ON DELETE CASCADE,
  profile_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       public.booking_status NOT NULL DEFAULT 'pending',
  member_note  text,
  admin_note   text,
  decided_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- One live booking per member per slot. A cancelled or declined one
-- does not block re-applying, which is why this is partial rather than
-- a plain unique constraint.
CREATE UNIQUE INDEX appointment_bookings_one_live_idx
  ON public.appointment_bookings (slot_id, profile_id)
  WHERE status IN ('pending', 'confirmed');

CREATE INDEX appointment_bookings_slot_idx ON public.appointment_bookings (slot_id, status);
CREATE INDEX appointment_bookings_member_idx ON public.appointment_bookings (profile_id);

ALTER TABLE public.appointment_slots    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_bookings ENABLE ROW LEVEL SECURITY;

-- ── slots ────────────────────────────────────────────────────────────
-- A member sees published slots that are open to them. Country-limited
-- slots are hidden from everyone else, the same rule as chapter handles.
CREATE POLICY slots_read ON public.appointment_slots
  FOR SELECT TO authenticated
  USING (
    is_published
    AND (
      country IS NULL
      OR country = (SELECT p.country_of_residence FROM public.profiles p WHERE p.id = auth.uid())
      OR country = ANY (public.my_countries())
    )
  );

-- Coordinators manage slots in their own countries; admin manages all.
-- A country-less (global) slot is admin-only, since it is offered to
-- every member in the wing.
CREATE POLICY slots_admin_write ON public.appointment_slots
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY slots_coordinator_write ON public.appointment_slots
  FOR ALL TO authenticated
  USING (
    public.is_coordinator() AND country IS NOT NULL
    AND country = ANY (public.my_countries())
  )
  WITH CHECK (
    public.is_coordinator() AND country IS NOT NULL
    AND country = ANY (public.my_countries())
  );

-- ── bookings ─────────────────────────────────────────────────────────
-- A member reads their own. Coordinators read bookings for slots in
-- their countries. Nobody reads another member's booking.
CREATE POLICY bookings_read ON public.appointment_bookings
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.appointment_slots s
       WHERE s.id = slot_id
         AND s.country IS NOT NULL
         AND s.country = ANY (public.my_countries())
    )
  );

-- Members cancel their own booking and nothing else. Everything that
-- decides a booking goes through decide_booking(), so a member cannot
-- confirm themselves past a capacity check.
CREATE POLICY bookings_member_cancel ON public.appointment_bookings
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid() AND status = 'cancelled');

CREATE POLICY bookings_admin_write ON public.appointment_bookings
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.appointment_slots    TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.appointment_slots TO authenticated;
GRANT SELECT, UPDATE ON public.appointment_bookings TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_appointment()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_slots_touch BEFORE UPDATE ON public.appointment_slots
  FOR EACH ROW EXECUTE FUNCTION public.touch_appointment();
CREATE TRIGGER trg_bookings_touch BEFORE UPDATE ON public.appointment_bookings
  FOR EACH ROW EXECUTE FUNCTION public.touch_appointment();

-- ── booking, with capacity enforced under a lock ─────────────────────
CREATE OR REPLACE FUNCTION public.book_slot(
  p_slot_id uuid,
  p_note    text DEFAULT NULL
)
RETURNS TABLE (ok boolean, status text, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  s          public.appointment_slots;
  taken      int;
  my_country text;
  new_status public.booking_status;
BEGIN
  -- FOR UPDATE serialises concurrent bookings on the same slot. Without
  -- it, two members can both read "1 seat left" and both insert.
  SELECT * INTO s FROM public.appointment_slots
   WHERE id = p_slot_id FOR UPDATE;

  IF s.id IS NULL OR NOT s.is_published THEN
    RETURN QUERY SELECT false, NULL::text, 'That appointment is not available.';
    RETURN;
  END IF;

  IF s.starts_at <= now() THEN
    RETURN QUERY SELECT false, NULL::text, 'That appointment has already started.';
    RETURN;
  END IF;

  SELECT country_of_residence INTO my_country
    FROM public.profiles WHERE id = auth.uid();

  IF s.country IS NOT NULL AND s.country IS DISTINCT FROM my_country THEN
    RETURN QUERY SELECT false, NULL::text, 'That appointment is not open to your country.';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.appointment_bookings
     WHERE slot_id = p_slot_id AND profile_id = auth.uid()
       AND status IN ('pending', 'confirmed')
  ) THEN
    RETURN QUERY SELECT false, NULL::text, 'You have already booked this one.';
    RETURN;
  END IF;

  -- Only confirmed bookings consume capacity. In manual mode a slot can
  -- collect more requests than seats — that is the point of the mode.
  SELECT count(*) INTO taken FROM public.appointment_bookings
   WHERE slot_id = p_slot_id AND status = 'confirmed';

  IF s.mode = 'auto' THEN
    IF taken >= s.capacity THEN
      RETURN QUERY SELECT false, NULL::text, 'That appointment is now full.';
      RETURN;
    END IF;
    new_status := 'confirmed';
  ELSE
    new_status := 'pending';
  END IF;

  INSERT INTO public.appointment_bookings (slot_id, profile_id, status, member_note)
  VALUES (p_slot_id, auth.uid(), new_status, nullif(btrim(p_note), ''));

  RETURN QUERY SELECT true, new_status::text,
    CASE WHEN new_status = 'confirmed'
         THEN 'Your appointment is confirmed.'
         ELSE 'Your request has been sent for approval.' END;
END $$;

REVOKE ALL ON FUNCTION public.book_slot(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.book_slot(uuid, text) TO authenticated;

-- ── deciding a pending request ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.decide_booking(
  p_booking_id uuid,
  p_decision   text,           -- 'confirmed' | 'declined'
  p_note       text DEFAULT NULL
)
RETURNS TABLE (ok boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  s      public.appointment_slots;
  b      public.appointment_bookings;
  taken  int;
BEGIN
  IF p_decision NOT IN ('confirmed', 'declined') THEN
    RAISE EXCEPTION 'decision must be confirmed or declined, got %', p_decision;
  END IF;

  SELECT * INTO b FROM public.appointment_bookings WHERE id = p_booking_id;
  IF b.id IS NULL THEN
    RETURN QUERY SELECT false, 'No such booking.';
    RETURN;
  END IF;

  SELECT * INTO s FROM public.appointment_slots WHERE id = b.slot_id FOR UPDATE;

  IF NOT (public.is_admin()
          OR (s.country IS NOT NULL AND s.country = ANY (public.my_countries()))) THEN
    RETURN QUERY SELECT false, 'That appointment is outside the countries you cover.';
    RETURN;
  END IF;

  -- Capacity binds approvals too. Without this an admin working through
  -- a manual queue would quietly confirm more people than there are
  -- seats, and nothing would complain until everyone turned up.
  IF p_decision = 'confirmed' THEN
    SELECT count(*) INTO taken FROM public.appointment_bookings
     WHERE slot_id = b.slot_id AND status = 'confirmed' AND id <> p_booking_id;
    IF taken >= s.capacity THEN
      RETURN QUERY SELECT false,
        format('That slot is full (%s of %s confirmed).', taken, s.capacity);
      RETURN;
    END IF;
  END IF;

  UPDATE public.appointment_bookings
     SET status     = p_decision::public.booking_status,
         admin_note = coalesce(nullif(btrim(p_note), ''), admin_note),
         decided_by = auth.uid(),
         decided_at = now()
   WHERE id = p_booking_id;

  RETURN QUERY SELECT true,
    CASE WHEN p_decision = 'confirmed' THEN 'Booking confirmed.'
         ELSE 'Booking declined.' END;
END $$;

REVOKE ALL ON FUNCTION public.decide_booking(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.decide_booking(uuid, text, text) TO authenticated;

-- ── what the member sees ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.open_slots()
RETURNS TABLE (
  id             uuid,
  title          text,
  description    text,
  host_name      text,
  venue          text,
  virtual_link   text,
  starts_at      timestamptz,
  ends_at        timestamptz,
  capacity       int,
  confirmed      bigint,
  seats_left     int,
  mode           text,
  notes_label    text,
  country        text,
  my_status      text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.title, s.description, s.host_name, s.venue, s.virtual_link,
         s.starts_at, s.ends_at, s.capacity,
         count(b.id) FILTER (WHERE b.status = 'confirmed'),
         greatest(0, s.capacity - count(b.id) FILTER (WHERE b.status = 'confirmed'))::int,
         s.mode::text, s.notes_label, s.country,
         max(b.status::text) FILTER (WHERE b.profile_id = auth.uid()
                                       AND b.status IN ('pending', 'confirmed'))
    FROM public.appointment_slots s
    LEFT JOIN public.appointment_bookings b ON b.slot_id = s.id
   WHERE s.is_published
     AND s.starts_at > now()
     AND (
       s.country IS NULL
       OR s.country = (SELECT p.country_of_residence FROM public.profiles p WHERE p.id = auth.uid())
     )
   GROUP BY s.id
   ORDER BY s.starts_at;
$$;

REVOKE ALL ON FUNCTION public.open_slots() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.open_slots() TO authenticated;

-- ── what the organiser sees ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.slot_bookings(p_slot_id uuid)
RETURNS TABLE (
  booking_id    uuid,
  status        text,
  member_name   text,
  member_email  text,
  member_mobile text,
  member_city   text,
  member_note   text,
  created_at    timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT b.id, b.status::text, p.full_name, p.email, p.mobile_number,
         p.city_abroad, b.member_note, b.created_at
    FROM public.appointment_bookings b
    JOIN public.profiles p ON p.id = b.profile_id
    JOIN public.appointment_slots s ON s.id = b.slot_id
   WHERE b.slot_id = p_slot_id
     AND (
       public.is_admin()
       OR (s.country IS NOT NULL AND s.country = ANY (public.my_countries()))
     )
   -- Pending first, then longest-waiting: the queue should show what
   -- needs a decision, not what was decided most recently.
   ORDER BY (b.status <> 'pending'), b.created_at;
$$;

REVOKE ALL ON FUNCTION public.slot_bookings(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.slot_bookings(uuid) TO authenticated;

COMMENT ON TABLE public.appointment_slots IS
  'Bookable time windows. mode=auto confirms on booking up to capacity; '
  'mode=manual collects requests for a human to decide. Capacity is '
  'enforced under a row lock in book_slot() and again in '
  'decide_booking(), so neither path can oversell.';
