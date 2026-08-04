-- =====================================================================
-- 20260805094000 — a supported way to read and write the private fields
--
-- (2) DATA ERASURE
--   20260804094500 revoked SELECT on dob and family_* from
--   `authenticated`, so AuthContext stopped requesting them. The profile
--   editor still initialises those inputs (to '') and still submits them
--   on save. A member editing their phone number wrote NULL over their
--   date of birth and every family field.
--
--   Same shape as the normalizeAssembly bug: the act of opening and
--   saving a form destroys data the form never loaded. Restricting a
--   read without auditing the writes that depend on it is how this
--   happens.
--
-- (3) ADMIN SCREENS DEAD
--   Column privileges bind the `authenticated` role, which every JWT
--   uses — admins included. Users.tsx and AdminDashboard.tsx both select
--   dob and family_* directly, so Postgres rejected the whole statement
--   with 42501 and those screens listed nobody. The admin user list has
--   been broken since that migration landed.
--
-- THE FIX
--   Two SECURITY DEFINER functions with their own authorisation, which
--   is what the column grants were always missing:
--     my_private_profile()          the caller's own private fields
--     update_my_private_profile()   partial update, NULL means "leave"
--     admin_member_details(id)      one member, admin or in-scope only
--
--   update_my_private_profile takes each field as NULL-means-unchanged,
--   so a form that never loaded a value cannot blank it. That is the
--   property the editor needed and did not have.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.my_private_profile()
RETURNS TABLE (
  dob                text,
  family_relation    text,
  family_name        text,
  family_mobile      text,
  family_village     text,
  family_designation text,
  has_vote           boolean,
  epic_number        text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.dob, p.family_relation, p.family_name, p.family_mobile,
         p.family_village, p.family_designation, p.has_vote, p.epic_number
    FROM public.profiles p
   WHERE p.id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.my_private_profile() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_private_profile() TO authenticated;

-- Partial update. Every parameter defaults to NULL and NULL means
-- "leave this alone", so a caller that did not load a field cannot
-- erase it. Clearing a value is done with the explicit p_clear_* flags,
-- which is a deliberate act rather than an omission.
CREATE OR REPLACE FUNCTION public.update_my_private_profile(
  p_dob                text    DEFAULT NULL,
  p_family_relation    text    DEFAULT NULL,
  p_family_name        text    DEFAULT NULL,
  p_family_mobile      text    DEFAULT NULL,
  p_family_village     text    DEFAULT NULL,
  p_family_designation text    DEFAULT NULL,
  p_has_vote           boolean DEFAULT NULL,
  p_epic_number        text    DEFAULT NULL,
  p_clear_dob          boolean DEFAULT false,
  p_clear_family       boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.profiles p
     SET dob                = CASE WHEN p_clear_dob THEN NULL
                                   ELSE coalesce(p_dob, p.dob) END,
         family_relation    = CASE WHEN p_clear_family THEN NULL
                                   ELSE coalesce(nullif(btrim(p_family_relation), ''), p.family_relation) END,
         family_name        = CASE WHEN p_clear_family THEN NULL
                                   ELSE coalesce(nullif(btrim(p_family_name), ''), p.family_name) END,
         family_mobile      = CASE WHEN p_clear_family THEN NULL
                                   ELSE coalesce(nullif(btrim(p_family_mobile), ''), p.family_mobile) END,
         family_village     = CASE WHEN p_clear_family THEN NULL
                                   ELSE coalesce(nullif(btrim(p_family_village), ''), p.family_village) END,
         family_designation = CASE WHEN p_clear_family THEN NULL
                                   ELSE coalesce(nullif(btrim(p_family_designation), ''), p.family_designation) END,
         has_vote           = coalesce(p_has_vote, p.has_vote),
         epic_number        = coalesce(nullif(btrim(p_epic_number), ''), p.epic_number)
   WHERE p.id = auth.uid();

  RETURN FOUND;
END $$;

REVOKE ALL ON FUNCTION public.update_my_private_profile(
  text, text, text, text, text, text, boolean, text, boolean, boolean)
  FROM public, anon;
GRANT EXECUTE ON FUNCTION public.update_my_private_profile(
  text, text, text, text, text, text, boolean, text, boolean, boolean)
  TO authenticated;

-- ── the admin member list, which is what Users.tsx needs ─────────────
-- Returns the columns the admin screens actually display. Scoped: an
-- admin sees everyone, a coordinator sees their own countries. Voter
-- fields stay out — admin_voter_rows() exists for those and is audited.
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
         p.role, p.status, p.onboarding_completed_at, p.created_at,
         count(*) OVER ()
    FROM public.profiles p
   WHERE public.member_in_scope(p.country_of_residence, p.city_abroad)
     AND (
       p_search IS NULL OR btrim(p_search) = ''
       OR p.full_name  ILIKE '%' || btrim(p_search) || '%'
       OR p.email      ILIKE '%' || btrim(p_search) || '%'
       OR p.mobile_number ILIKE '%' || btrim(p_search) || '%'
       OR p.city_abroad ILIKE '%' || btrim(p_search) || '%'
     )
   ORDER BY p.created_at DESC
   LIMIT greatest(1, least(coalesce(p_limit, 200), 2000))
  OFFSET greatest(0, coalesce(p_offset, 0));
END $$;

REVOKE ALL ON FUNCTION public.admin_member_list(text, int, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_member_list(text, int, int) TO authenticated;

COMMENT ON FUNCTION public.admin_member_list(text, int, int) IS
  'Member list for admin and coordinator screens, including the columns '
  'withheld from the authenticated role at the column level. Scoped by '
  'member_in_scope(); returns nothing to a member with no role.';
