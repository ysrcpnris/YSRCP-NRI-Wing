-- =====================================================================
-- 20260807110000 — Admin Grievances (a-griev): real district + ownership
--
-- CHECKED WITH THE USER — TWO GENUINE GAPS, NOT GUESSED AT
--   1. District: the member-facing grievance form (Grievances.tsx)
--      never asked which AP district a grievance concerns — the
--      table's own `state` column sits unused, and it's the wrong
--      column anyway (state means Andhra Pradesh, a constant; the
--      mock's "District" means Guntur/Krishna/Kurnool, a variable).
--      Added a genuinely new `district` column instead of repurposing
--      `state`, and the dropdown is sourced from leader_assignments'
--      own district list — real district names already seeded there,
--      not hand-typed and liable to drift from what the party actually
--      calls each district.
--   2. Owner: the mock's "Revenue Desk" / "Mandal President" / "District
--      Unit" means a named AP-side party official is accountable, not a
--      wing volunteer abroad (that's what assigned_to/assign_case()
--      already means, built for c-assist). Real AP leadership already
--      exists in leader_assignments (District President, Assembly
--      Coordinator, etc., real names, MasterData.tsx-managed).
--      grievances.assigned_leader_id references THAT table, not
--      profiles — a real official, not a placeholder desk label.
--
-- "PAST SLA" IS A FIXED, DOCUMENTED THRESHOLD, NOT A CONFIGURABLE ONE
--   No SLA/escalation-window concept exists anywhere in this schema.
--   21 days is a fixed convention chosen to sit between the mock's own
--   worked examples (19d shown as "In progress", 28d shown as "Past
--   SLA") — not sourced from any real configured value, because none
--   exists. If the wing wants this configurable later, that's a
--   distinct feature, not a UI nicety.
--
-- CATEGORY LEGEND USES THE REAL CATEGORIES, NOT THE MOCK'S FIVE
--   The member form's real options are general / welfare / civic /
--   land / other — not the mock's "Land & revenue / Welfare & pension /
--   Civic & infrastructure / Police & legal / Other". Relabeling to
--   match the mock's wording without the form actually offering those
--   choices would be exactly the kind of comment-not-evidence mismatch
--   this repo's CLAUDE.md calls out. The admin screen groups by
--   whatever category values actually exist.
--
-- OWNERSHIP ASSIGNMENT IS SECRETARIAT-ONLY, MATCHING a-roles' OWN MATRIX
--   a-roles lists "View grievances: Secretariat=All, Country
--   Coordinator=Own country, everyone else=No/Own only" — nothing
--   about a coordinator assigning AP-side ownership. assign_grievance_
--   leader() is gated on is_admin(), not can_write_country()/
--   can_write_scope(). This is a Reserved capability, not delegated.
-- =====================================================================

ALTER TABLE public.grievances ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE public.grievances ADD COLUMN IF NOT EXISTS assigned_leader_id uuid REFERENCES public.leader_assignments(id) ON DELETE SET NULL;

-- district is member-supplied at submission time via the existing
-- grievances_insert policy (profile_id = auth.uid()), same as
-- subject/category/description already are — no new grant needed.
--
-- assigned_leader_id MUST be explicitly revoked. 20260805233000 grants
-- whole-table UPDATE on grievances to authenticated (fixing a real
-- outage where nobody, admin included, could resolve a case) — every
-- column is updatable by anyone the grievances_update ROW policy lets
-- through, which includes any country coordinator via can_write_country
-- and the current assignee via assigned_to = auth.uid(). Without this
-- REVOKE, a coordinator could PATCH assigned_leader_id directly,
-- bypassing assign_grievance_leader()'s is_admin()-only check — the
-- exact "front door locked, back door open" trap this repo's CLAUDE.md
-- names explicitly. Checked by reading the row policy, not assumed.
REVOKE UPDATE (assigned_leader_id) ON public.grievances FROM authenticated;

CREATE OR REPLACE FUNCTION public.admin_grievances(p_status text DEFAULT NULL::text)
RETURNS TABLE (
  id uuid, reference_no text, subject text, category text, district text,
  member_name text, member_country text, status text,
  created_at timestamptz, resolved_at timestamptz,
  assigned_leader_id uuid, leader_name text, leader_role text, leader_district text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT g.id, g.reference_no, g.subject, g.category, g.district,
         p.full_name, p.country_of_residence, g.status,
         g.created_at, g.resolved_at,
         g.assigned_leader_id, lm.name, la.role, la.district
    FROM public.grievances g
    JOIN public.profiles p ON p.id = g.profile_id
    LEFT JOIN public.leader_assignments la ON la.id = g.assigned_leader_id
    LEFT JOIN public.leaders_master lm ON lm.id = la.leader_id
   WHERE public.is_admin()
     AND (p_status IS NULL OR (p_status = 'open' AND g.status IN ('open', 'in_progress'))
                            OR (p_status <> 'open' AND g.status = p_status))
   ORDER BY g.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.admin_grievances(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_grievances(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_grievance_stats()
RETURNS TABLE (
  open_count int, past_sla_count int, closed_this_quarter int,
  resolved_pct int, median_resolution_days numeric,
  categories jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH open_cases AS (
    SELECT * FROM public.grievances WHERE status IN ('open', 'in_progress')
  ),
  quarter AS (
    SELECT * FROM public.grievances
     WHERE created_at >= date_trunc('quarter', now())
  )
  SELECT
    (SELECT count(*) FROM open_cases)::int,
    (SELECT count(*) FROM open_cases WHERE created_at < now() - interval '21 days')::int,
    (SELECT count(*) FROM quarter WHERE status IN ('resolved', 'closed'))::int,
    (SELECT CASE WHEN count(*) = 0 THEN 0
                 ELSE round(100.0 * count(*) FILTER (WHERE status IN ('resolved', 'closed')) / count(*))::int
            END
       FROM quarter),
    (SELECT round(avg(extract(epoch FROM (resolved_at - created_at)) / 86400.0)::numeric, 1)
       FROM public.grievances WHERE resolved_at IS NOT NULL),
    (SELECT coalesce(jsonb_object_agg(category, cnt), '{}'::jsonb)
       FROM (SELECT coalesce(nullif(btrim(category), ''), 'general') AS category, count(*) AS cnt
               FROM open_cases GROUP BY 1) c);
END $$;

REVOKE ALL ON FUNCTION public.admin_grievance_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_grievance_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.assign_grievance_leader(p_grievance_id uuid, p_leader_assignment_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.grievances WHERE id = p_grievance_id) THEN
    RAISE EXCEPTION 'no such grievance' USING ERRCODE = '22023';
  END IF;
  IF p_leader_assignment_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.leader_assignments WHERE id = p_leader_assignment_id) THEN
    RAISE EXCEPTION 'no such leader assignment' USING ERRCODE = '22023';
  END IF;

  UPDATE public.grievances SET assigned_leader_id = p_leader_assignment_id WHERE id = p_grievance_id;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.assign_grievance_leader(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.assign_grievance_leader(uuid, uuid) TO authenticated;

-- ── real AP district list for the submission-form dropdown ───────────
CREATE OR REPLACE FUNCTION public.ap_districts()
RETURNS TABLE (district text)
LANGUAGE sql STABLE
AS $$
  SELECT DISTINCT district FROM public.leader_assignments
   WHERE district IS NOT NULL AND btrim(district) <> ''
   ORDER BY 1;
$$;

REVOKE ALL ON FUNCTION public.ap_districts() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ap_districts() TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'Admin Grievances RPCs ready';
END $$;
