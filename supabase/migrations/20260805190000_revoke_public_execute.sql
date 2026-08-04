-- =====================================================================
-- 20260805190000 — anonymous callers cannot reach SECURITY DEFINER code
--
-- PostgreSQL grants EXECUTE to PUBLIC on every newly created function.
-- Nothing in this project ever revoked it broadly, so 39 SECURITY
-- DEFINER functions were callable by `anon` — including
-- admin_voter_rows, admin_support_teams_overview, get_event_applicants
-- and support_team_*. Most predate the chapter rename; recreating
-- functions there re-granted a few more.
--
-- Confirmed against staging: anonymous wing_roles_list(),
-- my_chapter_ids() and my_role_rank() all returned HTTP 200.
--
-- NOTHING LEAKED
--   Every one returns empty because auth.uid() is NULL and the internal
--   checks fail closed. But "safe because the body happens to check"
--   is not the same as "unreachable", and admin_voter_rows sitting open
--   to anon is one careless SECURITY DEFINER edit away from mattering.
--
-- WHAT STAYS OPEN
--   register_click() — the public campaign redirect; a visitor
--   following a member's shared link has no account by definition.
--   Everything else is authenticated-only.
-- =====================================================================

DO $$
DECLARE
  fn record;
  kept  int := 0;
  fixed int := 0;
  -- Functions that legitimately serve unauthenticated callers.
  public_ok text[] := ARRAY['register_click'];
BEGIN
  FOR fn IN
    SELECT p.oid,
           p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prokind = 'f'
       AND has_function_privilege('public', p.oid, 'execute')
  LOOP
    IF fn.proname = ANY (public_ok) THEN
      kept := kept + 1;
      CONTINUE;
    END IF;

    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
                   fn.proname, fn.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated',
                   fn.proname, fn.args);
    fixed := fixed + 1;
  END LOOP;

  RAISE NOTICE 'revoked PUBLIC execute on % functions, kept % deliberately open',
               fixed, kept;
END $$;

-- Triggers run as the table owner and are never called directly, so
-- they need no grant at all. Revoke rather than leave them reachable.
DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
                   fn.proname, fn.args);
  END LOOP;
END $$;

DO $$
DECLARE leftovers text; n int;
BEGIN
  SELECT count(*), string_agg(p.proname, ', ')
    INTO n, leftovers
    FROM pg_proc p
    JOIN pg_namespace ns ON ns.oid = p.pronamespace
   WHERE ns.nspname = 'public'
     AND p.prokind = 'f'
     AND p.prosecdef
     AND has_function_privilege('public', p.oid, 'execute')
     AND p.proname <> 'register_click';

  IF n > 0 THEN
    RAISE EXCEPTION '% SECURITY DEFINER function(s) still open to PUBLIC: %', n, leftovers;
  END IF;

  -- And the deliberate exception must still work, or the campaign
  -- redirect breaks for every visitor.
  IF NOT has_function_privilege('anon', 'public.register_click(uuid)', 'execute') THEN
    RAISE EXCEPTION 'register_click is no longer callable by anon — campaign links would 401';
  END IF;

  RAISE NOTICE 'PUBLIC execute locked down';
END $$;
