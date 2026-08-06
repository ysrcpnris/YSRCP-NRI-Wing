-- =====================================================================
-- 20260806150000 — Chapter home overview (screen `c-home`)
--
-- EVERY NUMBER HERE IS COMPUTED, NAMED FOR WHAT IT ACTUALLY MEASURES
--   The mock has a "Median first reply" stat. This schema has no
--   first-response timestamp — assistance_queue() only ever tracks
--   created_at/updated_at. Built "median hours to resolution" instead
--   (created_at → updated_at on cases that left 'open'), and it is
--   labelled that on the frontend too — first-reply and time-to-
--   resolution are different claims, and only one of them is real here.
--
--   "Response rate" is status <> 'open' — a case a coordinator marked
--   in_progress/resolved/rejected, not proof someone replied to the
--   member. Real, but a proxy; labelled "moved off Open", not "replied".
--
--   Profile completion here is a SERVER-SIDE PROXY, not the client's
--   full weighted checklist (profileChecklist in Dashboard.tsx — family
--   fields, social handles, the works). Duplicating that logic
--   server-side risks the two silently disagreeing. This checks five
--   core fields only and is labelled "core fields complete", not the
--   member-facing "profile strength" percentage.
--
-- REAL REPLACEMENTS FOR TWO MOCK ITEMS THAT HAD NO BACKING AT ALL
--   "Hamburg city lead — 1 member volunteered, needs your decision":
--   there is no volunteer-for-a-role workflow anywhere in this schema
--   — only a coordinator directly appointing via grant_wing_role().
--   Replaced with what IS real: a count of the coordinator's own
--   chapters with no lead at all (my_chapters_overview().lead_name IS
--   NULL), which is the same underlying problem the mock's item was
--   gesturing at, using data that exists.
--
--   "Frankfurt group invite expired": now genuinely real, via
--   social_handles.expires_at (20260806140000).
--
-- WELCOMED TRACKING IS NEW AND MINIMAL
--   welcomed_at — one nullable timestamp, set by a coordinator/chapter
--   lead marking a new joiner as contacted. No new table; matches the
--   mock's "Welcome" workflow without inventing a heavier concept.
-- =====================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS welcomed_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS welcomed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.mark_member_welcomed(p_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_country text;
BEGIN
  SELECT country_of_residence INTO v_country FROM public.profiles WHERE id = p_profile_id;
  IF v_country IS NULL THEN
    RAISE EXCEPTION 'no such member' USING ERRCODE = '22023';
  END IF;
  IF NOT (public.is_admin() OR public.has_country_scope(v_country)) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles SET welcomed_at = now(), welcomed_by = auth.uid()
   WHERE id = p_profile_id AND welcomed_at IS NULL;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.mark_member_welcomed(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mark_member_welcomed(uuid) TO authenticated;

-- ── recent joiners, with real welcome state ────────────────────────────
CREATE OR REPLACE FUNCTION public.my_chapter_new_joinees(p_days int DEFAULT 7)
RETURNS TABLE (
  id             uuid,
  full_name      text,
  city_abroad    text,
  created_at     timestamptz,
  referred_by_name text,
  core_fields_complete boolean,
  welcomed_at    timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.city_abroad, p.created_at,
         ref.full_name,
         (p.mobile_number IS NOT NULL AND p.dob IS NOT NULL AND p.gender IS NOT NULL
          AND p.assembly_constituency IS NOT NULL AND p.city_abroad IS NOT NULL),
         p.welcomed_at
    FROM public.profiles p
    LEFT JOIN public.profiles ref ON ref.public_user_code = p.referred_by
   WHERE public.member_in_scope(p.country_of_residence, p.city_abroad)
     AND p.created_at > now() - make_interval(days => greatest(1, least(coalesce(p_days, 7), 90)))
   ORDER BY p.created_at DESC
   LIMIT 100;
$$;

REVOKE ALL ON FUNCTION public.my_chapter_new_joinees(int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_chapter_new_joinees(int) TO authenticated;

-- ── the overview stats and action items, all computed from real rows ──
CREATE OR REPLACE FUNCTION public.my_chapter_home()
RETURNS TABLE (
  members_total          bigint,
  joined_7d               bigint,
  open_assistance         bigint,
  unanswered_assistance   bigint,
  response_rate_pct       int,
  median_hours_to_resolution numeric,
  core_fields_complete_pct int,
  vacant_chapters         bigint,
  expiring_or_expired_handles bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_scoped_countries text[];
BEGIN
  v_scoped_countries := public.my_countries();
  IF v_scoped_countries IS NULL OR array_length(v_scoped_countries, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH mem AS (
    SELECT p.id, p.created_at,
           (p.mobile_number IS NOT NULL AND p.dob IS NOT NULL AND p.gender IS NOT NULL
            AND p.assembly_constituency IS NOT NULL AND p.city_abroad IS NOT NULL) AS complete
      FROM public.profiles p
     WHERE p.country_of_residence = ANY (v_scoped_countries)
  ),
  -- student_requests carries no country column of its own (target_country
  -- is a different field — where the student wants to study, not where
  -- they live) — scoped via the same profile JOIN assistance_queue() uses,
  -- not a column that doesn't exist on that table.
  cases AS (
    SELECT g.status, g.created_at, g.updated_at
      FROM public.grievances g
      JOIN public.profiles p ON p.id = g.profile_id
     WHERE p.country_of_residence = ANY (v_scoped_countries)
    UNION ALL
    SELECT s.status, s.created_at, s.updated_at
      FROM public.student_requests s
      JOIN public.profiles p ON p.id = s.profile_id
     WHERE p.country_of_residence = ANY (v_scoped_countries)
  ),
  handles AS (
    SELECT expires_at FROM public.social_handles
     WHERE scope = 'chapter' AND country = ANY (v_scoped_countries) AND is_active
  )
  SELECT
    (SELECT count(*) FROM mem),
    (SELECT count(*) FROM mem WHERE created_at > now() - interval '7 days'),
    (SELECT count(*) FROM cases WHERE status = 'open'),
    (SELECT count(*) FROM cases WHERE status = 'open' AND created_at < now() - interval '72 hours'),
    (SELECT CASE WHEN count(*) = 0 THEN 100
                 ELSE round(100.0 * count(*) FILTER (WHERE status <> 'open') / count(*))::int
            END
       FROM cases),
    (SELECT round(avg(extract(epoch FROM (updated_at - created_at)) / 3600.0)::numeric, 1)
       FROM cases WHERE status <> 'open'),
    (SELECT CASE WHEN count(*) = 0 THEN 0
                 ELSE round(100.0 * count(*) FILTER (WHERE complete) / count(*))::int
            END
       FROM mem),
    (SELECT count(*) FROM public.chapters c
      WHERE c.country = ANY (v_scoped_countries)
        AND NOT EXISTS (SELECT 1 FROM public.member_roles mr
                          WHERE mr.role = 'chapter_lead' AND mr.chapter_id = c.id AND mr.is_active)),
    (SELECT count(*) FROM handles WHERE expires_at IS NOT NULL AND expires_at < now() + interval '14 days');
END $$;

REVOKE ALL ON FUNCTION public.my_chapter_home() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_chapter_home() TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'Chapter home RPCs ready';
END $$;
