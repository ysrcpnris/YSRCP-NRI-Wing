-- =====================================================================
-- 20260805095500 — write to the audit columns that actually exist
--
-- grant_wing_role(), revoke_wing_role() and set_member_role() all
-- inserted into admin_overrides (actor_id, action, target_table,
-- target_id, detail). The table's columns are (actor_id, table_name,
-- row_id, action, country).
--
-- PL/pgSQL resolves column names at execution, not at CREATE FUNCTION,
-- so the migrations applied cleanly and every one of these would have
-- thrown the first time an admin used it. Exactly the failure mode this
-- review was about: applied is not the same as working.
-- =====================================================================

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
  IF p_role NOT IN ('user', 'admin', 'support') THEN
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
  IF p_role = 'secretariat' AND NOT public.has_global_scope() THEN
    RETURN QUERY SELECT false, 'Only a wing administrator can appoint secretariat.'; RETURN;
  END IF;
  IF p_role <> 'secretariat' AND NOT public.can_write_country(p_country) THEN
    RETURN QUERY SELECT false, 'That country is outside the ones you cover.'; RETURN;
  END IF;
  IF p_role = 'cluster_lead' AND p_cluster_id IS NULL THEN
    RETURN QUERY SELECT false, 'A cluster lead needs a chapter.'; RETURN;
  END IF;
  IF p_role IN ('country_coordinator','team_lead') AND p_country IS NULL THEN
    RETURN QUERY SELECT false, 'That role needs a country.'; RETURN;
  END IF;

  IF p_cluster_id IS NOT NULL THEN
    SELECT country INTO v_cluster_country FROM public.clusters WHERE id = p_cluster_id;
    IF v_cluster_country IS DISTINCT FROM p_country THEN
      RETURN QUERY SELECT false, 'That chapter is not in that country.'; RETURN;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.member_roles
     WHERE profile_id = p_profile_id AND role = p_role::public.wing_role
       AND country IS NOT DISTINCT FROM CASE WHEN p_role='secretariat' THEN NULL ELSE p_country END
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

CREATE OR REPLACE FUNCTION public.revoke_wing_role(p_role_id uuid)
RETURNS TABLE (ok boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r public.member_roles;
BEGIN
  SELECT * INTO r FROM public.member_roles WHERE id = p_role_id;
  IF r.id IS NULL THEN
    RETURN QUERY SELECT false, 'No such role.'; RETURN;
  END IF;
  IF r.role = 'secretariat' AND NOT public.has_global_scope() THEN
    RETURN QUERY SELECT false, 'Only a wing administrator can revoke secretariat.'; RETURN;
  END IF;
  IF r.role <> 'secretariat' AND NOT public.can_write_country(r.country) THEN
    RETURN QUERY SELECT false, 'That country is outside the ones you cover.'; RETURN;
  END IF;

  UPDATE public.member_roles SET revoked_at = now(), is_active = false
   WHERE id = p_role_id;

  INSERT INTO public.admin_overrides (actor_id, table_name, row_id, action, country)
  VALUES (auth.uid(), 'member_roles', r.profile_id, 'revoke:' || r.role::text, r.country);

  RETURN QUERY SELECT true, 'Role revoked.';
END $$;
