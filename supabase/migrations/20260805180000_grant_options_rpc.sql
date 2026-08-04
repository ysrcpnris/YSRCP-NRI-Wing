-- =====================================================================
-- 20260805180000 — the server says what a caller may appoint, and where
--
-- RoleManager reconstructed capability from my_role_rank(), a single
-- GLOBAL number, while grant_wing_role() computes rank for the TARGET
-- scope. Three consequences:
--
--   · A Germany coordinator who also leads a USA chapter was offered
--     USA operations the database correctly refuses — they hold rank 2
--     in Germany and rank 3 in the USA.
--   · Anyone at rank <= 2 was treated as covering every chapter.
--   · Secretariat could never be appointed at all: it is rank 1 and the
--     filter was `role.rank > myRank`, so an admin at rank 1 failed
--     `1 > 1`. A functional bug, invisible to the matrix because the
--     matrix tests the database, which allows it.
--
-- One RPC now returns the legal combinations. The client renders what
-- it is given rather than deriving anything.
--
-- SECRETARIAT IS TIGHTENED TO ADMIN
--   grant_wing_role() allowed anyone with has_global_scope() to appoint
--   secretariat — and has_global_scope() includes existing secretariat
--   members, so the role could replicate itself without an
--   administrator. Now is_admin() only. That is the narrower reading of
--   "only a wing administrator can appoint secretariat", which is what
--   the message already claimed.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.my_grant_options()
RETURNS TABLE (
  scope_kind   text,      -- 'global' | 'country' | 'chapter'
  country      text,
  chapter_id   uuid,
  chapter_name text,
  roles        text[]     -- what may be granted in THIS scope
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_admin boolean := public.is_admin();
BEGIN
  -- Global: appointing secretariat, which is administrators only.
  IF v_admin THEN
    RETURN QUERY SELECT 'global'::text, NULL::text, NULL::uuid, NULL::text,
                        ARRAY['secretariat']::text[];
  END IF;

  -- Countries. An admin may act in every country that has members or
  -- chapters; everyone else only where they hold country authority.
  RETURN QUERY
  SELECT 'country'::text, c.country, NULL::uuid, NULL::text,
         array_remove(ARRAY[
           CASE WHEN public.my_rank_in_country(c.country)
                     < public.role_rank('country_coordinator')
                THEN 'country_coordinator' END,
           CASE WHEN public.my_rank_in_country(c.country)
                     < public.role_rank('team_lead')
                THEN 'team_lead' END
         ], NULL)
    FROM (
      SELECT DISTINCT country FROM public.chapters
       WHERE v_admin OR country = ANY (public.my_write_countries())
    ) c
   WHERE array_length(array_remove(ARRAY[
           CASE WHEN public.my_rank_in_country(c.country)
                     < public.role_rank('country_coordinator')
                THEN 'country_coordinator' END,
           CASE WHEN public.my_rank_in_country(c.country)
                     < public.role_rank('team_lead')
                THEN 'team_lead' END
         ], NULL), 1) > 0;

  -- Chapters. Rank is asked of the chapter, not of the caller overall,
  -- which is the whole point — a chapter lead in one country holds no
  -- authority in another.
  RETURN QUERY
  SELECT 'chapter'::text, ch.country, ch.id, ch.name,
         array_remove(ARRAY[
           CASE WHEN public.my_rank_in_chapter(ch.id)
                     < public.role_rank('chapter_lead')
                THEN 'chapter_lead' END,
           CASE WHEN public.my_rank_in_chapter(ch.id)
                     < public.role_rank('team_lead')
                THEN 'team_lead' END
         ], NULL)
    FROM public.chapters ch
   WHERE public.can_write_chapter(ch.id)
     AND array_length(array_remove(ARRAY[
           CASE WHEN public.my_rank_in_chapter(ch.id)
                     < public.role_rank('chapter_lead')
                THEN 'chapter_lead' END,
           CASE WHEN public.my_rank_in_chapter(ch.id)
                     < public.role_rank('team_lead')
                THEN 'team_lead' END
         ], NULL), 1) > 0
   ORDER BY 2, 4;
END $$;

REVOKE ALL ON FUNCTION public.my_grant_options() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_grant_options() TO authenticated;

COMMENT ON FUNCTION public.my_grant_options() IS
  'Legal (scope, roles) combinations for the caller, with rank computed '
  'per scope. The client renders these rather than deriving capability '
  'from a single global rank, which offered operations the database '
  'then refused.';

-- Secretariat: administrators only, not anyone with global scope.
CREATE OR REPLACE FUNCTION public.grant_wing_role(
  p_profile_id uuid,
  p_role       text,
  p_country    text DEFAULT NULL,
  p_chapter_id uuid DEFAULT NULL,
  p_title      text DEFAULT NULL
)
RETURNS TABLE (ok boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_chapter_country text; v_rank int;
BEGIN
  IF p_role NOT IN ('secretariat','country_coordinator','chapter_lead','team_lead') THEN
    RETURN QUERY SELECT false, format('Unknown role: %s', p_role); RETURN;
  END IF;

  IF p_role = 'secretariat' THEN
    -- is_admin(), not has_global_scope(): the latter includes existing
    -- secretariat, letting the role replicate itself.
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
      (profile_id, role, country, chapter_id, title, granted_by)
    VALUES (p_profile_id, p_role::public.wing_role,
            CASE WHEN p_role = 'secretariat' THEN NULL ELSE p_country END,
            CASE WHEN p_role IN ('chapter_lead','team_lead') THEN p_chapter_id END,
            nullif(btrim(p_title), ''), auth.uid());
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT false, 'They already hold that role there.'; RETURN;
  END;

  INSERT INTO public.admin_overrides (actor_id, table_name, row_id, action, country)
  VALUES (auth.uid(), 'member_roles', p_profile_id, 'grant:' || p_role, p_country);

  RETURN QUERY SELECT true, 'Role granted.';
END $$;

REVOKE ALL ON FUNCTION public.grant_wing_role(uuid, text, text, uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.grant_wing_role(uuid, text, text, uuid, text) TO authenticated;
