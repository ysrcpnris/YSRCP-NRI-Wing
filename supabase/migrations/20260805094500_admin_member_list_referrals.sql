-- =====================================================================
-- 20260805094500 — admin_member_list also returns the referral columns
--
-- AdminDashboard computes referral statistics from referral_code and
-- referred_by. Those were in its old direct select and absent from
-- admin_member_list, so swapping the query would have silently zeroed
-- the referral report — a fix that breaks a different screen.
--
-- Both are readable by `authenticated` already (they are not part of the
-- protected set); they were simply missing from the function's shape.
-- =====================================================================

-- CREATE OR REPLACE cannot widen a RETURNS TABLE — the row type is part
-- of the signature. Drop first.
DROP FUNCTION IF EXISTS public.admin_member_list(text, int, int);

CREATE FUNCTION public.admin_member_list(
  p_search text DEFAULT NULL,
  p_limit  int  DEFAULT 200,
  p_offset int  DEFAULT 0
)
RETURNS TABLE (
  id uuid, public_user_code text, first_name text, last_name text,
  full_name text, email text, mobile_number text, whatsapp_number text,
  gender text, dob text, contribution text, profession text,
  organization text, designation text,
  country_of_residence text, state_abroad text, city_abroad text,
  indian_state text, district text, assembly_constituency text,
  mandal text, village text,
  family_relation text, family_name text, family_mobile text,
  family_village text, family_designation text,
  referral_code text, referred_by text,
  role text, status text, onboarding_completed_at timestamptz,
  created_at timestamptz, total_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_global_scope()
          OR array_length(public.my_countries(), 1) IS NOT NULL
          OR array_length(public.my_cluster_ids(), 1) IS NOT NULL) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id, p.public_user_code, p.first_name, p.last_name, p.full_name,
         p.email, p.mobile_number, p.whatsapp_number, p.gender, p.dob,
         p.contribution, p.profession, p.organization, p.designation,
         p.country_of_residence, p.state_abroad, p.city_abroad,
         p.indian_state, p.district, p.assembly_constituency,
         p.mandal, p.village,
         p.family_relation, p.family_name, p.family_mobile,
         p.family_village, p.family_designation,
         p.referral_code, p.referred_by,
         p.role, p.status, p.onboarding_completed_at, p.created_at,
         count(*) OVER ()
    FROM public.profiles p
   WHERE public.member_in_scope(p.country_of_residence, p.city_abroad)
     AND (
       p_search IS NULL OR btrim(p_search) = ''
       OR p.full_name     ILIKE '%' || btrim(p_search) || '%'
       OR p.email         ILIKE '%' || btrim(p_search) || '%'
       OR p.mobile_number ILIKE '%' || btrim(p_search) || '%'
       OR p.city_abroad   ILIKE '%' || btrim(p_search) || '%'
     )
   ORDER BY p.created_at DESC
   LIMIT greatest(1, least(coalesce(p_limit, 200), 2000))
  OFFSET greatest(0, coalesce(p_offset, 0));
END $$;

REVOKE ALL ON FUNCTION public.admin_member_list(text, int, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_member_list(text, int, int) TO authenticated;
