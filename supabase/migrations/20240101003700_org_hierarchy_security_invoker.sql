-- =====================================================================
-- Fix the SECURITY DEFINER warning Supabase's advisor raises on
-- `public.org_hierarchy_v`.
--
-- Background:
--   Postgres views run with the *creator's* permissions by default
--   (SECURITY DEFINER semantics). That means any authenticated user
--   selecting from the view gets whatever access the migration runner
--   (typically the `postgres` super-role) has — bypassing RLS on the
--   underlying tables. Supabase flags this as a security issue.
--
-- Fix:
--   Postgres 15+ adds the `security_invoker` view option. Setting it
--   to `on` makes the view enforce the *calling* user's permissions
--   and RLS policies — which is what we want.
--
--   The underlying tables (`leader_assignments`, `leaders_master`)
--   already have public-read RLS policies, so this change does NOT
--   reduce what users can see through the view. It just stops the
--   advisor warning and makes the access model consistent.
--
-- Idempotent — `ALTER VIEW ... SET` is a no-op if the option is
-- already set.
-- =====================================================================

ALTER VIEW public.org_hierarchy_v SET (security_invoker = on);

DO $verify$
BEGIN
  RAISE NOTICE
    'org_hierarchy_v is now SECURITY INVOKER. Querying users get their '
    'own RLS-enforced access to the underlying leader_assignments / '
    'leaders_master tables (both already allow public SELECT).';
END $verify$;
