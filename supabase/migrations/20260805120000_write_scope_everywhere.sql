-- =====================================================================
-- 20260805120000 — every write path uses a WRITE predicate
--
-- The last round fixed the write paths I looked at and left the ones I
-- did not. Same lesson, three more places:
--
-- (1) decide_booking() authorised through my_countries(), which
--     deliberately includes country-scoped team_lead for READ. Proven:
--     the Germany team lead confirmed a pending booking. The matrix
--     tested direct writes to appointment_bookings and never called the
--     RPC that is the only sanctioned way to change one.
--
-- (2) grievances_update and student_requests_update still used read
--     predicates, and the column grants covered the content columns.
--     Proven: the team lead rewrote a grievance's subject to
--     "REWRITTEN BY TEAM LEAD". They could not adjudicate a case and
--     could rewrite what it said, which is arguably worse — the reply
--     is visible, the edit is not.
--
-- (5) my_role_rank() took the caller's best rank ANYWHERE and scope was
--     checked separately, so someone who is a coordinator in Germany
--     and a chapter lead in the USA could combine coordinator rank with
--     USA scope. Rank is now computed for the scope being acted on.
--
-- (6) No uniqueness on active grants. IF EXISTS then INSERT races, and
--     revoking one duplicate leaves the other live while the UI reports
--     success.
-- =====================================================================

-- ── (5) rank, computed per scope ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.my_rank_in_country(p_country text)
RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE WHEN public.is_admin() THEN 1 ELSE coalesce((
    SELECT min(public.role_rank(role::text))
      FROM public.member_roles
     WHERE profile_id = auth.uid()
       AND revoked_at IS NULL
       AND (role = 'secretariat' OR country = p_country)
  ), 99) END;
$$;

CREATE OR REPLACE FUNCTION public.my_rank_in_cluster(p_cluster_id uuid)
RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE WHEN public.is_admin() THEN 1 ELSE coalesce((
    SELECT min(public.role_rank(mr.role::text))
      FROM public.member_roles mr
     WHERE mr.profile_id = auth.uid()
       AND mr.revoked_at IS NULL
       AND (
         mr.role = 'secretariat'
         -- country-level authority over the country this cluster is in
         OR (mr.cluster_id IS NULL AND mr.country = (
               SELECT c.country FROM public.clusters c WHERE c.id = p_cluster_id))
         -- or authority over this exact cluster
         OR mr.cluster_id = p_cluster_id
       )
  ), 99) END;
$$;

GRANT EXECUTE ON FUNCTION public.my_rank_in_country(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_rank_in_cluster(uuid) TO authenticated;

-- ── (6) one active grant per (person, role, scope) ───────────────────
-- Collapse any existing duplicates first, keeping the earliest.
UPDATE public.member_roles mr SET revoked_at = now()
 WHERE revoked_at IS NULL
   AND EXISTS (
     SELECT 1 FROM public.member_roles o
      WHERE o.revoked_at IS NULL
        AND o.profile_id = mr.profile_id
        AND o.role = mr.role
        AND o.country IS NOT DISTINCT FROM mr.country
        AND o.cluster_id IS NOT DISTINCT FROM mr.cluster_id
        AND o.granted_at < mr.granted_at
   );

-- coalesce rather than NULLS NOT DISTINCT so this works on any
-- supported Postgres version, not only 15+.
CREATE UNIQUE INDEX IF NOT EXISTS member_roles_one_active_idx
  ON public.member_roles (
    profile_id, role,
    coalesce(country, ''),
    coalesce(cluster_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE revoked_at IS NULL;

-- ── (1) decide_booking uses write scope ──────────────────────────────
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

  SELECT * INTO s FROM public.appointment_slots aslot
   WHERE aslot.id = b.slot_id FOR UPDATE;

  -- WRITE predicates. my_countries() includes read-only team leads, and
  -- using it here let one confirm and decline appointments.
  IF NOT (
       public.has_global_scope()
       OR (s.cluster_id IS NOT NULL AND public.can_write_cluster(s.cluster_id))
       OR (s.country IS NOT NULL AND public.can_write_country(s.country))
     ) THEN
    RETURN QUERY SELECT false, 'That appointment is outside the ones you manage.';
    RETURN;
  END IF;

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

REVOKE ALL ON FUNCTION public.decide_booking(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.decide_booking(uuid, text, text) TO authenticated;

-- slot_bookings() reads member contact details, so it is management
-- information — same predicate.
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
    JOIN public.appointment_slots s ON s.id = b.slot_id
   WHERE b.slot_id = p_slot_id
     AND (
       public.has_global_scope()
       OR (s.cluster_id IS NOT NULL AND public.can_write_cluster(s.cluster_id))
       OR (s.country IS NOT NULL AND public.can_write_country(s.country))
     )
   ORDER BY (b.status <> 'pending'), b.created_at;
$$;

REVOKE ALL ON FUNCTION public.slot_bookings(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.slot_bookings(uuid) TO authenticated;

-- ── (2) assistance content is not editable by read-only roles ────────
DROP POLICY IF EXISTS grievances_update ON public.grievances;
CREATE POLICY grievances_update ON public.grievances
  FOR UPDATE TO authenticated
  USING (
    public.has_global_scope()
    OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = grievances.profile_id
         AND public.can_write_country(p.country_of_residence)
    )
  )
  WITH CHECK (
    public.has_global_scope()
    OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = grievances.profile_id
         AND public.can_write_country(p.country_of_residence)
    )
  );

DROP POLICY IF EXISTS student_requests_update ON public.student_requests;
CREATE POLICY student_requests_update ON public.student_requests
  FOR UPDATE TO authenticated
  USING (
    public.has_global_scope()
    OR assigned_mentor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = student_requests.profile_id
         AND public.can_write_country(p.country_of_residence)
    )
  )
  WITH CHECK (
    public.has_global_scope()
    OR assigned_mentor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = student_requests.profile_id
         AND public.can_write_country(p.country_of_residence)
    )
  );

DO $$
DECLARE dupes int;
BEGIN
  SELECT count(*) INTO dupes FROM (
    SELECT profile_id, role, country, cluster_id
      FROM public.member_roles WHERE revoked_at IS NULL
     GROUP BY 1,2,3,4 HAVING count(*) > 1) d;
  IF dupes > 0 THEN
    RAISE EXCEPTION '% duplicate active role grants survived', dupes;
  END IF;
  RAISE NOTICE 'write scope applied to bookings and assistance';
END $$;
