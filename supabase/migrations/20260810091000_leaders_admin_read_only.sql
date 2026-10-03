-- =====================================================================
-- 20260810091000 — leader directory is admin-read only
--
-- Reported externally (report "P2 — leaders PII"): any signed-in account
-- could read every row of leaders_master and leader_assignments, and so
-- org_hierarchy_v, including leaders' personal WhatsApp numbers.
-- 20240101004200 had narrowed both read policies from "everyone" to
-- "authenticated, USING (true)" — which, with self-service signup, is
-- still everyone.
--
-- WHO STILL NEEDS THESE ROWS, checked before narrowing
--   * Admin screens (MasterData, OrgHierarchy, AdminDashboard,
--     AdminFeedback, AdminGrievances) — admins keep SELECT through the
--     existing *_admin_write policies, which are FOR ALL USING is_admin().
--   * Members reach leaders only through SECURITY DEFINER RPCs —
--     my_local_connect(), my_constituency_mandals() — which return the
--     caller's own area and are unaffected by RLS.
--   * The member Dashboard's leadersByRole fetch read the tables directly
--     but its result was never rendered; it is removed in the same commit.
--   * ap_districts() is SECURITY INVOKER and reads leader_assignments for
--     the member grievance form's district list. It returns district names
--     only, so it becomes SECURITY DEFINER below rather than losing rows.
--   * constituency_leader_coverage is a plain view (owner rights), returns
--     counts only, and is unaffected.
--
-- org_hierarchy_v is security_invoker (20240101003700), so it follows the
-- base tables with no change of its own.
-- =====================================================================

DROP POLICY IF EXISTS "leaders_master_read"     ON public.leaders_master;
DROP POLICY IF EXISTS "leader_assignments_read" ON public.leader_assignments;

-- District names only — no leader identity leaves this function.
CREATE OR REPLACE FUNCTION public.ap_districts()
RETURNS TABLE (district text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT la.district FROM public.leader_assignments la
   WHERE la.district IS NOT NULL AND btrim(la.district) <> ''
   ORDER BY 1;
$$;

REVOKE ALL ON FUNCTION public.ap_districts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ap_districts() TO authenticated;

DO $$
DECLARE
  open_reads int;
BEGIN
  -- Any remaining SELECT-capable policy on either table must be admin-gated.
  SELECT count(*) INTO open_reads
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename IN ('leaders_master', 'leader_assignments')
     AND cmd IN ('SELECT', 'ALL')
     AND coalesce(qual, '') NOT LIKE '%is_admin()%';
  IF open_reads > 0 THEN
    RAISE EXCEPTION '% non-admin read policies remain on the leader tables', open_reads;
  END IF;
  RAISE NOTICE 'Leader directory is admin-read only';
END $$;
