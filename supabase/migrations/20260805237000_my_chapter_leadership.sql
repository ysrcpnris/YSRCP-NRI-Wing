-- =====================================================================
-- 20260805237000 — the wing's own team where a member lives
--
-- The prototype's Abroad Connect screen (m-abroad) shows the member's
-- Country Coordinator, Deputy Coordinator and named functional team
-- leads (Student Assistance, Job Assistance, ...). This maps cleanly
-- onto member_roles, which already has exactly this shape:
-- country_coordinator / chapter_lead / team_lead, the last carrying a
-- free-text `title` documented with the example 'Student Visa
-- Navigator' — i.e. this was already designed for exactly this
-- purpose, just never surfaced to the member it's for.
--
-- WHAT THIS DOES NOT DO — checked with the user, not assumed
--   The mock's "City leads" table wants a named leader per INDIVIDUAL
--   city (Frankfurt/Berlin/Munich each named, Hamburg vacant). Nothing
--   in the schema tracks leadership below the chapter level — a
--   chapter_lead covers a whole multi-city chapter, not one city
--   within it. Building that would mean new schema with no way to
--   populate it yet. Decision: show the chapter_lead(s) for the
--   member's own chapter, no per-city breakdown, no fabricated
--   vacancies for a role level that doesn't exist.
--
--   WhatsApp join/leave state ("Joined" pills, "you're in 2") has no
--   membership table anywhere — my_social_handles() only ever returned
--   links. Decision: leave that exactly as it already works. Not
--   touched by this migration.
--
-- CONTACT INFO EXPOSURE
--   Returns name + mobile/whatsapp for people holding these roles —
--   the same precedent already established for leaders_master: someone
--   who has taken on a public-facing volunteer function is meant to be
--   reachable through it. Nothing else from their profile is exposed;
--   this is not a general "read another member's profile" RPC, and
--   profiles_self_select still blocks that directly.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.my_chapter_leadership()
RETURNS TABLE (
  tier        text,   -- 'coordinator' | 'chapter_lead' | 'team_lead'
  role        text,
  title       text,   -- team_lead's free-text seat name, else NULL
  leader_name text,
  mobile      text,
  whatsapp    text,
  since       timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH me AS (
    SELECT country_of_residence AS country,
           public.chapter_for_city(country_of_residence, city_abroad) AS chapter_id
      FROM public.profiles WHERE id = auth.uid()
  )
  SELECT 'coordinator', mr.role::text, NULL, p.full_name,
         p.mobile_number, p.whatsapp_number, mr.granted_at
    FROM public.member_roles mr
    JOIN public.profiles p ON p.id = mr.profile_id
    CROSS JOIN me
   WHERE mr.is_active AND mr.role = 'country_coordinator'
     AND me.country IS NOT NULL
     AND lower(btrim(mr.country)) = lower(btrim(me.country))

  UNION ALL

  SELECT 'chapter_lead', mr.role::text, NULL, p.full_name,
         p.mobile_number, p.whatsapp_number, mr.granted_at
    FROM public.member_roles mr
    JOIN public.profiles p ON p.id = mr.profile_id
    CROSS JOIN me
   WHERE mr.is_active AND mr.role = 'chapter_lead'
     AND me.chapter_id IS NOT NULL AND mr.chapter_id = me.chapter_id

  UNION ALL

  -- team_lead may be scoped to the member's own chapter OR country-wide
  -- with no chapter (20260805113000) — both are relevant to the member.
  SELECT 'team_lead', mr.role::text, mr.title, p.full_name,
         p.mobile_number, p.whatsapp_number, mr.granted_at
    FROM public.member_roles mr
    JOIN public.profiles p ON p.id = mr.profile_id
    CROSS JOIN me
   WHERE mr.is_active AND mr.role = 'team_lead'
     AND me.country IS NOT NULL
     AND lower(btrim(mr.country)) = lower(btrim(me.country))
     AND (mr.chapter_id IS NULL OR mr.chapter_id = me.chapter_id)

   ORDER BY 1;
$$;

REVOKE ALL ON FUNCTION public.my_chapter_leadership() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_chapter_leadership() TO authenticated;

COMMENT ON FUNCTION public.my_chapter_leadership() IS
  'Country coordinator, this member''s own chapter lead, and team leads '
  'covering their chapter or country. Contact info exposed by design — '
  'these are public-facing volunteer roles, same precedent as leaders_master.';

-- ── a couple of honest stats: real counts, no fabricated ones ────────
CREATE OR REPLACE FUNCTION public.my_chapter_stats()
RETURNS TABLE (
  country_member_count  bigint,
  chapter_name           text,
  chapter_member_count  bigint,
  next_event_title       text,
  next_event_date        timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH me AS (
    SELECT country_of_residence AS country,
           public.chapter_for_city(country_of_residence, city_abroad) AS chapter_id
      FROM public.profiles WHERE id = auth.uid()
  ),
  cc AS (
    SELECT count(*) n FROM public.profiles p, me
     WHERE me.country IS NOT NULL
       AND lower(btrim(p.country_of_residence)) = lower(btrim(me.country))
  ),
  chp AS (
    SELECT ch.name,
           (SELECT count(*) FROM public.profiles p, me
             WHERE me.chapter_id IS NOT NULL
               AND public.chapter_for_city(p.country_of_residence, p.city_abroad) = me.chapter_id) AS n
      FROM public.chapters ch, me WHERE ch.id = me.chapter_id
  ),
  ev AS (
    SELECT e.title, e.date
      FROM public.events e, me
     WHERE me.country IS NOT NULL
       AND lower(btrim(e.country)) = lower(btrim(me.country))
       AND e.status IN ('upcoming', 'Sent')
       AND e.date >= now()
     ORDER BY e.date
     LIMIT 1
  )
  SELECT (SELECT n FROM cc), (SELECT name FROM chp), (SELECT n FROM chp),
         (SELECT title FROM ev), (SELECT date FROM ev);
$$;

REVOKE ALL ON FUNCTION public.my_chapter_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_chapter_stats() TO authenticated;
