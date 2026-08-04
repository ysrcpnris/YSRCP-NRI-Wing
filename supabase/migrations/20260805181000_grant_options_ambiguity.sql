-- =====================================================================
-- 20260805181000 — my_grant_options: qualify the ambiguous column
--
-- RETURNS TABLE declares an OUT parameter named `country`, and the body
-- selected a column of the same name, so PL/pgSQL could not tell them
-- apart: 42702, and every call failed.
--
-- Third time this shape has appeared (book_slot's `status`,
-- chapter_rankings' reserved `position`). The rule that avoids it: give
-- inner selects distinct aliases rather than naming them after the OUT
-- parameters they feed.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.my_grant_options()
RETURNS TABLE (
  scope_kind   text,
  country      text,
  chapter_id   uuid,
  chapter_name text,
  roles        text[]
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_admin boolean := public.is_admin();
BEGIN
  IF v_admin THEN
    RETURN QUERY SELECT 'global'::text, NULL::text, NULL::uuid, NULL::text,
                        ARRAY['secretariat']::text[];
  END IF;

  RETURN QUERY
  WITH countries AS (
    SELECT DISTINCT ch.country AS ctry
      FROM public.chapters ch
     WHERE v_admin OR ch.country = ANY (public.my_write_countries())
  ),
  country_roles AS (
    SELECT c.ctry,
           array_remove(ARRAY[
             CASE WHEN public.my_rank_in_country(c.ctry)
                       < public.role_rank('country_coordinator')
                  THEN 'country_coordinator' END,
             CASE WHEN public.my_rank_in_country(c.ctry)
                       < public.role_rank('team_lead')
                  THEN 'team_lead' END
           ], NULL) AS grantable
      FROM countries c
  )
  SELECT 'country'::text, cr.ctry, NULL::uuid, NULL::text, cr.grantable
    FROM country_roles cr
   WHERE array_length(cr.grantable, 1) > 0;

  RETURN QUERY
  WITH chapter_roles AS (
    SELECT ch.id AS cid, ch.country AS ctry, ch.name AS cname,
           array_remove(ARRAY[
             CASE WHEN public.my_rank_in_chapter(ch.id)
                       < public.role_rank('chapter_lead')
                  THEN 'chapter_lead' END,
             CASE WHEN public.my_rank_in_chapter(ch.id)
                       < public.role_rank('team_lead')
                  THEN 'team_lead' END
           ], NULL) AS grantable
      FROM public.chapters ch
     WHERE public.can_write_chapter(ch.id)
  )
  SELECT 'chapter'::text, chr.ctry, chr.cid, chr.cname, chr.grantable
    FROM chapter_roles chr
   WHERE array_length(chr.grantable, 1) > 0
   ORDER BY 2, 4;
END $$;

REVOKE ALL ON FUNCTION public.my_grant_options() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_grant_options() TO authenticated;
