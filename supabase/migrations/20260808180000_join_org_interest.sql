-- =====================================================================
-- 20260808180000 — "Would you like to join the organisation formally?"
-- gets a real column
--
-- CHECKED WITH THE USER EARLIER THIS SESSION (before this migration
-- batch): "Finally build it, real column." Three files have carried
-- the deferred half of that decision as documented gaps until now:
--   - MyProfile.tsx: renders JOIN_OPTIONS (yes/not_yet/tell_me_more)
--     but never sends the answer anywhere, with an inline "Not saved
--     yet... Coming soon" warning.
--   - MyChapterMembers.tsx (c-members): explicitly omits the mock's
--     "Join org" column, citing MyProfile.tsx's own gap.
--   - AdminMembers.tsx (a-members, this batch): explicitly omits it
--     too, same reasoning, same "will be added ... once that column
--     exists" note.
--
-- NOT participate_campaign. That column already means something else
-- (how a member wants to take part in campaigns — physically,
-- digitally, funding — collected at signup) and reusing it under a
-- different question would silently answer one question with data
-- collected for another, per MyProfile.tsx's and 20260806120000's own
-- prior reasoning. join_org_interest is new and single-purpose.
--
-- ORDINARY, NOT RESTRICTED. This is the member's own stated interest,
-- the same class of field as contribution_areas (self-declared,
-- visible to the member and to coordinators/admin scoped to them) —
-- not dob/family_*/has_vote/epic_number/voter_constituency's class of
-- privileged PII. Granted directly, not funnelled through
-- update_my_private_profile().
--
-- WHAT THIS DOES NOT BUILD: any follow-up mechanism. The mock's copy
-- promises "a coordinator will contact you" — no notification/contact
-- pipeline exists anywhere in this schema (same conclusion already
-- reached for a-assist's dropped "Nudge chapter"/"Escalate" buttons).
-- This migration makes the answer real and visible to whoever manages
-- that member; it does not invent an automated contact system nobody
-- asked for.
-- =====================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS join_org_interest text
    CHECK (join_org_interest IN ('yes', 'not_yet', 'tell_me_more'));

COMMENT ON COLUMN public.profiles.join_org_interest IS
  'Member''s own answer to "would you like to join the organisation '
  'formally?" — an ordinary, member-editable field, not privileged PII.';

GRANT SELECT (join_org_interest), UPDATE (join_org_interest)
  ON public.profiles TO authenticated;

-- ── chapter_roster(): faithful diff, +join_org_interest ──────────────
DROP FUNCTION IF EXISTS public.chapter_roster(text, text, text, text, int, int);
CREATE OR REPLACE FUNCTION public.chapter_roster(
  p_country      text DEFAULT NULL,
  p_search       text DEFAULT NULL,
  p_city         text DEFAULT NULL,
  p_contribution text DEFAULT NULL,
  p_limit        int  DEFAULT 100,
  p_offset       int  DEFAULT 0
)
RETURNS TABLE (
  id                  uuid,
  full_name           text,
  email               text,
  mobile_number       text,
  city_abroad         text,
  country             text,
  chapter             text,
  constituency        text,
  district            text,
  joined_at           timestamptz,
  contribution_areas  text[],
  public_user_code    text,
  join_org_interest   text,
  total_count         bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_global_scope()
          OR array_length(public.my_countries(), 1) IS NOT NULL
          OR array_length(public.my_chapter_ids(), 1) IS NOT NULL) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH scoped AS (
    SELECT p.id, p.full_name, p.email, p.mobile_number,
           p.city_abroad, p.country_of_residence,
           cl.name AS chapter_name,
           p.assembly_constituency, p.district, p.created_at,
           p.contribution_areas, p.public_user_code, p.join_org_interest
      FROM public.profiles p
      LEFT JOIN public.chapter_cities cc
             ON lower(btrim(cc.country)) = lower(btrim(p.country_of_residence))
            AND lower(btrim(cc.city))    = lower(btrim(p.city_abroad))
      LEFT JOIN public.chapters cl ON cl.id = cc.chapter_id
     WHERE public.member_in_scope(p.country_of_residence, p.city_abroad)
       AND (p_country IS NULL OR p.country_of_residence = p_country)
       AND (p_city IS NULL OR btrim(p_city) = '' OR p.city_abroad ILIKE p_city)
       AND (p_contribution IS NULL OR btrim(p_contribution) = ''
            OR p.contribution_areas @> ARRAY[p_contribution])
       AND (
         p_search IS NULL OR btrim(p_search) = ''
         OR p.full_name   ILIKE '%' || btrim(p_search) || '%'
         OR p.email       ILIKE '%' || btrim(p_search) || '%'
         OR p.city_abroad ILIKE '%' || btrim(p_search) || '%'
       )
  )
  SELECT s.id, s.full_name, s.email, s.mobile_number,
         s.city_abroad, s.country_of_residence, s.chapter_name,
         s.assembly_constituency, s.district, s.created_at,
         s.contribution_areas, s.public_user_code, s.join_org_interest,
         count(*) OVER ()
    FROM scoped s
   ORDER BY s.created_at DESC
   LIMIT greatest(1, least(coalesce(p_limit, 100), 500))
  OFFSET greatest(0, coalesce(p_offset, 0));
END $$;

REVOKE ALL ON FUNCTION public.chapter_roster(text, text, text, text, int, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.chapter_roster(text, text, text, text, int, int) TO authenticated;

-- ── admin_member_list(): faithful diff, +join_org_interest ───────────
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
  join_org_interest text,
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
         p.join_org_interest,
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
  RAISE NOTICE 'join_org_interest added; chapter_roster/admin_member_list extended';
END $$;
