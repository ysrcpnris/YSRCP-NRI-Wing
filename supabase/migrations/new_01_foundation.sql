-- =====================================================================
-- NRI WING PORTAL — PART 1/3: FOUNDATION
-- Run this FIRST in the Supabase SQL Editor.
-- Sets up: extensions, helpers, storage, profiles, auth trigger,
-- referrals, contributions.
-- =====================================================================

-- ---------- EXTENSIONS ----------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------- HELPER: is_admin() ----------
-- Used across all RLS policies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- =====================================================================
-- PROFILES TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  auth_user_id          uuid,
  email                 text NOT NULL,

  -- Names
  first_name            text DEFAULT 'User',
  last_name             text DEFAULT 'change last name',
  full_name             text,

  -- Contact
  mobile_number         text,
  whatsapp_number       text,
  phone                 text,

  -- Profile meta
  profile_photo         text,
  occupation            text,
  profession            text,
  organization          text,
  role_designation      text,
  designation           text,

  -- Foreign address
  country_of_residence  text,
  state_abroad          text,
  city_abroad           text,

  -- Indian address
  indian_state          text,
  district              text,
  assembly_constituency text,
  mandal                text,
  village               text,
  native_district       text,
  native_constituency   text,
  native_mandal         text,
  native_village        text,

  -- Demographics
  gender                text,
  dob                   text,

  -- Engagement
  contribution          text,
  participate_campaign  text,
  suggestions           text,

  -- Referral
  referred_by           text,
  referral_code         text,

  -- Social
  instagram_id          text,
  facebook_id           text,
  twitter_id            text,
  linkedin_id           text,

  -- Role & status
  role                  text DEFAULT 'user',
  status                text DEFAULT 'pending',

  -- Current location (legacy compat)
  current_country       text,
  current_state         text,
  current_city          text,

  -- Tracking
  events_last_seen_at   timestamptz,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_email_idx          ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_role_idx           ON public.profiles(role);
CREATE INDEX IF NOT EXISTS profiles_referral_code_idx  ON public.profiles(referral_code);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;
CREATE POLICY "profiles_self_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;
CREATE POLICY "profiles_self_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_admin_delete" ON public.profiles;
CREATE POLICY "profiles_admin_delete" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- =====================================================================
-- AUTH TRIGGER — auto-create profile on signup
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, auth_user_id, email,
    first_name, last_name, full_name,
    mobile_number, country_of_residence,
    state_abroad, city_abroad,
    indian_state, district, assembly_constituency, mandal,
    referral_code, role, created_at
  )
  VALUES (
    NEW.id, NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1), 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name',  split_part(NEW.raw_user_meta_data->>'full_name', ' ', 2), 'change last name'),
    COALESCE(NEW.raw_user_meta_data->>'full_name',  NULL),
    NEW.raw_user_meta_data->>'mobile_number',
    NEW.raw_user_meta_data->>'country_of_residence',
    NEW.raw_user_meta_data->>'state_abroad',
    NEW.raw_user_meta_data->>'city_abroad',
    NEW.raw_user_meta_data->>'indian_state',
    NEW.raw_user_meta_data->>'district',
    NEW.raw_user_meta_data->>'assembly_constituency',
    NEW.raw_user_meta_data->>'mandal',
    NEW.raw_user_meta_data->>'referral_code',
    'user',
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- REFERRALS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source       text DEFAULT 'direct',  -- 'direct' | 'active' | 'passive'
  created_at   timestamptz DEFAULT now(),
  UNIQUE (referrer_id, referred_id, source)
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS referrals_referred_idx ON public.referrals(referred_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referrals_read_own" ON public.referrals;
CREATE POLICY "referrals_read_own" ON public.referrals
  FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "referrals_insert" ON public.referrals;
CREATE POLICY "referrals_insert" ON public.referrals
  FOR INSERT TO authenticated
  WITH CHECK (referred_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "referrals_admin_delete" ON public.referrals;
CREATE POLICY "referrals_admin_delete" ON public.referrals
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- =====================================================================
-- CONTRIBUTION TYPES & USER CONTRIBUTIONS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.contribution_types (
  id    serial PRIMARY KEY,
  name  text NOT NULL UNIQUE
);

ALTER TABLE public.contribution_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contribution_types_read" ON public.contribution_types;
CREATE POLICY "contribution_types_read" ON public.contribution_types
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "contribution_types_admin_write" ON public.contribution_types;
CREATE POLICY "contribution_types_admin_write" ON public.contribution_types
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Seed basic contribution categories
INSERT INTO public.contribution_types (name) VALUES
  ('Student Support'),
  ('Legal Advisor'),
  ('Career Coach'),
  ('Local Connector'),
  ('Healthcare'),
  ('Fundraising'),
  ('Content Creation'),
  ('Social Media'),
  ('Translation'),
  ('Event Management')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.user_contributions (
  user_id               uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  contribution_type_id  integer REFERENCES public.contribution_types(id) ON DELETE CASCADE,
  created_at            timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, contribution_type_id)
);

ALTER TABLE public.user_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_contributions_self" ON public.user_contributions;
CREATE POLICY "user_contributions_self" ON public.user_contributions
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- =====================================================================
-- STORAGE BUCKETS (all public)
-- =====================================================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('profile-photos',    'profile-photos',    true),
  ('news-images',       'news-images',       true),
  ('gallery-images',    'gallery-images',    true),
  ('homepage-banners',  'homepage-banners',  true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ---- Storage policies ----
-- Public buckets allow anonymous READ via the public CDN path automatically.
-- We use a single FOR ALL policy per bucket so upload({upsert:true}) works
-- without needing separate INSERT/UPDATE/DELETE/SELECT policies.

-- profile-photos: any authenticated user can read/write/delete
DROP POLICY IF EXISTS "profile_photos_auth_upload"  ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_auth_update"  ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_auth_delete"  ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_auth_all"     ON storage.objects;
CREATE POLICY "profile_photos_auth_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'profile-photos')
  WITH CHECK (bucket_id = 'profile-photos');

-- news-images: admin only (read still public via CDN for anonymous users)
DROP POLICY IF EXISTS "news_images_admin_write"  ON storage.objects;
DROP POLICY IF EXISTS "news_images_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "news_images_admin_all"    ON storage.objects;
CREATE POLICY "news_images_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'news-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'news-images' AND public.is_admin());

-- gallery-images: admin only
DROP POLICY IF EXISTS "gallery_images_admin_write"  ON storage.objects;
DROP POLICY IF EXISTS "gallery_images_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "gallery_images_admin_all"    ON storage.objects;
CREATE POLICY "gallery_images_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'gallery-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'gallery-images' AND public.is_admin());

-- homepage-banners: admin only
DROP POLICY IF EXISTS "homepage_banners_admin_write"  ON storage.objects;
DROP POLICY IF EXISTS "homepage_banners_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "homepage_banners_admin_all"    ON storage.objects;
CREATE POLICY "homepage_banners_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'homepage-banners' AND public.is_admin())
  WITH CHECK (bucket_id = 'homepage-banners' AND public.is_admin());

-- Verification
SELECT 'PART 1 / 3 COMPLETE — profiles, auth trigger, storage, referrals, contributions' AS status;
