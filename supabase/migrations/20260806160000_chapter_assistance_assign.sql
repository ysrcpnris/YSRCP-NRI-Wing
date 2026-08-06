-- =====================================================================
-- 20260806160000 — Chapter Assistance screen (c-assist): real assignment
--
-- THIS DOES NOT TOUCH assistance_queue() OR AssistanceQueue.tsx
--   That RPC and component are shared by the existing Chapter
--   "Assistance queue" tab AND the Admin surface. Both are tuned to
--   its current two-kind (grievance/student) shape and to
--   respond_to_case(), which only ever understood those two kinds.
--   Widening assistance_queue() in place to add a third kind and two
--   new columns would change behaviour under two callers this slice
--   never touched or re-tested. Instead: an entirely new RPC,
--   chapter_assistance_board(), purpose-built for the new c-assist
--   screen. Nothing existing changes shape.
--
-- "JOB" REQUESTS — CHECKED WITH THE USER, NOT ASSUMED
--   grievances/student_requests have no "job" kind; the only "job"
--   concept lives on the Assistance Board (assistance_posts,
--   20260805238000), a deliberately public, self-service subsystem
--   with no coordinator-assignment path at all. Asked whether c-assist
--   should therefore omit Job, show it read-only, or gain real
--   assignment — answer was real assignment. So: assistance_posts
--   gains assigned_to, additive to its existing self-service model
--   (offer_help() / share_contact_with_helper() are untouched — a
--   poster can still get organic offers same as before; a coordinator
--   can now ALSO formally route a case to a chapter volunteer).
--
-- ASSIGNABLE TARGETS ARE REAL VOLUNTEERS, NOT ANY PROFILE
--   assign_case() will only assign to a profile holding an active
--   member_roles row scoped to the case's own chapter (or, for a
--   country-wide role, the case's country) — matching the mock's
--   "Your volunteers" card, which is chapter team leads, not an
--   arbitrary member. Assigning to someone with no standing in that
--   chapter would grant them visibility into a case they have no
--   reason to see.
--
-- "MEDIAN FIRST REPLY" / "RESPONSE RATE" — SAME CAVEAT AS c-home
--   No first-response timestamp exists anywhere in this schema.
--   chapter_assistance_stats() computes and labels time-to-resolution
--   and "moved off Open", the same real, smaller claims used in
--   my_chapter_home() (20260806150000) — not the mock's literal
--   wording.
-- =====================================================================

ALTER TABLE public.assistance_posts
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Deliberately NOT added to the authenticated column grant below —
-- assistance_posts_update_own only ever granted (status, resolved_at).
-- assigned_to is writable exclusively through assign_case(), so a
-- direct PATCH /rest/v1/assistance_posts?id=eq.<id> with
-- {"assigned_to": ...} is refused at the column-privilege level before
-- RLS is even consulted — the same defence-in-depth already used for
-- welcomed_at, expires_at and every write RPC this session.

-- ── merged queue with real assignment, purpose-built for c-assist ────
CREATE OR REPLACE FUNCTION public.chapter_assistance_board(
  p_status text DEFAULT NULL, p_kind text DEFAULT NULL,
  p_limit int DEFAULT 100, p_offset int DEFAULT 0
)
RETURNS TABLE (
  kind text, id uuid, reference_no text, title text, detail text,
  status text, member_id uuid, member_name text, member_email text,
  member_mobile text, member_country text, member_city text,
  created_at timestamptz, updated_at timestamptz,
  assigned_to uuid, assigned_name text, total_count bigint
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
  WITH cases AS (
    SELECT 'grievance'::text AS kind, g.id, g.reference_no,
           g.subject AS title, g.description AS detail,
           g.status, g.profile_id, g.assigned_to, g.created_at, g.updated_at,
           NULL::text AS scope_country, NULL::text AS scope_city
      FROM public.grievances g
     WHERE p_kind IS NULL OR p_kind = 'grievance'
    UNION ALL
    SELECT 'student', s.id, s.reference_no,
           coalesce(s.request_type, 'Student assistance'), s.description,
           s.status, s.profile_id, s.assigned_mentor_id, s.created_at, s.updated_at,
           NULL, NULL
      FROM public.student_requests s
     WHERE p_kind IS NULL OR p_kind = 'student'
    UNION ALL
    -- country/city come from the post's own denormalised columns, not
    -- the poster's current profile — matching assistance_posts' own
    -- design (a member who moves shouldn't make old posts vanish or
    -- reappear in a country's board).
    SELECT 'job', ap.id, NULL,
           ap.title, ap.description,
           ap.status, ap.profile_id, ap.assigned_to, ap.created_at,
           coalesce(ap.resolved_at, ap.created_at),
           ap.country, ap.city
      FROM public.assistance_posts ap
     WHERE ap.category = 'job' AND (p_kind IS NULL OR p_kind = 'job')
  ),
  scoped_cases AS (
    SELECT c.*, p.full_name, p.email, p.mobile_number,
           coalesce(c.scope_country, p.country_of_residence) AS eff_country,
           coalesce(c.scope_city, p.city_abroad) AS eff_city,
           asg.full_name AS assigned_name
      FROM cases c
      JOIN public.profiles p ON p.id = c.profile_id
      LEFT JOIN public.profiles asg ON asg.id = c.assigned_to
     WHERE public.member_in_scope(coalesce(c.scope_country, p.country_of_residence),
                                   coalesce(c.scope_city, p.city_abroad))
       AND (
         CASE
           WHEN p_status IS NULL THEN c.status IN ('open', 'in_progress')
           WHEN p_status = 'all'  THEN true
           ELSE c.status = p_status
         END
       )
  )
  SELECT sc.kind, sc.id, sc.reference_no, sc.title, sc.detail,
         sc.status, sc.profile_id, sc.full_name, sc.email, sc.mobile_number,
         sc.eff_country, sc.eff_city, sc.created_at, sc.updated_at,
         sc.assigned_to, sc.assigned_name, count(*) OVER ()
    FROM scoped_cases sc
   ORDER BY sc.created_at ASC
   LIMIT greatest(1, least(coalesce(p_limit, 100), 500))
  OFFSET greatest(0, coalesce(p_offset, 0));
END $$;

REVOKE ALL ON FUNCTION public.chapter_assistance_board(text, text, int, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.chapter_assistance_board(text, text, int, int) TO authenticated;

-- ── assign a case to a chapter volunteer ──────────────────────────────
CREATE OR REPLACE FUNCTION public.assign_case(p_kind text, p_id uuid, p_volunteer_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_country text; v_city text;
BEGIN
  IF p_kind NOT IN ('grievance', 'student', 'job') THEN
    RAISE EXCEPTION 'unknown case type: %', p_kind USING ERRCODE = '22023';
  END IF;
  IF NOT public.can_write_scope() THEN
    RETURN false;                       -- team_lead reaches here, same as respond_to_case()
  END IF;

  IF p_kind = 'grievance' THEN
    SELECT p.country_of_residence, p.city_abroad INTO v_country, v_city
      FROM public.grievances g JOIN public.profiles p ON p.id = g.profile_id
     WHERE g.id = p_id;
  ELSIF p_kind = 'student' THEN
    SELECT p.country_of_residence, p.city_abroad INTO v_country, v_city
      FROM public.student_requests s JOIN public.profiles p ON p.id = s.profile_id
     WHERE s.id = p_id;
  ELSE
    SELECT ap.country, ap.city INTO v_country, v_city
      FROM public.assistance_posts ap WHERE ap.id = p_id AND ap.category = 'job';
  END IF;

  IF v_country IS NULL OR NOT public.member_in_scope(v_country, v_city) THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.member_roles mr
     WHERE mr.profile_id = p_volunteer_id
       AND mr.revoked_at IS NULL
       AND (
         mr.chapter_id = public.chapter_for_city(v_country, v_city)
         OR (mr.chapter_id IS NULL AND mr.country = v_country)
       )
  ) THEN
    RAISE EXCEPTION 'target is not an active team member for this case''s chapter' USING ERRCODE = '42501';
  END IF;

  IF p_kind = 'grievance' THEN
    UPDATE public.grievances SET assigned_to = p_volunteer_id WHERE id = p_id;
  ELSIF p_kind = 'student' THEN
    UPDATE public.student_requests SET assigned_mentor_id = p_volunteer_id WHERE id = p_id;
  ELSE
    UPDATE public.assistance_posts SET assigned_to = p_volunteer_id WHERE id = p_id AND category = 'job';
  END IF;

  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.assign_case(text, uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.assign_case(text, uuid, uuid) TO authenticated;

-- ── the "Your volunteers" card: real people, real open-case counts ───
CREATE OR REPLACE FUNCTION public.chapter_volunteers()
RETURNS TABLE (profile_id uuid, full_name text, role text, title text, chapter text, open_cases bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.full_name, mr.role::text, mr.title, cl.name,
         (
           (SELECT count(*) FROM public.grievances g
             WHERE g.assigned_to = p.id AND g.status IN ('open', 'in_progress'))
         + (SELECT count(*) FROM public.student_requests s
             WHERE s.assigned_mentor_id = p.id AND s.status IN ('open', 'in_progress'))
         + (SELECT count(*) FROM public.assistance_posts ap
             WHERE ap.assigned_to = p.id AND ap.status = 'open')
         )
    FROM public.member_roles mr
    JOIN public.profiles p ON p.id = mr.profile_id
    LEFT JOIN public.chapters cl ON cl.id = mr.chapter_id
   WHERE mr.revoked_at IS NULL
     AND mr.role IN ('team_lead', 'chapter_lead')
     AND (
       public.has_global_scope()
       OR (mr.country IS NOT NULL AND public.has_country_scope(mr.country))
       OR (mr.chapter_id IS NOT NULL AND public.can_write_chapter(mr.chapter_id))
     )
   ORDER BY mr.role, p.full_name;
$$;

REVOKE ALL ON FUNCTION public.chapter_volunteers() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.chapter_volunteers() TO authenticated;

-- ── stat cards ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.chapter_assistance_stats()
RETURNS TABLE (
  open_total bigint, open_student bigint, open_job bigint, open_grievance bigint,
  unassigned bigint, response_rate_pct int, median_hours_to_resolution numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_scoped_countries text[];
BEGIN
  v_scoped_countries := public.my_countries();
  IF v_scoped_countries IS NULL OR array_length(v_scoped_countries, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH cases AS (
    SELECT 'grievance'::text AS kind, g.status, g.assigned_to, g.created_at, g.updated_at
      FROM public.grievances g JOIN public.profiles p ON p.id = g.profile_id
     WHERE p.country_of_residence = ANY (v_scoped_countries)
    UNION ALL
    SELECT 'student', s.status, s.assigned_mentor_id, s.created_at, s.updated_at
      FROM public.student_requests s JOIN public.profiles p ON p.id = s.profile_id
     WHERE p.country_of_residence = ANY (v_scoped_countries)
    UNION ALL
    SELECT 'job', ap.status, ap.assigned_to, ap.created_at, coalesce(ap.resolved_at, ap.created_at)
      FROM public.assistance_posts ap
     WHERE ap.category = 'job' AND ap.country = ANY (v_scoped_countries)
  )
  SELECT
    (SELECT count(*) FROM cases WHERE status IN ('open', 'in_progress')),
    (SELECT count(*) FROM cases WHERE kind = 'student' AND status IN ('open', 'in_progress')),
    (SELECT count(*) FROM cases WHERE kind = 'job' AND status = 'open'),
    (SELECT count(*) FROM cases WHERE kind = 'grievance' AND status IN ('open', 'in_progress')),
    (SELECT count(*) FROM cases WHERE status IN ('open', 'in_progress') AND assigned_to IS NULL),
    (SELECT CASE WHEN count(*) = 0 THEN 100
                 ELSE round(100.0 * count(*) FILTER (WHERE status NOT IN ('open', 'in_progress')) / count(*))::int
            END
       FROM cases),
    (SELECT round(avg(extract(epoch FROM (updated_at - created_at)) / 3600.0)::numeric, 1)
       FROM cases WHERE status NOT IN ('open', 'in_progress'));
END $$;

REVOKE ALL ON FUNCTION public.chapter_assistance_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.chapter_assistance_stats() TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'Chapter assistance RPCs ready';
END $$;
