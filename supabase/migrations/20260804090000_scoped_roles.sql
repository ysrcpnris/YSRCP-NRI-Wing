-- =====================================================================
-- 20260804090000 — scoped roles: the missing tier between member and admin
--
-- THE PROBLEM
--   Every policy in this database reads "own row OR is_admin()". There
--   is nothing in between, so a country coordinator can only be given
--   either their own row or every row on earth — 2,611 members with
--   their EPIC numbers, mobile numbers and family contacts.
--
--   That is not a UI problem. The Supabase API is public: hiding other
--   countries in React changes nothing, because the coordinator's own
--   token still returns every row to anyone who opens DevTools.
--
-- THE MODEL
--   country → cluster → member. A coordinator is scoped to one country
--   and sees all of it. A cluster lead sees a set of cities inside that
--   country. Nobody sees sideways into another country.
--
--   Roles live in their own table rather than a column on profiles,
--   because one person can hold several (deputy coordinator AND jobs
--   lead), each carries its own scope, and every grant needs an author
--   and a timestamp.
--
-- WHAT THIS FILE DOES NOT DO
--   It does not rewrite the existing policies. Those come next, one
--   table at a time, so each can be verified in isolation. This file
--   only creates the vocabulary they will use.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Clusters — a named set of cities inside one country.
--   Membership is DERIVED from profiles.city_abroad, never assigned:
--   a member who moves city moves cluster with no admin action.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clusters (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country     text        NOT NULL,
  name        text        NOT NULL,
  created_by  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country, name)
);

-- A city belongs to at most one cluster, so a member is never in two.
CREATE TABLE IF NOT EXISTS public.cluster_cities (
  cluster_id  uuid NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  city        text NOT NULL,
  country     text NOT NULL,
  PRIMARY KEY (country, city)
);

CREATE INDEX IF NOT EXISTS cluster_cities_cluster_idx
  ON public.cluster_cities (cluster_id);

COMMENT ON TABLE public.cluster_cities IS
  'PK is (country, city) so a city cannot be claimed by two clusters. '
  'That constraint is what guarantees a member is never in two clusters.';

-- ---------------------------------------------------------------------
-- Role grants
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wing_role') THEN
    CREATE TYPE public.wing_role AS ENUM (
      'secretariat',        -- global; the existing profiles.role='admin'
      'country_coordinator',-- whole country, peers with other coordinators
      'cluster_lead',       -- one cluster inside a country
      'team_lead'           -- a function (jobs, students…) within a country
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.member_roles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role         public.wing_role NOT NULL,
  country      text,                   -- null only for 'secretariat'
  cluster_id   uuid REFERENCES public.clusters(id) ON DELETE CASCADE,
  title        text,                   -- free-text seat name, e.g. 'Student Visa Navigator'
  granted_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  granted_at   timestamptz NOT NULL DEFAULT now(),
  revoked_at   timestamptz,
  is_active    boolean GENERATED ALWAYS AS (revoked_at IS NULL) STORED,

  -- a country-scoped role without a country would silently grant nothing;
  -- a secretariat role with one would imply a limit that does not exist
  CONSTRAINT member_roles_scope_ck CHECK (
    (role = 'secretariat'         AND country IS NULL     AND cluster_id IS NULL) OR
    (role = 'country_coordinator' AND country IS NOT NULL AND cluster_id IS NULL) OR
    (role = 'team_lead'           AND country IS NOT NULL AND cluster_id IS NULL) OR
    (role = 'cluster_lead'        AND country IS NOT NULL AND cluster_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS member_roles_profile_idx
  ON public.member_roles (profile_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS member_roles_country_idx
  ON public.member_roles (country)    WHERE revoked_at IS NULL;

-- Revoking is an UPDATE, never a DELETE — who held what, and when, has
-- to survive the role ending.
COMMENT ON TABLE public.member_roles IS
  'Scoped role grants. One person may hold several. Revoke by setting '
  'revoked_at, never by deleting: the audit trail is the point.';

-- =====================================================================
-- Scope helpers
--
-- STABLE + SECURITY DEFINER so they can be called from inside RLS
-- policies without recursing into the policies on member_roles itself.
-- =====================================================================

-- Countries the caller may act in. Empty for a plain member.
CREATE OR REPLACE FUNCTION public.my_countries()
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT coalesce(array_agg(DISTINCT country), '{}')
    FROM public.member_roles
   WHERE profile_id = auth.uid()
     AND revoked_at IS NULL
     AND country IS NOT NULL;
$$;

-- True when the caller may act on rows belonging to this country.
-- Secretariat passes for every country.
CREATE OR REPLACE FUNCTION public.has_country_scope(p_country text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_admin()
      OR (p_country IS NOT NULL AND p_country = ANY (public.my_countries()));
$$;

-- True when the caller holds any scoped role at all — used to decide
-- whether to show the chapter surface.
CREATE OR REPLACE FUNCTION public.is_coordinator()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.member_roles
     WHERE profile_id = auth.uid() AND revoked_at IS NULL
       AND role IN ('country_coordinator','cluster_lead','team_lead'));
$$;

GRANT EXECUTE ON FUNCTION public.my_countries()            TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_country_scope(text)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_coordinator()          TO authenticated;

-- =====================================================================
-- Override audit
--
-- The secretariat can act on anything a coordinator can. Without a
-- record of when it does, delegation is a convention rather than a
-- boundary — so every write by an admin to a country they hold no role
-- in is logged.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.admin_overrides (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  table_name  text        NOT NULL,
  row_id      text,
  action      text        NOT NULL,
  country     text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_overrides_time_idx
  ON public.admin_overrides (occurred_at DESC);

CREATE OR REPLACE FUNCTION public.log_admin_override()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_country text;
BEGIN
  BEGIN
    v_country := to_jsonb(COALESCE(NEW, OLD)) ->> 'country_of_residence';
  EXCEPTION WHEN others THEN v_country := NULL;
  END;

  -- only log when an admin acts OUTSIDE any country they hold a role in
  IF public.is_admin()
     AND (v_country IS NULL OR NOT (v_country = ANY (public.my_countries())))
  THEN
    INSERT INTO public.admin_overrides (actor_id, table_name, row_id, action, country)
    VALUES (auth.uid(), TG_TABLE_NAME,
            (to_jsonb(COALESCE(NEW, OLD)) ->> 'id'), TG_OP, v_country);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- =====================================================================
-- RLS on the new tables
-- =====================================================================
ALTER TABLE public.clusters        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cluster_cities  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_roles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_overrides ENABLE ROW LEVEL SECURITY;

-- clusters: readable by anyone in that country, writable by its coordinator
DROP POLICY IF EXISTS clusters_read ON public.clusters;
CREATE POLICY clusters_read ON public.clusters
  FOR SELECT TO authenticated
  USING (public.has_country_scope(country)
      OR country = (SELECT country_of_residence FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS clusters_write ON public.clusters;
CREATE POLICY clusters_write ON public.clusters
  FOR ALL TO authenticated
  USING (public.has_country_scope(country))
  WITH CHECK (public.has_country_scope(country));

DROP POLICY IF EXISTS cluster_cities_read ON public.cluster_cities;
CREATE POLICY cluster_cities_read ON public.cluster_cities
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS cluster_cities_write ON public.cluster_cities;
CREATE POLICY cluster_cities_write ON public.cluster_cities
  FOR ALL TO authenticated
  USING (public.has_country_scope(country))
  WITH CHECK (public.has_country_scope(country));

-- member_roles: you always see your own; coordinators see their country's
DROP POLICY IF EXISTS member_roles_read ON public.member_roles;
CREATE POLICY member_roles_read ON public.member_roles
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.has_country_scope(country) OR public.is_admin());

-- Appointing a coordinator is secretariat-only. A coordinator may appoint
-- cluster and team leads inside their own country — but never another
-- coordinator, and never outside it. That ceiling is what stops
-- delegation from escalating.
DROP POLICY IF EXISTS member_roles_write ON public.member_roles;
CREATE POLICY member_roles_write ON public.member_roles
  FOR ALL TO authenticated
  USING (
    public.is_admin()
    OR (role IN ('cluster_lead','team_lead') AND public.has_country_scope(country))
  )
  WITH CHECK (
    public.is_admin()
    OR (role IN ('cluster_lead','team_lead') AND public.has_country_scope(country))
  );

-- overrides are readable by admins, written only by the trigger
DROP POLICY IF EXISTS admin_overrides_read ON public.admin_overrides;
CREATE POLICY admin_overrides_read ON public.admin_overrides
  FOR SELECT TO authenticated USING (public.is_admin());

GRANT SELECT ON public.clusters, public.cluster_cities, public.member_roles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.clusters, public.cluster_cities, public.member_roles TO authenticated;
GRANT SELECT ON public.admin_overrides TO authenticated;

-- =====================================================================
-- Backfill: every existing admin becomes a secretariat role grant, so
-- there is a single place to ask "who holds what" from now on.
-- profiles.role is left untouched — is_admin() still reads it, and
-- changing that in the same migration would be two risks at once.
-- =====================================================================
INSERT INTO public.member_roles (profile_id, role, granted_at)
SELECT id, 'secretariat', now()
  FROM public.profiles
 WHERE role = 'admin'
   AND NOT EXISTS (
     SELECT 1 FROM public.member_roles r
      WHERE r.profile_id = profiles.id AND r.role = 'secretariat' AND r.revoked_at IS NULL);
