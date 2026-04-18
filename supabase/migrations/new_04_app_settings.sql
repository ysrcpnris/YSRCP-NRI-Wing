-- =====================================================================
-- NRI WING PORTAL — PART 4 (add-on): APP SETTINGS
-- Simple key-value table for admin-controlled feature toggles.
-- Run after parts 1-3.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (homepage needs them)
DROP POLICY IF EXISTS "app_settings_read" ON public.app_settings;
CREATE POLICY "app_settings_read" ON public.app_settings
  FOR SELECT USING (true);

-- Only admins can write
DROP POLICY IF EXISTS "app_settings_admin_write" ON public.app_settings;
CREATE POLICY "app_settings_admin_write" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Seed the toggle — ON by default (current behavior)
INSERT INTO public.app_settings (key, value)
VALUES ('show_stay_connected', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Verification
SELECT key, value FROM public.app_settings;
