-- =====================================================================
-- 20260804250000 — only admin may change the chapter map
--
-- THE HOLE
--   20260804240000 added clusters_admin_write (USING is_admin()) and I
--   reported clusters as admin-only. It was not. A pre-existing policy
--   clusters_write (USING has_country_scope(country)) was still in
--   place, and PERMISSIVE policies are OR-ed together — so a country
--   coordinator could create AND delete clusters in their own country.
--
--   Adding a strict policy next to a lax one restricts nothing. The lax
--   one still grants.
--
--   Verified as the Germany coordinator before this migration:
--     POST   /clusters {"name":"Germany — Rogue Test"}  -> allowed
--     DELETE /clusters?name=eq.Germany — Rogue Test     -> allowed
--
--   The earlier test passed only because it used a plain member, who has
--   no country scope. The coordinator — the role that actually has
--   scope — was never tested.
--
-- WHY DELETE IS THE SERIOUS HALF
--   cluster_cities.cluster_id and social_handles.cluster_id are both
--   ON DELETE CASCADE. Deleting a cluster silently destroys every city
--   mapping and every chapter handle hanging off it. A coordinator
--   tidying up their own country could wipe their chapter's WhatsApp
--   groups with a single request.
--
-- THE RULE
--   A chapter lead owns what happens INSIDE their chapter — handles,
--   groups, members. Which chapters exist, and which cities belong to
--   them, is admin's. That is the split as specified: "Abroad connect
--   is responsibility of Chapter though admin has all the rights."
--
-- HOW IT IS ENFORCED
--   RESTRICTIVE policies are AND-ed with the permissive ones, so no
--   permissive policy — present or added later — can re-open writes.
--   They are declared per-command rather than FOR ALL, because a
--   RESTRICTIVE FOR ALL policy would also gate SELECT and hide the
--   cluster list from every non-admin member who needs to read it.
-- =====================================================================

-- Remove the lax policy and the earlier permissive-only attempt.
DROP POLICY IF EXISTS clusters_write             ON public.clusters;
DROP POLICY IF EXISTS clusters_admin_write       ON public.clusters;
DROP POLICY IF EXISTS cluster_cities_write       ON public.cluster_cities;
DROP POLICY IF EXISTS cluster_cities_admin_write ON public.cluster_cities;

-- Permissive: admin may write. (Reads stay governed by clusters_read /
-- cluster_cities_read from 20260804240000, which remain untouched.)
CREATE POLICY clusters_admin_write ON public.clusters
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY cluster_cities_admin_write ON public.cluster_cities
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Restrictive, per write command. SELECT is deliberately not listed.
CREATE POLICY clusters_no_insert ON public.clusters
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY clusters_no_update ON public.clusters
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY clusters_no_delete ON public.clusters
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY cluster_cities_no_insert ON public.cluster_cities
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY cluster_cities_no_update ON public.cluster_cities
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY cluster_cities_no_delete ON public.cluster_cities
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.is_admin());

COMMENT ON TABLE public.clusters IS
  'The chapter map. Readable by every member; writable only by admin — '
  'enforced by RESTRICTIVE policies so a permissive policy added later '
  'cannot re-open it. Chapter leads own what is INSIDE their chapter '
  '(handles, members), not which chapters exist.';

-- Leave nothing to a later reading of pg_policies: assert that no
-- permissive write policy on these tables grants to anyone but admin.
DO $$
DECLARE bad text;
BEGIN
  SELECT string_agg(format('%s.%s', tablename, policyname), ', ')
    INTO bad
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename IN ('clusters', 'cluster_cities')
     AND permissive = 'PERMISSIVE'
     AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
     AND coalesce(qual, with_check, '') NOT LIKE '%is_admin%';
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'permissive non-admin write policy still present: %', bad;
  END IF;
END $$;
