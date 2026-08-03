-- =====================================================================
-- 20260804100000 — onboarding completion
--
-- Registration drops from 13 fields to 6. Everything else moves to a
-- gated wizard AFTER the account exists, because a verified member who
-- has already committed will answer four more sections, and a stranger
-- looking at a signup form will not.
--
-- The gate needs a definition of "complete" that both the app and the
-- database agree on, or the two drift and members get stuck behind a
-- wall the server does not think exists.
--
--   Required : country · city · constituency · mandal · gender
--   Optional : everything else, still asked, still skippable
--
-- district is absent deliberately — it is derived from constituency.
-- =====================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

COMMENT ON COLUMN public.profiles.onboarding_completed_at IS
  'Set when the five required fields are first all present. Null means '
  'the member has an account but has not finished the wizard.';

-- Single source of truth for "is this profile usable". The wizard, the
-- route guard and any report all call this rather than each carrying
-- their own idea of the rules.
CREATE OR REPLACE FUNCTION public.profile_is_complete(p public.profiles)
RETURNS boolean
LANGUAGE sql IMMUTABLE
AS $$
  SELECT coalesce(p.country_of_residence,  '') <> ''
     AND coalesce(p.city_abroad,           '') <> ''
     AND coalesce(p.assembly_constituency, '') <> ''
     AND coalesce(p.mandal,                '') <> ''
     AND coalesce(p.gender,                '') <> '';
$$;

-- Stamp the timestamp the first time it becomes true, and never clear
-- it afterwards. A member who later blanks their city has still been
-- through onboarding; locking them out again would be punitive and
-- would strand them with no way back in.
CREATE OR REPLACE FUNCTION public.stamp_onboarding_complete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.onboarding_completed_at IS NULL AND public.profile_is_complete(NEW) THEN
    NEW.onboarding_completed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_onboarding_complete ON public.profiles;
CREATE TRIGGER trg_onboarding_complete
  BEFORE INSERT OR UPDATE OF country_of_residence, city_abroad,
                             assembly_constituency, mandal, gender
  ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.stamp_onboarding_complete();

-- Backfill: members who already have all five predate the wizard and
-- must not be sent through it.
UPDATE public.profiles
   SET onboarding_completed_at = coalesce(updated_at, created_at, now())
 WHERE onboarding_completed_at IS NULL
   AND public.profile_is_complete(profiles);

-- What the wizard reads to decide which sections still need attention.
-- SECURITY DEFINER + auth.uid() so it can only ever describe the caller.
CREATE OR REPLACE FUNCTION public.my_onboarding_status()
RETURNS TABLE (
  completed         boolean,
  needs_country     boolean,
  needs_city        boolean,
  needs_constituency boolean,
  needs_mandal      boolean,
  needs_gender      boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p.onboarding_completed_at IS NOT NULL,
    coalesce(p.country_of_residence,  '') = '',
    coalesce(p.city_abroad,           '') = '',
    coalesce(p.assembly_constituency, '') = '',
    coalesce(p.mandal,                '') = '',
    coalesce(p.gender,                '') = ''
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.my_onboarding_status() TO authenticated;

-- Column-level grants from 20260804094500 are built by exclusion, so a
-- new column is withheld by default. onboarding_completed_at is not
-- sensitive and the app needs it.
GRANT SELECT (onboarding_completed_at) ON public.profiles TO authenticated;
