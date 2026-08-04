-- =====================================================================
-- 20260805171000 — every member carries BOTH ranks
--
-- The previous version returned two separate lists and a member had one
-- rank in whichever list they were looking at. What the wing wants is a
-- member holding two positions at once:
--
--     "You are #3 in Germany and #47 worldwide."
--
-- So both ranks are computed for every member and travel on the same
-- row. The country board and the global board then differ only in who
-- is listed — the numbers on a person do not change between them.
--
-- WHAT A ROW MAY CONTAIN
--   country_place, global_place, display name, country, shares, clicks,
--   is_me. Nothing else — no email, mobile, city, chapter or
--   profile_id. A leaderboard needs a name, a place and a number.
--
-- Members with no activity are omitted rather than ranked last.
-- 'country' scope is always the caller's own; there is no parameter to
-- request another.
-- =====================================================================

DROP FUNCTION IF EXISTS public.member_rankings(text);

CREATE OR REPLACE FUNCTION public.member_rankings(p_scope text DEFAULT 'country')
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
  total_clicks   bigint
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
           p.country_of_residence AS country,
           sc.profile_id = auth.uid() AS is_me
      FROM scored sc
      JOIN public.profiles p ON p.id = sc.profile_id
     WHERE sc.shares > 0 OR sc.clicks > 0
  ),
  -- Both ranks computed over EVERY active member, so a person's numbers
  -- are the same whichever board they are seen on. PARTITION BY country
  -- gives the national placing; the unpartitioned window gives the
  -- worldwide one.
  ranked AS (
    SELECT a.*,
           (rank() OVER (PARTITION BY a.country
                         ORDER BY a.clicks DESC, a.shares DESC, a.display_name))::int AS c_place,
           (rank() OVER (ORDER BY a.clicks DESC, a.shares DESC, a.display_name))::int AS g_place,
           (count(*) OVER (PARTITION BY a.country))::bigint AS c_total,
           (count(*) OVER ())::bigint                       AS g_total,
           (sum(a.clicks) OVER ())::bigint                  AS all_clicks
      FROM active a
  )
  SELECT r.c_place, r.g_place, r.display_name, r.country,
         r.shares, r.clicks, r.is_me,
         r.c_total, r.g_total, r.all_clicks
    FROM ranked r
   WHERE p_scope = 'global'
      OR (v_country IS NOT NULL AND r.country = v_country)
   ORDER BY
     CASE WHEN p_scope = 'global' THEN r.g_place ELSE r.c_place END,
     r.display_name
   LIMIT 100;
END $$;

REVOKE ALL ON FUNCTION public.member_rankings(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.member_rankings(text) TO authenticated;

COMMENT ON FUNCTION public.member_rankings(text) IS
  'Digital Army leaderboard. Every member carries both a country place '
  'and a global place, so the numbers on a person do not change between '
  'the two boards. Returns name, country and score only — never email, '
  'mobile, city, chapter or profile_id.';

DO $$
DECLARE leaky text;
BEGIN
  SELECT string_agg(a.attname, ', ') INTO leaky
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN LATERAL unnest(p.proargnames) AS a(attname)
   WHERE n.nspname = 'public' AND p.proname = 'member_rankings'
     AND a.attname IN ('email','mobile_number','phone','city_abroad',
                       'profile_id','id','chapter_id','dob');
  IF leaky IS NOT NULL THEN
    RAISE EXCEPTION 'member_rankings would expose: %', leaky;
  END IF;
  RAISE NOTICE 'member rankings carry both places';
END $$;
