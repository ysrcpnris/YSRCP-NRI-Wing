-- =====================================================================
-- 20260804110000 — mandal is required only where mandals exist
--
-- THE PROBLEM THIS AVOIDS
--   profile_is_complete() requires mandal. ap_mandals is empty — seeding
--   ~670 mandals across 175 constituencies is a data-sourcing task, not
--   a code one. Shipping the wizard as written would block every single
--   member behind a dropdown with nothing in it.
--
--   The member data cannot fill the gap either. Members typed 722
--   distinct mandal strings for 206 constituencies:
--     Pullampet / Pullampeta / Pulampet
--     Proddatur / PRODDUTOOR / PRODDATUR_Mandal / Proddatur_local
--     మైదుకూరు (Telugu script)
--   Seeding from that would make the reference table as unreliable as
--   the free text it replaces.
--
-- THE RULE
--   Mandal is required for a constituency that HAS mandals loaded, and
--   optional for one that does not. So the requirement switches itself
--   on per constituency as the reference data arrives, with no code
--   change and no migration — and no member is ever asked for something
--   the system cannot offer.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.profile_is_complete(p public.profiles)
RETURNS boolean
LANGUAGE sql STABLE           -- no longer IMMUTABLE: it reads ap_mandals
AS $$
  SELECT coalesce(p.country_of_residence,  '') <> ''
     AND coalesce(p.city_abroad,           '') <> ''
     AND coalesce(p.assembly_constituency, '') <> ''
     AND coalesce(p.gender,                '') <> ''
     AND (
       coalesce(p.mandal, '') <> ''
       OR NOT EXISTS (
         SELECT 1
           FROM public.ap_mandals m
           JOIN public.ap_constituencies c ON c.id = m.constituency_id
          WHERE c.name = p.assembly_constituency
            AND m.is_active
       )
     );
$$;

COMMENT ON FUNCTION public.profile_is_complete(public.profiles) IS
  'Required: country, city, constituency, gender — plus mandal, but only '
  'where that constituency has mandals loaded. Nobody is blocked by a '
  'dropdown that has nothing in it.';

-- The wizard asks the same question, so it gets the same answer.
CREATE OR REPLACE FUNCTION public.my_onboarding_status()
RETURNS TABLE (
  completed          boolean,
  needs_country      boolean,
  needs_city         boolean,
  needs_constituency boolean,
  needs_mandal       boolean,
  needs_gender       boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p.onboarding_completed_at IS NOT NULL,
    coalesce(p.country_of_residence,  '') = '',
    coalesce(p.city_abroad,           '') = '',
    coalesce(p.assembly_constituency, '') = '',
    coalesce(p.mandal, '') = '' AND EXISTS (
      SELECT 1 FROM public.ap_mandals m
        JOIN public.ap_constituencies c ON c.id = m.constituency_id
       WHERE c.name = p.assembly_constituency AND m.is_active),
    coalesce(p.gender, '') = ''
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

-- Does this constituency have mandals yet? The picker calls this to
-- decide whether to mark the field required.
CREATE OR REPLACE FUNCTION public.constituency_has_mandals(p_name text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ap_mandals m
      JOIN public.ap_constituencies c ON c.id = m.constituency_id
     WHERE c.name = p_name AND m.is_active);
$$;

GRANT EXECUTE ON FUNCTION public.constituency_has_mandals(text) TO anon, authenticated;

-- The completion trigger referenced the old IMMUTABLE signature.
DROP TRIGGER IF EXISTS trg_onboarding_complete ON public.profiles;
CREATE TRIGGER trg_onboarding_complete
  BEFORE INSERT OR UPDATE OF country_of_residence, city_abroad,
                             assembly_constituency, mandal, gender
  ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.stamp_onboarding_complete();
