-- =====================================================================
-- 20260808150000 — Digital Army (a-digital)
--
-- HANDLE COVERAGE — X real (currently zero in this environment), no
-- Instagram equivalent at all
--   profiles.twitter_id/instagram_id ("handle on file") are real,
--   member-editable columns (MyProfile.tsx) — honestly countable.
--   "Verified" is only real for X, via member_x_connections — that
--   path is gated behind VITE_X_INTEGRATION_ENABLED (unset here, per
--   docs/deploy-to-production.md) so it reads 0 today, which is
--   accurate for this environment, not a placeholder — it will move
--   for real once the team turns X integration on, unlike a fabricated
--   number. There is no Instagram equivalent anywhere in the schema
--   (Instagram's Basic Display API was killed Dec 2024, and only
--   Business/Creator accounts could ever authorise an app even when it
--   existed) — admin_digital_handle_coverage() does not return an
--   Instagram-verified column at all, not a zero standing in for one.
--
-- AUDIENCE TARGETING — checked with the user: scoped to what's real
--   The mock's picker also offers "Members with X handles" and
--   "Social Media contributors" — neither contribution_areas nor
--   handle-presence is read by campaigns_read/my_campaigns() anywhere.
--   The frontend picker is scoped down to All members / One country,
--   the two campaigns.country already backs, rather than shipping
--   picker options that don't change delivery. No schema change needed
--   for this one — it's a frontend-only decision.
--
-- CAMPAIGN MANAGEMENT MOVED HERE FROM WingManagement.tsx — checked
-- with the user
--   campaign_stats() is redefined below with the columns a-digital's
--   Campaign-performance table needs (status, ends_at, top_channel)
--   that its old shape didn't carry — everything else (gate, existing
--   columns) is unchanged. Its only previous caller,
--   WingManagement.tsx's CampaignsTab, is removed in this commit.
--   Note /admin is already role='admin'-only end to end (AdminRoute.tsx)
--   — WingManagement, and therefore its old CampaignsTab, was never
--   reachable by a coordinator through this route regardless of what
--   campaigns_coordinator_write's RLS policy allows, so removing it
--   here is not a capability regression for anyone.
--
-- "LIVE X AMPLIFICATION" — prompted/tapped/took-the-link
--   Only for campaigns with x_post_id set. "Prompted" is audience
--   size (every profile the campaign is visible to, per
--   campaigns_read's own country rule), not shares — the mock's own
--   example ("Prompted 2,611" for an all-members campaign) confirms
--   this is who SAW the prompt, not who acted on it. "Tapped repost"/
--   "Tapped like" come from x_actions (status='ok') — real intent
--   signals, not confirmed platform engagement (X does not expose
--   that — see the original digital_army migration's own header).
--   "Took the link" is real clicks, the one hard number, same honesty
--   framing as the note-boxes AdminAbroad and AdminVoteCoverage use.
--
-- STAT-CARD DELTAS — real, not dropped
--   "Shares this month" vs last month and "ending this month" are
--   both computable from real timestamps (campaign_shares.created_at,
--   campaigns.ends_at) — built for real rather than dropped, unlike
--   the handle-coverage gaps above which have no query that could ever
--   answer them honestly.
-- =====================================================================

-- ── the 4 stat cards ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_digital_stats()
RETURNS TABLE (
  live_campaigns      bigint,
  ending_this_month   bigint,
  shares_this_month   bigint,
  shares_last_month   bigint,
  people_reached      bigint,
  active_sharers      bigint,
  total_members       bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_global_scope() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM public.campaigns
      WHERE is_published AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now())),
    (SELECT count(*) FROM public.campaigns
      WHERE is_published AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now())
        AND ends_at IS NOT NULL
        AND ends_at < date_trunc('month', now()) + interval '1 month'),
    (SELECT count(*) FROM public.campaign_shares
      WHERE created_at >= date_trunc('month', now())),
    (SELECT count(*) FROM public.campaign_shares
      WHERE created_at >= date_trunc('month', now()) - interval '1 month'
        AND created_at < date_trunc('month', now())),
    (SELECT count(*) FROM public.campaign_clicks),
    (SELECT count(DISTINCT profile_id) FROM public.campaign_shares),
    (SELECT count(*) FROM public.profiles);
END $$;

REVOKE ALL ON FUNCTION public.admin_digital_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_digital_stats() TO authenticated;

-- ── clicks by channel, last 30 days ───────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_digital_channel_breakdown()
RETURNS TABLE (
  platform  text,
  clicks    bigint,
  pct       numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_global_scope() THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH recent AS (
    SELECT s.platform::text AS platform
      FROM public.campaign_clicks k
      JOIN public.campaign_shares s ON s.id = k.share_id
     WHERE k.clicked_at >= now() - interval '30 days'
  ),
  total AS (SELECT count(*) AS n FROM recent)
  SELECT r.platform, count(*), round(100.0 * count(*) / nullif((SELECT n FROM total), 0), 1)
    FROM recent r
   GROUP BY r.platform
   ORDER BY count(*) DESC;
END $$;

REVOKE ALL ON FUNCTION public.admin_digital_channel_breakdown() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_digital_channel_breakdown() TO authenticated;

-- ── handle coverage ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_digital_handle_coverage()
RETURNS TABLE (
  total_members      bigint,
  x_on_file          bigint,
  x_verified         bigint,
  instagram_on_file  bigint,
  neither            bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_global_scope() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM public.profiles),
    (SELECT count(*) FROM public.profiles WHERE twitter_id IS NOT NULL AND btrim(twitter_id) <> ''),
    (SELECT count(*) FROM public.member_x_connections x
       JOIN public.profiles p ON p.id = x.profile_id WHERE x.revoked_at IS NULL),
    (SELECT count(*) FROM public.profiles WHERE instagram_id IS NOT NULL AND btrim(instagram_id) <> ''),
    (SELECT count(*) FROM public.profiles
      WHERE (twitter_id IS NULL OR btrim(twitter_id) = '')
        AND (instagram_id IS NULL OR btrim(instagram_id) = ''));
END $$;

REVOKE ALL ON FUNCTION public.admin_digital_handle_coverage() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_digital_handle_coverage() TO authenticated;

COMMENT ON FUNCTION public.admin_digital_handle_coverage() IS
  'ADMIN ONLY. No instagram_verified column — nothing in this schema '
  'can answer that honestly. x_verified is real and gated behind X '
  'integration being enabled, not a placeholder.';

-- ── campaign_stats(): faithful diff, +status/+ends_at/+top_channel ──
DROP FUNCTION IF EXISTS public.campaign_stats(uuid);
CREATE OR REPLACE FUNCTION public.campaign_stats(p_campaign_id uuid DEFAULT NULL)
RETURNS TABLE (
  campaign_id       uuid,
  title             text,
  country           text,
  status            text,
  ends_at           timestamptz,
  sharers           bigint,
  shares            bigint,
  clicks            bigint,
  clicks_per_share  numeric,
  top_channel       text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.title, c.country,
         CASE
           WHEN NOT c.is_published THEN 'draft'
           WHEN c.starts_at > now() THEN 'scheduled'
           WHEN c.ends_at IS NOT NULL AND c.ends_at <= now() THEN 'closed'
           ELSE 'live'
         END,
         c.ends_at,
         count(DISTINCT s.profile_id),
         count(DISTINCT s.id),
         count(k.id),
         round(count(k.id)::numeric / nullif(count(DISTINCT s.id), 0), 1),
         (
           SELECT s2.platform::text
             FROM public.campaign_shares s2
            WHERE s2.campaign_id = c.id
            GROUP BY s2.platform
            ORDER BY count(*) DESC
            LIMIT 1
         )
    FROM public.campaigns c
    LEFT JOIN public.campaign_shares s ON s.campaign_id = c.id
    LEFT JOIN public.campaign_clicks k ON k.share_id = s.id
   WHERE (p_campaign_id IS NULL OR c.id = p_campaign_id)
     AND (public.is_admin() OR (c.country IS NOT NULL AND c.country = ANY (public.my_countries())))
   GROUP BY c.id, c.title, c.country, c.is_published, c.starts_at, c.ends_at
   ORDER BY count(k.id) DESC;
$$;

REVOKE ALL ON FUNCTION public.campaign_stats(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.campaign_stats(uuid) TO authenticated;

-- ── top amplifiers: admin-scoped, unlike member_rankings() which is
--    deliberately barred from ever returning profile_id/handle ──────
CREATE OR REPLACE FUNCTION public.admin_digital_top_amplifiers(p_limit int DEFAULT 20)
RETURNS TABLE (
  profile_id   uuid,
  full_name    text,
  country      text,
  shares       bigint,
  clicks       bigint,
  twitter_id   text,
  x_verified   boolean,
  instagram_id text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_global_scope() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id, p.full_name, p.country_of_residence,
         count(DISTINCT s.id), count(k.id),
         p.twitter_id,
         EXISTS (SELECT 1 FROM public.member_x_connections x WHERE x.profile_id = p.id AND x.revoked_at IS NULL),
         p.instagram_id
    FROM public.campaign_shares s
    JOIN public.profiles p ON p.id = s.profile_id
    LEFT JOIN public.campaign_clicks k ON k.share_id = s.id
   GROUP BY p.id, p.full_name, p.country_of_residence, p.twitter_id, p.instagram_id
   ORDER BY count(k.id) DESC, count(DISTINCT s.id) DESC
   LIMIT greatest(1, least(coalesce(p_limit, 20), 200));
END $$;

REVOKE ALL ON FUNCTION public.admin_digital_top_amplifiers(int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_digital_top_amplifiers(int) TO authenticated;

COMMENT ON FUNCTION public.admin_digital_top_amplifiers(int) IS
  'ADMIN ONLY. member_rankings() deliberately never returns profile_id '
  'or a handle (its own migration asserts this at creation time) — '
  'this is a separate, admin-scoped function, not a workaround for '
  'that restriction.';

-- ── Live X amplification: prompted/tapped/took-the-link ───────────
CREATE OR REPLACE FUNCTION public.admin_digital_x_amplification()
RETURNS TABLE (
  campaign_id    uuid,
  title          text,
  x_post_id      text,
  country        text,
  prompted       bigint,
  tapped_repost  bigint,
  tapped_like    bigint,
  took_the_link  bigint,
  created_at     timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_global_scope() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id, c.title, c.x_post_id, c.country,
    (SELECT count(*) FROM public.profiles p
      WHERE c.country IS NULL OR p.country_of_residence = c.country),
    (SELECT count(*) FROM public.x_actions a
      WHERE a.campaign_id = c.id AND a.action = 'repost' AND a.status = 'ok'),
    (SELECT count(*) FROM public.x_actions a
      WHERE a.campaign_id = c.id AND a.action = 'like' AND a.status = 'ok'),
    (SELECT count(*) FROM public.campaign_clicks k
       JOIN public.campaign_shares s ON s.id = k.share_id
      WHERE s.campaign_id = c.id),
    c.created_at
    FROM public.campaigns c
   WHERE c.x_post_id IS NOT NULL
   ORDER BY c.created_at DESC;
END $$;

REVOKE ALL ON FUNCTION public.admin_digital_x_amplification() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_digital_x_amplification() TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'admin_digital_stats / admin_digital_channel_breakdown / admin_digital_handle_coverage / admin_digital_top_amplifiers / admin_digital_x_amplification created; campaign_stats extended';
END $$;
