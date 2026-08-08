-- =====================================================================
-- 20260808220000 — Digital Army content feed
--
-- USER-REQUESTED, mid-batch, not from the mock: "in the digital army,
-- let's have an option for admin to post the youtube, insta and x
-- feed." Asked separately whether real YouTube/Instagram APIs exist
-- for a live pull — answer, checked against this codebase's own
-- existing infrastructure:
--   YouTube — yes, a real API exists (supabase/functions/
--     fetch-youtube-videos + the youtube_videos table), but that
--     pipeline is single-purpose: it syncs one channel's uploads for
--     the PUBLIC HOMEPAGE's "Jagan Anna On Air" carousel, keyed on
--     YouTube's own video_id. Not reused here — pointing Digital
--     Army's feed at it would mean showing every member the same
--     party-channel uploads already visible on the homepage, not a
--     Digital-Army-curated feed.
--   Instagram — no. The Basic Display API was killed December 2024;
--     already documented in three other places in this codebase
--     (DigitalArmy.tsx, AdminDigital.tsx, 20260808150000_admin_digital.sql).
--   X — only per-post OAuth actions (member_x_connections, gated
--     behind VITE_X_INTEGRATION_ENABLED, off in this environment).
--     No feed-pull mechanism; auto-pull needs a paid API tier.
-- So: "just for the digital army to watch" — a simple admin-curated
-- list of links, one row per post, not a live sync from any platform.
--
-- DELIBERATELY NOT campaigns. campaigns already carries country-scoped,
-- coordinator-writable, share-tracked promotional content with its own
-- UI in AdminDigital.tsx/DigitalArmy.tsx. This is a different, simpler
-- thing — "here's something worth watching," no sharing mechanics, no
-- per-member click tracking, no coordinator write access (the user
-- said ADMIN, not "admin or coordinator" — campaigns' coordinator
-- carve-out is deliberately not repeated here). A NEW, platform-
-- uniform table, not an extension of youtube_videos (single-platform,
-- keyed on YouTube's own id) or campaigns (a heavier mechanism this
-- doesn't need).
--
-- No country targeting either — nothing in the request asked for it,
-- and campaigns already owns that pattern for content that needs it.
-- One global feed, shown to every Digital Army member.
-- =====================================================================

CREATE TABLE public.digital_content_feed (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform    text NOT NULL CHECK (platform IN ('youtube', 'instagram', 'x')),
  url         text NOT NULL,
  caption     text,
  posted_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  is_active   boolean NOT NULL DEFAULT true
);

CREATE INDEX digital_content_feed_active_idx
  ON public.digital_content_feed (created_at DESC) WHERE is_active;

ALTER TABLE public.digital_content_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY digital_content_feed_read ON public.digital_content_feed
  FOR SELECT TO authenticated
  USING (is_active);

CREATE POLICY digital_content_feed_admin_all ON public.digital_content_feed
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.digital_content_feed TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.digital_content_feed TO authenticated;

COMMENT ON TABLE public.digital_content_feed IS
  'Admin-curated links (YouTube/Instagram/X) shown on the member-facing '
  'Digital Army feed. Not a live platform sync — see migration header. '
  'Write access is is_admin() only, no coordinator carve-out.';

DO $$
BEGIN
  RAISE NOTICE 'digital_content_feed table + RLS created';
END $$;
