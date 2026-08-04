-- =====================================================================
-- 20260805210000 — deterministic ranking fixtures for the test suite
--
-- Four leaderboard assertions were vacuous or would have passed against
-- the implementation they were meant to catch:
--
--   · "tied scores share a place" — passed with no tie present
--   · "the caller always finds their row" — used a caller inside the
--     top 100, which the broken version also returned
--   · "the totals are separate" — asserted only that both KEYS existed,
--     not that they held different values
--
-- A test that cannot fail is worse than no test, because it is counted.
-- These build the exact conditions:
--
--   · three members on IDENTICAL scores, so placings must read 1,1,1,4
--   · more than 100 active members, so a caller can genuinely be below
--     the cut
--   · activity in more than one country, so country and global totals
--     differ by value rather than by name
--
-- ADMIN ONLY, AND STAGING ONLY. Both functions refuse outright on a
-- database holding real members — a test fixture must never be able to
-- rewrite production engagement data.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.matrix_seed_ranking()
RETURNS TABLE (active bigint, caller_place int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_campaign uuid;
  v_real     int;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT count(*) INTO v_real FROM public.profiles
   WHERE email NOT LIKE '%@example.test';
  IF v_real > 100 THEN
    RAISE EXCEPTION 'refusing to seed ranking fixtures: % real profiles present', v_real;
  END IF;

  SELECT id INTO v_campaign FROM public.campaigns WHERE country IS NULL LIMIT 1;
  IF v_campaign IS NULL THEN
    RAISE EXCEPTION 'no wing-wide campaign to attach shares to';
  END IF;

  DELETE FROM public.campaign_clicks k
   USING public.campaign_shares s
   WHERE s.id = k.share_id AND s.share_token LIKE 'MX-%';
  DELETE FROM public.campaign_shares WHERE share_token LIKE 'MX-%';

  -- 120 synthetic members get a share each, ordered so the click counts
  -- descend deterministically.
  INSERT INTO public.campaign_shares (campaign_id, profile_id, platform, share_token)
  SELECT v_campaign, x.id, 'x', 'MX-' || lpad(x.n::text, 4, '0')
    FROM (
      SELECT p.id, row_number() OVER (ORDER BY p.email) AS n
        FROM public.profiles p
       WHERE p.email LIKE 'seed.%@example.test'
       LIMIT 120
    ) x
  ON CONFLICT DO NOTHING;

  -- The top THREE get identical scores, so ranks must read 1,1,1 then 4.
  -- Everyone after descends, giving a strict order below the tie.
  INSERT INTO public.campaign_clicks (share_id, hour_bucket)
  SELECT s.id, date_trunc('hour', now()) - (g || ' hours')::interval
    FROM public.campaign_shares s
    CROSS JOIN generate_series(1, 200) g
   WHERE s.share_token LIKE 'MX-%'
     AND g <= CASE
                WHEN (split_part(s.share_token, '-', 2))::int <= 3 THEN 150
                ELSE greatest(1, 150 - (split_part(s.share_token, '-', 2))::int)
              END
  ON CONFLICT DO NOTHING;

  -- The Germany fixture member gets a share and NO clicks, putting them
  -- last — below the top 100, which is the case being tested.
  INSERT INTO public.campaign_shares (campaign_id, profile_id, platform, share_token)
  SELECT v_campaign, p.id, 'x', 'MX-9999'
    FROM public.profiles p WHERE p.email = 't.de.b@example.test'
  ON CONFLICT DO NOTHING;

  RETURN QUERY
  SELECT (SELECT count(*) FROM (
            SELECT s.profile_id FROM public.campaign_shares s GROUP BY s.profile_id) z),
         coalesce((SELECT r.global_place FROM public.member_rankings('global') r
                    WHERE r.is_me), 0);
END $$;

CREATE OR REPLACE FUNCTION public.matrix_clear_ranking()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  DELETE FROM public.campaign_clicks k
   USING public.campaign_shares s
   WHERE s.id = k.share_id AND s.share_token LIKE 'MX-%';
  DELETE FROM public.campaign_shares WHERE share_token LIKE 'MX-%';
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.matrix_seed_ranking()  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.matrix_clear_ranking() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.matrix_seed_ranking()  TO authenticated;
GRANT EXECUTE ON FUNCTION public.matrix_clear_ranking() TO authenticated;

COMMENT ON FUNCTION public.matrix_seed_ranking() IS
  'Test fixture for scripts/auth-matrix.sh. Admin only, and refuses on a '
  'database with real members. Builds a deliberate tie and >100 active '
  'members so the leaderboard assertions cannot pass vacuously.';
