-- =====================================================================
-- 20260804240000 — let members read the cluster list
--
-- clusters had RLS enabled and no SELECT policy, so it was readable by
-- nobody through the API. That surfaced while testing handle writes: a
-- REST fetch for a cluster id returned an empty array, the id went into
-- the request as an empty string, and the insert failed with 22P02
-- (invalid uuid) instead of 42501 (permission denied).
--
-- Worth naming, because the test LOOKED like it passed: "coordinator
-- cannot write to another chapter" was true, but for the wrong reason —
-- the row never reached the policy. A blocked-is-blocked assertion would
-- have shipped a leak the day the id started resolving. Checking the
-- SQLSTATE, not just the failure, is what caught it.
--
-- The cluster list is not sensitive: it is the names of chapters and the
-- countries they cover, which the chapter picker and the handle admin
-- both need. Membership of a cluster is a different question, and stays
-- governed by chapter_roster().
-- =====================================================================

DROP POLICY IF EXISTS clusters_read ON public.clusters;
CREATE POLICY clusters_read ON public.clusters
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS cluster_cities_read ON public.cluster_cities;
CREATE POLICY cluster_cities_read ON public.cluster_cities
  FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.clusters       TO authenticated;
GRANT SELECT ON public.cluster_cities TO authenticated;

-- Writing a cluster stays with admin: a chapter lead manages the handles
-- and members inside their chapter, not the map of chapters itself.
DROP POLICY IF EXISTS clusters_admin_write ON public.clusters;
CREATE POLICY clusters_admin_write ON public.clusters
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS cluster_cities_admin_write ON public.cluster_cities;
CREATE POLICY cluster_cities_admin_write ON public.cluster_cities
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
