-- =====================================================================
-- 20260808170000 — Feedback Analysis (a-feedback)
--
-- SENTIMENT AND THEMES — checked with the user: dropped, not faked
--   The mock's entire visual identity is sentiment: "62% positive",
--   "▲ 8pts since April" per head, plus a "Themes raised most" bar
--   chart (a curated cross-head topic taxonomy). Nothing backs any of
--   it — no sentiment score anywhere, no theme/tag column, no
--   historical snapshot to diff a trend against, and free-text
--   suggestions have never been classified by anything. Stat cards
--   below are real submission/unassigned counts per head instead —
--   same pattern as dropping the 15-seat committee cap, Instagram
--   verification, and the events/volunteer figure elsewhere this
--   batch. "Themes raised most" is not built at all; there is nothing
--   to honestly group by.
--
-- ASSIGNMENT — checked with the user: matches a-griev's precedent, not
-- assign_case()
--   a-feedback is a wing-wide Admin Console screen, not a Chapter
--   screen. assign_case() routes to a chapter volunteer scoped to a
--   case's chapter/country — built for and only used by the Chapter
--   surface (c-assist). a-griev's own migration (20260807110000)
--   already reasoned through this exact distinction for the identical
--   Admin-vs-Chapter situation and built assign_grievance_leader()
--   instead, routing to a named AP party official in leader_
--   assignments. suggestions.assigned_leader_id and
--   assign_suggestion_leader() below are a faithful copy of that same
--   mechanism — same table, same gate (is_admin() only, "Reserved
--   capability, not delegated," a-griev's own phrase), same shape —
--   not a new concept.
--
-- "Assign all" has no bulk RPC — unlike a-appt's decide_bookings(),
-- there is no shared, order-sensitive state between two suggestions
-- being assigned (no capacity, no lock to race), so a client-side loop
-- calling assign_suggestion_leader() once per row is exactly as
-- correct as a server-side one and doesn't need new SQL.
--
-- STATS AND LIST GATED is_admin(), MATCHING a-griev THROUGHOUT
--   a-griev gates both its stats RPC and its assignment RPC on
--   is_admin() specifically, not has_global_scope() (which most other
--   admin_* RPCs this batch use) — a deliberate choice there, kept
--   consistent here rather than mixed.
-- =====================================================================

ALTER TABLE public.suggestions
  ADD COLUMN IF NOT EXISTS assigned_leader_id uuid REFERENCES public.leader_assignments(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.assign_suggestion_leader(p_suggestion_id uuid, p_leader_assignment_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.suggestions WHERE id = p_suggestion_id) THEN
    RAISE EXCEPTION 'no such suggestion' USING ERRCODE = '22023';
  END IF;
  IF p_leader_assignment_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.leader_assignments WHERE id = p_leader_assignment_id) THEN
    RAISE EXCEPTION 'no such leader assignment' USING ERRCODE = '22023';
  END IF;

  UPDATE public.suggestions SET assigned_leader_id = p_leader_assignment_id WHERE id = p_suggestion_id;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.assign_suggestion_leader(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.assign_suggestion_leader(uuid, uuid) TO authenticated;

-- ── feedback_for_my_countries(): faithful diff, +assignment columns ──
-- CREATE OR REPLACE cannot change a function's OUT-parameter row type.
DROP FUNCTION IF EXISTS public.feedback_for_my_countries(int, int);
CREATE OR REPLACE FUNCTION public.feedback_for_my_countries(
  p_limit  int DEFAULT 100,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id                  uuid,
  name                text,
  suggestion          text,
  country             text,
  email               text,
  mobile_number       text,
  is_member           boolean,
  submitted_at        timestamptz,
  head                text,
  subject             text,
  assigned_leader_id  uuid,
  leader_name         text,
  leader_role         text,
  total_count         bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.name, s.suggestion, s.country, s.email, s.mobile_number,
         s.user_id IS NOT NULL,
         s.suggestion_date,
         s.head,
         s.subject,
         s.assigned_leader_id,
         lm.name,
         la.role,
         count(*) OVER ()
    FROM public.suggestions s
    LEFT JOIN public.leader_assignments la ON la.id = s.assigned_leader_id
    LEFT JOIN public.leaders_master lm ON lm.id = la.leader_id
   WHERE public.is_admin()
      OR (s.country IS NOT NULL AND s.country = ANY (public.my_countries()))
   ORDER BY s.suggestion_date DESC NULLS LAST
   LIMIT greatest(1, least(coalesce(p_limit, 100), 500))
  OFFSET greatest(0, coalesce(p_offset, 0));
$$;

REVOKE ALL ON FUNCTION public.feedback_for_my_countries(int, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.feedback_for_my_countries(int, int) TO authenticated;

-- ── real per-head counts — every head always present, even at 0 ─────
CREATE OR REPLACE FUNCTION public.admin_feedback_stats()
RETURNS TABLE (
  head        text,
  submissions bigint,
  unassigned  bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT h.head,
         count(s.id),
         count(s.id) FILTER (WHERE s.assigned_leader_id IS NULL)
    FROM unnest(ARRAY['political', 'policies', 'governance']) AS h(head)
    LEFT JOIN public.suggestions s ON s.head = h.head
   GROUP BY h.head
   ORDER BY array_position(ARRAY['political', 'policies', 'governance'], h.head);
END $$;

REVOKE ALL ON FUNCTION public.admin_feedback_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_feedback_stats() TO authenticated;

COMMENT ON FUNCTION public.admin_feedback_stats() IS
  'ADMIN ONLY. Real submission/unassigned counts per head — no '
  'sentiment or trend figure exists anywhere to back the mock''s '
  '"% positive" cards. Empty row set for non-admins.';

DO $$
BEGIN
  RAISE NOTICE 'assign_suggestion_leader / admin_feedback_stats created; feedback_for_my_countries extended with assignment';
END $$;
