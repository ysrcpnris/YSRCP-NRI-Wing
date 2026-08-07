-- =====================================================================
-- 20260807100000 — Roles & Access (a-roles): reason capture + real
-- hygiene signals for the admin surface's Roles & Access screen.
--
-- THE MOCK'S OWN "NEEDS DATABASE WORK, NOT UI WORK" NOTE IS STALE
--   a-roles' permission-matrix card says the wing has only three flat
--   roles (user/admin/support_team) and all-or-nothing is_admin(), and
--   that scoped roles need a role-assignment table plus scope-checking
--   policies. That was true when the mock was authored. It is not true
--   of this codebase any more — member_roles, the wing_role enum,
--   grant_wing_role()/revoke_wing_role(), and scope-checking RLS across
--   every table this session touched already ARE that work. This
--   migration does not rebuild any of that; it only adds what's
--   genuinely still missing for this one screen.
--
-- REASON CAPTURE — CHECKED WITH THE USER
--   The mock's "Override" card claims every override is reason-required
--   and audit-logged. The audit log (admin_overrides) already existed
--   and already fires on every grant/revoke, unconditionally — that
--   part of the claim was already true. The reason field did not exist.
--   Added as optional (not enforced not-null — grant_wing_role/
--   revoke_wing_role are used constantly by ordinary in-scope
--   coordinators, and making a reason mandatory for THAT would be a
--   UX regression having nothing to do with the mock's "secretariat
--   acting outside their normal scope" framing). The "coordinator is
--   notified" claim is dropped — no per-user notification system
--   exists anywhere in this codebase (the Notifications nav tab is
--   unseen wing-wide events, not targeted alerts).
--
-- "ROLES CLUSTERS INVENTED FOR THEMSELVES" — REAL TITLES, NO FAKE TAGS
--   Checked with the user. The mock's version assumes a fixed 15-seat
--   committee with a capability-tagging system (Members/Assistance/
--   Events/Groups pills) — neither exists, and the 15-seat premise was
--   explicitly overridden earlier this session (committee is
--   unlimited, per 20260806140000). wing_custom_titled_roles() below
--   returns real team_lead holders with a non-standard title and
--   nothing invented on top.
-- =====================================================================

ALTER TABLE public.member_roles ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE public.admin_overrides ADD COLUMN IF NOT EXISTS detail text;

-- Faithful diff of the 20260805150000 body — only p_reason is new. Every
-- branch, the exception-based duplicate check (backed by the partial
-- unique index member_roles_one_active_idx, so a concurrent duplicate
-- raises rather than slipping through a check-then-insert gap), and the
-- admin_overrides row_id convention (the AFFECTED MEMBER's profile_id,
-- matching revoke_wing_role) are unchanged.
DROP FUNCTION IF EXISTS public.grant_wing_role(uuid, text, text, uuid, text);
CREATE OR REPLACE FUNCTION public.grant_wing_role(
  p_profile_id uuid, p_role text, p_country text DEFAULT NULL::text,
  p_chapter_id uuid DEFAULT NULL::uuid, p_title text DEFAULT NULL::text,
  p_reason text DEFAULT NULL::text
)
RETURNS TABLE(ok boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_chapter_country text; v_rank int;
BEGIN
  IF p_role NOT IN ('secretariat','country_coordinator','chapter_lead','team_lead') THEN
    RETURN QUERY SELECT false, format('Unknown role: %s', p_role); RETURN;
  END IF;

  IF p_role = 'secretariat' THEN
    -- is_admin(), not has_global_scope(): the latter includes existing
    -- secretariat, letting the role replicate itself.
    IF NOT public.is_admin() THEN
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

  BEGIN
    INSERT INTO public.member_roles
      (profile_id, role, country, chapter_id, title, granted_by, reason)
    VALUES (p_profile_id, p_role::public.wing_role,
            CASE WHEN p_role = 'secretariat' THEN NULL ELSE p_country END,
            CASE WHEN p_role IN ('chapter_lead','team_lead') THEN p_chapter_id END,
            nullif(btrim(p_title), ''), auth.uid(), nullif(btrim(coalesce(p_reason, '')), ''));
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT false, 'They already hold that role there.'; RETURN;
  END;

  INSERT INTO public.admin_overrides (actor_id, table_name, row_id, action, country, detail)
  VALUES (auth.uid(), 'member_roles', p_profile_id, 'grant:' || p_role, p_country, p_reason);

  RETURN QUERY SELECT true, 'Role granted.';
END $$;

REVOKE ALL ON FUNCTION public.grant_wing_role(uuid, text, text, uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.grant_wing_role(uuid, text, text, uuid, text, text) TO authenticated;

DROP FUNCTION IF EXISTS public.revoke_wing_role(uuid);
CREATE OR REPLACE FUNCTION public.revoke_wing_role(p_role_id uuid, p_reason text DEFAULT NULL::text)
RETURNS TABLE(ok boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r public.member_roles; v_rank int;
BEGIN
  SELECT * INTO r FROM public.member_roles WHERE id = p_role_id;
  IF r.id IS NULL OR r.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT false, 'No such active role.'; RETURN;
  END IF;

  IF r.role = 'secretariat' THEN
    -- is_admin(), matching grant_wing_role(). has_global_scope() includes
    -- secretariat, which would let the role revoke its own peers — the
    -- exact bug 20260805200000 fixed. Do not revert to has_global_scope().
    IF NOT public.is_admin() THEN
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

  INSERT INTO public.admin_overrides (actor_id, table_name, row_id, action, country, detail)
  VALUES (auth.uid(), 'member_roles', r.profile_id::text, 'revoke:' || r.role::text, r.country, p_reason);

  RETURN QUERY SELECT true, 'Role revoked.';
END $$;

REVOKE ALL ON FUNCTION public.revoke_wing_role(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.revoke_wing_role(uuid, text) TO authenticated;

-- ── real "Access hygiene" signals, admin-only ─────────────────────────
CREATE OR REPLACE FUNCTION public.admin_role_actions_this_month()
RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT count(*)::int
    FROM public.admin_overrides ao
    JOIN public.profiles p ON p.id = ao.actor_id
   WHERE public.is_admin()
     AND ao.table_name = 'member_roles'
     AND p.role = 'admin'
     AND ao.occurred_at >= date_trunc('month', now());
$$;

REVOKE ALL ON FUNCTION public.admin_role_actions_this_month() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_role_actions_this_month() TO authenticated;

CREATE OR REPLACE FUNCTION public.wing_role_multi_holders()
RETURNS TABLE (profile_id uuid, full_name text, role_count bigint, roles text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT mr.profile_id, p.full_name, count(*),
         string_agg(mr.role::text || coalesce(' (' || mr.title || ')', ''), ', ' ORDER BY mr.role)
    FROM public.member_roles mr
    JOIN public.profiles p ON p.id = mr.profile_id
   WHERE public.is_admin() AND mr.revoked_at IS NULL
   GROUP BY mr.profile_id, p.full_name
  HAVING count(*) > 1
   ORDER BY count(*) DESC;
$$;

REVOKE ALL ON FUNCTION public.wing_role_multi_holders() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.wing_role_multi_holders() TO authenticated;

CREATE OR REPLACE FUNCTION public.wing_roles_appointed_soon_after_joining(p_days int DEFAULT 30)
RETURNS TABLE (profile_id uuid, full_name text, role text, granted_at timestamptz, joined_at timestamptz, days_after int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT mr.profile_id, p.full_name, mr.role::text, mr.granted_at, p.created_at,
         extract(day FROM (mr.granted_at - p.created_at))::int
    FROM public.member_roles mr
    JOIN public.profiles p ON p.id = mr.profile_id
   WHERE public.is_admin() AND mr.revoked_at IS NULL
     AND mr.granted_at - p.created_at < make_interval(days => greatest(1, coalesce(p_days, 30)))
   ORDER BY mr.granted_at DESC;
$$;

REVOKE ALL ON FUNCTION public.wing_roles_appointed_soon_after_joining(int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.wing_roles_appointed_soon_after_joining(int) TO authenticated;

-- ── real (non-fabricated) "invented roles" table, per user decision ──
CREATE OR REPLACE FUNCTION public.wing_custom_titled_roles()
RETURNS TABLE (role_id uuid, title text, chapter text, country text, holder_name text, granted_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT mr.id, mr.title, cl.name, mr.country, p.full_name, mr.granted_at
    FROM public.member_roles mr
    JOIN public.profiles p ON p.id = mr.profile_id
    LEFT JOIN public.chapters cl ON cl.id = mr.chapter_id
   WHERE public.is_admin() AND mr.revoked_at IS NULL
     AND mr.role = 'team_lead' AND mr.title IS NOT NULL
   ORDER BY mr.granted_at DESC;
$$;

REVOKE ALL ON FUNCTION public.wing_custom_titled_roles() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.wing_custom_titled_roles() TO authenticated;

-- ── countries with members but no active coordinator ──────────────────
CREATE OR REPLACE FUNCTION public.wing_countries_without_coordinator()
RETURNS TABLE (country text, member_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.country_of_residence, count(*)
    FROM public.profiles p
   WHERE public.is_admin()
     AND p.country_of_residence IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.member_roles mr
        WHERE mr.role = 'country_coordinator' AND mr.revoked_at IS NULL
          AND mr.country = p.country_of_residence
     )
   GROUP BY p.country_of_residence
   ORDER BY count(*) DESC;
$$;

REVOKE ALL ON FUNCTION public.wing_countries_without_coordinator() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.wing_countries_without_coordinator() TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'Roles & Access RPCs ready';
END $$;
