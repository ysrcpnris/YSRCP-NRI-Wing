-- =====================================================================
-- 20260805130000 — appointments cannot be published outside their scope
--
-- (HIGH) THE SAME INJECTION social_handles ALREADY HAD
--   appointment_slots stores cluster_id and country independently, and
--   the write policy allowed a cluster lead whenever they controlled
--   cluster_id — without checking the country beside it.
--
--   Proven on staging, both variants, both HTTP 201:
--     cluster_id = <Germany>, country = NULL          -> wing-wide slot
--     cluster_id = <Germany>, country = "United States"
--   and a USA member then saw BOTH in open_slots(). A chapter lead
--   published appointments to the entire wing.
--
--   social_handles was fixed with a composite FK in 20260805093000 and
--   the identical shape on this table was missed. Structure, not an RPC
--   check: the database must refuse to hold an inconsistent row.
--
-- (MEDIUM) MANAGEMENT WAS HALF CLUSTER-AWARE
--   decide_booking() and slot_bookings() learned can_write_cluster();
--   mark_attendance() and slots_i_manage() did not. A cluster lead could
--   decide a booking by UUID but could not list their own slots or mark
--   who turned up. One helper now answers "may I manage this slot",
--   and every appointment function uses it.
-- =====================================================================

-- ── structure ────────────────────────────────────────────────────────
-- REPORT AND STOP, never delete.
--
-- This block used to DELETE inconsistent slots and their bookings so the
-- constraint could be added. On staging that was two throwaway test
-- rows. On production it would silently destroy appointment history —
-- a record of who met whom — to make a schema change fit.
--
-- If production holds inconsistent rows, this migration halts and names
-- them. Someone then repairs or explicitly removes them, and re-runs.
-- A migration may refuse to proceed; it may not decide on its own that
-- operational history is expendable.
DO $$
DECLARE bad int; detail text;
BEGIN
  SELECT count(*), string_agg(format('%s (%s)', s.title, s.id), '; ')
    INTO bad, detail
    FROM public.appointment_slots s
   WHERE s.cluster_id IS NOT NULL
     AND (s.country IS NULL
          OR NOT EXISTS (SELECT 1 FROM public.clusters c
                          WHERE c.id = s.cluster_id AND c.country = s.country));

  IF bad > 0 THEN
    RAISE EXCEPTION
      E'% appointment slot(s) name a chapter inconsistently and must be '
      'resolved before this constraint can be added:\n  %\n'
      'Fix each by setting country to the chapter''s country, or delete '
      'it deliberately, then re-run.', bad, detail;
  END IF;
END $$;

ALTER TABLE public.appointment_slots
  DROP CONSTRAINT IF EXISTS appointment_slots_cluster_needs_country,
  ADD  CONSTRAINT appointment_slots_cluster_needs_country
       CHECK (cluster_id IS NULL OR country IS NOT NULL);

ALTER TABLE public.appointment_slots
  DROP CONSTRAINT IF EXISTS appointment_slots_cluster_country_fk,
  ADD  CONSTRAINT appointment_slots_cluster_country_fk
       FOREIGN KEY (cluster_id, country)
       REFERENCES public.clusters (id, country)
       -- RESTRICT, not CASCADE: deleting a chapter must not take its
       -- appointments and every booking with it. Attendance history
       -- should outlive a reorganisation of the chapter map.
       ON DELETE RESTRICT;

-- ── one predicate for every appointment function ─────────────────────
CREATE OR REPLACE FUNCTION public.can_manage_slot(p_slot_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.appointment_slots s
     WHERE s.id = p_slot_id
       AND (
         public.has_global_scope()
         OR (s.cluster_id IS NOT NULL AND public.can_write_cluster(s.cluster_id))
         OR (s.cluster_id IS NULL AND s.country IS NOT NULL
             AND public.can_write_country(s.country))
       )
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_slot(uuid) TO authenticated;

-- ── every appointment function now shares it ─────────────────────────
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
    SELECT count(*) INTO v_taken
      FROM public.appointment_bookings ab
     WHERE ab.slot_id = b.slot_id AND ab.status = 'confirmed' AND ab.id <> p_booking_id;
    IF v_taken >= s.capacity THEN
      RETURN QUERY SELECT false,
        format('That slot is full (%s of %s confirmed).', v_taken, s.capacity);
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

CREATE OR REPLACE FUNCTION public.mark_attendance(
  p_booking_id uuid, p_attended boolean
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_slot uuid;
BEGIN
  SELECT b.slot_id INTO v_slot
    FROM public.appointment_bookings b WHERE b.id = p_booking_id;
  IF v_slot IS NULL OR NOT public.can_manage_slot(v_slot) THEN
    RETURN false;
  END IF;

  UPDATE public.appointment_bookings
     SET status = CASE WHEN p_attended THEN 'attended' ELSE 'no_show' END::public.booking_status,
         decided_by = auth.uid(), decided_at = now()
   WHERE id = p_booking_id AND status = 'confirmed';
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.slot_bookings(p_slot_id uuid)
RETURNS TABLE (
  booking_id uuid, status text, member_name text, member_email text,
  member_mobile text, member_city text, member_note text, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT b.id, b.status::text, p.full_name, p.email, p.mobile_number,
         p.city_abroad, b.member_note, b.created_at
    FROM public.appointment_bookings b
    JOIN public.profiles p ON p.id = b.profile_id
   WHERE b.slot_id = p_slot_id
     AND public.can_manage_slot(p_slot_id)
   ORDER BY (b.status <> 'pending'), b.created_at;
$$;

CREATE OR REPLACE FUNCTION public.slots_i_manage()
RETURNS TABLE (
  id uuid, title text, starts_at timestamptz, ends_at timestamptz,
  capacity int, mode text, country text, is_published boolean,
  confirmed bigint, pending bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.title, s.starts_at, s.ends_at, s.capacity, s.mode::text,
         s.country, s.is_published,
         count(b.id) FILTER (WHERE b.status = 'confirmed'),
         count(b.id) FILTER (WHERE b.status = 'pending')
    FROM public.appointment_slots s
    LEFT JOIN public.appointment_bookings b ON b.slot_id = s.id
   WHERE public.can_manage_slot(s.id)
   GROUP BY s.id
   ORDER BY s.starts_at DESC;
$$;

-- ── visibility follows the chapter, not just the country ─────────────
CREATE OR REPLACE FUNCTION public.open_slots()
RETURNS TABLE (
  id uuid, title text, description text, host_name text,
  venue text, virtual_link text, starts_at timestamptz, ends_at timestamptz,
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
       -- A slot naming a chapter is for that chapter's members only.
       CASE WHEN s.cluster_id IS NOT NULL THEN
         s.cluster_id = (
           SELECT public.chapter_for_city(p.country_of_residence, p.city_abroad)
             FROM public.profiles p WHERE p.id = auth.uid())
       WHEN s.country IS NOT NULL THEN
         s.country = (SELECT p.country_of_residence FROM public.profiles p WHERE p.id = auth.uid())
       ELSE true      -- wing-wide, and only an admin can create one
       END
     )
   GROUP BY s.id
   ORDER BY s.starts_at;
$$;

REVOKE ALL ON FUNCTION public.open_slots() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.open_slots() TO authenticated;
REVOKE ALL ON FUNCTION public.decide_booking(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.decide_booking(uuid, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.mark_attendance(uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mark_attendance(uuid, boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.slot_bookings(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.slot_bookings(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.slots_i_manage() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.slots_i_manage() TO authenticated;

-- ── service_requests: the last write policy on a read predicate ──────
-- Flagged as a remaining blocker, and correctly. Slice 5 left this table
-- alone because it already had UI, and never audited its policies.
DROP POLICY IF EXISTS service_requests_admin_update ON public.service_requests;
CREATE POLICY service_requests_admin_update ON public.service_requests
  FOR UPDATE TO authenticated
  USING (
    public.has_global_scope()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = service_requests.user_id
         AND public.can_write_country(p.country_of_residence)
    )
  )
  WITH CHECK (
    public.has_global_scope()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = service_requests.user_id
         AND public.can_write_country(p.country_of_residence)
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'appointment_slots_cluster_country_fk') THEN
    RAISE EXCEPTION 'appointment cluster/country FK missing';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies
              WHERE schemaname='public' AND tablename='service_requests'
                AND cmd IN ('UPDATE','ALL') AND qual LIKE '%has_country_scope%') THEN
    RAISE EXCEPTION 'service_requests still writes on a read predicate';
  END IF;
  RAISE NOTICE 'appointment scope consistency applied';
END $$;
