-- =====================================================================
-- VAPT V-01 + V-04 fix: lock down PII-bearing tables so they require
-- an authenticated session. Tables that intentionally serve the
-- public home page (news, events, banners, gallery, testimonials,
-- youtube videos, master lookups like countries / continents /
-- service categories / wings) keep their open SELECT policies — those
-- carry no personal data.
--
-- Affected (now authenticated-only):
--   • leaders_master       — 217+ leader phone numbers (live PII breach)
--   • leader_assignments   — district / constituency mapping per leader
--   • coordinators         — coordinator contact data
--   • local_leaders        — legacy leader table (same shape as master)
--
-- Idempotent: DROP IF EXISTS + CREATE.
-- =====================================================================

-- 1. leaders_master  (was: FOR SELECT USING (true) — public)
DROP POLICY IF EXISTS "leaders_master_read" ON public.leaders_master;
CREATE POLICY "leaders_master_read" ON public.leaders_master
  FOR SELECT TO authenticated USING (true);

-- 2. leader_assignments
DROP POLICY IF EXISTS "leader_assignments_read" ON public.leader_assignments;
CREATE POLICY "leader_assignments_read" ON public.leader_assignments
  FOR SELECT TO authenticated USING (true);

-- 3. coordinators
DROP POLICY IF EXISTS "coordinators_read" ON public.coordinators;
CREATE POLICY "coordinators_read" ON public.coordinators
  FOR SELECT TO authenticated USING (true);

-- 4. local_leaders (legacy)
DROP POLICY IF EXISTS "local_leaders_read" ON public.local_leaders;
CREATE POLICY "local_leaders_read" ON public.local_leaders
  FOR SELECT TO authenticated USING (true);

-- Verify nothing is left publicly-readable that carries PII.
DO $verify$
DECLARE
  v_bad text;
BEGIN
  SELECT string_agg(tablename, ', ')
    INTO v_bad
    FROM pg_tables t
   WHERE schemaname = 'public'
     AND tablename IN ('leaders_master', 'leader_assignments', 'coordinators', 'local_leaders')
     AND EXISTS (
       SELECT 1 FROM pg_policy p
        JOIN pg_class c ON c.oid = p.polrelid
       WHERE c.relname = t.tablename
         AND p.polcmd = 'r'
         AND pg_get_expr(p.polqual, p.polrelid) = 'true'
         AND p.polroles = '{0}'::oid[]   -- empty roles array == PUBLIC
     );
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'Still public-readable: %', v_bad;
  END IF;
  RAISE NOTICE 'PII tables locked to authenticated role only.';
END $verify$;
