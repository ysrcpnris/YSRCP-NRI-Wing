-- =====================================================================
-- 20260805095000 — the RPCs the management screens need
--
-- Review finding (10): several delivered mechanisms had no operational
-- surface. member_roles, clusters, social_handles, appointment_slots and
-- campaigns all existed as tables with policies and nothing in the app
-- to work them, so slices 3, 4, 6 and 8 required direct SQL to use.
-- A table with no way to operate it is a schema plus a promise.
--
-- These are the server-side halves. Granting a role in particular must
-- not be a plain INSERT: it is delegation of authority and belongs in a
-- function that checks the granter outranks the grant and writes an
-- audit row.
-- =====================================================================

-- ── delegation ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.grant_wing_role(
  p_profile_id uuid,
  p_role       text,
  p_country    text DEFAULT NULL,
  p_cluster_id uuid DEFAULT NULL,
  p_title      text DEFAULT NULL
)
RETURNS TABLE (ok boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_cluster_country text;
BEGIN
  IF p_role NOT IN ('secretariat','country_coordinator','cluster_lead','team_lead') THEN
    RETURN QUERY SELECT false, format('Unknown role: %s', p_role); RETURN;
  END IF;

  -- Only an admin may create a secretariat: that is wing-wide authority
  -- and a country coordinator must not be able to mint it.
  IF p_role = 'secretariat' AND NOT public.has_global_scope() THEN
    RETURN QUERY SELECT false, 'Only a wing administrator can appoint secretariat.'; RETURN;
  END IF;

  -- Otherwise the granter needs write authority over the country the
  -- role is being granted in. A coordinator can appoint within their own
  -- country and nowhere else.
  IF p_role <> 'secretariat' AND NOT public.can_write_country(p_country) THEN
    RETURN QUERY SELECT false, 'That country is outside the ones you cover.'; RETURN;
  END IF;

  -- member_roles_scope_ck enforces the shape, but a clear message beats
  -- a constraint violation surfacing in the UI.
  IF p_role = 'cluster_lead' AND p_cluster_id IS NULL THEN
    RETURN QUERY SELECT false, 'A cluster lead needs a chapter.'; RETURN;
  END IF;
  IF p_role IN ('country_coordinator','team_lead') AND p_country IS NULL THEN
    RETURN QUERY SELECT false, 'That role needs a country.'; RETURN;
  END IF;

  IF p_cluster_id IS NOT NULL THEN
    SELECT country INTO v_cluster_country FROM public.clusters WHERE id = p_cluster_id;
    IF v_cluster_country IS DISTINCT FROM p_country THEN
      RETURN QUERY SELECT false, 'That chapter is not in that country.'; RETURN;
    END IF;
  END IF;

  INSERT INTO public.member_roles
    (profile_id, role, country, cluster_id, title, granted_by)
  VALUES (p_profile_id, p_role::public.wing_role,
          CASE WHEN p_role = 'secretariat' THEN NULL ELSE p_country END,
          CASE WHEN p_role = 'cluster_lead' THEN p_cluster_id END,
          nullif(btrim(p_title), ''), auth.uid());

  INSERT INTO public.admin_overrides (actor_id, action, target_table, target_id, detail)
  VALUES (auth.uid(), 'grant_role', 'member_roles', p_profile_id,
          format('%s%s', p_role, coalesce(' in ' || p_country, '')));

  RETURN QUERY SELECT true, 'Role granted.';
END $$;

CREATE OR REPLACE FUNCTION public.revoke_wing_role(p_role_id uuid)
RETURNS TABLE (ok boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r public.member_roles;
BEGIN
  SELECT * INTO r FROM public.member_roles WHERE id = p_role_id;
  IF r.id IS NULL THEN
    RETURN QUERY SELECT false, 'No such role.'; RETURN;
  END IF;

  IF r.role = 'secretariat' AND NOT public.has_global_scope() THEN
    RETURN QUERY SELECT false, 'Only a wing administrator can revoke secretariat.'; RETURN;
  END IF;
  IF r.role <> 'secretariat' AND NOT public.can_write_country(r.country) THEN
    RETURN QUERY SELECT false, 'That country is outside the ones you cover.'; RETURN;
  END IF;

  -- Revoked, not deleted: who held what and when is the audit trail.
  UPDATE public.member_roles SET revoked_at = now(), is_active = false
   WHERE id = p_role_id;

  INSERT INTO public.admin_overrides (actor_id, action, target_table, target_id, detail)
  VALUES (auth.uid(), 'revoke_role', 'member_roles', r.profile_id, r.role::text);

  RETURN QUERY SELECT true, 'Role revoked.';
END $$;

-- Who holds what, for the roles screen.
CREATE OR REPLACE FUNCTION public.wing_roles_list()
RETURNS TABLE (
  role_id     uuid,
  profile_id  uuid,
  member_name text,
  email       text,
  role        text,
  country     text,
  chapter     text,
  title       text,
  granted_at  timestamptz,
  granted_by_name text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT mr.id, p.id, p.full_name, p.email, mr.role::text, mr.country,
         cl.name, mr.title, mr.granted_at, g.full_name
    FROM public.member_roles mr
    JOIN public.profiles p ON p.id = mr.profile_id
    LEFT JOIN public.clusters cl ON cl.id = mr.cluster_id
    LEFT JOIN public.profiles g ON g.id = mr.granted_by
   WHERE mr.revoked_at IS NULL
     AND (public.has_global_scope() OR public.can_write_country(mr.country))
   ORDER BY mr.role, mr.country NULLS FIRST, p.full_name;
$$;

-- Finding a member to appoint, without exposing the whole roster.
CREATE OR REPLACE FUNCTION public.search_members(p_q text)
RETURNS TABLE (id uuid, full_name text, email text, country text, city text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.email, p.country_of_residence, p.city_abroad
    FROM public.profiles p
   WHERE public.member_in_scope(p.country_of_residence, p.city_abroad)
     AND btrim(coalesce(p_q, '')) <> ''
     AND (p.full_name ILIKE '%' || btrim(p_q) || '%'
       OR p.email     ILIKE '%' || btrim(p_q) || '%')
   ORDER BY p.full_name
   LIMIT 20;
$$;

-- ── bookings an organiser has to decide ──────────────────────────────
CREATE OR REPLACE FUNCTION public.slots_i_manage()
RETURNS TABLE (
  id uuid, title text, starts_at timestamptz, ends_at timestamptz,
  capacity int, mode text, country text, is_published boolean,
  confirmed bigint, pending bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.title, s.starts_at, s.ends_at, s.capacity, s.mode::text,
         s.country, s.is_published,
         count(b.id) FILTER (WHERE b.status = 'confirmed'),
         count(b.id) FILTER (WHERE b.status = 'pending')
    FROM public.appointment_slots s
    LEFT JOIN public.appointment_bookings b ON b.slot_id = s.id
   WHERE public.has_global_scope()
      OR (s.country IS NOT NULL AND public.can_write_country(s.country))
   GROUP BY s.id
   ORDER BY s.starts_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.grant_wing_role(uuid, text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_wing_role(uuid)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.wing_roles_list()        TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_members(text)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.slots_i_manage()         TO authenticated;
REVOKE ALL ON FUNCTION public.grant_wing_role(uuid, text, text, uuid, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.revoke_wing_role(uuid)      FROM public, anon;
REVOKE ALL ON FUNCTION public.wing_roles_list()           FROM public, anon;
REVOKE ALL ON FUNCTION public.search_members(text)        FROM public, anon;
REVOKE ALL ON FUNCTION public.slots_i_manage()            FROM public, anon;

COMMENT ON FUNCTION public.grant_wing_role(uuid, text, text, uuid, text) IS
  'Delegate authority. Checks the granter outranks the grant, that the '
  'country is theirs, and that a cluster belongs to that country. Writes '
  'an admin_overrides row — delegation without a record is a convention, '
  'not a boundary.';
