-- =====================================================================
-- 20260805201000 — my_grant_options: qualify the UNION columns
--
-- Widening the country source reintroduced 42702: the UNION selected a
-- bare `country` from chapters and member_roles, which collides with
-- the OUT parameter of the same name.
--
-- FIFTH TIME THIS SHAPE HAS APPEARED
--   book_slot's `status`, chapter_rankings' reserved `position`,
--   my_grant_options twice, and this. The rule that prevents it, stated
--   plainly so it stops recurring:
--
--     Inside a function with a RETURNS TABLE, every column in the body
--     carries a table alias, and inner selects are named for what they
--     are (ctry, cid) rather than for the OUT parameter they feed.
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
DECLARE
  v_admin  boolean := public.is_admin();
  v_global boolean := public.has_global_scope();
BEGIN
  IF v_admin THEN
    RETURN QUERY SELECT 'global'::text, NULL::text, NULL::uuid, NULL::text,
                        ARRAY['secretariat']::text[];
  END IF;

  RETURN QUERY
  WITH all_countries AS (
    SELECT DISTINCT x.ctry FROM (
      SELECT pr.country_of_residence AS ctry FROM public.profiles pr
       WHERE pr.country_of_residence IS NOT NULL
      UNION
      SELECT ch2.country AS ctry FROM public.chapters ch2
      UNION
      SELECT mr.country AS ctry FROM public.member_roles mr
       WHERE mr.profile_id = auth.uid() AND mr.revoked_at IS NULL
         AND mr.country IS NOT NULL
    ) x
  ),
  countries AS (
    SELECT ac.ctry FROM all_countries ac
     WHERE v_global OR ac.ctry = ANY (public.my_write_countries())
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
   WHERE array_length(cr.grantable, 1) > 0
   ORDER BY cr.ctry;

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
     WHERE v_global OR public.can_write_chapter(ch.id)
  )
  SELECT 'chapter'::text, chr.ctry, chr.cid, chr.cname, chr.grantable
    FROM chapter_roles chr
   WHERE array_length(chr.grantable, 1) > 0
   ORDER BY chr.ctry, chr.cname;
END $$;

REVOKE ALL ON FUNCTION public.my_grant_options() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_grant_options() TO authenticated;

-- Prove it runs rather than trusting it compiles — a 42702 only appears
-- at execution, which is how the last two slipped through.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.my_grant_options();
  RAISE NOTICE 'my_grant_options executes, % rows for the migration role', n;
END $$;
