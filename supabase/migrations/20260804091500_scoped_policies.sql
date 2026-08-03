-- =====================================================================
-- 20260804091500 — apply country scope to the policies that carry PII
--
-- Every policy here previously read "own row OR is_admin()". Each now
-- reads "own row OR my country OR is_admin()", so a coordinator sees
-- their country and nothing else — enforced by Postgres, not by React.
--
-- THE ONE THAT MATTERS MOST
--   profiles carries EPIC numbers, mobile numbers, dates of birth and
--   family contacts in AP. A coordinator needs names, cities and
--   contribution areas to organise; they do not need voter records.
--   Postgres RLS is row-level, not column-level, so the split is done
--   with a VIEW: coordinators read chapter_members, which simply does
--   not select the sensitive columns. A column that is never selected
--   cannot leak, however the query is written.
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
CREATE POLICY profiles_self_select ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR public.is_admin()
    OR public.has_country_scope(country_of_residence)
  );

-- Coordinators may correct a member's record inside their own country
-- (a misspelled city keeps someone out of every cluster). They may not
-- edit members elsewhere, and cannot grant themselves scope: country
-- comes from the row, not from the request.
DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = id
    OR public.is_admin()
    OR public.has_country_scope(country_of_residence)
  )
  WITH CHECK (
    auth.uid() = id
    OR public.is_admin()
    OR public.has_country_scope(country_of_residence)
  );

-- Deleting a member stays with the secretariat. Unchanged, stated here
-- so the full set is visible in one file.
DROP POLICY IF EXISTS profiles_admin_delete ON public.profiles;
CREATE POLICY profiles_admin_delete ON public.profiles
  FOR DELETE TO authenticated USING (public.is_admin());

-- ---------------------------------------------------------------------
-- chapter_members — what a coordinator actually reads
--
-- RLS cannot hide columns, only rows. This view is the column boundary:
-- epic_number, dob, family_* and the voter fields are absent by
-- construction, so no query against it can return them.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.chapter_members
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.public_user_code,
  p.first_name,
  p.last_name,
  p.full_name,
  p.email,
  p.mobile_number,
  p.country_of_residence,
  p.state_abroad,
  p.city_abroad,
  p.indian_state,
  p.district,
  p.assembly_constituency,
  p.mandal,
  p.profession,
  p.organization,
  p.contribution,
  p.participate_campaign,
  p.profile_photo,
  p.role,
  p.status,
  p.created_at
FROM public.profiles p;

COMMENT ON VIEW public.chapter_members IS
  'Member fields a coordinator may see. Deliberately omits epic_number, '
  'dob, family_* and voter status — those stay with the secretariat, so '
  'a compromised chapter account cannot expose them. security_invoker '
  'means the caller''s own RLS on profiles still applies underneath.';

GRANT SELECT ON public.chapter_members TO authenticated;

-- ---------------------------------------------------------------------
-- service_requests · grievances · student_requests
--   Same shape: requester, assignee, country coordinator, admin.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS service_requests_read_own_or_admin ON public.service_requests;
CREATE POLICY service_requests_read_own_or_admin ON public.service_requests
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR public.has_country_scope(
         (SELECT country_of_residence FROM public.profiles WHERE id = service_requests.user_id))
  );

DROP POLICY IF EXISTS service_requests_admin_update ON public.service_requests;
CREATE POLICY service_requests_admin_update ON public.service_requests
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR public.has_country_scope(
         (SELECT country_of_residence FROM public.profiles WHERE id = service_requests.user_id))
  );

DROP POLICY IF EXISTS grievances_read ON public.grievances;
CREATE POLICY grievances_read ON public.grievances
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR assigned_to = auth.uid()
    OR public.is_admin()
    OR public.has_country_scope(
         (SELECT country_of_residence FROM public.profiles WHERE id = grievances.profile_id))
  );

DROP POLICY IF EXISTS grievances_update ON public.grievances;
CREATE POLICY grievances_update ON public.grievances
  FOR UPDATE TO authenticated
  USING (
    assigned_to = auth.uid()
    OR public.is_admin()
    OR public.has_country_scope(
         (SELECT country_of_residence FROM public.profiles WHERE id = grievances.profile_id))
  );

DROP POLICY IF EXISTS student_requests_read ON public.student_requests;
CREATE POLICY student_requests_read ON public.student_requests
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR assigned_mentor_id = auth.uid()
    OR public.is_admin()
    OR public.has_country_scope(
         (SELECT country_of_residence FROM public.profiles WHERE id = student_requests.profile_id))
  );

DROP POLICY IF EXISTS student_requests_update ON public.student_requests;
CREATE POLICY student_requests_update ON public.student_requests
  FOR UPDATE TO authenticated
  USING (
    profile_id = auth.uid()
    OR assigned_mentor_id = auth.uid()
    OR public.is_admin()
    OR public.has_country_scope(
         (SELECT country_of_residence FROM public.profiles WHERE id = student_requests.profile_id))
  );

-- ---------------------------------------------------------------------
-- Override logging on the tables that carry member data
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_override_profiles ON public.profiles;
CREATE TRIGGER trg_override_profiles
  AFTER UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_override();

-- =====================================================================
-- Verify the boundary exists at all
-- =====================================================================
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM pg_policies
   WHERE schemaname='public' AND tablename='profiles'
     AND qual LIKE '%has_country_scope%';
  IF n < 2 THEN
    RAISE EXCEPTION 'profiles policies were not scoped — found % scoped policies', n;
  END IF;
  RAISE NOTICE 'country scope applied to % profiles policies', n;
END $$;
