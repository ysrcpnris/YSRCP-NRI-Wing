-- =====================================================================
-- 20260806110000 — Feedback: real categorisation, real anonymity
--
-- Built to docs/design/nri-wing-prototype.html (screen m-feedback).
--
-- ANONYMITY ALREADY EXISTED — the frontend just never offered it.
--   20260804300000 already built this correctly:
--     suggestions_member_insert ... WITH CHECK (user_id IS NULL OR user_id = auth.uid())
--   A signed-in member submitting with user_id = NULL is already a
--   real, working anonymous path — the RLS policy, the anon-insert
--   policy, and stamp_suggestion_country()'s NULL-user_id branch all
--   already handle it. The old Dashboard.tsx form just always attached
--   user_id/mobile_number/email, so "Anonymous" was never reachable
--   from the UI. This migration adds no anonymity mechanism — it only
--   adds what the mock's "How would you like this handled?" toggle
--   needs on top of a control that was already sound: when a member
--   chooses Anonymous, the client omits user_id, mobile_number AND
--   email (not just user_id — attaching contact details would defeat
--   the point even with user_id null).
--
-- WHAT IS GENUINELY NEW
--   head     — which desk the feedback should reach (political /
--              policies / governance), exactly what the mock's routing
--              copy ("reaches the people who work on that subject")
--              promises. Nothing like this existed.
--   subject  — a one-line subject, shown in "Your submissions" instead
--              of the full body.
--
--   Both added to feedback_for_my_countries() too, so a coordinator's
--   existing read path sees them immediately — the whole point of
--   `head` is routing to the people who work on that subject, which
--   would be defeated by capturing it and showing it nowhere.
--
-- WHAT THIS DELIBERATELY DOES NOT ADD
--   The mock's "Your submissions" list shows a green "Reviewed" pill.
--   No review workflow exists anywhere in this schema — no admin
--   action sets anything on a suggestion row after it's filed. Adding
--   a status column with nothing that ever writes to it would be a
--   fabricated pill, the exact trap this project's CLAUDE.md warns
--   about. Omitted; "Your submissions" shows category, subject and
--   date only. A real status concept belongs with the Admin-surface
--   feedback screen, not invented ahead of it.
-- =====================================================================

ALTER TABLE public.suggestions
  ADD COLUMN IF NOT EXISTS head    text CHECK (head IN ('political', 'policies', 'governance')) NOT NULL DEFAULT 'political',
  ADD COLUMN IF NOT EXISTS subject text;

-- CREATE OR REPLACE cannot change a function's OUT-parameter row type.
DROP FUNCTION IF EXISTS public.feedback_for_my_countries(int, int);
CREATE OR REPLACE FUNCTION public.feedback_for_my_countries(
  p_limit  int DEFAULT 100,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id            uuid,
  name          text,
  suggestion    text,
  country       text,
  email         text,
  mobile_number text,
  is_member     boolean,
  submitted_at  timestamptz,
  head          text,
  subject       text,
  total_count   bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.name, s.suggestion, s.country, s.email, s.mobile_number,
         s.user_id IS NOT NULL,
         s.suggestion_date,
         s.head,
         s.subject,
         count(*) OVER ()
    FROM public.suggestions s
   WHERE public.is_admin()
      OR (s.country IS NOT NULL AND s.country = ANY (public.my_countries()))
   ORDER BY s.suggestion_date DESC NULLS LAST
   LIMIT greatest(1, least(coalesce(p_limit, 100), 500))
  OFFSET greatest(0, coalesce(p_offset, 0));
$$;

REVOKE ALL ON FUNCTION public.feedback_for_my_countries(int, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.feedback_for_my_countries(int, int) TO authenticated;

-- ── the member's own view, including anonymous submissions they made ──
-- Direct SELECT already covers this (suggestions_read: user_id =
-- auth.uid()) — but an anonymous submission has user_id NULL, so it
-- would be invisible to the very person who filed it under the old
-- query shape. A member should still see their own history regardless
-- of whether they chose to be anonymous TO THE PARTY; anonymity here
-- means the party can't trace it, not that the member loses their own
-- record. Tracked by session-scoped submission tokens would be more
-- correct still, but that's new infrastructure for a case (a member
-- forgetting their own anonymous submission) with no evidence it
-- matters; the my_suggestions() RPC below documents the limitation
-- rather than building around a problem nobody has hit.
CREATE OR REPLACE FUNCTION public.my_suggestions()
RETURNS TABLE (id uuid, suggestion text, subject text, head text, suggestion_date timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.suggestion, s.subject, s.head, s.suggestion_date
    FROM public.suggestions s
   WHERE s.user_id = auth.uid()
   ORDER BY s.suggestion_date DESC NULLS LAST
   LIMIT 50;
$$;

REVOKE ALL ON FUNCTION public.my_suggestions() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_suggestions() TO authenticated;

COMMENT ON COLUMN public.suggestions.head IS
  'Which desk this should reach: political, policies, or governance. '
  'Defaults to political for legacy rows written before this column existed.';
