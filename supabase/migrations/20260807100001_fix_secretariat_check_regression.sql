-- =====================================================================
-- 20260807100001 — grant_wing_role/revoke_wing_role: fix a regression
-- introduced by 20260807100000 itself.
--
-- 20260807100000 added p_reason by diffing against 20260805150000's
-- body, which predates 20260805200000's fix ("secretariat could revoke
-- its own peers because revoke_wing_role checked has_global_scope(),
-- not is_admin()") and 20260805180000's matching fix on the grant side.
-- The result silently reintroduced both bugs — caught immediately by
-- auth-matrix.sh ("secretariat cannot revoke a peer secretariat" and
-- the grant-options fallout it caused both failed on the first run
-- after 20260807100000 was pushed).
--
-- 20260807100000's source file has been corrected in place so a fresh
-- database applies the right thing from the start, but supabase db
-- push does not re-run an already-applied migration — this file is
-- what actually fixes the currently-deployed function. Content is
-- identical to what 20260807100000 now contains; only DROP FUNCTION
-- and REVOKE/GRANT are omitted since the 6-arg signatures already
-- exist and do not need re-declaring.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.grant_wing_role(
  p_profile_id uuid, p_role text, p_country text DEFAULT NULL::text,
  p_chapter_id uuid DEFAULT NULL::uuid, p_title text DEFAULT NULL::text,
  p_reason text DEFAULT NULL::text
)
RETURNS TABLE(ok boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_chapter_country text; v_rank int;
BEGIN
  IF p_role NOT IN ('secretariat','country_coordinator','chapter_lead','team_lead') THEN
    RETURN QUERY SELECT false, format('Unknown role: %s', p_role); RETURN;
  END IF;

  IF p_role = 'secretariat' THEN
    IF NOT public.is_admin() THEN
      RETURN QUERY SELECT false, 'Only a wing administrator can appoint secretariat.'; RETURN;
    END IF;

  ELSIF p_role = 'chapter_lead' THEN
    IF p_chapter_id IS NULL THEN
      RETURN QUERY SELECT false, 'A chapter lead needs a chapter.'; RETURN;
    END IF;
    SELECT country INTO v_chapter_country FROM public.chapters WHERE id = p_chapter_id;
    IF v_chapter_country IS DISTINCT FROM p_country THEN
      RETURN QUERY SELECT false, 'That chapter is not in that country.'; RETURN;
    END IF;
    v_rank := public.my_rank_in_chapter(p_chapter_id);
    IF v_rank >= public.role_rank(p_role) THEN
      RETURN QUERY SELECT false,
        'You can only appoint roles below your own level in that chapter.'; RETURN;
    END IF;
    IF NOT public.can_write_chapter(p_chapter_id) THEN
      RETURN QUERY SELECT false, 'That chapter is outside the ones you cover.'; RETURN;
    END IF;

  ELSIF p_role = 'team_lead' THEN
    IF p_country IS NULL THEN
      RETURN QUERY SELECT false, 'That role needs a country.'; RETURN;
    END IF;
    IF p_chapter_id IS NOT NULL THEN
      SELECT country INTO v_chapter_country FROM public.chapters WHERE id = p_chapter_id;
      IF v_chapter_country IS DISTINCT FROM p_country THEN
        RETURN QUERY SELECT false, 'That chapter is not in that country.'; RETURN;
      END IF;
      v_rank := public.my_rank_in_chapter(p_chapter_id);
      IF v_rank >= public.role_rank(p_role) THEN
        RETURN QUERY SELECT false,
          'You can only appoint roles below your own level in that chapter.'; RETURN;
      END IF;
      IF NOT public.can_write_chapter(p_chapter_id) THEN
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

  BEGIN
    INSERT INTO public.member_roles
      (profile_id, role, country, chapter_id, title, granted_by, reason)
    VALUES (p_profile_id, p_role::public.wing_role,
            CASE WHEN p_role = 'secretariat' THEN NULL ELSE p_country END,
            CASE WHEN p_role IN ('chapter_lead','team_lead') THEN p_chapter_id END,
            nullif(btrim(p_title), ''), auth.uid(), nullif(btrim(coalesce(p_reason, '')), ''));
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT false, 'They already hold that role there.'; RETURN;
  END;

  INSERT INTO public.admin_overrides (actor_id, table_name, row_id, action, country, detail)
  VALUES (auth.uid(), 'member_roles', p_profile_id, 'grant:' || p_role, p_country, p_reason);

  RETURN QUERY SELECT true, 'Role granted.';
END $$;

CREATE OR REPLACE FUNCTION public.revoke_wing_role(p_role_id uuid, p_reason text DEFAULT NULL::text)
RETURNS TABLE(ok boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r public.member_roles; v_rank int;
BEGIN
  SELECT * INTO r FROM public.member_roles WHERE id = p_role_id;
  IF r.id IS NULL OR r.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT false, 'No such active role.'; RETURN;
  END IF;

  IF r.role = 'secretariat' THEN
    IF NOT public.is_admin() THEN
      RETURN QUERY SELECT false, 'Only a wing administrator can revoke secretariat.'; RETURN;
    END IF;
  ELSIF r.chapter_id IS NOT NULL THEN
    v_rank := public.my_rank_in_chapter(r.chapter_id);
    IF v_rank >= public.role_rank(r.role::text) THEN
      RETURN QUERY SELECT false, 'That role is at or above your own level there.'; RETURN;
    END IF;
    IF NOT public.can_write_chapter(r.chapter_id) THEN
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

  INSERT INTO public.admin_overrides (actor_id, table_name, row_id, action, country, detail)
  VALUES (auth.uid(), 'member_roles', r.profile_id::text, 'revoke:' || r.role::text, r.country, p_reason);

  RETURN QUERY SELECT true, 'Role revoked.';
END $$;

DO $$
BEGIN
  RAISE NOTICE 'secretariat self-revoke/self-clone regression fixed';
END $$;
