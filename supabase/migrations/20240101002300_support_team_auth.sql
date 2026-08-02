-- =====================================================================
-- Support Team auth + per-team workflow
--
-- Adds the third role ('support_team') alongside 'user' and 'admin'.
-- Each support_teams row is a single seat that can be claimed by at most
-- one profile. While claimed it's locked — the seat doesn't reappear in
-- the signup dropdown until either the holder deletes their account or
-- the admin deletes the team / force-releases the seat.
--
-- Service requests gain a real FK to the team they're routed to plus a
-- team_reply field that flows into the user's "My Service Requests" card.
--
-- Idempotent. Re-running is a no-op (ADD COLUMN IF NOT EXISTS, CREATE
-- POLICY IF NOT EXISTS variants where supported, GRANT is idempotent).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Schema additions
-- ---------------------------------------------------------------------

-- Each team can be owned by at most one profile at a time. ON DELETE
-- SET NULL so deleting the profile (account-delete flow) frees the seat
-- without losing the team row.
ALTER TABLE public.support_teams
  ADD COLUMN IF NOT EXISTS claimed_by_profile_id uuid
    REFERENCES public.profiles(id) ON DELETE SET NULL;

-- One seat per profile — partial index so multiple NULLs are fine.
CREATE UNIQUE INDEX IF NOT EXISTS support_teams_one_seat_per_profile
  ON public.support_teams (claimed_by_profile_id)
  WHERE claimed_by_profile_id IS NOT NULL;

-- service_requests gains the routing FK + team-reply fields.
ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS assigned_team_id uuid
    REFERENCES public.support_teams(id) ON DELETE SET NULL;

ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS team_reply text;

ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS team_resolved_at timestamptz;

CREATE INDEX IF NOT EXISTS service_requests_assigned_team_idx
  ON public.service_requests (assigned_team_id);


-- ---------------------------------------------------------------------
-- 2. Helper — `is_support_team()`, mirrors `is_admin()`
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_support_team()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
     WHERE id = auth.uid() AND role = 'support_team'
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.is_support_team() TO authenticated;


-- ---------------------------------------------------------------------
-- 3. handle_new_user — honor 'support_team' from metadata
--
-- Anything except the literal 'support_team' still maps to 'user', so
-- the public register page is unchanged.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := CASE
    WHEN NEW.raw_user_meta_data->>'role' = 'support_team' THEN 'support_team'
    ELSE 'user'
  END;

  INSERT INTO public.profiles (
    id, auth_user_id, email,
    first_name, last_name, full_name,
    mobile_number, country_of_residence,
    state_abroad, city_abroad,
    indian_state, district, assembly_constituency, mandal,
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
    NEW.raw_user_meta_data->>'referral_code',
    v_role,
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


-- ---------------------------------------------------------------------
-- 4. RLS — support team members can SELECT requests routed to their team
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "service_requests_team_read" ON public.service_requests;
CREATE POLICY "service_requests_team_read" ON public.service_requests
  FOR SELECT TO authenticated
  USING (
    public.is_support_team()
    AND assigned_team_id IS NOT NULL
    AND assigned_team_id IN (
      SELECT id FROM public.support_teams WHERE claimed_by_profile_id = auth.uid()
    )
  );

-- Support teams write only via the SECURITY DEFINER RPCs below — no
-- direct UPDATE policy on service_requests for them.


-- ---------------------------------------------------------------------
-- 5. RPCs the support team member uses
-- ---------------------------------------------------------------------

-- claim_support_team — atomically claim a team during signup.
-- Returns jsonb with { ok, reason, team_id }.
CREATE OR REPLACE FUNCTION public.claim_support_team(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_my_role text;
  v_already_claimed_team uuid;
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

  -- One seat per profile — bail if they already hold one.
  SELECT id INTO v_already_claimed_team
    FROM public.support_teams WHERE claimed_by_profile_id = v_me;
  IF v_already_claimed_team IS NOT NULL THEN
    -- Idempotent: same team → success, different team → error.
    IF v_already_claimed_team = p_team_id THEN
      RETURN jsonb_build_object('ok', true, 'reason', 'already_claimed', 'team_id', v_already_claimed_team);
    END IF;
    RETURN jsonb_build_object('ok', false, 'reason', 'caller_owns_other_team', 'team_id', v_already_claimed_team);
  END IF;

  -- Make sure the role is set; the trigger does it for new signups, but
  -- if an existing 'user' is being upgraded we want to keep it consistent.
  UPDATE public.profiles SET role = 'support_team' WHERE id = v_me AND role <> 'admin';

  -- Claim with a guarded UPDATE so concurrent claims can't both win.
  UPDATE public.support_teams
     SET claimed_by_profile_id = v_me
   WHERE id = p_team_id
     AND is_active = true
     AND claimed_by_profile_id IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'team_unavailable');
  END IF;

  RETURN jsonb_build_object('ok', true, 'team_id', p_team_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_support_team(uuid) TO authenticated;


-- support_team_save_reply — save a draft reply without resolving.
CREATE OR REPLACE FUNCTION public.support_team_save_reply(
  p_request_id uuid,
  p_reply text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_my_team uuid;
BEGIN
  IF v_me IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  SELECT id INTO v_my_team FROM public.support_teams WHERE claimed_by_profile_id = v_me;
  IF v_my_team IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_team_seat');
  END IF;

  UPDATE public.service_requests
     SET team_reply = p_reply,
         status = CASE WHEN status = 'pending' THEN 'in_progress' ELSE status END
   WHERE id = p_request_id
     AND assigned_team_id = v_my_team;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'request_not_yours');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.support_team_save_reply(uuid, text) TO authenticated;


-- support_team_mark_resolved — atomic save reply + resolve.
CREATE OR REPLACE FUNCTION public.support_team_mark_resolved(
  p_request_id uuid,
  p_reply text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_my_team uuid;
BEGIN
  IF v_me IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  IF p_reply IS NULL OR length(trim(p_reply)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'empty_reply');
  END IF;

  SELECT id INTO v_my_team FROM public.support_teams WHERE claimed_by_profile_id = v_me;
  IF v_my_team IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_team_seat');
  END IF;

  UPDATE public.service_requests
     SET team_reply       = p_reply,
         team_resolved_at = now(),
         status           = 'resolved'
   WHERE id = p_request_id
     AND assigned_team_id = v_my_team;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'request_not_yours');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.support_team_mark_resolved(uuid, text) TO authenticated;


-- delete_my_support_account — release the seat and delete the profile row.
-- The auth.users row stays orphaned (admin can clean up later); without a
-- profile the AuthContext will refuse to log them back in.
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

  -- ON DELETE SET NULL on support_teams.claimed_by_profile_id will run as
  -- part of the profile delete, but we explicitly NULL it first so the
  -- timing is obvious if anything goes wrong below.
  UPDATE public.support_teams
     SET claimed_by_profile_id = NULL
   WHERE claimed_by_profile_id = v_me;

  DELETE FROM public.profiles WHERE id = v_me;

  RETURN jsonb_build_object('ok', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.delete_my_support_account() TO authenticated;


-- ---------------------------------------------------------------------
-- 6. RPC the admin uses — list teams with seat info + issue stats
--
-- Admin can read profiles already (via is_admin() RLS), but joining live
-- in the UI is awkward when service_requests has its own RLS too. This
-- RPC returns a clean shape: team + claimed-by member info + counts.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_support_teams_overview()
RETURNS TABLE (
  id                     uuid,
  name                   text,
  description            text,
  is_active              boolean,
  created_at             timestamptz,
  claimed_by_profile_id  uuid,
  member_first_name      text,
  member_last_name       text,
  member_email           text,
  member_mobile          text,
  total_assigned         int,
  total_resolved         int
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.description,
    t.is_active,
    t.created_at,
    t.claimed_by_profile_id,
    p.first_name,
    p.last_name,
    p.email,
    p.mobile_number,
    (SELECT count(*)::int FROM public.service_requests sr WHERE sr.assigned_team_id = t.id),
    (SELECT count(*)::int FROM public.service_requests sr WHERE sr.assigned_team_id = t.id AND sr.status = 'resolved')
  FROM public.support_teams t
  LEFT JOIN public.profiles p ON p.id = t.claimed_by_profile_id
  ORDER BY t.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_support_teams_overview() TO authenticated;


-- support_team_lookup_users — returns name/email/mobile for a list of user
-- ids, but only when the requests they own are routed to the caller's team.
-- Profiles RLS is "user can SELECT own profile only", so support-team
-- members can't join service_requests → profiles directly. This RPC does
-- the join under SECURITY DEFINER and is scoped by ownership of the team.
CREATE OR REPLACE FUNCTION public.support_team_lookup_users(p_user_ids uuid[])
RETURNS TABLE (
  id            uuid,
  first_name    text,
  last_name     text,
  full_name     text,
  email         text,
  mobile_number text
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_team uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;

  SELECT id INTO v_my_team
    FROM public.support_teams WHERE claimed_by_profile_id = auth.uid();
  IF v_my_team IS NULL THEN RETURN; END IF;

  -- Only return users that have at least one service_request routed to my team.
  RETURN QUERY
  SELECT DISTINCT
    p.id, p.first_name, p.last_name, p.full_name, p.email, p.mobile_number
  FROM public.profiles p
  WHERE p.id = ANY (p_user_ids)
    AND EXISTS (
      SELECT 1 FROM public.service_requests sr
       WHERE sr.user_id = p.id
         AND sr.assigned_team_id = v_my_team
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.support_team_lookup_users(uuid[]) TO authenticated;


-- admin_release_support_team — clear a seat (e.g. team member is unreachable).
-- Does NOT delete the team or the profile; just frees the seat for someone else.
CREATE OR REPLACE FUNCTION public.admin_release_support_team(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_admin');
  END IF;

  UPDATE public.support_teams
     SET claimed_by_profile_id = NULL
   WHERE id = p_team_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'team_not_found');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_release_support_team(uuid) TO authenticated;


-- ---------------------------------------------------------------------
-- 7. Realtime — admin assignment + team reply both flow live
-- ---------------------------------------------------------------------
DO $pub$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'service_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'support_teams'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_teams;
  END IF;
END $pub$;


-- ---------------------------------------------------------------------
-- 8. Verify
-- ---------------------------------------------------------------------
DO $verify$
DECLARE
  v_team_col   int;
  v_req_team   int;
  v_req_reply  int;
  v_req_resol  int;
BEGIN
  SELECT count(*) INTO v_team_col FROM information_schema.columns
   WHERE table_schema='public' AND table_name='support_teams' AND column_name='claimed_by_profile_id';
  SELECT count(*) INTO v_req_team FROM information_schema.columns
   WHERE table_schema='public' AND table_name='service_requests' AND column_name='assigned_team_id';
  SELECT count(*) INTO v_req_reply FROM information_schema.columns
   WHERE table_schema='public' AND table_name='service_requests' AND column_name='team_reply';
  SELECT count(*) INTO v_req_resol FROM information_schema.columns
   WHERE table_schema='public' AND table_name='service_requests' AND column_name='team_resolved_at';
  RAISE NOTICE
    'Support-team auth ready — claim col=%, assigned_team_id=%, team_reply=%, team_resolved_at=%',
    v_team_col, v_req_team, v_req_reply, v_req_resol;
END $verify$;
