-- =====================================================================
-- 20260805220000 — the ranking fixture must be unable to run on prod
--
-- matrix_seed_ranking() shipped with "refuse if more than 100 real
-- profiles". That was picked to protect production, but it is the wrong
-- shape of guard: it assumes production is BIG. A threshold of 100 is
-- only a boundary while the live member count stays above it, and this
-- function goes out in the same batch as the migration that takes the
-- NRI Wing's real data forward. Staging carries exactly 1 non-test
-- profile, so the honest threshold is small, not large.
--
-- Two conditions now, both structural rather than statistical:
--
--   · at most 5 non-@example.test profiles — production has vastly more,
--     and it can never grow DOWN into the permitted range
--   · at least 100 seed.%@example.test members must already exist —
--     these are created by supabase/seeds/staging_members.sql and exist
--     nowhere else, so the function simply has nothing to stand on in
--     any environment that is not staging
--
-- The second is the real lock. A guard that depends on production
-- staying above a number is a guard with an expiry date.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.matrix_seed_ranking()
RETURNS TABLE (active bigint, caller_place int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_campaign uuid;
  v_real     int;
  v_seeded   int;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT count(*) INTO v_real FROM public.profiles
   WHERE email NOT LIKE '%@example.test';
  IF v_real > 5 THEN
    RAISE EXCEPTION
      'refusing: % real profiles present — this is not a test database', v_real;
  END IF;

  SELECT count(*) INTO v_seeded FROM public.profiles
   WHERE email LIKE 'seed.%@example.test';
  IF v_seeded < 100 THEN
    RAISE EXCEPTION
      'refusing: only % synthetic members — run supabase/seeds/staging_members.sql', v_seeded;
  END IF;

  SELECT id INTO v_campaign FROM public.campaigns WHERE country IS NULL LIMIT 1;
  IF v_campaign IS NULL THEN
    RAISE EXCEPTION 'no wing-wide campaign to attach shares to';
  END IF;

  DELETE FROM public.campaign_clicks k
   USING public.campaign_shares s
   WHERE s.id = k.share_id AND s.share_token LIKE 'MX-%';
  DELETE FROM public.campaign_shares WHERE share_token LIKE 'MX-%';

  INSERT INTO public.campaign_shares (campaign_id, profile_id, platform, share_token)
  SELECT v_campaign, x.id, 'x', 'MX-' || lpad(x.n::text, 4, '0')
    FROM (
      SELECT p.id, row_number() OVER (ORDER BY p.email) AS n
        FROM public.profiles p
       WHERE p.email LIKE 'seed.%@example.test'
       LIMIT 120
    ) x
  ON CONFLICT DO NOTHING;

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

COMMENT ON FUNCTION public.matrix_seed_ranking() IS
  'Test fixture for scripts/auth-matrix.sh. Admin only. Refuses unless the '
  'database has <=5 real profiles AND >=100 seed.% synthetic members, so it '
  'cannot run anywhere but staging.';
