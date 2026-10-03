-- =====================================================================
-- 20260810094000 — a member cannot INSERT their own role
--
-- Found while fixing the external reports, not one of them. Read from
-- the code on develop; not exercised against a live database.
--
--   20260805111000 closed role/status to UPDATE: column grants plus
--   guard_privileged_profile_columns(). INSERT was left table-wide
--   (20260804094500: GRANT INSERT ... ON public.profiles TO authenticated)
--   under profiles_self_insert, WITH CHECK (auth.uid() = id). The guard is
--   a BEFORE UPDATE trigger and never sees an INSERT.
--
--   Normally the row already exists — handle_new_user() creates it at
--   signup — so the INSERT conflicts. But delete_my_support_account()
--   let ANY signed-in caller delete their own profile while their auth
--   account and session stayed valid. After that, inserting one's own
--   row with role = 'admin' passed every check.
--
-- FIXED HERE
--   1. INSERT on profiles is granted per column, without the authorisation
--      columns. Omitted columns take their defaults (role 'user', status
--      'pending'). handle_new_user() is SECURITY DEFINER and unaffected.
--   2. delete_my_support_account() is for support-team accounts only, as
--      its name and the support dashboard's "no seat" notice intend.
--
--   The client fallback that inserts a missing profile
--   (src/contexts/AuthContext.tsx) no longer sends role, in the same
--   commit; with role sent, that insert would now be refused.
-- =====================================================================

REVOKE INSERT ON public.profiles FROM authenticated;

DO $$
DECLARE
  -- Columns a member may not choose for themselves on creation.
  privileged text[] := ARRAY[
    'role', 'status',
    'public_user_code', 'referral_code',
    'onboarding_completed_at',
    'epic_number', 'has_vote', 'voter_constituency'
  ];
  cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ') INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'profiles'
     AND column_name <> ALL (privileged);
  EXECUTE format('GRANT INSERT (%s) ON public.profiles TO authenticated', cols);
END $$;

CREATE OR REPLACE FUNCTION public.delete_my_support_account()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles
                  WHERE id = v_me AND role = 'support_team') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_support_team');
  END IF;

  UPDATE public.support_teams
     SET claimed_by_profile_id = NULL
   WHERE claimed_by_profile_id = v_me;

  DELETE FROM public.profiles WHERE id = v_me;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_support_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_support_account() TO authenticated;

DO $$
BEGIN
  IF has_column_privilege('authenticated', 'public.profiles', 'role', 'INSERT') THEN
    RAISE EXCEPTION 'authenticated can still INSERT profiles.role';
  END IF;
  IF has_column_privilege('authenticated', 'public.profiles', 'status', 'INSERT') THEN
    RAISE EXCEPTION 'authenticated can still INSERT profiles.status';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.profiles', 'first_name', 'INSERT') THEN
    RAISE EXCEPTION 'column INSERT grant did not land';
  END IF;
  RAISE NOTICE 'profiles: role/status are not member-insertable';
END $$;
