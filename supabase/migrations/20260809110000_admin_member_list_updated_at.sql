-- =====================================================================
-- 20260809110000 — admin_member_list(): add updated_at
--
-- USER-REQUESTED: "Excel Data: Add Joining Date and Last Edited Date."
-- The a-members export (AdminMembers.tsx exportCsv) currently has no
-- date columns at all. admin_member_list() already RETURNS created_at
-- (Joining Date) — it just isn't read by the export. Last Edited Date
-- needs updated_at added to the function; profiles.updated_at already
-- exists (20240101000100) and is admin-writable (20260805100000), it
-- was just never selected here. A faithful diff, same as every other
-- extension in this batch — nothing else about the function changes.
--
-- RETURNS TABLE is changing shape, so this needs DROP FUNCTION first —
-- CREATE OR REPLACE cannot add a column to an existing RETURNS TABLE.
-- =====================================================================

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
  created_at timestamptz, updated_at timestamptz,
  has_vote boolean, epic_number text, contribution_areas text[],
  wing_role text, wing_role_country text, wing_role_chapter text,
  referred_count bigint,
  total_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_global_scope() THEN
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
         p.role, p.status, p.onboarding_completed_at, p.created_at, p.updated_at,
         p.has_vote, p.epic_number, p.contribution_areas,
         mr.role::text, mr.country, ch.name,
         (SELECT count(*) FROM public.referrals r WHERE r.referrer_id = p.id),
         count(*) OVER ()
    FROM public.profiles p
    LEFT JOIN LATERAL (
      SELECT m.role, m.country, m.chapter_id
        FROM public.member_roles m
       WHERE m.profile_id = p.id AND m.revoked_at IS NULL
       ORDER BY public.role_rank(m.role::text)
       LIMIT 1
    ) mr ON true
    LEFT JOIN public.chapters ch ON ch.id = mr.chapter_id
   WHERE (
       p_search IS NULL OR btrim(p_search) = ''
       OR p.full_name     ILIKE '%' || btrim(p_search) || '%'
       OR p.email         ILIKE '%' || btrim(p_search) || '%'
       OR p.mobile_number ILIKE '%' || btrim(p_search) || '%'
       OR p.city_abroad   ILIKE '%' || btrim(p_search) || '%'
       OR p.public_user_code ILIKE '%' || btrim(p_search) || '%'
     )
   ORDER BY p.created_at DESC
   LIMIT greatest(1, least(coalesce(p_limit, 200), 2000))
  OFFSET greatest(0, coalesce(p_offset, 0));
END $$;

REVOKE ALL ON FUNCTION public.admin_member_list(text, int, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_member_list(text, int, int) TO authenticated;

COMMENT ON FUNCTION public.admin_member_list(text, int, int) IS
  'ADMIN/SECRETARIAT ONLY. updated_at added 20260809110000 for the '
  'export''s Last Edited Date column. Empty row set for non-privileged callers.';

DO $$
BEGIN
  RAISE NOTICE 'admin_member_list extended with updated_at';
END $$;
