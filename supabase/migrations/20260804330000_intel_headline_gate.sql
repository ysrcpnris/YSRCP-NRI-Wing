-- =====================================================================
-- 20260804330000 — intel_headline must return nothing to a non-admin
--
-- THE DEFECT
--   intel_headline() gated every branch with `WHERE public.is_admin()`,
--   the same pattern the other four intel functions use. For those it
--   works, because they GROUP BY — an empty input yields no groups and
--   therefore no rows.
--
--   intel_headline does not group. `SELECT count(*) FROM profiles WHERE
--   is_admin()` over an empty set still returns exactly one row, with
--   count 0. So a coordinator calling it got all seven metrics back,
--   every value zero.
--
--   No data leaked — the numbers were all zero. But the response shape
--   still confirmed the function exists and what it measures, and the
--   next person to add a non-aggregate branch (a name, a latest item,
--   anything without count()) would have leaked it for real. A gate
--   that only works because every column happens to be an aggregate is
--   not a gate.
--
-- THE FIX
--   One explicit check at the top. PL/pgSQL so it can RETURN early,
--   which is unambiguous in a way a WHERE clause on seven separate
--   branches is not.
--
--   Caught by testing every function as a non-admin rather than only
--   the ones that seemed risky.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.intel_headline()
RETURNS TABLE (
  metric   text,
  value    bigint,
  detail   text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN;                       -- no rows at all, not seven zeroes
  END IF;

  RETURN QUERY
  SELECT 'members'::text, count(*), 'total registered'::text
    FROM public.profiles
  UNION ALL
  SELECT 'incomplete_profiles',
         count(*) FILTER (WHERE onboarding_completed_at IS NULL),
         'signed up but never finished onboarding'
    FROM public.profiles
  UNION ALL
  SELECT 'open_grievances', count(*), 'awaiting a reply'
    FROM public.grievances WHERE status IN ('open', 'in_progress')
  UNION ALL
  SELECT 'open_student_requests', count(*), 'awaiting a mentor'
    FROM public.student_requests WHERE status IN ('open', 'in_progress')
  UNION ALL
  SELECT 'pending_appointments', count(*), 'requests needing a decision'
    FROM public.appointment_bookings WHERE status = 'pending'
  UNION ALL
  SELECT 'constituencies_covered',
         count(DISTINCT public.resolve_constituency(assembly_constituency)),
         'of 175 with at least one member'
    FROM public.profiles WHERE assembly_constituency IS NOT NULL
  UNION ALL
  SELECT 'countries', count(DISTINCT country_of_residence), 'with members'
    FROM public.profiles;
END $$;

REVOKE ALL ON FUNCTION public.intel_headline() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.intel_headline() TO authenticated;

-- The other four gate correctly through GROUP BY, but relying on that
-- is the same fragility. Each gets the same explicit early return.
CREATE OR REPLACE FUNCTION public.intel_engagement()
RETURNS TABLE (band text, members bigint, share numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN;
  END IF;

  RETURN QUERY
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
  ),
  banded AS (
    SELECT CASE
             WHEN s.signals = 0 THEN 'Dormant — no activity at all'
             WHEN s.signals = 1 THEN 'Signed up only'
             WHEN s.signals <= 3 THEN 'Participating'
             ELSE 'Highly active'
           END AS band,
           CASE WHEN s.signals = 0 THEN 0 WHEN s.signals = 1 THEN 1
                WHEN s.signals <= 3 THEN 2 ELSE 3 END AS ord,
           count(*) OVER () AS total
      FROM scored s
  )
  SELECT b.band, count(*),
         round(100.0 * count(*) / nullif(max(b.total), 0), 1)
    FROM banded b
   GROUP BY b.band, b.ord
   ORDER BY b.ord;
END $$;

REVOKE ALL ON FUNCTION public.intel_engagement() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.intel_engagement() TO authenticated;
