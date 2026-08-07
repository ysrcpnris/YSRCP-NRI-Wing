-- =====================================================================
-- 20260807120000 — Admin Student & Job Assistance (a-assist)
--
-- THIS IS THE PUBLIC ASSISTANCE BOARD, NOT c-assist's PRIVATE QUEUE
--   The mock's own copy says "Requests are visible to every member in
--   the requester's country. This is the tracking view." That is
--   assistance_posts/assistance_offers (20260805238000) — the public,
--   self-service board — not grievances/student_requests, which
--   chapter_assistance_board() already covers for the Chapter surface.
--   Different subsystem, so new RPCs rather than reusing c-assist's.
--
-- DROPPED, NO BACKING ANYWHERE IN THIS SCHEMA
--   "Views" — no view-tracking exists on assistance_posts or anywhere
--   else. Not built; the mock's number would be fiction.
--   "Urgent" as a request type — assistance_posts.category is
--   constrained to ('student','job') only, a deliberate decision from
--   20260805238000 ("Category filters are real; that tag specifically
--   is not built" for anything beyond those two). Not added here.
--   "Nudge chapter" / "Escalate" buttons — no per-user notification
--   system exists (same conclusion as a-roles' Override card and
--   c-home's dropped "coordinator notified"). "Requests needing a
--   push" is built as a real, honest diagnostic list — which posts
--   are actually stale — with no fake action button pretending to
--   deliver a nudge nothing will receive.
--
-- WHAT IS REAL AND NEW HERE
--   "Median first reply" is genuinely computable for this board (unlike
--   grievances, which have no first-response timestamp) — the first
--   assistance_offers row per post IS the first reply. "Replies" is a
--   real per-post offer count. "Being helped" / "No reply" status is
--   derived from whether a post has at least one offer, matching the
--   mock's own semantics exactly.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.admin_assistance_stats()
RETURNS TABLE (
  open_worldwide int, countries_open int, unanswered_72h int,
  resolved_this_month int, resolved_last_month int, median_first_reply_hours numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH first_offer AS (
    SELECT post_id, min(created_at) AS first_reply_at
      FROM public.assistance_offers
     GROUP BY post_id
  )
  SELECT
    (SELECT count(*)::int FROM public.assistance_posts WHERE status = 'open'),
    (SELECT count(DISTINCT country)::int FROM public.assistance_posts WHERE status = 'open'),
    (SELECT count(*)::int FROM public.assistance_posts ap
      WHERE ap.status = 'open' AND ap.created_at < now() - interval '72 hours'
        AND NOT EXISTS (SELECT 1 FROM public.assistance_offers ao WHERE ao.post_id = ap.id)),
    (SELECT count(*)::int FROM public.assistance_posts
      WHERE status = 'resolved' AND resolved_at >= date_trunc('month', now())),
    (SELECT count(*)::int FROM public.assistance_posts
      WHERE status = 'resolved' AND resolved_at >= date_trunc('month', now()) - interval '1 month'
        AND resolved_at < date_trunc('month', now())),
    (SELECT round(avg(extract(epoch FROM (fo.first_reply_at - ap.created_at)) / 3600.0)::numeric, 1)
       FROM public.assistance_posts ap JOIN first_offer fo ON fo.post_id = ap.id);
END $$;

REVOKE ALL ON FUNCTION public.admin_assistance_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_assistance_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_assistance_responsiveness()
RETURNS TABLE (country text, total_posts int, answered_posts int, answered_pct int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT ap.country, count(*)::int,
         count(*) FILTER (WHERE ao.post_id IS NOT NULL OR ap.status = 'resolved')::int,
         round(100.0 * count(*) FILTER (WHERE ao.post_id IS NOT NULL OR ap.status = 'resolved') / count(*))::int
    FROM public.assistance_posts ap
    LEFT JOIN LATERAL (
      SELECT 1 AS post_id FROM public.assistance_offers WHERE post_id = ap.id LIMIT 1
    ) ao ON true
   WHERE public.is_admin()
   GROUP BY ap.country
   ORDER BY 4 DESC;
$$;

REVOKE ALL ON FUNCTION public.admin_assistance_responsiveness() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_assistance_responsiveness() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_assistance_needing_push()
RETURNS TABLE (id uuid, title text, member_name text, country text, category text, age_days int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT ap.id, ap.title, p.full_name, ap.country, ap.category,
         extract(day FROM (now() - ap.created_at))::int
    FROM public.assistance_posts ap
    JOIN public.profiles p ON p.id = ap.profile_id
   WHERE public.is_admin()
     AND ap.status = 'open' AND ap.created_at < now() - interval '72 hours'
     AND NOT EXISTS (SELECT 1 FROM public.assistance_offers ao WHERE ao.post_id = ap.id)
   ORDER BY ap.created_at ASC
   LIMIT 50;
$$;

REVOKE ALL ON FUNCTION public.admin_assistance_needing_push() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_assistance_needing_push() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_assistance_requests(p_category text DEFAULT NULL::text)
RETURNS TABLE (
  id uuid, title text, country text, category text,
  replies int, age_days int, status text, is_answered boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT ap.id, ap.title, ap.country, ap.category,
         count(ao.id)::int, extract(day FROM (now() - ap.created_at))::int, ap.status,
         count(ao.id) > 0
    FROM public.assistance_posts ap
    LEFT JOIN public.assistance_offers ao ON ao.post_id = ap.id
   WHERE public.is_admin()
     AND ap.status IN ('open', 'resolved')
     AND (p_category IS NULL OR ap.category = p_category)
   GROUP BY ap.id, ap.title, ap.country, ap.category, ap.created_at, ap.status
   ORDER BY ap.created_at DESC
   LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.admin_assistance_requests(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_assistance_requests(text) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'Admin Assistance Board RPCs ready';
END $$;
