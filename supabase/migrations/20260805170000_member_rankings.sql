-- =====================================================================
-- 20260805170000 — Digital Army leaderboards rank MEMBERS
--
-- Two boards, as before:
--   'country'  members in the caller's own country
--   'global'   members across the whole wing
--
-- This replaces chapter_rankings(). Ranking chapters was my suggestion
-- and it is not what the wing wants — members compete, not chapters.
--
-- WHAT A ROW MAY CONTAIN
--   place, display name, country, shares, clicks, is_me.
--
--   Nothing else. No email, no mobile, no city, no chapter, no
--   profile_id. City would narrow a person to a handful of members and
--   profile_id is a handle to every other table. A leaderboard needs a
--   name and a number; anything more is an unrelated disclosure riding
--   along with a feature.
--
-- ONLY MEMBERS WHO ACTUALLY SHARED
--   A board listing everyone would publish who has done nothing, which
--   is both useless and unkind. Zero-activity members are absent, not
--   ranked last.
--
-- SCOPE
--   'country' is always the CALLER'S country. There is no parameter to
--   request another one.
--
-- THE NUMBERS UNDERSTATE
--   Clicks are counted at most once per link per hour — a deliberate
--   floor against inflation. total_clicks travels with every row so the
--   UI can say "too early to rank" instead of ordering noise.
-- =====================================================================

DROP FUNCTION IF EXISTS public.chapter_rankings(text);

CREATE OR REPLACE FUNCTION public.member_rankings(p_scope text DEFAULT 'country')
RETURNS TABLE (
  place        int,
  display_name text,
  country      text,
  shares       bigint,
  clicks       bigint,
  is_me        boolean,
  total_clicks bigint,
  ranked       bigint
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
  scoped AS (
    SELECT sc.profile_id, sc.shares, sc.clicks,
           -- Fall back through the name fields so a member with only a
           -- first name still appears as a person rather than blank.
           coalesce(
             nullif(btrim(p.full_name), ''),
             nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''),
             'A member'
           ) AS display_name,
           p.country_of_residence AS country,
           sc.profile_id = auth.uid() AS is_me
      FROM scored sc
      JOIN public.profiles p ON p.id = sc.profile_id
     WHERE (sc.shares > 0 OR sc.clicks > 0)
       AND (p_scope = 'global'
            OR (v_country IS NOT NULL AND p.country_of_residence = v_country))
  )
  SELECT (rank() OVER (ORDER BY s.clicks DESC, s.shares DESC, s.display_name))::int,
         s.display_name, s.country, s.shares, s.clicks, s.is_me,
         (sum(s.clicks) OVER ())::bigint,
         (count(*) OVER ())::bigint
    FROM scoped s
   ORDER BY s.clicks DESC, s.shares DESC, s.display_name
   LIMIT 100;   -- a leaderboard, not a directory
END $$;

REVOKE ALL ON FUNCTION public.member_rankings(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.member_rankings(text) TO authenticated;

COMMENT ON FUNCTION public.member_rankings(text) IS
  'Digital Army leaderboards. Returns place, display name, country and '
  'score only — never email, mobile, city, chapter or profile_id. '
  'country scope is always the caller''s own. Members with no activity '
  'are omitted rather than ranked last.';

DO $$
DECLARE leaky text;
BEGIN
  -- The whole design rests on the returned shape. Assert it here so a
  -- later edit that adds a column has to notice.
  SELECT string_agg(a.attname, ', ') INTO leaky
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN LATERAL unnest(p.proargnames) WITH ORDINALITY AS a(attname, ord)
   WHERE n.nspname = 'public' AND p.proname = 'member_rankings'
     AND a.attname IN ('email','mobile_number','phone','city_abroad',
                       'profile_id','id','chapter_id','dob');
  IF leaky IS NOT NULL THEN
    RAISE EXCEPTION 'member_rankings would expose: %', leaky;
  END IF;
  RAISE NOTICE 'member rankings ready';
END $$;
