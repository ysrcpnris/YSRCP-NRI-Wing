-- =====================================================================
-- 20260810090000 — a support-team seat needs an admin's invite
--
-- Reported externally (report "P3 — claim_support_team") and confirmed
-- by reading develop. Two independent ways in, both open:
--
--   1. handle_new_user() set profiles.role = 'support_team' for any
--      signup whose user_metadata said so. user_metadata is whatever the
--      browser passes to auth.signUp(), so any visitor could create a
--      support_team account.
--   2. claim_support_team() refused admins and nobody else. Any signed-in
--      account could take any open, active seat.
--
--   The seat is what grants access: service_requests_team_read and every
--   support_team_* RPC key on support_teams.claimed_by_profile_id. So (2)
--   is the one that reaches citizens' service requests. (1) is closed as
--   well because a role nobody granted should not exist.
--
--   Side note on develop before this file: claim_support_team()'s role
--   UPDATE was already being reverted by guard_privileged_profile_columns()
--   (it never set app.private_profile_write), so a member who claimed got
--   the seat but kept role 'user'. The seat alone was enough for the
--   support_team_* RPCs, which check only the seat.
--
-- AFTER THIS FILE
--   * Signup always creates role 'user'.
--   * An admin records an invite — team + email — on Wing Management →
--     Support Teams (src/AdminDashboard/SupportTeams.tsx).
--   * claim_support_team() succeeds only when the caller's CONFIRMED auth
--     email equals the invite for that team. It takes the seat first and
--     only then sets the role, so a failed claim changes nothing. The
--     invite is consumed.
--   * support_team_invites is admin-only. Neither anon nor members can
--     read who has been invited.
--
-- NOT DONE HERE — needs a person
--   Existing role = 'support_team' profiles are left as they are,
--   including any that were self-made through (1) or seats taken through
--   (2). Review with:
--
--     SELECT p.id, p.email, p.created_at, t.name AS seat
--       FROM public.profiles p
--       LEFT JOIN public.support_teams t ON t.claimed_by_profile_id = p.id
--      WHERE p.role = 'support_team' OR t.id IS NOT NULL
--      ORDER BY p.created_at;
-- =====================================================================

-- ── invites ──────────────────────────────────────────────────────────
-- One open invite per team: a seat has one holder, so it has one invitee.
CREATE TABLE IF NOT EXISTS public.support_team_invites (
  team_id    uuid PRIMARY KEY
             REFERENCES public.support_teams(id) ON DELETE CASCADE,
  email      text NOT NULL
             CHECK (email = lower(btrim(email)) AND position('@' IN email) > 1),
  invited_by uuid DEFAULT auth.uid()
             REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_team_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_team_invites_admin_all ON public.support_team_invites;
CREATE POLICY support_team_invites_admin_all ON public.support_team_invites
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Supabase's default privileges grant new public tables to anon. Undo
-- that; RLS above is the gate for authenticated.
REVOKE ALL ON public.support_team_invites FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_team_invites TO authenticated;

-- ── signup no longer reads role from user_metadata ───────────────────
-- Body is 20240101004400's verbatim except v_role, which is now always
-- 'user'. The role is set by a successful claim_support_team(), nowhere
-- else.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, auth_user_id, email,
    first_name, last_name, full_name,
    mobile_number, country_of_residence,
    state_abroad, city_abroad,
    indian_state, district, assembly_constituency, mandal,
    gender,
    contribution,
    referral_code, role, created_at
  )
  VALUES (
    NEW.id, NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1), 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name',  split_part(NEW.raw_user_meta_data->>'full_name', ' ', 2), 'change last name'),
    COALESCE(NEW.raw_user_meta_data->>'full_name',  NULL),
    NEW.raw_user_meta_data->>'mobile_number',
    NEW.raw_user_meta_data->>'country_of_residence',
    NEW.raw_user_meta_data->>'state_abroad',
    NEW.raw_user_meta_data->>'city_abroad',
    NEW.raw_user_meta_data->>'indian_state',
    NEW.raw_user_meta_data->>'district',
    NEW.raw_user_meta_data->>'assembly_constituency',
    NEW.raw_user_meta_data->>'mandal',
    NEW.raw_user_meta_data->>'gender',
    NEW.raw_user_meta_data->>'contribution',
    NEW.raw_user_meta_data->>'referral_code',
    'user',
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ── the claim ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.claim_support_team(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me      uuid := auth.uid();
  v_my_role text;
  v_email   text;
  v_already uuid;
BEGIN
  IF v_me IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  SELECT role INTO v_my_role FROM public.profiles WHERE id = v_me;
  IF v_my_role IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_profile');
  END IF;
  IF v_my_role = 'admin' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'admin_cannot_claim');
  END IF;

  -- One seat per profile. Idempotent for the seat already held.
  SELECT id INTO v_already
    FROM public.support_teams WHERE claimed_by_profile_id = v_me;
  IF v_already IS NOT NULL THEN
    IF v_already = p_team_id THEN
      RETURN jsonb_build_object('ok', true, 'reason', 'already_claimed', 'team_id', v_already);
    END IF;
    RETURN jsonb_build_object('ok', false, 'reason', 'caller_owns_other_team', 'team_id', v_already);
  END IF;

  -- The invite is matched against auth.users, not profiles.email: only a
  -- confirmed auth email proves the caller controls that inbox.
  SELECT lower(btrim(u.email)) INTO v_email
    FROM auth.users u
   WHERE u.id = v_me AND u.email_confirmed_at IS NOT NULL;
  IF v_email IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'email_not_confirmed');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.support_team_invites i
     WHERE i.team_id = p_team_id AND i.email = v_email
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_invited');
  END IF;

  -- Seat first, guarded so concurrent claims cannot both win. Nothing
  -- else changes unless this lands.
  UPDATE public.support_teams
     SET claimed_by_profile_id = v_me
   WHERE id = p_team_id
     AND is_active = true
     AND claimed_by_profile_id IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'team_unavailable');
  END IF;

  -- guard_privileged_profile_columns() reverts role for non-admins unless
  -- this transaction-local flag is set (same channel as
  -- update_my_private_profile()).
  PERFORM set_config('app.private_profile_write', '1', true);
  UPDATE public.profiles SET role = 'support_team'
   WHERE id = v_me AND role <> 'admin';
  PERFORM set_config('app.private_profile_write', '0', true);

  DELETE FROM public.support_team_invites WHERE team_id = p_team_id;

  RETURN jsonb_build_object('ok', true, 'team_id', p_team_id);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_support_team(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_support_team(uuid) TO authenticated;

DO $$
BEGIN
  IF has_table_privilege('anon', 'public.support_team_invites', 'SELECT') THEN
    RAISE EXCEPTION 'support_team_invites is readable by anon';
  END IF;
  IF has_function_privilege('anon', 'public.claim_support_team(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'claim_support_team is executable by anon';
  END IF;
  RAISE NOTICE 'Support-team seats are invite-only';
END $$;
