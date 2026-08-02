-- =====================================================================
-- Featured YouTube Videos — admin-curated.
--
-- Why:
--   The "Jagan Anna On Air" section on the home page was previously
--   auto-populated from the YouTube Data API at runtime (subject to
--   quota and depending on whatever was newest on the channel). The
--   client wants explicit editorial control: admin pastes specific
--   YouTube links, and only those appear on the home page.
--
-- Strategy:
--   Reuse the existing `public.youtube_videos` table (created in
--   new_02_content.sql). It already has:
--     • video_id (PK)
--     • title, description, thumbnail_url, video_url
--     • published_at, channel_id
--     • RLS: public SELECT, admin-only writes
--   Add two columns this feature needs:
--     • sort_order (int) — admin-controlled ordering on the home page
--     • is_active  (boolean) — soft-hide without losing the row
--
-- Idempotent — safe to re-run.
-- =====================================================================

ALTER TABLE public.youtube_videos
  ADD COLUMN IF NOT EXISTS sort_order int     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active  boolean DEFAULT true;

-- Helpful index for the home-page query that orders by sort_order then
-- recency.
CREATE INDEX IF NOT EXISTS youtube_videos_sort_order_idx
  ON public.youtube_videos (is_active, sort_order, published_at DESC);

-- ---------------------------------------------------------------------
-- Sanity-check NOTICE
-- ---------------------------------------------------------------------
DO $verify$
DECLARE
  v_total  int;
  v_active int;
BEGIN
  SELECT count(*) INTO v_total  FROM public.youtube_videos;
  SELECT count(*) INTO v_active FROM public.youtube_videos WHERE is_active = true;
  RAISE NOTICE
    'youtube_videos: % total rows, % currently active. Admins can now manage these from the Featured Videos page.',
    v_total, v_active;
END $verify$;
