-- =====================================================================
-- 20260807130001 — mandal names for a constituency, for MasterData.tsx's
-- new Mandal President picker.
--
-- A free-text mandal field would repeat the exact bug this migration's
-- predecessor (20260805235000) already produced once by hand while
-- testing: "Nandyal Rural" typed as a leader_assignments.mandal value
-- while ap_mandals' real name for that seat is "Nandyal" — resolve_
-- mandal() does exact/lower matching only (no alias table exists for
-- mandals, unlike constituency/district), so the mistyped assignment
-- silently never resolves and the seat shows as permanently vacant.
-- Sourcing the admin's picker from ap_mandals directly, the same table
-- resolve_mandal() checks against, makes that class of mismatch
-- structurally impossible rather than something to catch by review.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.ap_mandal_names(p_constituency text)
RETURNS TABLE (name text)
LANGUAGE sql STABLE
AS $$
  SELECT m.name
    FROM public.ap_mandals m
   WHERE m.constituency_id = public.resolve_constituency(p_constituency)
     AND m.is_active
   ORDER BY m.name;
$$;

REVOKE ALL ON FUNCTION public.ap_mandal_names(text) FROM public;
GRANT EXECUTE ON FUNCTION public.ap_mandal_names(text) TO anon, authenticated;

DO $$
BEGIN
  RAISE NOTICE 'ap_mandal_names ready';
END $$;
