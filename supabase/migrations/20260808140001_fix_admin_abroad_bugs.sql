-- =====================================================================
-- 20260808140001 — fix two bugs in 20260808140000, caught live before
-- either function was ever wired to a screen (already applied — a new
-- migration is the only way to land the fix, per this repo's own rule
-- against editing an applied file).
--
-- BUG 1 — admin_abroad_stats(): 42804, "Returned type numeric does not
--   match expected type bigint in column 7". sum() over a bigint
--   column (gaps.member_count, itself a count(*)) returns numeric in
--   Postgres, not bigint — the RETURNS TABLE declared members_unserved
--   bigint. Fixed with an explicit ::bigint cast.
--
-- BUG 2 — admin_abroad_countries(): 42702, "column reference \"country\"
--   is ambiguous". Three of its CTEs (chaps/committee/groups) selected
--   and grouped by a bare `country` column straight off chapters/
--   member_roles/social_handles. The function's own RETURNS TABE has
--   an OUT parameter also named `country` — PL/pgSQL can't tell the
--   unqualified column from the OUT variable. Fixed by qualifying
--   every reference with its table alias, same fix admin_abroad_gaps()
--   never needed because its country references were qualified from
--   the start.
-- =====================================================================

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

DO $$
BEGIN
  RAISE NOTICE 'admin_abroad_stats / admin_abroad_countries fixed live';
END $$;
