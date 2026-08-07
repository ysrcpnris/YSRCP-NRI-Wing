-- =====================================================================
-- 20260808110000 — Members (a-members)
--
-- Extends admin_member_list() — a faithful diff of the true latest
-- definition (20260805112000_role_rpcs_and_privacy.sql, confirmed by
-- grepping every "CREATE OR REPLACE FUNCTION public.admin_member_list"
-- and checking there is no later one) — adding exactly the columns
-- the mock's table needs and nothing else. Every existing column,
-- the has_global_scope() gate, and the search predicate are unchanged.
--
-- "Join org" is deliberately still absent here — checked with the
-- user separately (see the profiles.join_org_interest migration) and
-- will be added to this RPC once that column exists, not guessed at
-- now. Same reasoning already applied twice this session (c-members,
-- and this screen's own research pass): no column, don't render it.
--
-- "Import cohort" has no backend anywhere in this codebase (checked:
-- no bulk-import/csv mechanism exists) and isn't touched by this
-- migration — the button is dropped in the UI, not stubbed.
--
-- referred_count uses the `referrals` table (referrer_id/referred_id),
-- not profiles.referred_by. Tracing referred_by's only two write paths
-- (process_my_referral() and the live "Copy invite link" in
-- Dashboard.tsx, both keyed on referral_code) found TWO independent
-- bugs, not one: my_chapter_new_joinees() joined referred_by against
-- the wrong code column (public_user_code, not referral_code — fixed
-- in 20260808110001), and process_my_referral()'s own UPDATE to
-- referred_by has been silently reverted since guard_privileged_
-- profile_columns() (20260805114000/20260805230000) started resetting
-- NEW.referred_by := OLD.referred_by on every profiles UPDATE that
-- doesn't set the app.private_profile_write escape hatch — which
-- process_my_referral(), written months earlier, never learned to do.
-- Confirmed live: called process_my_referral() as a real fixture,
-- referrals gained a real row, profiles.referred_by stayed NULL.
-- Fixed at the source in 20260808110002; referred_count and
-- referred_by_name both read the reliable `referrals` table instead
-- of the fragile denormalised text column either way, so they're
-- correct regardless of whether referred_by itself ever gets fixed.
-- =====================================================================

DROP FUNCTION IF EXISTS public.admin_member_list(text, int, int);
CREATE OR REPLACE FUNCTION public.admin_member_list(
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
  created_at timestamptz,
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
         p.role, p.status, p.onboarding_completed_at, p.created_at,
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
  'ADMIN ONLY. Returns dob, family_*, has_vote and epic_number — columns revoked from the '
  'authenticated role. Coordinators use chapter_roster(), which has '
  'never carried them.';

DO $$
BEGIN
  RAISE NOTICE 'admin_member_list extended for a-members';
END $$;
