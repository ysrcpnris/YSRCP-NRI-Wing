-- =====================================================================
-- 20260808190000 — Talent Pool (a-talent)
--
-- THE SCREEN'S REAL SPINE IS contribution_areas, NOT join_org_interest
--   The mock's three top stat cards (Social Media/Technology/Political,
--   counts and percentages) are exactly profiles.contribution_areas'
--   three real values — already granted, already carried by
--   chapter_roster()/admin_member_list(). join_org_interest backs
--   exactly one card ("Willing to join the organisation"), not the
--   whole screen — the todo list that named this migration guessed the
--   connection was screen-wide; it isn't.
--
-- DROPPED, NOT FAKED — same pattern as every other screen this batch
--   "X active" on each stat card: no login/session-tracking concept
--   exists anywhere in this schema (checked: no last_active/last_login
--   column on profiles or anywhere else). Not built.
--
--   The "Deployable capacity" card's four categories (Telugu content
--   creators / web & app builders / data & analytics / event
--   organisers abroad) correspond to nothing — not contribution_areas'
--   three real values, not profession (free text, and two earlier
--   migrations — 20260805238000, and MyHome.tsx's own comment — already
--   concluded profession has no structured skills taxonomy to match
--   against reliably). Replaced with a real substitute that keeps the
--   card's actual purpose (where is contribution capacity concentrated)
--   using data that exists: contribution_areas broken down by country.
--
--   Per-member bio lines in the "Willing to join" table ("Runs a
--   2,000-strong Telugu network in Germany") — no bio/description
--   field exists on profiles. Not built; the row shows what's real
--   (name, country, contributes, referred, since).
--
--   "Start intake" / "Shortlist" buttons — no intake or shortlist
--   mechanism exists anywhere in this schema, same class of drop as
--   a-assist's Nudge/Escalate buttons and a-digital's auto-pull.
--
-- GATE: has_global_scope(), matching the reporting-screen convention
--   (a-vote/a-abroad/a-digital/a-appt), not a-feedback's stricter
--   is_admin()-only — there's no "reserved capability" analog here,
--   this is read-only reporting a secretariat should see too.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.admin_talent_pool_stats()
RETURNS TABLE (
  area   text,
  count  bigint,
  pct    numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_total bigint;
BEGIN
  IF NOT public.has_global_scope() THEN
    RETURN;
  END IF;

  SELECT count(*) INTO v_total FROM public.profiles;

  RETURN QUERY
  SELECT a.area,
         count(p.id),
         round(100.0 * count(p.id) / nullif(v_total, 0), 1)
    FROM unnest(ARRAY['social_media', 'technology', 'political']) AS a(area)
    LEFT JOIN public.profiles p ON p.contribution_areas @> ARRAY[a.area]
   GROUP BY a.area
   ORDER BY array_position(ARRAY['social_media', 'technology', 'political'], a.area);
END $$;

REVOKE ALL ON FUNCTION public.admin_talent_pool_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_talent_pool_stats() TO authenticated;

COMMENT ON FUNCTION public.admin_talent_pool_stats() IS
  'ADMIN/SECRETARIAT. Real counts/percentages per contribution area. '
  'No "active" column — nothing in this schema tracks activity. Empty '
  'row set without global scope.';

CREATE OR REPLACE FUNCTION public.admin_talent_willing()
RETURNS TABLE (
  id                  uuid,
  full_name           text,
  country             text,
  city_abroad         text,
  contribution_areas  text[],
  referred_count      bigint,
  member_since        timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_global_scope() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id, p.full_name, p.country_of_residence, p.city_abroad,
         p.contribution_areas,
         (SELECT count(*) FROM public.referrals r WHERE r.referrer_id = p.id),
         p.created_at
    FROM public.profiles p
   WHERE p.join_org_interest = 'yes'
   ORDER BY p.created_at DESC;
END $$;

REVOKE ALL ON FUNCTION public.admin_talent_willing() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_talent_willing() TO authenticated;

COMMENT ON FUNCTION public.admin_talent_willing() IS
  'ADMIN/SECRETARIAT. Members who answered yes to "join the '
  'organisation formally?" No bio/intake/shortlist fields exist — '
  'not returned. Empty row set without global scope.';

CREATE OR REPLACE FUNCTION public.admin_talent_by_country()
RETURNS TABLE (
  country       text,
  social_media  bigint,
  technology    bigint,
  political     bigint,
  total         bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_global_scope() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.country_of_residence,
         count(*) FILTER (WHERE p.contribution_areas @> ARRAY['social_media']),
         count(*) FILTER (WHERE p.contribution_areas @> ARRAY['technology']),
         count(*) FILTER (WHERE p.contribution_areas @> ARRAY['political']),
         count(*)
    FROM public.profiles p
   WHERE p.country_of_residence IS NOT NULL
     AND p.contribution_areas IS NOT NULL
     AND array_length(p.contribution_areas, 1) > 0
   GROUP BY p.country_of_residence
   ORDER BY count(*) DESC;
END $$;

REVOKE ALL ON FUNCTION public.admin_talent_by_country() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_talent_by_country() TO authenticated;

COMMENT ON FUNCTION public.admin_talent_by_country() IS
  'ADMIN/SECRETARIAT. Real replacement for the mock''s "Deployable '
  'capacity" card, whose four categories correspond to nothing in this '
  'schema — this groups the three real contribution_areas by country '
  'instead. Empty row set without global scope.';

DO $$
BEGIN
  RAISE NOTICE 'admin_talent_pool_stats / admin_talent_willing / admin_talent_by_country created';
END $$;
