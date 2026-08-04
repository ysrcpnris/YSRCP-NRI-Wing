-- =====================================================================
-- 20260805110000 — separate cluster authority from country authority
--
-- WHAT WAS WRONG
--   my_write_countries() included cluster_lead, so can_write_country()
--   handed a chapter lead authority over their ENTIRE country: every
--   chapter's handles, every appointment slot, every campaign, and the
--   role-management RPCs.
--
--   Proven on staging — the Germany cluster lead's my_write_countries()
--   returned ["Germany"], and they successfully appointed a COUNTRY
--   COORDINATOR, a rank above their own.
--
--   The previous migration fixed READ scope and left WRITE scope
--   conflated. "cluster_lead can write" was true; "cluster_lead can
--   write only their cluster" was never expressed anywhere.
--
-- THE PREDICATES, NOW DISTINCT
--   can_write_country(c)   global, or country_coordinator of c
--   can_write_cluster(id)  global, country_coordinator of that
--                          cluster's country, or the lead of that
--                          cluster itself
--
--   team_lead appears in neither. They read their country and write
--   nothing, which is what "read-only" has claimed since 20260805091500
--   and was not enforced.
--
-- ROLE HIERARCHY
--   Appointing someone must never grant a rank at or above your own:
--     secretariat / admin  -> any role
--     country_coordinator  -> cluster_lead, team_lead, in their country
--     cluster_lead         -> team_lead, in their own cluster
--     team_lead            -> nothing
--   Previously any caller with country write scope could mint a
--   country_coordinator, so a coordinator could clone themselves and a
--   cluster lead could outrank themselves.
-- =====================================================================

-- Countries where the caller may WRITE. cluster_lead removed — their
-- authority is a cluster, not a country.
CREATE OR REPLACE FUNCTION public.my_write_countries()
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT coalesce(array_agg(DISTINCT country), '{}')
    FROM public.member_roles
   WHERE profile_id = auth.uid()
     AND revoked_at IS NULL
     AND country IS NOT NULL
     AND role IN ('secretariat', 'country_coordinator');
$$;

CREATE OR REPLACE FUNCTION public.can_write_country(p_country text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_global_scope()
      OR (p_country IS NOT NULL AND p_country = ANY (public.my_write_countries()));
$$;

-- Cluster-level write. A country coordinator outranks a cluster lead,
-- so they can write any cluster inside their own country.
CREATE OR REPLACE FUNCTION public.can_write_cluster(p_cluster_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p_cluster_id IS NOT NULL
     AND (
       public.has_global_scope()
       OR EXISTS (
         SELECT 1 FROM public.clusters c
          WHERE c.id = p_cluster_id
            AND c.country = ANY (public.my_write_countries())
       )
       OR EXISTS (
         SELECT 1 FROM public.member_roles mr
          WHERE mr.profile_id = auth.uid()
            AND mr.revoked_at IS NULL
            AND mr.role = 'cluster_lead'
            AND mr.cluster_id = p_cluster_id
       )
     );
$$;

-- "May the caller write anything at all", used only as a cheap early
-- exit. It must never stand in for a scoped check.
CREATE OR REPLACE FUNCTION public.can_write_scope()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_global_scope()
      OR EXISTS (
        SELECT 1 FROM public.member_roles
         WHERE profile_id = auth.uid()
           AND revoked_at IS NULL
           AND role IN ('secretariat', 'country_coordinator', 'cluster_lead')
      );
$$;

-- The rank ladder. Lower number outranks higher.
CREATE OR REPLACE FUNCTION public.role_rank(p_role text)
RETURNS int
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE p_role
           WHEN 'secretariat'         THEN 1
           WHEN 'country_coordinator' THEN 2
           WHEN 'cluster_lead'        THEN 3
           WHEN 'team_lead'           THEN 4
           ELSE 99
         END;
$$;

-- The best (lowest) rank the caller holds. Admin counts as secretariat.
CREATE OR REPLACE FUNCTION public.my_role_rank()
RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE WHEN public.is_admin() THEN 1 ELSE coalesce(
    (SELECT min(public.role_rank(role::text))
       FROM public.member_roles
      WHERE profile_id = auth.uid() AND revoked_at IS NULL), 99) END;
$$;

GRANT EXECUTE ON FUNCTION public.can_write_cluster(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.role_rank(text)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_role_rank()          TO authenticated;

COMMENT ON FUNCTION public.can_write_cluster(uuid) IS
  'Cluster-level write authority. A cluster_lead has it for their own '
  'cluster only; a country_coordinator has it for every cluster in '
  'their country; team_lead never has it.';
