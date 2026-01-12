-- Migration: Add missing profile columns
-- Adds nullable text columns for assembly constituency and city abroad fields

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS assembly_constituency text,
  ADD COLUMN IF NOT EXISTS city_abroad text;
ALTER TABLE profiles ADD COLUMN referred_by text;

-- Update the updated_at timestamp for existing rows (optional)
-- Uncomment if you want to refresh updated_at values
-- UPDATE public.profiles SET updated_at = now() WHERE updated_at IS NULL;
