-- =====================================================================
-- 20260806130000 — a country coordinator can create chapters, safely
--
-- Built to docs/design/nri-wing-prototype.html (screen `c-clusters`),
-- per explicit user decision: reverse the LIMITATION that
-- 20260804250000 imposed (coordinators could not create chapters at
-- all), without reopening the HOLE that migration actually closed.
--
-- WHAT 20260804250000 CLOSED, AND WHY THIS DOESN'T REOPEN IT
--   The hole was a lax PERMISSIVE table policy (`clusters_write USING
--   has_country_scope(country)`) that let a coordinator INSERT *and
--   DELETE* directly via PostgREST — and DELETE was the dangerous
--   half, because chapter_cities/social_handles cascade off a chapter,
--   so deleting one silently wiped a chapter's WhatsApp groups and
--   handles. That migration's RESTRICTIVE policies (clusters_no_insert/
--   update/delete) are UNTOUCHED here — direct table writes are still
--   admin-only, still enforced at the RLS layer, still safe against a
--   compromised or buggy client.
--
--   What this adds instead is two SECURITY DEFINER RPCs — the same
--   pattern as every other write path in this schema (record_share,
--   book_slot, post_assistance_request, ...): scoped, audited,
--   input-validated, and incapable of the one thing that made the
--   original hole dangerous. Neither RPC deletes anything. A
--   coordinator can create a chapter and add cities to it (their own
--   country only, checked server-side via has_country_scope, never
--   client-supplied) — they still cannot delete a chapter or detach a
--   city from one, which stays admin-only exactly as before.
--
-- CITY DATA QUALITY IS REAL, NOT ASSUMED
--   The mock's own "Before this works properly" card says city is
--   free text and clusters are only as good as it. city_data_quality()
--   returns the real distinct (city, member_count) pairs for a
--   country — the frontend does the near-duplicate/null detection the
--   mock describes, against real values, not invented examples.
-- =====================================================================

-- ── create a chapter, in the caller's own country only ────────────────
CREATE OR REPLACE FUNCTION public.create_chapter(
  p_country text,
  p_name    text,
  p_cities  text[] DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid; v_city text;
BEGIN
  IF NOT (public.is_admin() OR public.has_country_scope(p_country)) THEN
    RAISE EXCEPTION 'not authorized to create a chapter in %', p_country USING ERRCODE = '42501';
  END IF;
  IF btrim(coalesce(p_name, '')) = '' THEN
    RAISE EXCEPTION 'chapter name is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.chapters (country, name, created_by)
  VALUES (p_country, btrim(p_name), auth.uid())
  RETURNING id INTO v_id;

  -- A city already claimed by another chapter is silently skipped, not
  -- stolen — chapter_cities' PK is (country, city), one chapter per
  -- city. Use assign_city_to_chapter() to move a city on purpose.
  FOREACH v_city IN ARRAY coalesce(p_cities, '{}') LOOP
    IF btrim(coalesce(v_city, '')) <> '' THEN
      INSERT INTO public.chapter_cities (chapter_id, city, country)
      VALUES (v_id, btrim(v_city), p_country)
      ON CONFLICT (country, city) DO NOTHING;
    END IF;
  END LOOP;

  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.create_chapter(text, text, text[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_chapter(text, text, text[]) TO authenticated;

-- ── add (or move) one city into a chapter the caller has scope over ───
CREATE OR REPLACE FUNCTION public.assign_city_to_chapter(p_chapter_id uuid, p_city text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_country text;
BEGIN
  SELECT country INTO v_country FROM public.chapters WHERE id = p_chapter_id;
  IF v_country IS NULL THEN
    RAISE EXCEPTION 'no such chapter' USING ERRCODE = '22023';
  END IF;
  IF NOT (public.is_admin() OR public.has_country_scope(v_country)) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF btrim(coalesce(p_city, '')) = '' THEN
    RAISE EXCEPTION 'city is required' USING ERRCODE = '22023';
  END IF;

  -- Reassigning a city already in one of the caller's own-country
  -- chapters to another is within their authority (whole-country
  -- scope); a city in a DIFFERENT country is unreachable regardless,
  -- since chapter_cities.country is fixed to this chapter's country.
  INSERT INTO public.chapter_cities (chapter_id, city, country)
  VALUES (p_chapter_id, btrim(p_city), v_country)
  ON CONFLICT (country, city) DO UPDATE SET chapter_id = EXCLUDED.chapter_id;

  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.assign_city_to_chapter(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.assign_city_to_chapter(uuid, text) TO authenticated;

-- ── chapters in the caller's scope, with real city + member counts ────
CREATE OR REPLACE FUNCTION public.my_chapters_overview()
RETURNS TABLE (
  chapter_id    uuid,
  name          text,
  country       text,
  cities        text[],
  member_count  bigint,
  lead_name     text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.name, c.country,
         coalesce(array_agg(DISTINCT cc.city) FILTER (WHERE cc.city IS NOT NULL), '{}'),
         count(DISTINCT p.id),
         (SELECT pr.full_name FROM public.member_roles mr
            JOIN public.profiles pr ON pr.id = mr.profile_id
           WHERE mr.role = 'chapter_lead' AND mr.chapter_id = c.id AND mr.is_active
           ORDER BY mr.granted_at LIMIT 1)
    FROM public.chapters c
    LEFT JOIN public.chapter_cities cc ON cc.chapter_id = c.id
    LEFT JOIN public.profiles p
           ON lower(btrim(p.country_of_residence)) = lower(btrim(cc.country))
          AND lower(btrim(p.city_abroad))           = lower(btrim(cc.city))
   WHERE public.is_admin() OR c.country = ANY (public.my_countries())
   GROUP BY c.id, c.name, c.country
   ORDER BY c.name;
$$;

REVOKE ALL ON FUNCTION public.my_chapters_overview() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_chapters_overview() TO authenticated;

-- ── cities with members but no chapter yet ─────────────────────────────
CREATE OR REPLACE FUNCTION public.unclustered_cities(p_country text)
RETURNS TABLE (city text, member_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.city_abroad, count(*)
    FROM public.profiles p
   WHERE (public.is_admin() OR public.has_country_scope(p_country))
     AND p.country_of_residence = p_country
     AND p.city_abroad IS NOT NULL AND btrim(p.city_abroad) <> ''
     AND NOT EXISTS (
       SELECT 1 FROM public.chapter_cities cc
        WHERE lower(btrim(cc.country)) = lower(btrim(p.country_of_residence))
          AND lower(btrim(cc.city))    = lower(btrim(p.city_abroad))
     )
   GROUP BY p.city_abroad
   ORDER BY count(*) DESC;
$$;

REVOKE ALL ON FUNCTION public.unclustered_cities(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.unclustered_cities(text) TO authenticated;

-- ── real city-string variance, for the "before this works properly" card ──
CREATE OR REPLACE FUNCTION public.city_data_quality(p_country text)
RETURNS TABLE (city text, member_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT coalesce(nullif(btrim(p.city_abroad), ''), '(blank)'), count(*)
    FROM public.profiles p
   WHERE (public.is_admin() OR public.has_country_scope(p_country))
     AND p.country_of_residence = p_country
   GROUP BY 1
   ORDER BY count(*) DESC;
$$;

REVOKE ALL ON FUNCTION public.city_data_quality(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.city_data_quality(text) TO authenticated;
