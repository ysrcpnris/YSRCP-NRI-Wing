-- =====================================================================
-- 20260805113000 — a team lead can belong to a chapter, not just a country
--
-- THE GAP THE HIERARCHY FIX EXPOSED
--   Once cluster_lead lost country-wide write authority (correctly), it
--   could no longer appoint anyone: team_lead's shape was
--   (country NOT NULL, cluster_id NULL), so creating one meant claiming
--   country authority the chapter lead does not have.
--
--   That contradicts the brief, which is explicit that a chapter lead
--   creates roles for their own chapter — "local to that chapter,
--   student assistance or something else in future".
--
-- THE MODEL
--   team_lead may now carry EITHER a country or a chapter:
--     country only   appointed by a coordinator; reads that country
--     with a chapter appointed by a chapter lead; reads that chapter
--
--   So a "Student Assistance Lead" can exist for Germany, or for the
--   Germany chapter specifically, and neither can see further than the
--   person who appointed them. Nobody can be given scope their
--   appointer does not hold.
--
--   Both remain read-only. Nothing here grants a team lead any write.
-- =====================================================================

ALTER TABLE public.member_roles DROP CONSTRAINT IF EXISTS member_roles_scope_ck;
ALTER TABLE public.member_roles ADD CONSTRAINT member_roles_scope_ck CHECK (
     (role = 'secretariat'         AND country IS NULL     AND cluster_id IS NULL)
  OR (role = 'country_coordinator' AND country IS NOT NULL AND cluster_id IS NULL)
  OR (role = 'cluster_lead'        AND country IS NOT NULL AND cluster_id IS NOT NULL)
  -- team_lead: a country, and optionally a chapter within it.
  OR (role = 'team_lead'           AND country IS NOT NULL)
);

-- A team lead scoped to a chapter reads that chapter, not the country.
CREATE OR REPLACE FUNCTION public.my_countries()
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT coalesce(array_agg(DISTINCT country), '{}')
    FROM public.member_roles
   WHERE profile_id = auth.uid()
     AND revoked_at IS NULL
     AND country IS NOT NULL
     AND (
       role IN ('secretariat', 'country_coordinator')
       -- country-wide team lead only when no chapter narrows them
       OR (role = 'team_lead' AND cluster_id IS NULL)
     );
$$;

CREATE OR REPLACE FUNCTION public.my_cluster_ids()
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT coalesce(array_agg(DISTINCT cluster_id), '{}')
    FROM public.member_roles
   WHERE profile_id = auth.uid()
     AND revoked_at IS NULL
     AND cluster_id IS NOT NULL
     AND role IN ('cluster_lead', 'team_lead');
$$;

-- grant_wing_role: a chapter lead may appoint a team lead inside their
-- own chapter. The rank check already stops them reaching higher.
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

  IF NOT public.has_global_scope()
     AND public.my_role_rank() >= public.role_rank(p_role) THEN
    RETURN QUERY SELECT false,
      'You can only appoint roles below your own level.'; RETURN;
  END IF;

  IF p_role = 'secretariat' THEN
    IF NOT public.has_global_scope() THEN
      RETURN QUERY SELECT false, 'Only a wing administrator can appoint secretariat.'; RETURN;
    END IF;

  ELSIF p_role = 'cluster_lead' THEN
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

  ELSIF p_role = 'team_lead' THEN
    IF p_country IS NULL THEN
      RETURN QUERY SELECT false, 'That role needs a country.'; RETURN;
    END IF;
    IF p_cluster_id IS NOT NULL THEN
      -- Chapter-scoped: a chapter lead can do this for their own chapter.
      IF NOT public.can_write_cluster(p_cluster_id) THEN
        RETURN QUERY SELECT false, 'That chapter is outside the ones you cover.'; RETURN;
      END IF;
      SELECT country INTO v_cluster_country FROM public.clusters WHERE id = p_cluster_id;
      IF v_cluster_country IS DISTINCT FROM p_country THEN
        RETURN QUERY SELECT false, 'That chapter is not in that country.'; RETURN;
      END IF;
    ELSE
      -- Country-wide: needs country authority, which a chapter lead
      -- does not have. They must name a chapter instead.
      IF NOT public.can_write_country(p_country) THEN
        RETURN QUERY SELECT false,
          'You can appoint a team lead for your own chapter — choose one.'; RETURN;
      END IF;
    END IF;

  ELSE   -- country_coordinator
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
       AND cluster_id IS NOT DISTINCT FROM p_cluster_id
       AND revoked_at IS NULL
  ) THEN
    RETURN QUERY SELECT false, 'They already hold that role there.'; RETURN;
  END IF;

  INSERT INTO public.member_roles
    (profile_id, role, country, cluster_id, title, granted_by)
  VALUES (p_profile_id, p_role::public.wing_role,
          CASE WHEN p_role = 'secretariat' THEN NULL ELSE p_country END,
          CASE WHEN p_role IN ('cluster_lead','team_lead') THEN p_cluster_id END,
          nullif(btrim(p_title), ''), auth.uid());

  INSERT INTO public.admin_overrides (actor_id, table_name, row_id, action, country)
  VALUES (auth.uid(), 'member_roles', p_profile_id, 'grant:' || p_role, p_country);

  RETURN QUERY SELECT true, 'Role granted.';
END $$;

-- revoke: a chapter lead may revoke a team lead inside their chapter.
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

  IF NOT public.has_global_scope()
     AND public.my_role_rank() >= public.role_rank(r.role::text) THEN
    RETURN QUERY SELECT false, 'That role is at or above your own level.'; RETURN;
  END IF;

  IF r.role = 'secretariat' THEN
    IF NOT public.has_global_scope() THEN
      RETURN QUERY SELECT false, 'Only a wing administrator can revoke secretariat.'; RETURN;
    END IF;
  ELSIF r.cluster_id IS NOT NULL THEN
    IF NOT public.can_write_cluster(r.cluster_id) THEN
      RETURN QUERY SELECT false, 'That chapter is outside the ones you cover.'; RETURN;
    END IF;
  ELSE
    IF NOT public.can_write_country(r.country) THEN
      RETURN QUERY SELECT false, 'That country is outside the ones you cover.'; RETURN;
    END IF;
  END IF;

  UPDATE public.member_roles SET revoked_at = now() WHERE id = p_role_id;

  INSERT INTO public.admin_overrides (actor_id, table_name, row_id, action, country)
  VALUES (auth.uid(), 'member_roles', r.profile_id, 'revoke:' || r.role::text, r.country);

  RETURN QUERY SELECT true, 'Role revoked.';
END $$;
