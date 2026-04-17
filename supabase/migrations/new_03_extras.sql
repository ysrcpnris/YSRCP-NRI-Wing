-- =====================================================================
-- NRI WING PORTAL — PART 3/3: EXTENDED SCHEMA + ADMIN SETUP
-- Run this THIRD, after Parts 1 and 2 have completed successfully.
-- Sets up: original schema tables (wings, jobs, grievances, etc.),
-- countries reference table, and admin user promotion snippet.
-- =====================================================================

-- =====================================================================
-- WINGS + PROFILE_WINGS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.wings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  icon        text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.wings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wings_read" ON public.wings;
CREATE POLICY "wings_read" ON public.wings FOR SELECT USING (true);
DROP POLICY IF EXISTS "wings_admin_write" ON public.wings;
CREATE POLICY "wings_admin_write" ON public.wings
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.profile_wings (
  profile_id  uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  wing_id     uuid REFERENCES public.wings(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  PRIMARY KEY (profile_id, wing_id)
);

ALTER TABLE public.profile_wings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_wings_self" ON public.profile_wings;
CREATE POLICY "profile_wings_self" ON public.profile_wings
  FOR ALL TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin())
  WITH CHECK (profile_id = auth.uid() OR public.is_admin());

-- =====================================================================
-- LOCAL LEADERS (original schema — separate from leaders_master)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.local_leaders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  designation    text,
  district       text,
  constituency   text,
  mandal         text,
  phone          text,
  email          text,
  photo          text,
  party_position text,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE public.local_leaders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "local_leaders_read" ON public.local_leaders;
CREATE POLICY "local_leaders_read" ON public.local_leaders FOR SELECT USING (true);
DROP POLICY IF EXISTS "local_leaders_admin_write" ON public.local_leaders;
CREATE POLICY "local_leaders_admin_write" ON public.local_leaders
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================================
-- STUDENT REQUESTS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.student_requests (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id           uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type         text,  -- 'university_guidance' | 'exam_prep' | 'fee_discount' | 'mentorship'
  course_level         text,
  field_of_study       text,
  target_country       text,
  description          text,
  status               text DEFAULT 'pending',
  assigned_mentor_id   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

ALTER TABLE public.student_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_requests_read" ON public.student_requests;
CREATE POLICY "student_requests_read" ON public.student_requests
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR assigned_mentor_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "student_requests_insert" ON public.student_requests;
CREATE POLICY "student_requests_insert" ON public.student_requests
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());
DROP POLICY IF EXISTS "student_requests_update" ON public.student_requests;
CREATE POLICY "student_requests_update" ON public.student_requests
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid() OR assigned_mentor_id = auth.uid() OR public.is_admin())
  WITH CHECK (profile_id = auth.uid() OR assigned_mentor_id = auth.uid() OR public.is_admin());

-- =====================================================================
-- JOB POSTINGS + APPLICATIONS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.job_postings (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title              text NOT NULL,
  company            text,
  location           text,
  country            text,
  job_type           text,
  description        text,
  requirements       text,
  salary_range       text,
  application_email  text,
  status             text DEFAULT 'active',
  created_at         timestamptz DEFAULT now(),
  expires_at         timestamptz
);

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "job_postings_read" ON public.job_postings;
CREATE POLICY "job_postings_read" ON public.job_postings FOR SELECT USING (true);
DROP POLICY IF EXISTS "job_postings_self_write" ON public.job_postings;
CREATE POLICY "job_postings_self_write" ON public.job_postings
  FOR ALL TO authenticated
  USING (posted_by = auth.uid() OR public.is_admin())
  WITH CHECK (posted_by = auth.uid() OR public.is_admin());

CREATE TABLE IF NOT EXISTS public.job_applications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        uuid REFERENCES public.job_postings(id) ON DELETE CASCADE,
  applicant_id  uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  resume_url    text,
  cover_letter  text,
  status        text DEFAULT 'applied',
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "job_applications_read" ON public.job_applications;
CREATE POLICY "job_applications_read" ON public.job_applications
  FOR SELECT TO authenticated
  USING (
    applicant_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.job_postings WHERE id = job_id AND posted_by = auth.uid())
    OR public.is_admin()
  );
DROP POLICY IF EXISTS "job_applications_insert" ON public.job_applications;
CREATE POLICY "job_applications_insert" ON public.job_applications
  FOR INSERT TO authenticated
  WITH CHECK (applicant_id = auth.uid());

-- =====================================================================
-- EVENT RSVPS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid REFERENCES public.events(id) ON DELETE CASCADE,
  profile_id  uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      text DEFAULT 'yes',
  created_at  timestamptz DEFAULT now(),
  UNIQUE (event_id, profile_id)
);

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "event_rsvps_self" ON public.event_rsvps;
CREATE POLICY "event_rsvps_self" ON public.event_rsvps
  FOR ALL TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin())
  WITH CHECK (profile_id = auth.uid() OR public.is_admin());

-- =====================================================================
-- NEWS ARTICLES (original schema — extended news with author)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.news_articles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  content         text,
  excerpt         text,
  featured_image  text,
  author_id       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  category        text DEFAULT 'news',
  country_scope   text,
  published       boolean DEFAULT false,
  published_at    timestamptz,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "news_articles_read" ON public.news_articles;
CREATE POLICY "news_articles_read" ON public.news_articles
  FOR SELECT USING (published = true OR public.is_admin());
DROP POLICY IF EXISTS "news_articles_admin_write" ON public.news_articles;
CREATE POLICY "news_articles_admin_write" ON public.news_articles
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================================
-- MEDIA GALLERY
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.media_gallery (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text,
  media_type     text DEFAULT 'photo',
  media_url      text NOT NULL,
  thumbnail_url  text,
  event_id       uuid REFERENCES public.events(id) ON DELETE SET NULL,
  uploaded_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE public.media_gallery ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "media_gallery_read" ON public.media_gallery;
CREATE POLICY "media_gallery_read" ON public.media_gallery FOR SELECT USING (true);
DROP POLICY IF EXISTS "media_gallery_write" ON public.media_gallery;
CREATE POLICY "media_gallery_write" ON public.media_gallery
  FOR ALL TO authenticated
  USING (uploaded_by = auth.uid() OR public.is_admin())
  WITH CHECK (uploaded_by = auth.uid() OR public.is_admin());

-- =====================================================================
-- VOLUNTEER TASKS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.volunteer_tasks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  description  text,
  task_type    text,
  status       text DEFAULT 'open',
  assigned_to  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date     timestamptz,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.volunteer_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "volunteer_tasks_read" ON public.volunteer_tasks;
CREATE POLICY "volunteer_tasks_read" ON public.volunteer_tasks
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "volunteer_tasks_write" ON public.volunteer_tasks;
CREATE POLICY "volunteer_tasks_write" ON public.volunteer_tasks
  FOR ALL TO authenticated
  USING (assigned_to = auth.uid() OR created_by = auth.uid() OR public.is_admin())
  WITH CHECK (assigned_to = auth.uid() OR created_by = auth.uid() OR public.is_admin());

-- =====================================================================
-- GRIEVANCES
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.grievances (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject     text,
  category    text DEFAULT 'general',
  description text,
  country     text,
  state       text,
  status      text DEFAULT 'open',
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  response    text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.grievances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "grievances_read" ON public.grievances;
CREATE POLICY "grievances_read" ON public.grievances
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR assigned_to = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "grievances_insert" ON public.grievances;
CREATE POLICY "grievances_insert" ON public.grievances
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());
DROP POLICY IF EXISTS "grievances_update" ON public.grievances;
CREATE POLICY "grievances_update" ON public.grievances
  FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid() OR public.is_admin())
  WITH CHECK (assigned_to = auth.uid() OR public.is_admin());

-- =====================================================================
-- CONTINENTS + COUNTRIES (reference tables — used by admin geo grouping)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.continents (
  id    serial PRIMARY KEY,
  name  text NOT NULL UNIQUE
);

ALTER TABLE public.continents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "continents_read" ON public.continents;
CREATE POLICY "continents_read" ON public.continents FOR SELECT USING (true);
DROP POLICY IF EXISTS "continents_admin_write" ON public.continents;
CREATE POLICY "continents_admin_write" ON public.continents
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.continents (name) VALUES
  ('Asia'),
  ('Europe'),
  ('North America'),
  ('South America'),
  ('Africa'),
  ('Oceania'),
  ('Antarctica')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.countries (
  code          text PRIMARY KEY,
  name          text NOT NULL,
  phone         text,
  continent_id  integer REFERENCES public.continents(id) ON DELETE SET NULL
);

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "countries_read" ON public.countries;
CREATE POLICY "countries_read" ON public.countries FOR SELECT USING (true);
DROP POLICY IF EXISTS "countries_admin_write" ON public.countries;
CREATE POLICY "countries_admin_write" ON public.countries
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Minimal seed (most common NRI countries with continent mapping).
-- Frontend has its own full list for country-code dropdowns.
INSERT INTO public.countries (code, name, phone, continent_id) VALUES
  ('IN', 'India',                '+91',  (SELECT id FROM public.continents WHERE name = 'Asia')),
  ('US', 'United States',        '+1',   (SELECT id FROM public.continents WHERE name = 'North America')),
  ('GB', 'United Kingdom',       '+44',  (SELECT id FROM public.continents WHERE name = 'Europe')),
  ('CA', 'Canada',               '+1',   (SELECT id FROM public.continents WHERE name = 'North America')),
  ('AU', 'Australia',            '+61',  (SELECT id FROM public.continents WHERE name = 'Oceania')),
  ('AE', 'United Arab Emirates', '+971', (SELECT id FROM public.continents WHERE name = 'Asia')),
  ('SG', 'Singapore',            '+65',  (SELECT id FROM public.continents WHERE name = 'Asia')),
  ('DE', 'Germany',              '+49',  (SELECT id FROM public.continents WHERE name = 'Europe')),
  ('NZ', 'New Zealand',          '+64',  (SELECT id FROM public.continents WHERE name = 'Oceania')),
  ('MY', 'Malaysia',             '+60',  (SELECT id FROM public.continents WHERE name = 'Asia')),
  ('SA', 'Saudi Arabia',         '+966', (SELECT id FROM public.continents WHERE name = 'Asia')),
  ('QA', 'Qatar',                '+974', (SELECT id FROM public.continents WHERE name = 'Asia')),
  ('NL', 'Netherlands',          '+31',  (SELECT id FROM public.continents WHERE name = 'Europe')),
  ('IT', 'Italy',                '+39',  (SELECT id FROM public.continents WHERE name = 'Europe')),
  ('FR', 'France',               '+33',  (SELECT id FROM public.continents WHERE name = 'Europe')),
  ('JP', 'Japan',                '+81',  (SELECT id FROM public.continents WHERE name = 'Asia')),
  ('KR', 'South Korea',          '+82',  (SELECT id FROM public.continents WHERE name = 'Asia')),
  ('CN', 'China',                '+86',  (SELECT id FROM public.continents WHERE name = 'Asia')),
  ('BR', 'Brazil',               '+55',  (SELECT id FROM public.continents WHERE name = 'South America')),
  ('ZA', 'South Africa',         '+27',  (SELECT id FROM public.continents WHERE name = 'Africa')),
  ('KW', 'Kuwait',               '+965', (SELECT id FROM public.continents WHERE name = 'Asia')),
  ('OM', 'Oman',                 '+968', (SELECT id FROM public.continents WHERE name = 'Asia')),
  ('BH', 'Bahrain',              '+973', (SELECT id FROM public.continents WHERE name = 'Asia'))
ON CONFLICT (code) DO UPDATE
  SET continent_id = EXCLUDED.continent_id,
      phone = EXCLUDED.phone,
      name = EXCLUDED.name;

-- =====================================================================
-- ADMIN USER PROMOTION
-- =====================================================================
-- After running Parts 1-3 and having your admin user sign up via the website,
-- run THIS LINE separately (or as the final statement) to grant admin role.
-- The user must have ALREADY registered through the website first.
-- ---------------------------------------------------------------------

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'ysrcpnris@gmail.com';

-- Verification queries (optional)
SELECT email, role, first_name, last_name
FROM public.profiles
WHERE email = 'ysrcpnris@gmail.com';

SELECT 'PART 3 / 3 COMPLETE — extended schema, countries, admin promotion' AS status;

