-- =====================================================================
-- Allow anonymous visitors to read public support_teams metadata.
--
-- Why: the /support-teams register page is loaded by users who don't yet
-- have an account, so the supabase client uses the anon role. The
-- existing SELECT policy `support_teams_read_auth` is scoped to
-- `authenticated` only, which silently returned an empty array on the
-- register page — rendering the "No seats available right now" message
-- even when active, unclaimed teams existed.
--
-- Fix: a separate policy that lets `anon` see the same rows. We don't
-- expose anything sensitive — just team name, description, is_active,
-- and the *fact* of whether a seat is claimed (we only show unclaimed
-- ones in the dropdown). The previous policy stays as-is for
-- authenticated reads.
--
-- Idempotent — DROP IF EXISTS + CREATE.
-- =====================================================================

DROP POLICY IF EXISTS "support_teams_read_anon" ON public.support_teams;
CREATE POLICY "support_teams_read_anon" ON public.support_teams
  FOR SELECT TO anon
  USING (true);

DO $verify$
DECLARE
  v_anon int;
BEGIN
  SELECT count(*) INTO v_anon FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'support_teams'
     AND policyname = 'support_teams_read_anon';
  RAISE NOTICE 'support_teams anon read policy in place: %', v_anon;
END $verify$;
