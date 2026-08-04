-- =====================================================================
-- 20260805091000 — make the declared scope model real
--
-- TWO DEFECTS, ONE CAUSE
--
--   (5) my_countries() returned the country for EVERY wing_role, so a
--       cluster_lead and a team_lead both got whole-country authority:
--       the entire roster, every assistance case, every chapter's
--       handles, country-wide campaigns, and the ability to delegate
--       more roles. The three-tier model existed only in the enum.
--
--   (8) An admin holds profiles.role='admin' and usually NO member_roles
--       row, so my_countries() returned '{}' and every scoped RPC took
--       its "no role, return nothing" branch. chapter_roster() and
--       assistance_queue() returned zero rows to the one person meant
--       to see everything. Their comments said "admin sees everything".
--
-- THE MODEL, NOW ENFORCED
--   global   secretariat / profiles.role='admin' — the whole wing
--   country  country_coordinator — every member in their countries
--   cluster  cluster_lead — only their cluster's cities
--   team     team_lead — read-only inside their cluster or country;
--            they run a function (students, events), not a territory
--
-- ONE SOURCE OF TRUTH
--   Every scoped RPC now composes the same three predicates instead of
--   each re-deriving scope. Getting this wrong in one function out of
--   six is how a hole appears, so there is one definition to get right.
-- =====================================================================

-- Global: the whole wing. An admin need not hold a member_roles row.
CREATE OR REPLACE FUNCTION public.has_global_scope()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.member_roles
         WHERE profile_id = auth.uid()
           AND revoked_at IS NULL
           AND role = 'secretariat'
      );
$$;

-- Countries where the caller has COUNTRY-level authority. Cluster and
-- team leads are deliberately excluded — that was the bug.
CREATE OR REPLACE FUNCTION public.my_countries()
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT coalesce(array_agg(DISTINCT country), '{}')
    FROM public.member_roles
   WHERE profile_id = auth.uid()
     AND revoked_at IS NULL
     AND country IS NOT NULL
     AND role IN ('secretariat', 'country_coordinator');
$$;

-- Clusters the caller leads or serves a team in.
CREATE OR REPLACE FUNCTION public.my_cluster_ids()
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT coalesce(array_agg(DISTINCT cluster_id), '{}')
    FROM public.member_roles
   WHERE profile_id = auth.uid()
     AND revoked_at IS NULL
     AND cluster_id IS NOT NULL
     AND role IN ('cluster_lead', 'team_lead');
$$;

-- May the caller WRITE in this scope? team_lead is read-only: they run
-- a function, not a territory, and nothing in the brief gives them
-- authority to edit members, handles or bookings.
CREATE OR REPLACE FUNCTION public.can_write_scope()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_global_scope()
      OR EXISTS (
        SELECT 1 FROM public.member_roles
         WHERE profile_id = auth.uid()
           AND revoked_at IS NULL
           AND role IN ('secretariat', 'country_coordinator', 'cluster_lead')
      );
$$;

-- The single predicate every scoped read uses. One definition, so a
-- mistake is in one place rather than six.
CREATE OR REPLACE FUNCTION public.member_in_scope(
  p_country text,
  p_city    text
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_global_scope()
      OR (p_country IS NOT NULL AND p_country = ANY (public.my_countries()))
      OR (
        public.chapter_for_city(p_country, p_city) IS NOT NULL
        AND public.chapter_for_city(p_country, p_city) = ANY (public.my_cluster_ids())
      );
$$;

-- is_coordinator() previously answered "do you hold any role at all",
-- which let a team_lead through every write gate. It now means "may
-- write", which is how every call site already used it.
CREATE OR REPLACE FUNCTION public.is_coordinator()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.can_write_scope();
$$;

GRANT EXECUTE ON FUNCTION public.has_global_scope()            TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_cluster_ids()              TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_write_scope()             TO authenticated;
GRANT EXECUTE ON FUNCTION public.member_in_scope(text, text)   TO authenticated;

-- has_country_scope() is used by several older RLS policies. It must
-- now honour global scope too, or an admin stays locked out of the
-- tables those policies guard.
CREATE OR REPLACE FUNCTION public.has_country_scope(p_country text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_global_scope()
      OR (p_country IS NOT NULL AND p_country = ANY (public.my_countries()));
$$;

-- ── rebuild the scoped RPCs on the shared predicate ──────────────────
CREATE OR REPLACE FUNCTION public.chapter_roster(
  p_country text DEFAULT NULL,
  p_search  text DEFAULT NULL,
  p_limit   int  DEFAULT 100,
  p_offset  int  DEFAULT 0
)
RETURNS TABLE (
  id uuid, full_name text, email text, mobile_number text,
  city_abroad text, country text, chapter text,
  constituency text, district text, joined_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Global, country or cluster — any of them may read a roster. Only
  -- "no scope at all" returns nothing.
  IF NOT (public.has_global_scope()
          OR array_length(public.my_countries(), 1) IS NOT NULL
          OR array_length(public.my_cluster_ids(), 1) IS NOT NULL) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH scoped AS (
    SELECT p.id, p.full_name, p.email, p.mobile_number,
           p.city_abroad, p.country_of_residence,
           cl.name AS chapter_name,
           p.assembly_constituency, p.district, p.created_at
      FROM public.profiles p
      LEFT JOIN public.cluster_cities cc
             ON lower(btrim(cc.country)) = lower(btrim(p.country_of_residence))
            AND lower(btrim(cc.city))    = lower(btrim(p.city_abroad))
      LEFT JOIN public.clusters cl ON cl.id = cc.cluster_id
     WHERE public.member_in_scope(p.country_of_residence, p.city_abroad)
       AND (p_country IS NULL OR p.country_of_residence = p_country)
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
         count(*) OVER ()
    FROM scoped s
   ORDER BY s.created_at DESC
   LIMIT greatest(1, least(coalesce(p_limit, 100), 500))
  OFFSET greatest(0, coalesce(p_offset, 0));
END $$;

REVOKE ALL ON FUNCTION public.chapter_roster(text, text, int, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.chapter_roster(text, text, int, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.chapter_stats(p_country text DEFAULT NULL)
RETURNS TABLE (
  country text, chapter text, members bigint,
  joined_30d bigint, cities bigint, women bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.country_of_residence,
         coalesce(cl.name, 'Not yet organised'),
         count(*),
         count(*) FILTER (WHERE p.created_at > now() - interval '30 days'),
         count(DISTINCT p.city_abroad),
         count(*) FILTER (WHERE p.gender = 'Female')
    FROM public.profiles p
    LEFT JOIN public.cluster_cities cc
           ON lower(btrim(cc.country)) = lower(btrim(p.country_of_residence))
          AND lower(btrim(cc.city))    = lower(btrim(p.city_abroad))
    LEFT JOIN public.clusters cl ON cl.id = cc.cluster_id
   WHERE public.member_in_scope(p.country_of_residence, p.city_abroad)
     AND (p_country IS NULL OR p.country_of_residence = p_country)
   GROUP BY 1, 2
   ORDER BY 3 DESC;
$$;

REVOKE ALL ON FUNCTION public.chapter_stats(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.chapter_stats(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.assistance_queue(
  p_status text DEFAULT NULL,
  p_kind   text DEFAULT NULL,
  p_limit  int  DEFAULT 100,
  p_offset int  DEFAULT 0
)
RETURNS TABLE (
  kind text, id uuid, reference_no text, title text, detail text,
  status text, response text, member_id uuid, member_name text,
  member_email text, member_mobile text, member_country text,
  member_city text, created_at timestamptz, updated_at timestamptz,
  total_count bigint
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
     WHERE public.member_in_scope(p.country_of_residence, p.city_abroad)
       AND (
         CASE
           WHEN p_status IS NULL THEN c.status IN ('open', 'in_progress')
           WHEN p_status = 'all'  THEN true
           ELSE c.status = p_status
         END
       )
  )
  SELECT sc.kind, sc.id, sc.reference_no, sc.title, sc.detail,
         sc.status, sc.response, sc.profile_id,
         sc.full_name, sc.email, sc.mobile_number,
         sc.country_of_residence, sc.city_abroad,
         sc.created_at, sc.updated_at, count(*) OVER ()
    FROM scoped_cases sc
   ORDER BY sc.created_at ASC
   LIMIT greatest(1, least(coalesce(p_limit, 100), 500))
  OFFSET greatest(0, coalesce(p_offset, 0));
END $$;

REVOKE ALL ON FUNCTION public.assistance_queue(text, text, int, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.assistance_queue(text, text, int, int) TO authenticated;

-- respond_to_case: team_lead may read the queue but not decide it, and
-- scope now includes cluster and global.
CREATE OR REPLACE FUNCTION public.respond_to_case(
  p_kind text, p_id uuid, p_status text, p_response text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_country text; v_city text;
BEGIN
  IF p_status NOT IN ('open','in_progress','resolved','closed','rejected') THEN
    RAISE EXCEPTION 'unknown status: %', p_status;
  END IF;
  IF p_kind NOT IN ('grievance', 'student') THEN
    RAISE EXCEPTION 'unknown case type: %', p_kind;
  END IF;
  IF NOT public.can_write_scope() THEN
    RETURN false;                       -- team_lead reaches here
  END IF;

  IF p_kind = 'grievance' THEN
    SELECT p.country_of_residence, p.city_abroad INTO v_country, v_city
      FROM public.grievances g JOIN public.profiles p ON p.id = g.profile_id
     WHERE g.id = p_id;
  ELSE
    SELECT p.country_of_residence, p.city_abroad INTO v_country, v_city
      FROM public.student_requests s JOIN public.profiles p ON p.id = s.profile_id
     WHERE s.id = p_id;
  END IF;

  IF v_country IS NULL OR NOT public.member_in_scope(v_country, v_city) THEN
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

-- feedback: same treatment, so admin sees everything and a cluster lead
-- sees their cluster.
CREATE OR REPLACE FUNCTION public.feedback_for_my_countries(
  p_limit int DEFAULT 100, p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid, name text, suggestion text, country text, email text,
  mobile_number text, is_member boolean, submitted_at timestamptz,
  total_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.name, s.suggestion, s.country, s.email, s.mobile_number,
         s.user_id IS NOT NULL, s.suggestion_date, count(*) OVER ()
    FROM public.suggestions s
    LEFT JOIN public.profiles p ON p.id = s.user_id
   WHERE public.has_global_scope()
      OR (s.country IS NOT NULL AND s.country = ANY (public.my_countries()))
      OR (p.id IS NOT NULL
          AND public.member_in_scope(p.country_of_residence, p.city_abroad))
   ORDER BY s.suggestion_date DESC NULLS LAST
   LIMIT greatest(1, least(coalesce(p_limit, 100), 500))
  OFFSET greatest(0, coalesce(p_offset, 0));
$$;

REVOKE ALL ON FUNCTION public.feedback_for_my_countries(int, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.feedback_for_my_countries(int, int) TO authenticated;

COMMENT ON FUNCTION public.member_in_scope(text, text) IS
  'The one scope predicate. global sees all; country_coordinator sees '
  'their countries; cluster_lead and team_lead see only their cluster''s '
  'cities. Every scoped read composes this rather than re-deriving it.';
