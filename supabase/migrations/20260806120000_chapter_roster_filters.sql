-- =====================================================================
-- 20260806120000 — chapter_roster(): city/contribution filters, a real
-- "Contributes" column for the mock's Our Members screen
--
-- Built to docs/design/nri-wing-prototype.html (screen `c-members`).
--
-- THE VOTER COLUMN STAYS EXACTLY AS ABSENT AS IT ALREADY WAS
--   The mock shows a "Voter" column that always reads "Hidden" — this
--   needs no backend change at all. chapter_roster() has never
--   returned has_vote/epic_number/voter_constituency (column-level
--   privilege withholds them from coordinators, per MyProfile.tsx's
--   own docstring), so the frontend can render a static "Hidden" label
--   honestly: it genuinely has nothing to show, by design, not by
--   omission.
--
-- WHAT'S GENUINELY NEW HERE
--   p_city / p_contribution filter params, and contribution_areas
--   (→ "Contributes" pills) — an existing column, filled in by members
--   themselves via Profile → "How can you contribute?", never selected
--   by chapter_roster() before.
--
-- WHAT THE MOCK ALSO SHOWS THAT THIS DOES NOT ADD: "Join org"
--   The mock's table has a "Join org" column (Yes / Tell me more / —).
--   That is NOT participate_campaign, which already means something
--   else (how a member wants to take part in campaigns — physically,
--   digitally, funding — collected at signup, no signup form control
--   currently writes to it either). The actual "would you like to join
--   the organisation formally?" question MyProfile.tsx renders has, by
--   its own documented decision, no backing column at all — rendered,
--   answer never sent anywhere. Building a coordinator-facing "Join
--   org" column here would either show participate_campaign under the
--   wrong label or read a real answer from a field that stores nothing.
--   Omitted, matching the same call already made on the member side.
-- =====================================================================

DROP FUNCTION IF EXISTS public.chapter_roster(text, text, int, int);
CREATE OR REPLACE FUNCTION public.chapter_roster(
  p_country      text DEFAULT NULL,
  p_search       text DEFAULT NULL,
  p_city         text DEFAULT NULL,
  p_contribution text DEFAULT NULL,
  p_limit        int  DEFAULT 100,
  p_offset       int  DEFAULT 0
)
RETURNS TABLE (
  id                 uuid,
  full_name          text,
  email              text,
  mobile_number      text,
  city_abroad        text,
  country            text,
  chapter            text,
  constituency       text,
  district            text,
  joined_at          timestamptz,
  contribution_areas text[],
  public_user_code   text,
  total_count        bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_global_scope()
          OR array_length(public.my_countries(), 1) IS NOT NULL
          OR array_length(public.my_chapter_ids(), 1) IS NOT NULL) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH scoped AS (
    SELECT p.id, p.full_name, p.email, p.mobile_number,
           p.city_abroad, p.country_of_residence,
           cl.name AS chapter_name,
           p.assembly_constituency, p.district, p.created_at,
           p.contribution_areas, p.public_user_code
      FROM public.profiles p
      LEFT JOIN public.chapter_cities cc
             ON lower(btrim(cc.country)) = lower(btrim(p.country_of_residence))
            AND lower(btrim(cc.city))    = lower(btrim(p.city_abroad))
      LEFT JOIN public.chapters cl ON cl.id = cc.chapter_id
     WHERE public.member_in_scope(p.country_of_residence, p.city_abroad)
       AND (p_country IS NULL OR p.country_of_residence = p_country)
       AND (p_city IS NULL OR btrim(p_city) = '' OR p.city_abroad ILIKE p_city)
       AND (p_contribution IS NULL OR btrim(p_contribution) = ''
            OR p.contribution_areas @> ARRAY[p_contribution])
       AND (
         p_search IS NULL OR btrim(p_search) = ''
         OR p.full_name   ILIKE '%' || btrim(p_search) || '%'
         OR p.email       ILIKE '%' || btrim(p_search) || '%'
         OR p.city_abroad ILIKE '%' || btrim(p_search) || '%'
       )
  )
  SELECT s.id, s.full_name, s.email, s.mobile_number,
         s.city_abroad, s.country_of_residence, s.chapter_name,
         s.assembly_constituency, s.district, s.created_at,
         s.contribution_areas, s.public_user_code,
         count(*) OVER ()
    FROM scoped s
   ORDER BY s.created_at DESC
   LIMIT greatest(1, least(coalesce(p_limit, 100), 500))
  OFFSET greatest(0, coalesce(p_offset, 0));
END $$;

REVOKE ALL ON FUNCTION public.chapter_roster(text, text, text, text, int, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.chapter_roster(text, text, text, text, int, int) TO authenticated;
