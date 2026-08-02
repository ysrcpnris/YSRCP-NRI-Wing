-- =====================================================================
-- Propagate `gender` and `contribution` from signup metadata into
-- public.profiles.
--
-- WHY THIS MIGRATION EXISTS
-- -------------------------
-- A field submitted at signup has to survive three independent filters
-- before it lands in `profiles`. Any one of them omitting the field
-- drops it silently, with no error shown to the user:
--
--   1. the form's profilePayload            (RegisterPage / AuthModal)
--   2. the `keys[]` allow-list in signUp()  (contexts/AuthContext.tsx)
--   3. the column list in handle_new_user() (this file)
--
-- Layers 1 and 2 are handled in the accompanying frontend change. This
-- migration is layer 3. Adding the fields to the form WITHOUT this
-- migration would appear to work and quietly persist nothing.
--
-- WHAT CHANGED
-- ------------
--   • `gender`       — now required on /register, optional in the modal.
--                      Feeds the Gender column already present in the
--                      admin Users tab, the event applicant list, and
--                      three sheets of the Excel export.
--   • `contribution` — new optional free-text field on /register. The
--                      column already exists (new_01) and is already read
--                      and exported by the admin dashboard, so no schema
--                      change is needed — only trigger propagation.
--
-- Both columns already exist on public.profiles. This migration adds no
-- columns; it only widens what the signup trigger copies across.
--
-- DELIBERATELY NOT CHANGED
-- ------------------------
-- `referred_by` is still absent from the column list below. It was added
-- by new_12 and then dropped by new_23's CREATE OR REPLACE, so referral
-- codes have not persisted to profiles since new_23 was applied. That is
-- a real open bug, but it is out of scope here by explicit decision —
-- restoring it changes referral behaviour in production and is being
-- handled separately. Do not "helpfully" add it back as part of an
-- unrelated change.
--
-- Base version: new_23_support_team_auth.sql. The support_team role
-- branch from that migration is preserved verbatim below.
--
-- Idempotent: CREATE OR REPLACE. Re-running is a no-op.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
-- Pinned search_path, matching new_12 and the convention new_13 set for
-- SECURITY DEFINER functions. new_23 omitted it; restoring parity here.
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := CASE
    WHEN NEW.raw_user_meta_data->>'role' = 'support_team' THEN 'support_team'
    ELSE 'user'
  END;

  INSERT INTO public.profiles (
    id, auth_user_id, email,
    first_name, last_name, full_name,
    mobile_number, country_of_residence,
    state_abroad, city_abroad,
    indian_state, district, assembly_constituency, mandal,
    gender,                     -- NEW: collected at signup
    contribution,               -- NEW: optional free text
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
    NEW.raw_user_meta_data->>'gender',
    NEW.raw_user_meta_data->>'contribution',
    NEW.raw_user_meta_data->>'referral_code',
    v_role,
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- The BEFORE INSERT trigger (trg_profiles_autofill_codes) and the
-- AFTER INSERT trigger on auth.users both already point at this
-- function name — no trigger recreation needed.

-- ---------------------------------------------------------------------
-- Sanity check: confirm both columns exist before anyone relies on the
-- trigger writing to them. Fails loudly at migration time rather than
-- silently dropping data at signup time.
-- ---------------------------------------------------------------------
DO $verify$
DECLARE
  v_missing text;
BEGIN
  SELECT string_agg(c, ', ')
    INTO v_missing
    FROM unnest(ARRAY['gender', 'contribution']) AS c
   WHERE NOT EXISTS (
     SELECT 1
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = 'profiles'
        AND column_name  = c
   );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'public.profiles is missing expected column(s): %', v_missing;
  END IF;

  RAISE NOTICE 'handle_new_user now propagates gender + contribution.';
END $verify$;
