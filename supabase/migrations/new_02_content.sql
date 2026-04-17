-- =====================================================================
-- NRI WING PORTAL — PART 2/3: CONTENT & ADMIN FEATURES
-- Run this SECOND, after Part 1 has completed successfully.
-- Sets up: events, news, assistance requests, suggestions, visits,
-- gallery/banners, live links, YouTube cache, leaders & coordinators.
-- =====================================================================

-- =====================================================================
-- EVENTS (dual-purpose: notifications & real events)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text NOT NULL,
  description    text,
  info           text,
  event_type     text DEFAULT 'meeting',
  date           timestamptz,
  time           text,
  venue          text,
  virtual_link   text,
  country        text,
  state          text,
  banner_image   text,
  organizer_id   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  max_attendees  integer,
  status         text DEFAULT 'Draft',   -- 'Draft' | 'Sent' | 'upcoming' | 'completed' | 'cancelled'
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_status_idx     ON public.events(status);
CREATE INDEX IF NOT EXISTS events_created_at_idx ON public.events(created_at);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_read" ON public.events;
CREATE POLICY "events_read" ON public.events
  FOR SELECT USING (true);   -- public can read

DROP POLICY IF EXISTS "events_admin_write" ON public.events;
CREATE POLICY "events_admin_write" ON public.events
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- NEWS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.news (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL,
  info       text NOT NULL,
  image_url  text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS news_created_at_idx ON public.news(created_at);

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "news_read" ON public.news;
CREATE POLICY "news_read" ON public.news FOR SELECT USING (true);

DROP POLICY IF EXISTS "news_admin_write" ON public.news;
CREATE POLICY "news_admin_write" ON public.news
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- SERVICE REQUESTS (Assistance admin panel)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.service_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  applicant_name    text,
  service_type      text,
  service_category  text,
  service_option    text,
  current_location  text,
  description       text,
  status            text DEFAULT 'pending',   -- 'pending' | 'resolved' | 'rejected'
  assigned_to       text,
  action_taken      text,
  admin_comments    text,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_requests_status_idx  ON public.service_requests(status);
CREATE INDEX IF NOT EXISTS service_requests_user_id_idx ON public.service_requests(user_id);

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_requests_read_own_or_admin" ON public.service_requests;
CREATE POLICY "service_requests_read_own_or_admin" ON public.service_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "service_requests_insert_auth" ON public.service_requests;
CREATE POLICY "service_requests_insert_auth" ON public.service_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "service_requests_admin_update" ON public.service_requests;
CREATE POLICY "service_requests_admin_update" ON public.service_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "service_requests_admin_delete" ON public.service_requests;
CREATE POLICY "service_requests_admin_delete" ON public.service_requests
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- =====================================================================
-- SUGGESTIONS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.suggestions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text,
  country         text,
  suggestion      text NOT NULL,
  suggestion_date timestamptz DEFAULT now()
);

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suggestions_public_insert" ON public.suggestions;
CREATE POLICY "suggestions_public_insert" ON public.suggestions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "suggestions_admin_read" ON public.suggestions;
CREATE POLICY "suggestions_admin_read" ON public.suggestions
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "suggestions_admin_write" ON public.suggestions;
CREATE POLICY "suggestions_admin_write" ON public.suggestions
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "suggestions_admin_delete" ON public.suggestions;
CREATE POLICY "suggestions_admin_delete" ON public.suggestions
  FOR DELETE TO authenticated USING (public.is_admin());

-- =====================================================================
-- NRI VISITS (Visited admin panel)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.nri_visits (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_name  text NOT NULL,
  email         text,
  place         text,
  visit_date    text,
  visit_time    text,
  purpose       text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.nri_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nri_visits_admin_all" ON public.nri_visits;
CREATE POLICY "nri_visits_admin_all" ON public.nri_visits
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- GALLERY IMAGES (admin-managed)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.gallery_images (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url  text NOT NULL,
  is_active  boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gallery_images_read" ON public.gallery_images;
CREATE POLICY "gallery_images_read" ON public.gallery_images
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "gallery_images_admin_write" ON public.gallery_images;
CREATE POLICY "gallery_images_admin_write" ON public.gallery_images
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================================
-- HOMEPAGE BANNERS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.homepage_banners (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text,
  image_url  text NOT NULL,
  is_active  boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.homepage_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "homepage_banners_read" ON public.homepage_banners;
CREATE POLICY "homepage_banners_read" ON public.homepage_banners
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "homepage_banners_admin_write" ON public.homepage_banners;
CREATE POLICY "homepage_banners_admin_write" ON public.homepage_banners
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================================
-- CONTENT LIVE LINKS (press meet / live stream URL)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.content_live_links (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  live_url   text NOT NULL,
  is_active  boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.content_live_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "content_live_links_read" ON public.content_live_links;
CREATE POLICY "content_live_links_read" ON public.content_live_links
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "content_live_links_admin_write" ON public.content_live_links;
CREATE POLICY "content_live_links_admin_write" ON public.content_live_links
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Seed a single placeholder row so UI doesn't break
INSERT INTO public.content_live_links (live_url, is_active)
VALUES ('', true)
ON CONFLICT DO NOTHING;

-- =====================================================================
-- YOUTUBE VIDEOS (edge function sync cache)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.youtube_videos (
  video_id     text PRIMARY KEY,
  title        text,
  description  text,
  thumbnail_url text,
  published_at timestamptz,
  video_url    text,
  channel_id   text
);

ALTER TABLE public.youtube_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "youtube_videos_read" ON public.youtube_videos;
CREATE POLICY "youtube_videos_read" ON public.youtube_videos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "youtube_videos_admin_write" ON public.youtube_videos;
CREATE POLICY "youtube_videos_admin_write" ON public.youtube_videos
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================================
-- LEADERS MASTER + ASSIGNMENTS (admin Master Data panel)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.leaders_master (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  whatsapp_number  text,
  is_active        boolean DEFAULT true,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE public.leaders_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leaders_master_read" ON public.leaders_master;
CREATE POLICY "leaders_master_read" ON public.leaders_master
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "leaders_master_admin_write" ON public.leaders_master;
CREATE POLICY "leaders_master_admin_write" ON public.leaders_master
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.leader_assignments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id     uuid REFERENCES public.leaders_master(id) ON DELETE CASCADE,
  role          text,
  district      text,
  constituency  text,
  is_active     boolean DEFAULT true,
  sort_order    integer DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leader_assignments_district_idx      ON public.leader_assignments(district);
CREATE INDEX IF NOT EXISTS leader_assignments_constituency_idx  ON public.leader_assignments(constituency);

ALTER TABLE public.leader_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leader_assignments_read" ON public.leader_assignments;
CREATE POLICY "leader_assignments_read" ON public.leader_assignments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "leader_assignments_admin_write" ON public.leader_assignments;
CREATE POLICY "leader_assignments_admin_write" ON public.leader_assignments
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================================
-- COORDINATORS (regional contact points)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.coordinators (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name         text,
  phone        text,
  email        text,
  region       text,
  country      text,
  state        text,
  position     text,
  is_active    boolean DEFAULT true,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.coordinators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coordinators_read" ON public.coordinators;
CREATE POLICY "coordinators_read" ON public.coordinators
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "coordinators_admin_write" ON public.coordinators;
CREATE POLICY "coordinators_admin_write" ON public.coordinators
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Verification
SELECT 'PART 2 / 3 COMPLETE — events, news, assistance, suggestions, visits, gallery, banners, live links, youtube, leaders, coordinators' AS status;
