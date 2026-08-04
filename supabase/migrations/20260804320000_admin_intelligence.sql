-- =====================================================================
-- 20260804320000 — admin intelligence
--
-- The admin dashboard already has a screen per table: Users,
-- Assistance, ServiceInbox, Suggestions, OrgHierarchy. What it has
-- never had is a question that crosses them. Nothing here duplicates a
-- CRUD screen; every function answers something no single list can.
--
-- THE QUESTIONS, AND WHY THESE ONES
--   1. Where are our members, and where are they FROM? Two different
--      maps. A chapter organises by where people live; the party's
--      interest is which constituencies they can influence back home.
--   2. Which constituencies have members but no coordinator, and which
--      have a coordinator but no members? Both are gaps, and neither is
--      visible from any existing screen.
--   3. Who is not engaged? A member who joined and never returned is
--      the cheapest person to re-activate and the easiest to miss.
--   4. Is the wing growing, and where?
--
-- WHAT THESE FUNCTIONS DO NOT RETURN
--   No epic_number, no dob, no family_*, no mobile. Aggregates and
--   counts only. An intelligence screen is exactly where a careless
--   join leaks the fields the column grants were written to protect
--   (20260804094500), so these are built from counts outward rather
--   than from a member list inward.
--
-- SMALL NUMBERS ARE NOT SUPPRESSED, BUT THEY ARE COUNTED HONESTLY.
--   Staging has 65 members. A "top constituency" with 2 members is
--   noise, and the UI is responsible for saying so — these functions
--   return the real count so it can.
-- =====================================================================

-- ── 1. the two maps ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.intel_geography()
RETURNS TABLE (
  dimension    text,      -- 'residence' | 'origin'
  label        text,
  sublabel     text,
  members      bigint,
  onboarded    bigint,
  joined_30d   bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  -- Where members live: the chapter's view.
  SELECT 'residence', p.country_of_residence,
         cl.name,
         count(*),
         count(*) FILTER (WHERE p.onboarding_completed_at IS NOT NULL),
         count(*) FILTER (WHERE p.created_at > now() - interval '30 days')
    FROM public.profiles p
    LEFT JOIN public.cluster_cities cc
           ON lower(btrim(cc.country)) = lower(btrim(p.country_of_residence))
          AND lower(btrim(cc.city))    = lower(btrim(p.city_abroad))
    LEFT JOIN public.clusters cl ON cl.id = cc.cluster_id
   WHERE public.is_admin()
     AND p.country_of_residence IS NOT NULL
   GROUP BY p.country_of_residence, cl.name

  UNION ALL

  -- Where members are from: the party's view. Resolved through the
  -- alias table, so 'Nandyala' and 'Nandyal' are one constituency and
  -- not two rows (20260804160000).
  SELECT 'origin', c.name, d.name,
         count(*),
         count(*) FILTER (WHERE p.onboarding_completed_at IS NOT NULL),
         count(*) FILTER (WHERE p.created_at > now() - interval '30 days')
    FROM public.profiles p
    JOIN public.ap_constituencies c
      ON c.id = public.resolve_constituency(p.assembly_constituency)
    JOIN public.ap_districts d ON d.id = c.district_id
   WHERE public.is_admin()
   GROUP BY c.name, d.name

   ORDER BY 1, 4 DESC;
$$;

REVOKE ALL ON FUNCTION public.intel_geography() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.intel_geography() TO authenticated;

-- ── 2. coverage gaps ─────────────────────────────────────────────────
-- Constituencies where we have members but no assembly coordinator, and
-- the reverse. Both are organisational gaps; neither shows up on a list
-- of members or a list of leaders.
CREATE OR REPLACE FUNCTION public.intel_coverage_gaps()
RETURNS TABLE (
  gap_type      text,     -- 'members_no_leader' | 'leader_no_members'
  constituency  text,
  district      text,
  members       bigint,
  coordinators  bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH per_seat AS (
    SELECT c.id, c.name AS constituency, d.name AS district,
           count(DISTINCT p.id) AS members,
           count(DISTINCT la.id) FILTER (
             WHERE la.role = 'Assembly Coordinator' AND la.is_active
           ) AS coordinators
      FROM public.ap_constituencies c
      JOIN public.ap_districts d ON d.id = c.district_id
      LEFT JOIN public.profiles p
             ON public.resolve_constituency(p.assembly_constituency) = c.id
      LEFT JOIN public.leader_assignments la
             ON public.resolve_constituency(la.constituency) = c.id
     WHERE public.is_admin()
     GROUP BY c.id, c.name, d.name
  )
  SELECT CASE WHEN members > 0 AND coordinators = 0 THEN 'members_no_leader'
              ELSE 'leader_no_members' END,
         constituency, district, members, coordinators
    FROM per_seat
   WHERE (members > 0 AND coordinators = 0)
      OR (members = 0 AND coordinators > 0)
   ORDER BY 1, members DESC, constituency;
$$;

REVOKE ALL ON FUNCTION public.intel_coverage_gaps() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.intel_coverage_gaps() TO authenticated;

-- ── 3. engagement ────────────────────────────────────────────────────
-- Deliberately a count per band, not a list of names. "Who has not
-- logged in" as a downloadable list of individuals is a different and
-- more sensitive artefact than "how many are dormant", and the second
-- is what a decision needs.
CREATE OR REPLACE FUNCTION public.intel_engagement()
RETURNS TABLE (
  band        text,
  members     bigint,
  share       numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH scored AS (
    SELECT p.id,
           (p.onboarding_completed_at IS NOT NULL)::int
           + (EXISTS (SELECT 1 FROM public.campaign_shares s WHERE s.profile_id = p.id))::int
           + (EXISTS (SELECT 1 FROM public.appointment_bookings b
                       WHERE b.profile_id = p.id
                         AND b.status IN ('confirmed','attended')))::int
           + (EXISTS (SELECT 1 FROM public.grievances g WHERE g.profile_id = p.id))::int
           + (EXISTS (SELECT 1 FROM public.suggestions su WHERE su.user_id = p.id))::int
             AS signals
      FROM public.profiles p
     WHERE public.is_admin()
  ),
  banded AS (
    SELECT CASE
             WHEN signals = 0 THEN 'Dormant — no activity at all'
             WHEN signals = 1 THEN 'Signed up only'
             WHEN signals <= 3 THEN 'Participating'
             ELSE 'Highly active'
           END AS band,
           CASE WHEN signals = 0 THEN 0 WHEN signals = 1 THEN 1
                WHEN signals <= 3 THEN 2 ELSE 3 END AS ord,
           count(*) OVER () AS total
      FROM scored
  )
  SELECT band, count(*),
         round(100.0 * count(*) / nullif(max(total), 0), 1)
    FROM banded
   GROUP BY band, ord
   ORDER BY ord;
$$;

REVOKE ALL ON FUNCTION public.intel_engagement() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.intel_engagement() TO authenticated;

-- ── 4. growth ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.intel_growth(p_weeks int DEFAULT 12)
RETURNS TABLE (
  week_start   date,
  joined       bigint,
  running_total bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH weeks AS (
    SELECT generate_series(
             date_trunc('week', now() - (greatest(1, least(p_weeks, 104)) || ' weeks')::interval),
             date_trunc('week', now()),
             interval '1 week'
           )::date AS wk
  ),
  per_week AS (
    SELECT w.wk,
           count(p.id) AS joined
      FROM weeks w
      LEFT JOIN public.profiles p
             ON date_trunc('week', p.created_at)::date = w.wk
     WHERE public.is_admin()
     GROUP BY w.wk
  )
  SELECT wk, joined,
         sum(joined) OVER (ORDER BY wk)
    FROM per_week
   ORDER BY wk;
$$;

REVOKE ALL ON FUNCTION public.intel_growth(int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.intel_growth(int) TO authenticated;

-- ── 5. the operational headline ──────────────────────────────────────
-- What needs a human today, across every queue at once. This is the one
-- number an admin should see first, and no existing screen computes it.
CREATE OR REPLACE FUNCTION public.intel_headline()
RETURNS TABLE (
  metric   text,
  value    bigint,
  detail   text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT 'members', count(*), 'total registered'
    FROM public.profiles WHERE public.is_admin()
  UNION ALL
  SELECT 'incomplete_profiles',
         count(*) FILTER (WHERE onboarding_completed_at IS NULL),
         'signed up but never finished onboarding'
    FROM public.profiles WHERE public.is_admin()
  UNION ALL
  SELECT 'open_grievances', count(*), 'awaiting a reply'
    FROM public.grievances
   WHERE public.is_admin() AND status IN ('open', 'in_progress')
  UNION ALL
  SELECT 'open_student_requests', count(*), 'awaiting a mentor'
    FROM public.student_requests
   WHERE public.is_admin() AND status IN ('open', 'in_progress')
  UNION ALL
  SELECT 'pending_appointments', count(*), 'requests needing a decision'
    FROM public.appointment_bookings
   WHERE public.is_admin() AND status = 'pending'
  UNION ALL
  SELECT 'constituencies_covered',
         count(DISTINCT public.resolve_constituency(assembly_constituency)),
         'of 175 with at least one member'
    FROM public.profiles
   WHERE public.is_admin() AND assembly_constituency IS NOT NULL
  UNION ALL
  SELECT 'countries', count(DISTINCT country_of_residence), 'with members'
    FROM public.profiles WHERE public.is_admin();
$$;

REVOKE ALL ON FUNCTION public.intel_headline() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.intel_headline() TO authenticated;

COMMENT ON FUNCTION public.intel_headline() IS
  'Cross-queue operational summary for admin. Counts only — no member '
  'identifiers, no protected columns.';
