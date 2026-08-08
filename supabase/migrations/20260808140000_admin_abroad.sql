-- =====================================================================
-- 20260808140000 — Abroad Connect (a-abroad)
--
-- TERMINOLOGY FIX, NOT A NEW DECISION
--   The mock's "Active chapters: 34, one per country" and "Chapters
--   approaching the group limit" both use "chapter" to mean the
--   COUNTRY-level unit. That was true before 20260805150000 renamed
--   clusters -> chapters — today a chapter is a city-cluster WITHIN a
--   country (a country can have 0-5+, see the US's 5 and Australia's
--   2). Reusing "chapter" for a country-count here would be wrong
--   under the current schema, not a stale mock detail worth
--   preserving. Every stat/label below is named for what it actually
--   counts; see admin_abroad_countries()'s own columns for the real
--   per-chapter breakdown (chapters_count).
--
-- "COMMITTEE: X/15" — DROPPED, ALREADY DECIDED
--   The 15-seat committee cap was explicitly rejected twice already
--   in this codebase (20260806140000, 20260807100000): team_lead is
--   uncapped, no fixed denominator exists. admin_abroad_countries()
--   returns a raw committee_count, no fraction.
--
-- "CITY LEADS: 61, 18 UNFILLED" — RELABELLED, NOT DROPPED
--   chapter_lead is scoped to a whole chapter (member_roles.chapter_id),
--   not to one city within it — there's no column anywhere that
--   assigns a lead to a specific city. A literal per-city count would
--   be invented precision the schema doesn't have. admin_abroad_stats()
--   reports chapters_with_lead / chapters_total instead — the same
--   underlying gap (which chapters have someone running them), at the
--   precision the data actually supports.
--
-- WHATSAPP REGISTRY — CHECKED WITH THE USER: REUSE, DON'T DUPLICATE
--   my_chapter_handles_admin() (20260808100000) already returns every
--   field a-abroad's WhatsApp registry needs (member_count,
--   count_as_of, expires_at, can_write) — it was just never grouped by
--   country, only chapter. Extended below with one column (country)
--   rather than forked into a second query over the same table.
--   rotate_chapter_handle() (20260806140000) already exists and is
--   wired here for the first time — a-links itself doesn't expose a
--   Rotate action yet.
--
-- "UNFILLED ROLES" — CHECKED WITH THE USER: 3 REAL SIGNALS, 1 DROPPED
--   admin_abroad_gaps() unions country-coordinator gaps (the same
--   query wing_countries_without_coordinator() runs, inlined here
--   rather than called — that function gates on is_admin() specifically,
--   narrower than has_global_scope(), which would silently starve a
--   secretariat caller of rows despite passing this function's own
--   gate), chapter_lead gaps (chapters with zero active lead), and an
--   assistance backlog per country (answered_pct < 50, the same
--   threshold AdminAssistance.tsx's own barColor() already treats as
--   the red/urgent tier — inlined for the same is_admin()-vs-
--   has_global_scope() reason, not copied from
--   admin_assistance_responsiveness() directly). The mock's fourth
--   item — an "events activity" / "1 volunteer" figure — has no
--   backing column anywhere in the schema and is not built.
--
-- "ADD CHAPTER" / "ADD GROUP" — REAL, NOT NEW
--   create_chapter() (20260806130000) and add_chapter_handle()
--   (20260806140000) already exist and already work (the former is
--   wired into MyChapterClusters.tsx for coordinators) — a-abroad just
--   gives admin the same two actions, not a new mechanism.
--
-- NOTE: this file's source below is already corrected for two bugs
-- caught live right after this migration was first applied (a bigint/
-- numeric cast mismatch, and a bare `country` column colliding with a
-- PL/pgSQL OUT parameter of the same name) — the live fix landed as a
-- separate migration, 20260808140001, since this file was already
-- applied by the time either bug surfaced. See that file for detail.
-- =====================================================================

-- ── my_chapter_handles_admin(): add country, needed to group/filter
--    the same real handle rows by country instead of only by chapter ──
DROP FUNCTION IF EXISTS public.my_chapter_handles_admin();
CREATE OR REPLACE FUNCTION public.my_chapter_handles_admin()
RETURNS TABLE (
  id                 uuid,
  chapter_id         uuid,
  chapter_name       text,
  country            text,
  platform           text,
  label              text,
  handle             text,
  url                text,
  member_count       int,
  count_as_of        date,
  expires_at         timestamptz,
  joined_via_portal  bigint,
  can_write          boolean,
  published_by_name  text,
  published_at       timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT sh.id, sh.chapter_id, cl.name, sh.country, sh.platform::text, sh.label, sh.handle, sh.url,
         sh.member_count, sh.count_as_of, sh.expires_at,
         (SELECT count(*) FROM public.social_handle_joins j WHERE j.handle_id = sh.id),
         public.can_write_chapter(sh.chapter_id),
         p.full_name, sh.created_at
    FROM public.social_handles sh
    JOIN public.chapters cl ON cl.id = sh.chapter_id
    LEFT JOIN public.profiles p ON p.id = sh.created_by
   WHERE sh.scope = 'chapter'
     AND sh.is_active
     AND (public.is_admin() OR sh.chapter_id = ANY (public.my_chapter_ids())
          OR sh.country = ANY (public.my_countries()))
   ORDER BY cl.name, sh.sort_order, sh.label;
$$;

REVOKE ALL ON FUNCTION public.my_chapter_handles_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_chapter_handles_admin() TO authenticated;

-- ── the 4 stat cards ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_abroad_stats()
RETURNS TABLE (
  countries_active               bigint,
  chapters_total                 bigint,
  chapters_with_lead             bigint,
  whatsapp_groups                bigint,
  whatsapp_members_reached       bigint,
  countries_without_coordinator  bigint,
  members_unserved                bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_global_scope() THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH gaps AS (
    SELECT p.country_of_residence AS country, count(*) AS member_count
      FROM public.profiles p
     WHERE p.country_of_residence IS NOT NULL AND btrim(p.country_of_residence) <> ''
       AND NOT EXISTS (
         SELECT 1 FROM public.member_roles mr
          WHERE mr.role = 'country_coordinator' AND mr.revoked_at IS NULL
            AND mr.country = p.country_of_residence
       )
     GROUP BY p.country_of_residence
  )
  SELECT
    (SELECT count(DISTINCT country_of_residence) FROM public.profiles
      WHERE country_of_residence IS NOT NULL AND btrim(country_of_residence) <> ''),
    (SELECT count(*) FROM public.chapters),
    (SELECT count(DISTINCT c.id) FROM public.chapters c
       JOIN public.member_roles mr ON mr.chapter_id = c.id
      WHERE mr.role = 'chapter_lead' AND mr.revoked_at IS NULL),
    (SELECT count(*) FROM public.social_handles
      WHERE scope = 'chapter' AND platform = 'whatsapp' AND is_active),
    (SELECT coalesce(sum(member_count), 0) FROM public.social_handles
      WHERE scope = 'chapter' AND platform = 'whatsapp' AND is_active),
    (SELECT count(*) FROM gaps),
    (SELECT coalesce(sum(member_count), 0)::bigint FROM gaps);
END $$;

REVOKE ALL ON FUNCTION public.admin_abroad_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_abroad_stats() TO authenticated;

COMMENT ON FUNCTION public.admin_abroad_stats() IS
  'ADMIN ONLY. countries_active/chapters_* are the honest analogs of '
  'the mock''s "Active chapters"/"City leads" cards — see migration '
  'header for why the mock''s own numbers don''t map 1:1 onto this '
  'schema. Empty row set for non-admins.';

-- ── the Countries table ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_abroad_countries()
RETURNS TABLE (
  country            text,
  coordinator_count  bigint,
  lead_coordinator   text,
  members            bigint,
  chapters_count     bigint,
  committee_count    bigint,
  whatsapp_groups    bigint,
  status             text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_global_scope() THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT country_of_residence AS country, count(*) AS members
      FROM public.profiles
     WHERE country_of_residence IS NOT NULL AND btrim(country_of_residence) <> ''
     GROUP BY country_of_residence
  ),
  coords AS (
    SELECT mr.country, count(*) AS coordinator_count,
           (array_agg(p.full_name ORDER BY mr.granted_at))[1] AS first_name
      FROM public.member_roles mr
      JOIN public.profiles p ON p.id = mr.profile_id
     WHERE mr.role = 'country_coordinator' AND mr.revoked_at IS NULL
     GROUP BY mr.country
  ),
  chaps AS (
    SELECT c.country, count(*) AS chapters_count FROM public.chapters c GROUP BY c.country
  ),
  committee AS (
    SELECT mr.country, count(*) AS committee_count
      FROM public.member_roles mr
     WHERE mr.role = 'team_lead' AND mr.revoked_at IS NULL
     GROUP BY mr.country
  ),
  groups AS (
    SELECT sh.country, count(*) AS whatsapp_groups
      FROM public.social_handles sh
     WHERE sh.scope = 'chapter' AND sh.platform = 'whatsapp' AND sh.is_active
     GROUP BY sh.country
  )
  SELECT
    b.country,
    coalesce(co.coordinator_count, 0),
    CASE
      WHEN coalesce(co.coordinator_count, 0) = 0 THEN NULL
      WHEN co.coordinator_count = 1 THEN co.first_name
      ELSE co.first_name || ' + ' || (co.coordinator_count - 1) || ' peer'
           || CASE WHEN co.coordinator_count - 1 = 1 THEN '' ELSE 's' END
    END,
    b.members,
    coalesce(ch.chapters_count, 0),
    coalesce(cm.committee_count, 0),
    coalesce(g.whatsapp_groups, 0),
    CASE WHEN coalesce(co.coordinator_count, 0) = 0 THEN 'no_coordinator' ELSE 'healthy' END
  FROM base b
  LEFT JOIN coords    co ON co.country = b.country
  LEFT JOIN chaps     ch ON ch.country = b.country
  LEFT JOIN committee cm ON cm.country = b.country
  LEFT JOIN groups    g  ON g.country  = b.country
  ORDER BY b.members DESC;
END $$;

REVOKE ALL ON FUNCTION public.admin_abroad_countries() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_abroad_countries() TO authenticated;

COMMENT ON FUNCTION public.admin_abroad_countries() IS
  'ADMIN ONLY. status is binary (healthy/no_coordinator) — the mock''s '
  'third state, "Committee short", implies a target committee size '
  'that does not exist in this schema (team_lead is uncapped by '
  'design). Empty row set for non-admins.';

-- ── the Unfilled-roles list: 3 real signals, unioned ──────────────
CREATE OR REPLACE FUNCTION public.admin_abroad_gaps()
RETURNS TABLE (
  gap_type    text,
  country     text,
  chapter     text,
  chapter_id  uuid,
  detail      text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_global_scope() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 'no_coordinator', g.country, NULL::text, NULL::uuid,
         g.member_count || CASE WHEN g.member_count = 1 THEN ' member waiting' ELSE ' members waiting' END
    FROM (
      SELECT p.country_of_residence AS country, count(*) AS member_count
        FROM public.profiles p
       WHERE p.country_of_residence IS NOT NULL AND btrim(p.country_of_residence) <> ''
         AND NOT EXISTS (
           SELECT 1 FROM public.member_roles mr
            WHERE mr.role = 'country_coordinator' AND mr.revoked_at IS NULL
              AND mr.country = p.country_of_residence
         )
       GROUP BY p.country_of_residence
    ) g

  UNION ALL

  SELECT 'no_chapter_lead', c.country, c.name, c.id,
         coalesce(m.member_count, 0) || CASE WHEN coalesce(m.member_count, 0) = 1 THEN ' member, no chapter lead' ELSE ' members, no chapter lead' END
    FROM public.chapters c
    LEFT JOIN LATERAL (
      SELECT count(*) AS member_count
        FROM public.profiles p2
        JOIN public.chapter_cities cc2
          ON lower(btrim(cc2.country)) = lower(btrim(p2.country_of_residence))
         AND lower(btrim(cc2.city))    = lower(btrim(p2.city_abroad))
       WHERE cc2.chapter_id = c.id
    ) m ON true
   WHERE NOT EXISTS (
     SELECT 1 FROM public.member_roles mr
      WHERE mr.role = 'chapter_lead' AND mr.revoked_at IS NULL AND mr.chapter_id = c.id
   )

  UNION ALL

  SELECT 'assistance_backlog', ap.country, NULL::text, NULL::uuid,
         round(100.0 * count(*) FILTER (WHERE ao.post_id IS NOT NULL OR ap.status = 'resolved') / count(*))::text
           || '% answered, ' || count(*) FILTER (WHERE ao.post_id IS NULL AND ap.status <> 'resolved') || ' open unanswered'
    FROM public.assistance_posts ap
    LEFT JOIN LATERAL (
      SELECT 1 AS post_id FROM public.assistance_offers WHERE post_id = ap.id LIMIT 1
    ) ao ON true
   GROUP BY ap.country
  HAVING round(100.0 * count(*) FILTER (WHERE ao.post_id IS NOT NULL OR ap.status = 'resolved') / count(*)) < 50;
END $$;

REVOKE ALL ON FUNCTION public.admin_abroad_gaps() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_abroad_gaps() TO authenticated;

COMMENT ON FUNCTION public.admin_abroad_gaps() IS
  'ADMIN ONLY. 3 real signals only — see migration header for the '
  'unfilled-roles figure that was checked with the user and dropped '
  'for having no backing column. Empty row set for non-admins.';

DO $$
BEGIN
  RAISE NOTICE 'admin_abroad_stats / admin_abroad_countries / admin_abroad_gaps created; my_chapter_handles_admin extended with country';
END $$;
