-- =====================================================================
-- 20260804270000 — the coordinator's assistance queue
--
-- A grievance nobody sees is a database row, not a service. This is the
-- other half of 20260804260000: the list a coordinator works from.
--
-- SCOPE
--   Reads my_countries(), same as chapter_roster(). A coordinator sees
--   cases from their own countries; admin sees everything. The existing
--   row policies already enforce this on the tables themselves — this
--   function exists to join the three types into one queue and to carry
--   the member's name and contact, which a coordinator needs in order
--   to actually follow up.
--
-- WHAT IT DOES NOT EXPOSE
--   No epic_number, no dob, no family_* — the same withheld set as
--   everywhere else. A grievance about a chapter event does not justify
--   handing over the complainant's voter ID.
--
-- WHY grievances.country IS NOT TRUSTED
--   The column exists and is nullable, and nothing has ever populated
--   it (the table has never been written to by the app). Scope is
--   therefore taken from the member's own profile, which is the same
--   source chapter_roster() uses. Two definitions of "which country is
--   this case in" is one more than a security boundary can afford.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.assistance_queue(
  p_status  text DEFAULT NULL,   -- null = everything still open
  p_kind    text DEFAULT NULL,   -- 'grievance' | 'student' | null
  p_limit   int  DEFAULT 100,
  p_offset  int  DEFAULT 0
)
RETURNS TABLE (
  kind          text,
  id            uuid,
  reference_no  text,
  title         text,
  detail        text,
  status        text,
  response      text,
  member_id     uuid,
  member_name   text,
  member_email  text,
  member_mobile text,
  member_country text,
  member_city   text,
  created_at    timestamptz,
  updated_at    timestamptz,
  total_count   bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE scoped text[];
BEGIN
  scoped := public.my_countries();
  IF scoped IS NULL OR array_length(scoped, 1) IS NULL THEN
    RETURN;                                   -- no role, no queue
  END IF;

  RETURN QUERY
  WITH cases AS (
    SELECT 'grievance'::text AS kind, g.id, g.reference_no,
           g.subject AS title, g.description AS detail,
           g.status, g.response, g.profile_id, g.created_at, g.updated_at
      FROM public.grievances g
     WHERE p_kind IS NULL OR p_kind = 'grievance'

    UNION ALL

    SELECT 'student', s.id, s.reference_no,
           coalesce(s.request_type, 'Student assistance'), s.description,
           s.status, NULL, s.profile_id, s.created_at, s.updated_at
      FROM public.student_requests s
     WHERE p_kind IS NULL OR p_kind = 'student'
  ),
  scoped_cases AS (
    SELECT c.*, p.full_name, p.email, p.mobile_number,
           p.country_of_residence, p.city_abroad
      FROM cases c
      JOIN public.profiles p ON p.id = c.profile_id
     WHERE p.country_of_residence = ANY (scoped)
       AND (
         CASE
           WHEN p_status IS NULL       THEN c.status IN ('open', 'in_progress')
           WHEN p_status = 'all'       THEN true
           ELSE c.status = p_status
         END
       )
  )
  SELECT sc.kind, sc.id, sc.reference_no, sc.title, sc.detail,
         sc.status, sc.response, sc.profile_id,
         sc.full_name, sc.email, sc.mobile_number,
         sc.country_of_residence, sc.city_abroad,
         sc.created_at, sc.updated_at,
         count(*) OVER () AS total_count
    FROM scoped_cases sc
   -- Oldest first: a queue sorted newest-first quietly buries the case
   -- that has been waiting longest, which is the one that matters most.
   ORDER BY sc.created_at ASC
   LIMIT greatest(1, least(coalesce(p_limit, 100), 500))
  OFFSET greatest(0, coalesce(p_offset, 0));
END $$;

REVOKE ALL ON FUNCTION public.assistance_queue(text, text, int, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.assistance_queue(text, text, int, int) TO authenticated;

COMMENT ON FUNCTION public.assistance_queue(text, text, int, int) IS
  'Open grievances and student requests for the caller''s scoped '
  'countries, oldest first. No voter, DOB or family fields.';

-- Respond to a case. A function rather than a direct UPDATE so that the
-- status vocabulary and the scope check live in one place, and so a
-- coordinator cannot set a status the UI does not offer.
CREATE OR REPLACE FUNCTION public.respond_to_case(
  p_kind     text,
  p_id       uuid,
  p_status   text,
  p_response text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  scoped  text[];
  owner_country text;
BEGIN
  IF p_status NOT IN ('open', 'in_progress', 'resolved', 'closed', 'rejected') THEN
    RAISE EXCEPTION 'unknown status: %', p_status;
  END IF;
  IF p_kind NOT IN ('grievance', 'student') THEN
    RAISE EXCEPTION 'unknown case type: %', p_kind;
  END IF;

  scoped := public.my_countries();
  IF scoped IS NULL OR array_length(scoped, 1) IS NULL THEN
    RETURN false;
  END IF;

  -- Whose case is it, and is that country in scope? Checked before any
  -- write, so an out-of-scope id changes nothing and reveals nothing.
  IF p_kind = 'grievance' THEN
    SELECT p.country_of_residence INTO owner_country
      FROM public.grievances g JOIN public.profiles p ON p.id = g.profile_id
     WHERE g.id = p_id;
  ELSE
    SELECT p.country_of_residence INTO owner_country
      FROM public.student_requests s JOIN public.profiles p ON p.id = s.profile_id
     WHERE s.id = p_id;
  END IF;

  IF owner_country IS NULL OR NOT (owner_country = ANY (scoped)) THEN
    RETURN false;
  END IF;

  IF p_kind = 'grievance' THEN
    UPDATE public.grievances
       SET status = p_status,
           response = coalesce(p_response, response),
           assigned_to = coalesce(assigned_to, auth.uid())
     WHERE id = p_id;
  ELSE
    UPDATE public.student_requests
       SET status = p_status,
           assigned_mentor_id = coalesce(assigned_mentor_id, auth.uid())
     WHERE id = p_id;
  END IF;

  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.respond_to_case(text, uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_case(text, uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.respond_to_case(text, uuid, text, text) IS
  'Set a case status and reply. Returns false, changing nothing, if the '
  'caller has no role or the case belongs to a country out of scope.';
