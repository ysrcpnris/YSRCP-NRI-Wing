-- =====================================================================
-- 20260805112000 — working revoke, a real hierarchy, and a private roster
--
-- (1) REVOKE WAS COMPLETELY BROKEN
--   revoke_wing_role() set `is_active = false`. is_active is
--   GENERATED ALWAYS AS (revoked_at IS NULL), and Postgres refuses an
--   explicit write to a generated column:
--
--     428C9  column "is_active" can only be updated to DEFAULT
--
--   So revocation had never worked once. No test called it — the
--   authorization matrix covered granting and reading and never the one
--   operation that takes authority away.
--
-- (4) NO ROLE HIERARCHY
--   grant_wing_role() required only can_write_country(), so anyone with
--   country write scope could mint a country_coordinator. Proven: the
--   Germany cluster lead appointed a country coordinator, a rank above
--   their own. Both grant and revoke now compare ranks.
--
-- (5) admin_member_list() LEAKED PROTECTED COLUMNS
--   It returns dob and every family_* field, and authorised any role
--   with any scope. Confirmed on staging: the team-lead account
--   received rows including dob, family_name and family_mobile — fields
--   deliberately revoked from `authenticated` at the column level.
--
--   It is now admin-only. Coordinators get chapter_roster(), which has
--   never carried those columns.
--
-- (7) WRONG SUPPORT ROLE
--   set_member_role() accepted 'support'. The app uses 'support_team'
--   throughout, so the function could create a role the support route
--   does not recognise while rejecting the one it does.
-- =====================================================================

-- ── (1) + (4) revoke ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.revoke_wing_role(p_role_id uuid)
RETURNS TABLE (ok boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r public.member_roles;
BEGIN
  SELECT * INTO r FROM public.member_roles WHERE id = p_role_id;
  IF r.id IS NULL OR r.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT false, 'No such active role.'; RETURN;
  END IF;

  -- You cannot revoke a rank at or above your own.
  IF public.my_role_rank() >= public.role_rank(r.role::text)
     AND NOT public.has_global_scope() THEN
    RETURN QUERY SELECT false,
      'That role is at or above your own level.'; RETURN;
  END IF;

  IF r.role = 'cluster_lead' THEN
    IF NOT public.can_write_cluster(r.cluster_id) THEN
      RETURN QUERY SELECT false, 'That chapter is outside the ones you cover.'; RETURN;
    END IF;
  ELSIF r.role <> 'secretariat' THEN
    IF NOT public.can_write_country(r.country) THEN
      RETURN QUERY SELECT false, 'That country is outside the ones you cover.'; RETURN;
    END IF;
  ELSIF NOT public.has_global_scope() THEN
    RETURN QUERY SELECT false, 'Only a wing administrator can revoke secretariat.'; RETURN;
  END IF;

  -- revoked_at only. is_active is generated from it, and writing to a
  -- generated column throws 428C9 — which is what made this function
  -- fail every time it was called.
  UPDATE public.member_roles SET revoked_at = now() WHERE id = p_role_id;

  INSERT INTO public.admin_overrides (actor_id, table_name, row_id, action, country)
  VALUES (auth.uid(), 'member_roles', r.profile_id, 'revoke:' || r.role::text, r.country);

  RETURN QUERY SELECT true, 'Role revoked.';
END $$;

-- ── (4) grant, with rank and cluster scope ───────────────────────────
CREATE OR REPLACE FUNCTION public.grant_wing_role(
  p_profile_id uuid,
  p_role       text,
  p_country    text DEFAULT NULL,
  p_cluster_id uuid DEFAULT NULL,
  p_title      text DEFAULT NULL
)
RETURNS TABLE (ok boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_cluster_country text;
BEGIN
  IF p_role NOT IN ('secretariat','country_coordinator','cluster_lead','team_lead') THEN
    RETURN QUERY SELECT false, format('Unknown role: %s', p_role); RETURN;
  END IF;

  -- Never appoint at or above your own rank. Admin/secretariat (rank 1)
  -- is the only caller who may create rank 1 or 2.
  IF NOT public.has_global_scope()
     AND public.my_role_rank() >= public.role_rank(p_role) THEN
    RETURN QUERY SELECT false,
      'You can only appoint roles below your own level.'; RETURN;
  END IF;

  IF p_role = 'secretariat' AND NOT public.has_global_scope() THEN
    RETURN QUERY SELECT false, 'Only a wing administrator can appoint secretariat.'; RETURN;
  END IF;

  IF p_role = 'cluster_lead' THEN
    IF p_cluster_id IS NULL THEN
      RETURN QUERY SELECT false, 'A chapter lead needs a chapter.'; RETURN;
    END IF;
    IF NOT public.can_write_cluster(p_cluster_id) THEN
      RETURN QUERY SELECT false, 'That chapter is outside the ones you cover.'; RETURN;
    END IF;
    SELECT country INTO v_cluster_country FROM public.clusters WHERE id = p_cluster_id;
    IF v_cluster_country IS DISTINCT FROM p_country THEN
      RETURN QUERY SELECT false, 'That chapter is not in that country.'; RETURN;
    END IF;
  ELSIF p_role <> 'secretariat' THEN
    IF p_country IS NULL THEN
      RETURN QUERY SELECT false, 'That role needs a country.'; RETURN;
    END IF;
    IF NOT public.can_write_country(p_country) THEN
      RETURN QUERY SELECT false, 'That country is outside the ones you cover.'; RETURN;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.member_roles
     WHERE profile_id = p_profile_id AND role = p_role::public.wing_role
       AND country IS NOT DISTINCT FROM
           CASE WHEN p_role='secretariat' THEN NULL ELSE p_country END
       AND revoked_at IS NULL
  ) THEN
    RETURN QUERY SELECT false, 'They already hold that role there.'; RETURN;
  END IF;

  INSERT INTO public.member_roles
    (profile_id, role, country, cluster_id, title, granted_by)
  VALUES (p_profile_id, p_role::public.wing_role,
          CASE WHEN p_role = 'secretariat' THEN NULL ELSE p_country END,
          CASE WHEN p_role = 'cluster_lead' THEN p_cluster_id END,
          nullif(btrim(p_title), ''), auth.uid());

  INSERT INTO public.admin_overrides (actor_id, table_name, row_id, action, country)
  VALUES (auth.uid(), 'member_roles', p_profile_id, 'grant:' || p_role, p_country);

  RETURN QUERY SELECT true, 'Role granted.';
END $$;

-- ── (7) the role the app actually uses ───────────────────────────────
CREATE OR REPLACE FUNCTION public.set_member_role(
  p_profile_id uuid,
  p_role       text
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN false;
  END IF;
  -- 'support_team' is what src/ and the support route use throughout;
  -- 'support' was a value nothing recognised.
  IF p_role NOT IN ('user', 'admin', 'support_team') THEN
    RAISE EXCEPTION 'unknown role: %', p_role;
  END IF;
  IF p_profile_id = auth.uid() AND p_role <> 'admin' THEN
    RAISE EXCEPTION 'an admin cannot remove their own admin role';
  END IF;

  UPDATE public.profiles SET role = p_role WHERE id = p_profile_id;
  INSERT INTO public.admin_overrides (actor_id, table_name, row_id, action, country)
  VALUES (auth.uid(), 'profiles', p_profile_id, 'set_role:' || p_role, NULL);
  RETURN true;
END $$;

-- ── (5) admin_member_list is admin-only ──────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_member_list(
  p_search text DEFAULT NULL,
  p_limit  int  DEFAULT 200,
  p_offset int  DEFAULT 0
)
RETURNS TABLE (
  id uuid, public_user_code text, first_name text, last_name text,
  full_name text, email text, mobile_number text, whatsapp_number text,
  gender text, dob text, contribution text, profession text,
  organization text, designation text,
  country_of_residence text, state_abroad text, city_abroad text,
  indian_state text, district text, assembly_constituency text,
  mandal text, village text,
  family_relation text, family_name text, family_mobile text,
  family_village text, family_designation text,
  referral_code text, referred_by text,
  role text, status text, onboarding_completed_at timestamptz,
  created_at timestamptz, total_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Admin only. This function returns dob and every family_* column —
  -- the exact fields revoked from `authenticated` at the column level —
  -- so authorising it by "any scope" handed them to coordinators, and
  -- to team leads, who are read-only functional appointees.
  IF NOT public.has_global_scope() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id, p.public_user_code, p.first_name, p.last_name, p.full_name,
         p.email, p.mobile_number, p.whatsapp_number, p.gender, p.dob,
         p.contribution, p.profession, p.organization, p.designation,
         p.country_of_residence, p.state_abroad, p.city_abroad,
         p.indian_state, p.district, p.assembly_constituency,
         p.mandal, p.village,
         p.family_relation, p.family_name, p.family_mobile,
         p.family_village, p.family_designation,
         p.referral_code, p.referred_by,
         p.role, p.status, p.onboarding_completed_at, p.created_at,
         count(*) OVER ()
    FROM public.profiles p
   WHERE (
       p_search IS NULL OR btrim(p_search) = ''
       OR p.full_name     ILIKE '%' || btrim(p_search) || '%'
       OR p.email         ILIKE '%' || btrim(p_search) || '%'
       OR p.mobile_number ILIKE '%' || btrim(p_search) || '%'
       OR p.city_abroad   ILIKE '%' || btrim(p_search) || '%'
     )
   ORDER BY p.created_at DESC
   LIMIT greatest(1, least(coalesce(p_limit, 200), 2000))
  OFFSET greatest(0, coalesce(p_offset, 0));
END $$;

REVOKE ALL ON FUNCTION public.admin_member_list(text, int, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_member_list(text, int, int) TO authenticated;

COMMENT ON FUNCTION public.admin_member_list(text, int, int) IS
  'ADMIN ONLY. Returns dob and family_* — columns revoked from the '
  'authenticated role. Coordinators use chapter_roster(), which has '
  'never carried them.';
