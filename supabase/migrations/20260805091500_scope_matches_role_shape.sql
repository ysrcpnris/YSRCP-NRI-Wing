-- =====================================================================
-- 20260805091500 — align the scope model with what a role actually is
--
-- 20260805091000 assumed team_lead was cluster-scoped. member_roles has
-- always said otherwise:
--
--   member_roles_scope_ck
--     secretariat         country NULL,     cluster NULL
--     country_coordinator country NOT NULL, cluster NULL
--     team_lead           country NOT NULL, cluster NULL      <—
--     cluster_lead        country NOT NULL, cluster NOT NULL
--
-- A team_lead holds a COUNTRY and a functional title ("Student
-- Assistance Lead"), not a territory. Putting them in my_cluster_ids()
-- would have given them no scope at all, silently — the opposite bug to
-- the one being fixed, and just as invisible.
--
-- THE CORRECTED MODEL
--   global    secretariat / profiles.role='admin' — the whole wing
--   country   country_coordinator — read and write in their countries
--   cluster   cluster_lead — read and write in their cluster's cities
--   function  team_lead — READ their country, write nothing
--
-- The security defect the review found was that a team_lead could
-- write: manage every chapter's handles, decide every case, create
-- country-wide campaigns and delegate further roles. That is closed.
-- They keep read access to their country, which matches how the wing
-- was described ("coordinators see all the members") and is what a
-- functional lead needs to do the function.
--
-- STILL OPEN, AND DELIBERATELY NOT INVENTED HERE
--   Narrowing a team_lead to their functional area — showing the
--   student-assistance lead only student cases — needs a mapping from
--   member_roles.title to case types that does not exist in the schema.
--   Inventing one would be guessing at the wing's org design. Flagged
--   for the user rather than fabricated.
-- =====================================================================

-- Countries a caller may READ. team_lead included; they hold a country.
CREATE OR REPLACE FUNCTION public.my_countries()
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT coalesce(array_agg(DISTINCT country), '{}')
    FROM public.member_roles
   WHERE profile_id = auth.uid()
     AND revoked_at IS NULL
     AND country IS NOT NULL
     AND role IN ('secretariat', 'country_coordinator', 'team_lead');
$$;

-- Clusters a caller leads. Only cluster_lead ever has one.
CREATE OR REPLACE FUNCTION public.my_cluster_ids()
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT coalesce(array_agg(DISTINCT cluster_id), '{}')
    FROM public.member_roles
   WHERE profile_id = auth.uid()
     AND revoked_at IS NULL
     AND cluster_id IS NOT NULL
     AND role = 'cluster_lead';
$$;

-- Countries a caller may WRITE in. team_lead is absent by design.
CREATE OR REPLACE FUNCTION public.my_write_countries()
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT coalesce(array_agg(DISTINCT country), '{}')
    FROM public.member_roles
   WHERE profile_id = auth.uid()
     AND revoked_at IS NULL
     AND country IS NOT NULL
     AND role IN ('secretariat', 'country_coordinator', 'cluster_lead');
$$;

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

-- Write authority for one country: used by every write policy so a
-- team_lead cannot slip through a gate that only checks my_countries().
CREATE OR REPLACE FUNCTION public.can_write_country(p_country text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_global_scope()
      OR (p_country IS NOT NULL AND p_country = ANY (public.my_write_countries()));
$$;

GRANT EXECUTE ON FUNCTION public.my_write_countries()          TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_write_country(text)       TO authenticated;

-- has_country_scope is a READ predicate — several older policies use it
-- for SELECT. Write policies must use can_write_country instead.
CREATE OR REPLACE FUNCTION public.has_country_scope(p_country text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_global_scope()
      OR (p_country IS NOT NULL AND p_country = ANY (public.my_countries()));
$$;

-- is_coordinator() is used by the social_handles and appointment write
-- policies, so it must mean "may write".
CREATE OR REPLACE FUNCTION public.is_coordinator()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.can_write_scope();
$$;

COMMENT ON FUNCTION public.my_countries() IS
  'Countries the caller may READ. Includes team_lead. For writes use '
  'my_write_countries() / can_write_country(), which exclude them.';
