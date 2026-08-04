-- =====================================================================
-- 20260805092000 — close the direct-write paths around the RPCs
--
-- THE COMMON DEFECT
--   Three tables had a SECURITY DEFINER function enforcing a rule and a
--   table grant that let the client skip it entirely. Locking the front
--   door is not a boundary while the back door is open.
--
--     respond_to_case()  checks scope    | PATCH /student_requests did not
--     decide_booking()   checks capacity | PATCH /appointment_bookings did not
--
--   Reproduced: a member set their own student request to 'resolved',
--   and an admin confirmed a second booking on a capacity-1 slot,
--   overselling it — the exact case decide_booking() exists to prevent.
--
--   Every one of my slice tests went through the RPC. None tried the
--   table.
--
-- THE RULE APPLIED HERE
--   If a function exists to enforce an invariant, the table must not be
--   writable in a way that bypasses it. The grant is the boundary; the
--   policy is a second layer, not the first.
-- =====================================================================

-- ── student_requests ─────────────────────────────────────────────────
-- A member files and reads. Status, mentor and ownership are decided by
-- respond_to_case(), which checks scope. Members keep no UPDATE at all:
-- there is no field on this table they legitimately edit after filing,
-- and "description" is not worth an escalation path.
REVOKE UPDATE ON public.student_requests FROM authenticated;

DROP POLICY IF EXISTS student_requests_update ON public.student_requests;
CREATE POLICY student_requests_update ON public.student_requests
  FOR UPDATE TO authenticated
  USING (
    public.has_global_scope()
    OR assigned_mentor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = student_requests.profile_id
         AND public.member_in_scope(p.country_of_residence, p.city_abroad)
    )
  )
  WITH CHECK (
    public.has_global_scope()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = student_requests.profile_id
         AND public.member_in_scope(p.country_of_residence, p.city_abroad)
    )
  );

-- Column grants are built by EXCLUSION, never as "grant the table then
-- revoke a few columns" — table-level UPDATE implies every column and a
-- later REVOKE of a subset is a no-op. The assertion at the foot of this
-- file caught exactly that mistake.
--
-- respond_to_case() is SECURITY DEFINER and runs as the owner, so it
-- needs no grant at all. These columns are for a coordinator editing
-- from the admin UI, still scoped by the policy above.
DO $$
DECLARE protected text[] := ARRAY['id','profile_id','status','assigned_mentor_id',
                                  'reference_no','resolved_at','created_at'];
        cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ') INTO cols
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='student_requests'
     AND column_name <> ALL (protected);
  EXECUTE format('GRANT UPDATE (%s) ON public.student_requests TO authenticated', cols);
END $$;

-- ── appointment_bookings ─────────────────────────────────────────────
-- Nobody writes this table directly. Booking goes through book_slot()
-- (row lock + capacity), deciding through decide_booking() (capacity
-- again), cancelling through cancel_booking() below.
REVOKE UPDATE, INSERT, DELETE ON public.appointment_bookings FROM authenticated;

DROP POLICY IF EXISTS bookings_member_cancel ON public.appointment_bookings;
DROP POLICY IF EXISTS bookings_admin_write   ON public.appointment_bookings;

CREATE OR REPLACE FUNCTION public.cancel_booking(p_slot_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE n int;
BEGIN
  UPDATE public.appointment_bookings
     SET status = 'cancelled'
   WHERE slot_id = p_slot_id
     AND profile_id = auth.uid()
     AND status IN ('pending', 'confirmed');
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END $$;

REVOKE ALL ON FUNCTION public.cancel_booking(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid) TO authenticated;

-- An organiser marking who turned up. Separate from decide_booking()
-- because attendance is not an admission decision and must not re-run
-- the capacity check on an already-confirmed seat.
CREATE OR REPLACE FUNCTION public.mark_attendance(
  p_booking_id uuid,
  p_attended   boolean
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_country text;
BEGIN
  SELECT s.country INTO v_country
    FROM public.appointment_bookings b
    JOIN public.appointment_slots s ON s.id = b.slot_id
   WHERE b.id = p_booking_id;

  IF NOT (public.has_global_scope() OR public.can_write_country(v_country)) THEN
    RETURN false;
  END IF;

  UPDATE public.appointment_bookings
     SET status = CASE WHEN p_attended THEN 'attended' ELSE 'no_show' END::public.booking_status,
         decided_by = auth.uid(), decided_at = now()
   WHERE id = p_booking_id AND status = 'confirmed';
  RETURN FOUND;
END $$;

REVOKE ALL ON FUNCTION public.mark_attendance(uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mark_attendance(uuid, boolean) TO authenticated;

-- ── suggestions: admin DELETE was granted to nobody ──────────────────
-- 20260804300000 revoked ALL then granted INSERT, SELECT, UPDATE. Its
-- own comment said "DELETE stays with admin", and the admin policy
-- exists, but the grant was never restored — so the policy was
-- unreachable. Verified: admin DELETE returned 403.
GRANT DELETE ON public.suggestions TO authenticated;

-- ── grievances: same audit, applied before it bites ──────────────────
-- The member policy here was already correct (verified in slice 5), but
-- the column grants were not checked. A member must not rewrite status,
-- response or ownership even though the row is theirs.
REVOKE UPDATE ON public.grievances FROM authenticated;
DO $$
DECLARE protected text[] := ARRAY['id','profile_id','status','response','assigned_to',
                                  'reference_no','resolved_at','created_at'];
        cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ') INTO cols
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='grievances'
     AND column_name <> ALL (protected);
  EXECUTE format('GRANT UPDATE (%s) ON public.grievances TO authenticated', cols);
END $$;

DO $$
DECLARE bad text;
BEGIN
  SELECT string_agg(format('%s.%s', table_name, column_name), ', ')
    INTO bad
    FROM information_schema.column_privileges
   WHERE table_schema = 'public'
     AND grantee = 'authenticated'
     AND privilege_type = 'UPDATE'
     AND (
       (table_name = 'student_requests' AND column_name IN ('status','profile_id','assigned_mentor_id'))
       OR (table_name = 'grievances'      AND column_name IN ('status','response','assigned_to','profile_id'))
       OR (table_name = 'appointment_bookings')
     );
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'direct write still possible on: %', bad;
  END IF;
  RAISE NOTICE 'direct write paths closed';
END $$;
