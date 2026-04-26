-- =====================================================================
-- HANDLE_NEW_USER — include referred_by from metadata
--
-- The original handle_new_user() trigger (new_01) creates a profiles row
-- from auth.users.raw_user_meta_data but only included 17 columns. It did
-- not propagate `referred_by`, which is what carries the referrer's code
-- through the email-verification round-trip.
--
-- Without this fix:
--   - User registers via /ref/CODE → meta.referred_by = "CODE"
--   - auth.users insert fires handle_new_user
--   - profiles row is created WITHOUT referred_by
--   - applyVerifiedSession's upsert is a no-op (profile already exists)
--   - profiles.referred_by stays NULL forever
--   - the "permanent" fallback layer (read referral code from profile) is
--     dead, leaving us only with localStorage and user_metadata
--
-- This patch adds `referred_by` to the column list so it's persisted on
-- first profile creation and stays available to processReferralIfNeeded
-- on every future login.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, auth_user_id, email,
    first_name, last_name, full_name,
    mobile_number, country_of_residence,
    state_abroad, city_abroad,
    indian_state, district, assembly_constituency, mandal,
    referral_code,
    referred_by,                -- NEW: who referred this user (referrer's code)
    role, created_at
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
    NEW.raw_user_meta_data->>'referred_by',
    'user',
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
