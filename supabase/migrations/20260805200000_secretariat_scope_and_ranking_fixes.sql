-- =====================================================================
-- 20260805200000 — secretariat revoke, grant scopes, ranking accuracy
--
-- (1) SECRETARIAT COULD REVOKE ITS PEERS
--   Granting was tightened to is_admin(); revoking still used
--   has_global_scope(), which includes secretariat. So the role could
--   not create a peer but could remove one — while the message said
--   only an administrator may. Half a rule is worse than either half,
--   because the message is believed.
--
-- (2) COUNTRY OPTIONS CAME ONLY FROM chapters
--   Consequences: an admin could not appoint a coordinator for a
--   country that has members but no chapter yet; a coordinator in such
--   a country got no country options at all; and an existing
--   secretariat got chapter options but no country options, even though
--   grant_wing_role() would accept them.
--
--   Countries now come from members, chapters and the caller's own
--   active roles combined. Staging has no uncovered country today, so
--   this was latent — it becomes real the first time someone joins from
--   a country the wing has not organised.
--
-- (3) A MEMBER OUTSIDE THE TOP 100 COULD NOT SEE THEIR OWN STANDING
--   The board is capped at 100 and the UI looks for is_me among the
--   rows returned, while the panel claims to show your placing "even
--   when you are far down the table". Below 100 it showed nothing. The
--   caller's own row now always comes back.
--
-- (4) TIES WERE BROKEN BY NAME, INSIDE THE RANK
--   display_name sat inside rank(), so two members with identical
--   clicks and shares got different placings decided alphabetically.
--   Ranking is now on the score alone — genuine ties share a place —
--   and the name only orders the display.
--
--   total_clicks was also global on both tabs, so the "too early to
--   rank" notice judged a country board by worldwide activity. Both
--   figures are returned.
-- =====================================================================

-- ── (1) ──────────────────────────────────────────────────────────────
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
    -- is_admin(), matching grant_wing_role(). has_global_scope()
    -- includes secretariat, which let the role remove its own peers.
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

  INSERT INTO public.admin_overrides (actor_id, table_name, row_id, action, country)
  VALUES (auth.uid(), 'member_roles', r.profile_id, 'revoke:' || r.role::text, r.country);

  RETURN QUERY SELECT true, 'Role revoked.';
END $$;

REVOKE ALL ON FUNCTION public.revoke_wing_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_wing_role(uuid) TO authenticated;

-- ── (2) ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.my_grant_options()
RETURNS TABLE (
  scope_kind   text,
  country      text,
  chapter_id   uuid,
  chapter_name text,
  roles        text[]
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin  boolean := public.is_admin();
  v_global boolean := public.has_global_scope();
BEGIN
  -- Only an administrator appoints secretariat, matching the RPC.
  IF v_admin THEN
    RETURN QUERY SELECT 'global'::text, NULL::text, NULL::uuid, NULL::text,
                        ARRAY['secretariat']::text[];
  END IF;

  RETURN QUERY
  WITH countries AS (
    -- Every country the wing actually touches: where members live,
    -- where chapters exist, and where the caller holds a role. A
    -- country with members and no chapter is exactly where a
    -- coordinator most needs appointing.
    SELECT DISTINCT ctry FROM (
      SELECT country_of_residence AS ctry FROM public.profiles
       WHERE country_of_residence IS NOT NULL
      UNION
      SELECT country FROM public.chapters
      UNION
      SELECT country FROM public.member_roles
       WHERE profile_id = auth.uid() AND revoked_at IS NULL AND country IS NOT NULL
    ) x
     WHERE v_global OR ctry = ANY (public.my_write_countries())
  ),
  country_roles AS (
    SELECT c.ctry,
           array_remove(ARRAY[
             CASE WHEN public.my_rank_in_country(c.ctry)
                       < public.role_rank('country_coordinator')
                  THEN 'country_coordinator' END,
             CASE WHEN public.my_rank_in_country(c.ctry)
                       < public.role_rank('team_lead')
                  THEN 'team_lead' END
           ], NULL) AS grantable
      FROM countries c
  )
  SELECT 'country'::text, cr.ctry, NULL::uuid, NULL::text, cr.grantable
    FROM country_roles cr
   WHERE array_length(cr.grantable, 1) > 0
   ORDER BY cr.ctry;

  RETURN QUERY
  WITH chapter_roles AS (
    SELECT ch.id AS cid, ch.country AS ctry, ch.name AS cname,
           array_remove(ARRAY[
             CASE WHEN public.my_rank_in_chapter(ch.id)
                       < public.role_rank('chapter_lead')
                  THEN 'chapter_lead' END,
             CASE WHEN public.my_rank_in_chapter(ch.id)
                       < public.role_rank('team_lead')
                  THEN 'team_lead' END
           ], NULL) AS grantable
      FROM public.chapters ch
     WHERE v_global OR public.can_write_chapter(ch.id)
  )
  SELECT 'chapter'::text, chr.ctry, chr.cid, chr.cname, chr.grantable
    FROM chapter_roles chr
   WHERE array_length(chr.grantable, 1) > 0
   ORDER BY chr.ctry, chr.cname;
END $$;

REVOKE ALL ON FUNCTION public.my_grant_options() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_grant_options() TO authenticated;

-- ── (3) + (4) ────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.member_rankings(text);

CREATE FUNCTION public.member_rankings(p_scope text DEFAULT 'country')
RETURNS TABLE (
  country_place  int,
  global_place   int,
  display_name   text,
  country        text,
  shares         bigint,
  clicks         bigint,
  is_me          boolean,
  country_total  bigint,
  global_total   bigint,
  country_clicks bigint,
  global_clicks  bigint,
  beyond_top     boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_country text;
BEGIN
  IF p_scope NOT IN ('country', 'global') THEN
    RAISE EXCEPTION 'scope must be country or global, got %', p_scope;
  END IF;

  SELECT p.country_of_residence INTO v_country
    FROM public.profiles p WHERE p.id = auth.uid();

  RETURN QUERY
  WITH scored AS (
    SELECT s.profile_id,
           count(DISTINCT s.id) AS shares,
           count(k.id)          AS clicks
      FROM public.campaign_shares s
      LEFT JOIN public.campaign_clicks k ON k.share_id = s.id
     GROUP BY s.profile_id
  ),
  active AS (
    SELECT sc.profile_id, sc.shares, sc.clicks,
           coalesce(
             nullif(btrim(p.full_name), ''),
             nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''),
             'A member'
           ) AS display_name,
           p.country_of_residence AS ctry,
           sc.profile_id = auth.uid() AS is_me
      FROM scored sc
      JOIN public.profiles p ON p.id = sc.profile_id
     WHERE sc.shares > 0 OR sc.clicks > 0
  ),
  ranked AS (
    SELECT a.*,
           -- Score only. display_name used to sit inside rank(), so two
           -- members on identical numbers were separated alphabetically
           -- and told they were 4th and 5th. Genuine ties now share a
           -- place; the name only orders the display.
           (rank() OVER (PARTITION BY a.ctry ORDER BY a.clicks DESC, a.shares DESC))::int AS c_place,
           (rank() OVER (ORDER BY a.clicks DESC, a.shares DESC))::int                     AS g_place,
           (count(*) OVER (PARTITION BY a.ctry))::bigint  AS c_total,
           (count(*) OVER ())::bigint                     AS g_total,
           (sum(a.clicks) OVER (PARTITION BY a.ctry))::bigint AS c_clicks,
           (sum(a.clicks) OVER ())::bigint                    AS g_clicks
      FROM active a
  ),
  in_scope AS (
    SELECT r.* FROM ranked r
     WHERE p_scope = 'global'
        OR (v_country IS NOT NULL AND r.ctry = v_country)
  )
  SELECT i.c_place, i.g_place, i.display_name, i.ctry,
         i.shares, i.clicks, i.is_me,
         i.c_total, i.g_total, i.c_clicks, i.g_clicks,
         -- True when the caller's own row is only present because it was
         -- added back below the cut, so the UI can say "you are not in
         -- the top 100" rather than implying they are.
         i.is_me AND (CASE WHEN p_scope = 'global' THEN i.g_place ELSE i.c_place END) > 100
    FROM in_scope i
   -- Top 100 PLUS the caller, always. The panel promises your standing
   -- "even when you are far down the table"; capping at 100 broke that
   -- for everyone below it.
   WHERE (CASE WHEN p_scope = 'global' THEN i.g_place ELSE i.c_place END) <= 100
      OR i.is_me
   ORDER BY
     CASE WHEN p_scope = 'global' THEN i.g_place ELSE i.c_place END,
     i.display_name;
END $$;

REVOKE ALL ON FUNCTION public.member_rankings(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_rankings(text) TO authenticated;

-- ── hardening: new functions must not default to PUBLIC ──────────────
-- The sweep in 20260805190000 closed everything that existed. Without
-- this, the next CREATE FUNCTION re-opens the hole.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

DO $$
DECLARE body text;
BEGIN
  -- Assert on the CODE, with comment lines stripped. The first version
  -- of this check matched the word "has_global_scope" in the comment
  -- above that explains why it is no longer used, and failed the
  -- migration it was meant to protect.
  SELECT string_agg(l.line, E'\n') INTO body
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN LATERAL regexp_split_to_table(p.prosrc, E'\n') AS l(line)
   WHERE n.nspname = 'public'
     AND p.proname = 'revoke_wing_role'
     AND btrim(l.line) NOT LIKE '--%';

  IF body LIKE '%has_global_scope%' THEN
    RAISE EXCEPTION 'revoke_wing_role still calls has_global_scope';
  END IF;
  IF body NOT LIKE '%is_admin%' THEN
    RAISE EXCEPTION 'revoke_wing_role does not check is_admin';
  END IF;

  RAISE NOTICE 'secretariat, grant scopes and ranking corrected';
END $$;
