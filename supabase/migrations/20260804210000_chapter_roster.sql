-- =====================================================================
-- 20260804210000 — chapter roster and chapter stats
--
-- The chapter surface: a coordinator sees the members of the countries
-- they are scoped to, and nothing else.
--
-- WHAT THIS DELIBERATELY DOES NOT RETURN
--   No epic_number, no has_vote, no dob, no family_* fields. Those are
--   withheld from `authenticated` at the column level (20260804094500)
--   and this function does not reintroduce them by the back door.
--   A coordinator needs to organise their chapter, which requires
--   knowing who is in it and how to reach them — not their voter ID.
--
--   mobile_number IS returned. A coordinator who cannot contact their
--   own members cannot do the job, and it is already visible to them
--   through chapter_members. It is scoped by country, so this is not a
--   route to the full membership.
--
-- WHY SECURITY DEFINER WITH AN EXPLICIT SCOPE CHECK
--   The function must read profiles across a country, which row-level
--   policies alone would not permit for a coordinator. It therefore
--   checks scope itself, at the top, and returns nothing when the caller
--   has no claim to the country asked for. A caller with no role gets an
--   empty set, never someone else's chapter.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.chapter_roster(
  p_country text DEFAULT NULL,
  p_search  text DEFAULT NULL,
  p_limit   int  DEFAULT 100,
  p_offset  int  DEFAULT 0
)
RETURNS TABLE (
  id              uuid,
  full_name       text,
  email           text,
  mobile_number   text,
  city_abroad     text,
  country         text,
  chapter         text,
  constituency    text,
  district        text,
  joined_at       timestamptz,
  total_count     bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  scoped text[];
BEGIN
  -- The caller's countries. An admin gets every country they administer;
  -- a coordinator gets the ones they are assigned to.
  scoped := public.my_countries();

  IF scoped IS NULL OR array_length(scoped, 1) IS NULL THEN
    RETURN;                       -- no role, no roster
  END IF;

  -- Asking for a specific country is only honoured if it is in scope.
  IF p_country IS NOT NULL AND NOT (p_country = ANY (scoped)) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH scoped_members AS (
    SELECT p.id, p.full_name, p.email, p.mobile_number,
           p.city_abroad, p.country_of_residence,
           cl.name AS chapter_name,
           p.assembly_constituency, p.district, p.created_at
      FROM public.profiles p
      LEFT JOIN public.cluster_cities cc
             ON lower(btrim(cc.country)) = lower(btrim(p.country_of_residence))
            AND lower(btrim(cc.city))    = lower(btrim(p.city_abroad))
      LEFT JOIN public.clusters cl ON cl.id = cc.cluster_id
     WHERE p.country_of_residence = ANY (scoped)
       AND (p_country IS NULL OR p.country_of_residence = p_country)
       AND (
         p_search IS NULL OR btrim(p_search) = ''
         OR p.full_name   ILIKE '%' || btrim(p_search) || '%'
         OR p.email       ILIKE '%' || btrim(p_search) || '%'
         OR p.city_abroad ILIKE '%' || btrim(p_search) || '%'
       )
  )
  SELECT sm.id, sm.full_name, sm.email, sm.mobile_number,
         sm.city_abroad, sm.country_of_residence,
         sm.chapter_name, sm.assembly_constituency, sm.district,
         sm.created_at,
         -- Total before paging, so the UI can show "showing 100 of 842"
         -- without a second round trip.
         count(*) OVER () AS total_count
    FROM scoped_members sm
   ORDER BY sm.created_at DESC
   LIMIT greatest(1, least(coalesce(p_limit, 100), 500))
  OFFSET greatest(0, coalesce(p_offset, 0));
END $$;

REVOKE ALL ON FUNCTION public.chapter_roster(text, text, int, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.chapter_roster(text, text, int, int) TO authenticated;

COMMENT ON FUNCTION public.chapter_roster(text, text, int, int) IS
  'Members of the caller''s scoped countries. Returns no voter, DOB or '
  'family fields. Empty set for a caller with no role, or for a country '
  'they are not scoped to.';

-- Headline numbers for the chapter dashboard.
CREATE OR REPLACE FUNCTION public.chapter_stats(p_country text DEFAULT NULL)
RETURNS TABLE (
  country          text,
  chapter          text,
  members          bigint,
  joined_30d       bigint,
  cities           bigint,
  women            bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.country_of_residence,
         coalesce(cl.name, 'Not yet organised'),
         count(*),
         count(*) FILTER (WHERE p.created_at > now() - interval '30 days'),
         count(DISTINCT p.city_abroad),
         count(*) FILTER (WHERE p.gender = 'Female')
    FROM public.profiles p
    LEFT JOIN public.cluster_cities cc
           ON lower(btrim(cc.country)) = lower(btrim(p.country_of_residence))
          AND lower(btrim(cc.city))    = lower(btrim(p.city_abroad))
    LEFT JOIN public.clusters cl ON cl.id = cc.cluster_id
   WHERE p.country_of_residence = ANY (public.my_countries())
     AND (p_country IS NULL OR p.country_of_residence = p_country)
   GROUP BY 1, 2
   ORDER BY 3 DESC;
$$;

REVOKE ALL ON FUNCTION public.chapter_stats(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.chapter_stats(text) TO authenticated;
