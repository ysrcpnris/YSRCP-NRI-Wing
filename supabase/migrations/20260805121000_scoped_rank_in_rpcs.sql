-- =====================================================================
-- 20260805121000 — grant/revoke use rank computed for the target scope
--
-- my_role_rank() answered "the best rank you hold anywhere". Combined
-- with a separate scope check, someone who is a country coordinator in
-- Germany and a chapter lead in the USA could present coordinator rank
-- (2) against USA cluster scope and appoint another chapter lead there,
-- a rank they do not hold in that country.
--
-- Rank is now asked of the scope being acted on: my_rank_in_country()
-- or my_rank_in_cluster(). Authority and scope are answered by the same
-- question rather than two that can be mixed.
-- =====================================================================

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
DECLARE v_cluster_country text; v_rank int;
BEGIN
  IF p_role NOT IN ('secretariat','country_coordinator','cluster_lead','team_lead') THEN
    RETURN QUERY SELECT false, format('Unknown role: %s', p_role); RETURN;
  END IF;

  IF p_role = 'secretariat' THEN
    IF NOT public.has_global_scope() THEN
      RETURN QUERY SELECT false, 'Only a wing administrator can appoint secretariat.'; RETURN;
    END IF;

  ELSIF p_role = 'cluster_lead' THEN
    IF p_cluster_id IS NULL THEN
      RETURN QUERY SELECT false, 'A chapter lead needs a chapter.'; RETURN;
    END IF;
    SELECT country INTO v_cluster_country FROM public.clusters WHERE id = p_cluster_id;
    IF v_cluster_country IS DISTINCT FROM p_country THEN
      RETURN QUERY SELECT false, 'That chapter is not in that country.'; RETURN;
    END IF;
    v_rank := public.my_rank_in_cluster(p_cluster_id);
    IF v_rank >= public.role_rank(p_role) THEN
      RETURN QUERY SELECT false,
        'You can only appoint roles below your own level in that chapter.'; RETURN;
    END IF;
    IF NOT public.can_write_cluster(p_cluster_id) THEN
      RETURN QUERY SELECT false, 'That chapter is outside the ones you cover.'; RETURN;
    END IF;

  ELSIF p_role = 'team_lead' THEN
    IF p_country IS NULL THEN
      RETURN QUERY SELECT false, 'That role needs a country.'; RETURN;
    END IF;
    IF p_cluster_id IS NOT NULL THEN
      SELECT country INTO v_cluster_country FROM public.clusters WHERE id = p_cluster_id;
      IF v_cluster_country IS DISTINCT FROM p_country THEN
        RETURN QUERY SELECT false, 'That chapter is not in that country.'; RETURN;
      END IF;
      v_rank := public.my_rank_in_cluster(p_cluster_id);
      IF v_rank >= public.role_rank(p_role) THEN
        RETURN QUERY SELECT false,
          'You can only appoint roles below your own level in that chapter.'; RETURN;
      END IF;
      IF NOT public.can_write_cluster(p_cluster_id) THEN
        RETURN QUERY SELECT false, 'That chapter is outside the ones you cover.'; RETURN;
      END IF;
    ELSE
      v_rank := public.my_rank_in_country(p_country);
      IF v_rank >= public.role_rank(p_role) THEN
        RETURN QUERY SELECT false,
          'You can only appoint roles below your own level.'; RETURN;
      END IF;
      IF NOT public.can_write_country(p_country) THEN
        RETURN QUERY SELECT false,
          'You can appoint a team lead for your own chapter — choose one.'; RETURN;
      END IF;
    END IF;

  ELSE  -- country_coordinator
    IF p_country IS NULL THEN
      RETURN QUERY SELECT false, 'That role needs a country.'; RETURN;
    END IF;
    v_rank := public.my_rank_in_country(p_country);
    IF v_rank >= public.role_rank(p_role) THEN
      RETURN QUERY SELECT false,
        'You can only appoint roles below your own level in that country.'; RETURN;
    END IF;
    IF NOT public.can_write_country(p_country) THEN
      RETURN QUERY SELECT false, 'That country is outside the ones you cover.'; RETURN;
    END IF;
  END IF;

  -- A unique partial index now backs this, so a concurrent duplicate
  -- raises rather than slipping through the gap between check and
  -- insert. Report it the same way either path arrives.
  BEGIN
    INSERT INTO public.member_roles
      (profile_id, role, country, cluster_id, title, granted_by)
    VALUES (p_profile_id, p_role::public.wing_role,
            CASE WHEN p_role = 'secretariat' THEN NULL ELSE p_country END,
            CASE WHEN p_role IN ('cluster_lead','team_lead') THEN p_cluster_id END,
            nullif(btrim(p_title), ''), auth.uid());
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT false, 'They already hold that role there.'; RETURN;
  END;

  INSERT INTO public.admin_overrides (actor_id, table_name, row_id, action, country)
  VALUES (auth.uid(), 'member_roles', p_profile_id, 'grant:' || p_role, p_country);

  RETURN QUERY SELECT true, 'Role granted.';
END $$;

CREATE OR REPLACE FUNCTION public.revoke_wing_role(p_role_id uuid)
RETURNS TABLE (ok boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r public.member_roles; v_rank int;
BEGIN
  SELECT * INTO r FROM public.member_roles WHERE id = p_role_id;
  IF r.id IS NULL OR r.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT false, 'No such active role.'; RETURN;
  END IF;

  IF r.role = 'secretariat' THEN
    IF NOT public.has_global_scope() THEN
      RETURN QUERY SELECT false, 'Only a wing administrator can revoke secretariat.'; RETURN;
    END IF;
  ELSIF r.cluster_id IS NOT NULL THEN
    v_rank := public.my_rank_in_cluster(r.cluster_id);
    IF v_rank >= public.role_rank(r.role::text) THEN
      RETURN QUERY SELECT false, 'That role is at or above your own level there.'; RETURN;
    END IF;
    IF NOT public.can_write_cluster(r.cluster_id) THEN
      RETURN QUERY SELECT false, 'That chapter is outside the ones you cover.'; RETURN;
    END IF;
  ELSE
    v_rank := public.my_rank_in_country(r.country);
    IF v_rank >= public.role_rank(r.role::text) THEN
      RETURN QUERY SELECT false, 'That role is at or above your own level there.'; RETURN;
    END IF;
    IF NOT public.can_write_country(r.country) THEN
      RETURN QUERY SELECT false, 'That country is outside the ones you cover.'; RETURN;
    END IF;
  END IF;

  UPDATE public.member_roles SET revoked_at = now() WHERE id = p_role_id;

  INSERT INTO public.admin_overrides (actor_id, table_name, row_id, action, country)
  VALUES (auth.uid(), 'member_roles', r.profile_id, 'revoke:' || r.role::text, r.country);

  RETURN QUERY SELECT true, 'Role revoked.';
END $$;

-- (3) wing_roles_list excluded cluster-scoped authority, so a chapter
-- lead could create a role through the RPC and never see it again —
-- and therefore never revoke it.
-- Widening a RETURNS TABLE changes the signature, so it must be dropped.
DROP FUNCTION IF EXISTS public.wing_roles_list();
CREATE FUNCTION public.wing_roles_list()
RETURNS TABLE (
  role_id uuid, profile_id uuid, member_name text, email text,
  role text, country text, chapter text, cluster_id uuid,
  title text, granted_at timestamptz, granted_by_name text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT mr.id, p.id, p.full_name, p.email, mr.role::text, mr.country,
         cl.name, mr.cluster_id, mr.title, mr.granted_at, g.full_name
    FROM public.member_roles mr
    JOIN public.profiles p ON p.id = mr.profile_id
    LEFT JOIN public.clusters cl ON cl.id = mr.cluster_id
    LEFT JOIN public.profiles g ON g.id = mr.granted_by
   WHERE mr.revoked_at IS NULL
     AND (
       public.has_global_scope()
       OR public.can_write_country(mr.country)
       OR (mr.cluster_id IS NOT NULL AND public.can_write_cluster(mr.cluster_id))
     )
   ORDER BY mr.role, mr.country NULLS FIRST, p.full_name;
$$;

REVOKE ALL ON FUNCTION public.wing_roles_list() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.wing_roles_list() TO authenticated;
