-- =====================================================================
-- 20260805140000 — Digital Army chapter rankings
--
-- Two rankings, both over CHAPTERS:
--   'country'  chapters inside the caller's own country
--   'global'   every chapter in the wing
--
-- WHY CHAPTERS AND NOT MEMBERS
--   A member leaderboard would name individuals by their political
--   activity. Around 700 members are in the EU, where political opinion
--   is an Article 9 special category, and the whole Digital Army design
--   exists to avoid exactly that (20260804310000). Ranking chapters
--   creates the same competition and names nobody.
--
-- WHY NOT A CHAPTER-INTERNAL RANKING
--   Clicks are counted at most once per link per hour — a deliberate
--   floor against inflation. Below a certain volume that quantisation
--   dominates, so a ranking of a 40-member chapter would order noise.
--   Country is the smallest scope with enough signal.
--
-- HONEST NUMBERS
--   total_clicks travels with every row so the UI can say "too early to
--   rank" rather than presenting a leaderboard built on single digits.
--   Ranking makes people trust a number they would otherwise skim, so
--   the undercount has to stay visible.
--
-- SCOPE
--   'country' is always the CALLER'S country — there is no parameter to
--   ask for another one. 'global' is genuinely wing-wide, which is the
--   point of it.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.chapter_rankings(p_scope text DEFAULT 'country')
RETURNS TABLE (
  place        int,   -- 'position' is reserved in Postgres
  chapter      text,
  country      text,
  members      bigint,
  sharers      bigint,
  shares       bigint,
  clicks       bigint,
  is_mine      boolean,
  total_clicks bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_country text;
  v_cluster uuid;
BEGIN
  IF p_scope NOT IN ('country', 'global') THEN
    RAISE EXCEPTION 'scope must be country or global, got %', p_scope;
  END IF;

  SELECT p.country_of_residence,
         public.chapter_for_city(p.country_of_residence, p.city_abroad)
    INTO v_country, v_cluster
    FROM public.profiles p WHERE p.id = auth.uid();

  RETURN QUERY
  WITH member_chapter AS (
    SELECT p.id AS profile_id,
           public.chapter_for_city(p.country_of_residence, p.city_abroad) AS cluster_id
      FROM public.profiles p
  ),
  headcount AS (
    SELECT cluster_id, count(*) AS members
      FROM member_chapter WHERE cluster_id IS NOT NULL
     GROUP BY cluster_id
  ),
  activity AS (
    SELECT mc.cluster_id,
           count(DISTINCT s.profile_id) AS sharers,
           count(DISTINCT s.id)         AS shares,
           count(k.id)                  AS clicks
      FROM public.campaign_shares s
      JOIN member_chapter mc ON mc.profile_id = s.profile_id
      LEFT JOIN public.campaign_clicks k ON k.share_id = s.id
     WHERE mc.cluster_id IS NOT NULL
     GROUP BY mc.cluster_id
  ),
  scoped AS (
    -- LEFT JOIN from clusters so a chapter with no activity still
    -- appears at the bottom rather than vanishing. "You are last" is
    -- information; absence is confusing.
    SELECT cl.id, cl.name, cl.country,
           coalesce(h.members, 0) AS members,
           coalesce(a.sharers, 0) AS sharers,
           coalesce(a.shares, 0)  AS shares,
           coalesce(a.clicks, 0)  AS clicks
      FROM public.clusters cl
      LEFT JOIN headcount h ON h.cluster_id = cl.id
      LEFT JOIN activity  a ON a.cluster_id = cl.id
     WHERE p_scope = 'global'
        OR (v_country IS NOT NULL AND cl.country = v_country)
  )
  SELECT (rank() OVER (ORDER BY sc.clicks DESC, sc.shares DESC, sc.name))::int,
         sc.name, sc.country, sc.members, sc.sharers, sc.shares, sc.clicks,
         sc.id = v_cluster,
         -- sum() over bigint yields numeric; cast the whole window
         -- expression, not just its argument.
         (sum(sc.clicks) OVER ())::bigint
    FROM scoped sc
   ORDER BY sc.clicks DESC, sc.shares DESC, sc.name;
END $$;

REVOKE ALL ON FUNCTION public.chapter_rankings(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.chapter_rankings(text) TO authenticated;

COMMENT ON FUNCTION public.chapter_rankings(text) IS
  'Chapter rankings for Digital Army. Chapters only — never members, '
  'because a member leaderboard would name individuals by political '
  'activity. country scope is always the caller''s own; there is no '
  'parameter to request another country''s table.';
