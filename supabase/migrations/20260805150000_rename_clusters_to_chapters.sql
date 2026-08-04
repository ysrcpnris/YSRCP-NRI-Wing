-- =====================================================================
-- 20260805150000 — clusters become chapters, everywhere
--
-- "Cluster" was the table name and "chapter" was the word in the
-- product, and both were used interchangeably in code, comments and
-- conversation all the way through. Two names for one thing is a
-- standing invitation to write a policy against one and a function
-- against the other.
--
-- WHAT CHANGES
--   clusters              -> chapters
--   cluster_cities        -> chapter_cities
--   *.cluster_id          -> *.chapter_id   (chapter_cities, member_roles,
--                                            social_handles, appointment_slots)
--   wing_role 'cluster_lead' -> 'chapter_lead'
--   can_write_cluster()   -> can_write_chapter()
--   my_cluster_ids()      -> my_chapter_ids()
--   my_rank_in_cluster()  -> my_rank_in_chapter()
--
-- WHY THE FUNCTIONS ARE ALL RECREATED
--   Renaming a table or column updates indexes, constraints and foreign
--   keys automatically. It does NOT update function bodies — those are
--   stored as text and would keep referring to a table that no longer
--   exists, failing at call time rather than at migration time. All 19
--   functions that mentioned a cluster are recreated below, generated
--   from their live definitions so nothing is lost in transcription.
--
-- The old names are gone rather than aliased. A compatibility view would
-- mean both names keep working, which is the problem this migration
-- exists to remove.
-- =====================================================================

ALTER TABLE public.clusters       RENAME TO chapters;
ALTER TABLE public.cluster_cities RENAME TO chapter_cities;

ALTER TABLE public.chapter_cities    RENAME COLUMN cluster_id TO chapter_id;
ALTER TABLE public.member_roles      RENAME COLUMN cluster_id TO chapter_id;
ALTER TABLE public.social_handles    RENAME COLUMN cluster_id TO chapter_id;
ALTER TABLE public.appointment_slots RENAME COLUMN cluster_id TO chapter_id;

-- Renaming an enum value keeps every stored row valid — the label
-- changes, the underlying value does not.
ALTER TYPE public.wing_role RENAME VALUE 'cluster_lead' TO 'chapter_lead';

-- Constraint and index names, so nothing still reads "cluster".
ALTER TABLE public.chapters
  RENAME CONSTRAINT clusters_id_country_key TO chapters_id_country_key;
ALTER TABLE public.social_handles
  RENAME CONSTRAINT social_handles_cluster_country_fk TO social_handles_chapter_country_fk;
ALTER TABLE public.appointment_slots
  RENAME CONSTRAINT appointment_slots_cluster_country_fk TO appointment_slots_chapter_country_fk;
ALTER TABLE public.appointment_slots
  RENAME CONSTRAINT appointment_slots_cluster_needs_country TO appointment_slots_chapter_needs_country;

-- Policies depend on these functions, so they go first. They are
-- recreated at the foot of this file against the new names.
DROP POLICY IF EXISTS handles_chapter_write   ON public.social_handles;
DROP POLICY IF EXISTS handles_read            ON public.social_handles;
DROP POLICY IF EXISTS slots_coordinator_write ON public.appointment_slots;

-- A function is DROPPED when anything in its signature renames — its
-- own name, a parameter, or a RETURNS TABLE column. CREATE OR REPLACE
-- can change none of those. Everything else is replaced in place, which
-- matters because policies across five tables depend on my_countries()
-- and dropping it would take them with it.
DROP FUNCTION IF EXISTS public.can_write_cluster(p_cluster_id uuid);
DROP FUNCTION IF EXISTS public.grant_wing_role(p_profile_id uuid, p_role text, p_country text, p_cluster_id uuid, p_title text);
DROP FUNCTION IF EXISTS public.my_cluster_ids();
DROP FUNCTION IF EXISTS public.my_rank_in_cluster(p_cluster_id uuid);
DROP FUNCTION IF EXISTS public.wing_roles_list();

-- Emitted alphabetically and mutually referencing, so a LANGUAGE sql
-- body would be validated against a function that does not exist yet.
-- The assertion at the foot proves they all resolve afterwards.
SET LOCAL check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.assistance_queue(p_status text DEFAULT NULL::text, p_kind text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
 RETURNS TABLE(kind text, id uuid, reference_no text, title text, detail text, status text, response text, member_id uuid, member_name text, member_email text, member_mobile text, member_country text, member_city text, created_at timestamp with time zone, updated_at timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_global_scope()
          OR array_length(public.my_countries(), 1) IS NOT NULL
          OR array_length(public.my_chapter_ids(), 1) IS NOT NULL) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH cases AS (
    SELECT 'grievance'::text AS kind, g.id, g.reference_no,
           g.subject AS title, g.description AS detail,
           g.status, g.response, g.profile_id, g.created_at, g.updated_at
      FROM public.grievances g
     WHERE p_kind IS NULL OR p_kind = 'grievance'
    UNION ALL
    SELECT 'student', s.id, s.reference_no,
           coalesce(s.request_type, 'Student assistance'), s.description,
           s.status, NULL, s.profile_id, s.created_at, s.updated_at
      FROM public.student_requests s
     WHERE p_kind IS NULL OR p_kind = 'student'
  ),
  scoped_cases AS (
    SELECT c.*, p.full_name, p.email, p.mobile_number,
           p.country_of_residence, p.city_abroad
      FROM cases c
      JOIN public.profiles p ON p.id = c.profile_id
     WHERE public.member_in_scope(p.country_of_residence, p.city_abroad)
       AND (
         CASE
           WHEN p_status IS NULL THEN c.status IN ('open', 'in_progress')
           WHEN p_status = 'all'  THEN true
           ELSE c.status = p_status
         END
       )
  )
  SELECT sc.kind, sc.id, sc.reference_no, sc.title, sc.detail,
         sc.status, sc.response, sc.profile_id,
         sc.full_name, sc.email, sc.mobile_number,
         sc.country_of_residence, sc.city_abroad,
         sc.created_at, sc.updated_at, count(*) OVER ()
    FROM scoped_cases sc
   ORDER BY sc.created_at ASC
   LIMIT greatest(1, least(coalesce(p_limit, 100), 500))
  OFFSET greatest(0, coalesce(p_offset, 0));
END $function$;

CREATE OR REPLACE FUNCTION public.can_manage_slot(p_slot_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.appointment_slots s
     WHERE s.id = p_slot_id
       AND (
         public.has_global_scope()
         OR (s.chapter_id IS NOT NULL AND public.can_write_chapter(s.chapter_id))
         OR (s.chapter_id IS NULL AND s.country IS NOT NULL
             AND public.can_write_country(s.country))
       )
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_write_chapter(p_chapter_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p_chapter_id IS NOT NULL
     AND (
       public.has_global_scope()
       OR EXISTS (
         SELECT 1 FROM public.chapters c
          WHERE c.id = p_chapter_id
            AND c.country = ANY (public.my_write_countries())
       )
       OR EXISTS (
         SELECT 1 FROM public.member_roles mr
          WHERE mr.profile_id = auth.uid()
            AND mr.revoked_at IS NULL
            AND mr.role = 'chapter_lead'
            AND mr.chapter_id = p_chapter_id
       )
     );
$function$;

CREATE OR REPLACE FUNCTION public.can_write_scope()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.has_global_scope()
      OR EXISTS (
        SELECT 1 FROM public.member_roles
         WHERE profile_id = auth.uid()
           AND revoked_at IS NULL
           AND role IN ('secretariat', 'country_coordinator', 'chapter_lead')
      );
$function$;

CREATE OR REPLACE FUNCTION public.chapter_for_city(p_country text, p_city text)
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  SELECT chapter_id FROM public.chapter_cities
   WHERE lower(btrim(country)) = lower(btrim(p_country))
     AND lower(btrim(city))    = lower(btrim(p_city));
$function$;

CREATE OR REPLACE FUNCTION public.chapter_rankings(p_scope text DEFAULT 'country'::text)
 RETURNS TABLE(place integer, chapter text, country text, members bigint, sharers bigint, shares bigint, clicks bigint, is_mine boolean, total_clicks bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_country text;
  v_chapter uuid;
BEGIN
  IF p_scope NOT IN ('country', 'global') THEN
    RAISE EXCEPTION 'scope must be country or global, got %', p_scope;
  END IF;

  SELECT p.country_of_residence,
         public.chapter_for_city(p.country_of_residence, p.city_abroad)
    INTO v_country, v_chapter
    FROM public.profiles p WHERE p.id = auth.uid();

  RETURN QUERY
  WITH member_chapter AS (
    SELECT p.id AS profile_id,
           public.chapter_for_city(p.country_of_residence, p.city_abroad) AS chapter_id
      FROM public.profiles p
  ),
  headcount AS (
    SELECT chapter_id, count(*) AS members
      FROM member_chapter WHERE chapter_id IS NOT NULL
     GROUP BY chapter_id
  ),
  activity AS (
    SELECT mc.chapter_id,
           count(DISTINCT s.profile_id) AS sharers,
           count(DISTINCT s.id)         AS shares,
           count(k.id)                  AS clicks
      FROM public.campaign_shares s
      JOIN member_chapter mc ON mc.profile_id = s.profile_id
      LEFT JOIN public.campaign_clicks k ON k.share_id = s.id
     WHERE mc.chapter_id IS NOT NULL
     GROUP BY mc.chapter_id
  ),
  scoped AS (
    -- LEFT JOIN from chapters so a chapter with no activity still
    -- appears at the bottom rather than vanishing. "You are last" is
    -- information; absence is confusing.
    SELECT cl.id, cl.name, cl.country,
           coalesce(h.members, 0) AS members,
           coalesce(a.sharers, 0) AS sharers,
           coalesce(a.shares, 0)  AS shares,
           coalesce(a.clicks, 0)  AS clicks
      FROM public.chapters cl
      LEFT JOIN headcount h ON h.chapter_id = cl.id
      LEFT JOIN activity  a ON a.chapter_id = cl.id
     WHERE p_scope = 'global'
        OR (v_country IS NOT NULL AND cl.country = v_country)
  )
  SELECT (rank() OVER (ORDER BY sc.clicks DESC, sc.shares DESC, sc.name))::int,
         sc.name, sc.country, sc.members, sc.sharers, sc.shares, sc.clicks,
         sc.id = v_chapter,
         -- sum() over bigint yields numeric; cast the whole window
         -- expression, not just its argument.
         (sum(sc.clicks) OVER ())::bigint
    FROM scoped sc
   ORDER BY sc.clicks DESC, sc.shares DESC, sc.name;
END $function$;

CREATE OR REPLACE FUNCTION public.chapter_roster(p_country text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, full_name text, email text, mobile_number text, city_abroad text, country text, chapter text, constituency text, district text, joined_at timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Global, country or chapter — any of them may read a roster. Only
  -- "no scope at all" returns nothing.
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
           p.assembly_constituency, p.district, p.created_at
      FROM public.profiles p
      LEFT JOIN public.chapter_cities cc
             ON lower(btrim(cc.country)) = lower(btrim(p.country_of_residence))
            AND lower(btrim(cc.city))    = lower(btrim(p.city_abroad))
      LEFT JOIN public.chapters cl ON cl.id = cc.chapter_id
     WHERE public.member_in_scope(p.country_of_residence, p.city_abroad)
       AND (p_country IS NULL OR p.country_of_residence = p_country)
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
         count(*) OVER ()
    FROM scoped s
   ORDER BY s.created_at DESC
   LIMIT greatest(1, least(coalesce(p_limit, 100), 500))
  OFFSET greatest(0, coalesce(p_offset, 0));
END $function$;

CREATE OR REPLACE FUNCTION public.chapter_stats(p_country text DEFAULT NULL::text)
 RETURNS TABLE(country text, chapter text, members bigint, joined_30d bigint, cities bigint, women bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.country_of_residence,
         coalesce(cl.name, 'Not yet organised'),
         count(*),
         count(*) FILTER (WHERE p.created_at > now() - interval '30 days'),
         count(DISTINCT p.city_abroad),
         count(*) FILTER (WHERE p.gender = 'Female')
    FROM public.profiles p
    LEFT JOIN public.chapter_cities cc
           ON lower(btrim(cc.country)) = lower(btrim(p.country_of_residence))
          AND lower(btrim(cc.city))    = lower(btrim(p.city_abroad))
    LEFT JOIN public.chapters cl ON cl.id = cc.chapter_id
   WHERE public.member_in_scope(p.country_of_residence, p.city_abroad)
     AND (p_country IS NULL OR p.country_of_residence = p_country)
   GROUP BY 1, 2
   ORDER BY 3 DESC;
$function$;

CREATE OR REPLACE FUNCTION public.grant_wing_role(p_profile_id uuid, p_role text, p_country text DEFAULT NULL::text, p_chapter_id uuid DEFAULT NULL::uuid, p_title text DEFAULT NULL::text)
 RETURNS TABLE(ok boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_chapter_country text; v_rank int;
BEGIN
  IF p_role NOT IN ('secretariat','country_coordinator','chapter_lead','team_lead') THEN
    RETURN QUERY SELECT false, format('Unknown role: %s', p_role); RETURN;
  END IF;

  IF p_role = 'secretariat' THEN
    IF NOT public.has_global_scope() THEN
      RETURN QUERY SELECT false, 'Only a wing administrator can appoint secretariat.'; RETURN;
    END IF;

  ELSIF p_role = 'chapter_lead' THEN
    IF p_chapter_id IS NULL THEN
      RETURN QUERY SELECT false, 'A chapter lead needs a chapter.'; RETURN;
    END IF;
    SELECT country INTO v_chapter_country FROM public.chapters WHERE id = p_chapter_id;
    IF v_chapter_country IS DISTINCT FROM p_country THEN
      RETURN QUERY SELECT false, 'That chapter is not in that country.'; RETURN;
    END IF;
    v_rank := public.my_rank_in_chapter(p_chapter_id);
    IF v_rank >= public.role_rank(p_role) THEN
      RETURN QUERY SELECT false,
        'You can only appoint roles below your own level in that chapter.'; RETURN;
    END IF;
    IF NOT public.can_write_chapter(p_chapter_id) THEN
      RETURN QUERY SELECT false, 'That chapter is outside the ones you cover.'; RETURN;
    END IF;

  ELSIF p_role = 'team_lead' THEN
    IF p_country IS NULL THEN
      RETURN QUERY SELECT false, 'That role needs a country.'; RETURN;
    END IF;
    IF p_chapter_id IS NOT NULL THEN
      SELECT country INTO v_chapter_country FROM public.chapters WHERE id = p_chapter_id;
      IF v_chapter_country IS DISTINCT FROM p_country THEN
        RETURN QUERY SELECT false, 'That chapter is not in that country.'; RETURN;
      END IF;
      v_rank := public.my_rank_in_chapter(p_chapter_id);
      IF v_rank >= public.role_rank(p_role) THEN
        RETURN QUERY SELECT false,
          'You can only appoint roles below your own level in that chapter.'; RETURN;
      END IF;
      IF NOT public.can_write_chapter(p_chapter_id) THEN
        RETURN QUERY SELECT false, 'That chapter is outside the ones you cover.'; RETURN;
      END IF;
    ELSE
      v_rank := public.my_rank_in_country(p_country);
      IF v_rank >= public.role_rank(p_role) THEN
        RETURN QUERY SELECT false,
          'You can only appoint roles below your own level.'; RETURN;
      END IF;
      IF NOT public.can_write_country(p_country) THEN
        RETURN QUERY SELECT false,
          'You can appoint a team lead for your own chapter — choose one.'; RETURN;
      END IF;
    END IF;

  ELSE  -- country_coordinator
    IF p_country IS NULL THEN
      RETURN QUERY SELECT false, 'That role needs a country.'; RETURN;
    END IF;
    v_rank := public.my_rank_in_country(p_country);
    IF v_rank >= public.role_rank(p_role) THEN
      RETURN QUERY SELECT false,
        'You can only appoint roles below your own level in that country.'; RETURN;
    END IF;
    IF NOT public.can_write_country(p_country) THEN
      RETURN QUERY SELECT false, 'That country is outside the ones you cover.'; RETURN;
    END IF;
  END IF;

  -- A unique partial index now backs this, so a concurrent duplicate
  -- raises rather than slipping through the gap between check and
  -- insert. Report it the same way either path arrives.
  BEGIN
    INSERT INTO public.member_roles
      (profile_id, role, country, chapter_id, title, granted_by)
    VALUES (p_profile_id, p_role::public.wing_role,
            CASE WHEN p_role = 'secretariat' THEN NULL ELSE p_country END,
            CASE WHEN p_role IN ('chapter_lead','team_lead') THEN p_chapter_id END,
            nullif(btrim(p_title), ''), auth.uid());
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT false, 'They already hold that role there.'; RETURN;
  END;

  INSERT INTO public.admin_overrides (actor_id, table_name, row_id, action, country)
  VALUES (auth.uid(), 'member_roles', p_profile_id, 'grant:' || p_role, p_country);

  RETURN QUERY SELECT true, 'Role granted.';
END $function$;

CREATE OR REPLACE FUNCTION public.intel_geography()
 RETURNS TABLE(dimension text, label text, sublabel text, members bigint, onboarded bigint, joined_30d bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Where members live: the chapter's view.
  SELECT 'residence', p.country_of_residence,
         cl.name,
         count(*),
         count(*) FILTER (WHERE p.onboarding_completed_at IS NOT NULL),
         count(*) FILTER (WHERE p.created_at > now() - interval '30 days')
    FROM public.profiles p
    LEFT JOIN public.chapter_cities cc
           ON lower(btrim(cc.country)) = lower(btrim(p.country_of_residence))
          AND lower(btrim(cc.city))    = lower(btrim(p.city_abroad))
    LEFT JOIN public.chapters cl ON cl.id = cc.chapter_id
   WHERE public.is_admin()
     AND p.country_of_residence IS NOT NULL
   GROUP BY p.country_of_residence, cl.name

  UNION ALL

  -- Where members are from: the party's view. Resolved through the
  -- alias table, so 'Nandyala' and 'Nandyal' are one constituency and
  -- not two rows (20260804160000).
  SELECT 'origin', c.name, d.name,
         count(*),
         count(*) FILTER (WHERE p.onboarding_completed_at IS NOT NULL),
         count(*) FILTER (WHERE p.created_at > now() - interval '30 days')
    FROM public.profiles p
    JOIN public.ap_constituencies c
      ON c.id = public.resolve_constituency(p.assembly_constituency)
    JOIN public.ap_districts d ON d.id = c.district_id
   WHERE public.is_admin()
   GROUP BY c.name, d.name

   ORDER BY 1, 4 DESC;
$function$;

CREATE OR REPLACE FUNCTION public.member_in_scope(p_country text, p_city text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.has_global_scope()
      OR (p_country IS NOT NULL AND p_country = ANY (public.my_countries()))
      OR (
        public.chapter_for_city(p_country, p_city) IS NOT NULL
        AND public.chapter_for_city(p_country, p_city) = ANY (public.my_chapter_ids())
      );
$function$;

CREATE OR REPLACE FUNCTION public.my_chapter_ids()
 RETURNS uuid[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(array_agg(DISTINCT chapter_id), '{}')
    FROM public.member_roles
   WHERE profile_id = auth.uid()
     AND revoked_at IS NULL
     AND chapter_id IS NOT NULL
     AND role IN ('chapter_lead', 'team_lead');
$function$;

CREATE OR REPLACE FUNCTION public.my_countries()
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(array_agg(DISTINCT country), '{}')
    FROM public.member_roles
   WHERE profile_id = auth.uid()
     AND revoked_at IS NULL
     AND country IS NOT NULL
     AND (
       role IN ('secretariat', 'country_coordinator')
       -- country-wide team lead only when no chapter narrows them
       OR (role = 'team_lead' AND chapter_id IS NULL)
     );
$function$;

CREATE OR REPLACE FUNCTION public.my_rank_in_chapter(p_chapter_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN public.is_admin() THEN 1 ELSE coalesce((
    SELECT min(public.role_rank(mr.role::text))
      FROM public.member_roles mr
     WHERE mr.profile_id = auth.uid()
       AND mr.revoked_at IS NULL
       AND (
         mr.role = 'secretariat'
         -- country-level authority over the country this chapter is in
         OR (mr.chapter_id IS NULL AND mr.country = (
               SELECT c.country FROM public.chapters c WHERE c.id = p_chapter_id))
         -- or authority over this exact chapter
         OR mr.chapter_id = p_chapter_id
       )
  ), 99) END;
$function$;

CREATE OR REPLACE FUNCTION public.my_social_handles()
 RETURNS TABLE(scope handle_scope, platform handle_platform, label text, url text, handle text, chapter text, member_count integer, count_as_of date, description text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT sh.scope, sh.platform, sh.label, sh.url, sh.handle,
         cl.name, sh.member_count, sh.count_as_of, sh.description
    FROM public.social_handles sh
    LEFT JOIN public.chapters cl ON cl.id = sh.chapter_id
   WHERE sh.is_active
     AND (
       sh.scope = 'national'
       OR sh.chapter_id = (
         SELECT public.chapter_for_city(p.country_of_residence, p.city_abroad)
           FROM public.profiles p WHERE p.id = auth.uid()
       )
     )
   ORDER BY sh.scope DESC, sh.sort_order, sh.label;
$function$;

CREATE OR REPLACE FUNCTION public.open_slots()
 RETURNS TABLE(id uuid, title text, description text, host_name text, venue text, virtual_link text, starts_at timestamp with time zone, ends_at timestamp with time zone, capacity integer, confirmed bigint, seats_left integer, mode text, notes_label text, country text, my_status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.id, s.title, s.description, s.host_name, s.venue,
         CASE WHEN max(b.status::text) FILTER (
                WHERE b.profile_id = auth.uid() AND b.status = 'confirmed'
              ) IS NOT NULL
              THEN s.virtual_link END,
         s.starts_at, s.ends_at, s.capacity,
         count(b.id) FILTER (WHERE b.status = 'confirmed'),
         greatest(0, s.capacity - count(b.id) FILTER (WHERE b.status = 'confirmed'))::int,
         s.mode::text, s.notes_label, s.country,
         max(b.status::text) FILTER (WHERE b.profile_id = auth.uid()
                                       AND b.status IN ('pending', 'confirmed'))
    FROM public.appointment_slots s
    LEFT JOIN public.appointment_bookings b ON b.slot_id = s.id
   WHERE s.is_published
     AND s.starts_at > now()
     AND (
       -- A slot naming a chapter is for that chapter's members only.
       CASE WHEN s.chapter_id IS NOT NULL THEN
         s.chapter_id = (
           SELECT public.chapter_for_city(p.country_of_residence, p.city_abroad)
             FROM public.profiles p WHERE p.id = auth.uid())
       WHEN s.country IS NOT NULL THEN
         s.country = (SELECT p.country_of_residence FROM public.profiles p WHERE p.id = auth.uid())
       ELSE true      -- wing-wide, and only an admin can create one
       END
     )
   GROUP BY s.id
   ORDER BY s.starts_at;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_wing_role(p_role_id uuid)
 RETURNS TABLE(ok boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r public.member_roles; v_rank int;
BEGIN
  SELECT * INTO r FROM public.member_roles WHERE id = p_role_id;
  IF r.id IS NULL OR r.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT false, 'No such active role.'; RETURN;
  END IF;

  IF r.role = 'secretariat' THEN
    IF NOT public.has_global_scope() THEN
      RETURN QUERY SELECT false, 'Only a wing administrator can revoke secretariat.'; RETURN;
    END IF;
  ELSIF r.chapter_id IS NOT NULL THEN
    v_rank := public.my_rank_in_chapter(r.chapter_id);
    IF v_rank >= public.role_rank(r.role::text) THEN
      RETURN QUERY SELECT false, 'That role is at or above your own level there.'; RETURN;
    END IF;
    IF NOT public.can_write_chapter(r.chapter_id) THEN
      RETURN QUERY SELECT false, 'That chapter is outside the ones you cover.'; RETURN;
    END IF;
  ELSE
    v_rank := public.my_rank_in_country(r.country);
    IF v_rank >= public.role_rank(r.role::text) THEN
      RETURN QUERY SELECT false, 'That role is at or above your own level there.'; RETURN;
    END IF;
    IF NOT public.can_write_country(r.country) THEN
      RETURN QUERY SELECT false, 'That country is outside the ones you cover.'; RETURN;
    END IF;
  END IF;

  UPDATE public.member_roles SET revoked_at = now() WHERE id = p_role_id;

  INSERT INTO public.admin_overrides (actor_id, table_name, row_id, action, country)
  VALUES (auth.uid(), 'member_roles', r.profile_id, 'revoke:' || r.role::text, r.country);

  RETURN QUERY SELECT true, 'Role revoked.';
END $function$;

CREATE OR REPLACE FUNCTION public.role_rank(p_role text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT CASE p_role
           WHEN 'secretariat'         THEN 1
           WHEN 'country_coordinator' THEN 2
           WHEN 'chapter_lead'        THEN 3
           WHEN 'team_lead'           THEN 4
           ELSE 99
         END;
$function$;

CREATE OR REPLACE FUNCTION public.wing_roles_list()
 RETURNS TABLE(role_id uuid, profile_id uuid, member_name text, email text, role text, country text, chapter text, chapter_id uuid, title text, granted_at timestamp with time zone, granted_by_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT mr.id, p.id, p.full_name, p.email, mr.role::text, mr.country,
         cl.name, mr.chapter_id, mr.title, mr.granted_at, g.full_name
    FROM public.member_roles mr
    JOIN public.profiles p ON p.id = mr.profile_id
    LEFT JOIN public.chapters cl ON cl.id = mr.chapter_id
    LEFT JOIN public.profiles g ON g.id = mr.granted_by
   WHERE mr.revoked_at IS NULL
     AND (
       public.has_global_scope()
       OR public.can_write_country(mr.country)
       OR (mr.chapter_id IS NOT NULL AND public.can_write_chapter(mr.chapter_id))
     )
   ORDER BY mr.role, mr.country NULLS FIRST, p.full_name;
$function$;

SET LOCAL check_function_bodies = on;

-- ── policies that named the column ───────────────────────────────────
DROP POLICY IF EXISTS handles_chapter_write ON public.social_handles;
CREATE POLICY handles_chapter_write ON public.social_handles
  FOR ALL TO authenticated
  USING (scope = 'chapter' AND public.can_write_chapter(chapter_id))
  WITH CHECK (scope = 'chapter' AND public.can_write_chapter(chapter_id));

DROP POLICY IF EXISTS slots_coordinator_write ON public.appointment_slots;
CREATE POLICY slots_coordinator_write ON public.appointment_slots
  FOR ALL TO authenticated
  USING (
    (chapter_id IS NOT NULL AND public.can_write_chapter(chapter_id))
    OR (chapter_id IS NULL AND country IS NOT NULL AND public.can_write_country(country))
  )
  WITH CHECK (
    (chapter_id IS NOT NULL AND public.can_write_chapter(chapter_id))
    OR (chapter_id IS NULL AND country IS NOT NULL AND public.can_write_country(country))
  );

DROP POLICY IF EXISTS handles_read ON public.social_handles;
CREATE POLICY handles_read ON public.social_handles
  FOR SELECT TO authenticated
  USING (
    public.has_global_scope()
    OR (
      is_active
      AND (
        scope = 'national'
        OR chapter_id = (
          SELECT public.chapter_for_city(p.country_of_residence, p.city_abroad)
            FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR country = ANY (public.my_countries())
        OR chapter_id = ANY (public.my_chapter_ids())
      )
    )
  );

-- The unique index on active grants named the old column.
DROP INDEX IF EXISTS member_roles_one_active_idx;
CREATE UNIQUE INDEX member_roles_one_active_idx
  ON public.member_roles (
    profile_id, role,
    coalesce(country, ''),
    coalesce(chapter_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE revoked_at IS NULL;

-- member_roles_scope_ck names the enum label that just changed.
ALTER TABLE public.member_roles DROP CONSTRAINT IF EXISTS member_roles_scope_ck;
ALTER TABLE public.member_roles ADD CONSTRAINT member_roles_scope_ck CHECK (
     (role = 'secretariat'         AND country IS NULL     AND chapter_id IS NULL)
  OR (role = 'country_coordinator' AND country IS NOT NULL AND chapter_id IS NULL)
  OR (role = 'chapter_lead'        AND country IS NOT NULL AND chapter_id IS NOT NULL)
  OR (role = 'team_lead'           AND country IS NOT NULL)
);

GRANT EXECUTE ON FUNCTION public.can_write_chapter(uuid)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_chapter_ids()         TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_rank_in_chapter(uuid) TO authenticated;

DO $$
DECLARE leftovers text;
BEGIN
  SELECT string_agg(DISTINCT src, ', ') INTO leftovers FROM (
    SELECT 'table:' || table_name AS src FROM information_schema.tables
     WHERE table_schema='public' AND table_name ILIKE '%cluster%'
    UNION ALL
    SELECT 'column:' || table_name || '.' || column_name FROM information_schema.columns
     WHERE table_schema='public' AND column_name ILIKE '%cluster%'
    UNION ALL
    SELECT 'function:' || p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.prosrc ILIKE '%cluster%'
    UNION ALL
    SELECT 'enum:' || e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
     WHERE t.typname='wing_role' AND e.enumlabel ILIKE '%cluster%'
  ) x;
  IF leftovers IS NOT NULL THEN
    RAISE EXCEPTION 'still referring to clusters: %', leftovers;
  END IF;

  -- check_function_bodies was off above, so prove the bodies actually
  -- resolve rather than trusting that the rename was textually clean.
  PERFORM public.can_write_chapter('00000000-0000-0000-0000-000000000000'::uuid);
  PERFORM public.my_chapter_ids();
  PERFORM public.my_rank_in_chapter('00000000-0000-0000-0000-000000000000'::uuid);
  PERFORM public.member_in_scope('Germany', 'Frankfurt');
  PERFORM public.chapter_for_city('Germany', 'Frankfurt');
  PERFORM public.role_rank('chapter_lead');

  RAISE NOTICE 'clusters renamed to chapters throughout';
END $$;
