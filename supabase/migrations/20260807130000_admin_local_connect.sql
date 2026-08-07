-- =====================================================================
-- 20260807130000 — Admin Local Connect (a-connect): real Mandal
-- Presidents + per-leader handles, both checked with the user first.
--
-- MANDAL PRESIDENTS — THE BACKEND ALREADY EXISTED, THE ADMIN UI DIDN'T
--   20260805235000 built leader_assignments.mandal, resolve_mandal(),
--   my_local_connect()'s mandal tier and my_constituency_mandals() for
--   the MEMBER side — but MasterData.tsx's role dropdown never gained
--   "Mandal President", so zero real assignments exist anywhere. This
--   migration adds the admin-facing read side (an admin_ variant of
--   my_constituency_mandals(), parameterised rather than tied to the
--   caller's own profile); MasterData.tsx itself is extended in the
--   same commit to actually let an admin create one.
--
--   villages_count/households_count stay exactly as
--   20260805235000 left them — nullable, unpopulated, and this
--   migration adds no data-entry path for them, matching that
--   migration's own explicit reasoning ("a fabricated household count
--   would be worse than an honest blank").
--
-- LEADER HANDLES — NEW, MINIMAL, CHECKED WITH THE USER
--   No table anywhere links a social handle to a specific leader.
--   leader_handles is the same shape as social_handles (reuses
--   public.handle_platform) but keyed to leaders_master instead of a
--   chapter — admin-write only, public read (matches leaders_master's
--   own "leaders_master_read USING (true)" policy).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.leader_handles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id  uuid NOT NULL REFERENCES public.leaders_master(id) ON DELETE CASCADE,
  platform   public.handle_platform NOT NULL,
  url        text NOT NULL,
  added_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  added_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (leader_id, platform)
);

ALTER TABLE public.leader_handles ENABLE ROW LEVEL SECURITY;

CREATE POLICY leader_handles_read ON public.leader_handles
  FOR SELECT USING (true);

CREATE POLICY leader_handles_admin_write ON public.leader_handles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

REVOKE ALL ON public.leader_handles FROM authenticated;
GRANT SELECT ON public.leader_handles TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.leader_handles TO authenticated;

-- ── stat cards ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_local_connect_stats()
RETURNS TABLE (
  constituencies_listed int, constituencies_total int,
  mandal_presidents int, unfilled_mandals int, country_coordinators int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    (SELECT count(DISTINCT public.resolve_constituency(la.constituency))
       FROM public.leader_assignments la
      WHERE la.is_active AND la.role = 'Assembly Coordinator'),
    (SELECT count(*) FROM public.ap_constituencies),
    (SELECT count(*) FROM public.leader_assignments
      WHERE is_active AND role = 'Mandal President'),
    (SELECT count(*) FROM public.ap_mandals m
      WHERE m.is_active
        AND NOT EXISTS (
          SELECT 1 FROM public.leader_assignments la
           WHERE la.is_active AND la.role = 'Mandal President'
             AND la.mandal IS NOT NULL
             AND lower(btrim(la.mandal)) = lower(btrim(m.name))
             AND public.resolve_constituency(la.constituency) = m.constituency_id
        )),
    (SELECT count(*) FROM public.member_roles
      WHERE revoked_at IS NULL AND role = 'country_coordinator')
  WHERE public.is_admin();
$$;

REVOKE ALL ON FUNCTION public.admin_local_connect_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_local_connect_stats() TO authenticated;

-- ── every mandal in a given constituency, admin-chosen (not the
--    caller's own) — same shape as my_constituency_mandals() ─────────
CREATE OR REPLACE FUNCTION public.admin_constituency_mandals(p_constituency text)
RETURNS TABLE (
  mandal_id int, mandal_name text, villages_count int, households_count int,
  assignment_id uuid, president_name text, whatsapp text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT m.id::int, m.name, m.villages_count, m.households_count,
         la.id, lm.name, lm.whatsapp_number
    FROM public.ap_mandals m
    LEFT JOIN public.leader_assignments la
           ON la.role = 'Mandal President' AND la.is_active
          AND public.resolve_constituency(la.constituency) = m.constituency_id
          AND la.mandal IS NOT NULL
          AND lower(btrim(la.mandal)) = lower(btrim(m.name))
    LEFT JOIN public.leaders_master lm ON lm.id = la.leader_id AND lm.is_active
   WHERE public.is_admin()
     AND m.constituency_id = public.resolve_constituency(p_constituency)
     AND m.is_active
   ORDER BY m.name;
$$;

REVOKE ALL ON FUNCTION public.admin_constituency_mandals(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_constituency_mandals(text) TO authenticated;

-- ── constituency picklist for the filter dropdown ─────────────────────
CREATE OR REPLACE FUNCTION public.admin_constituencies_with_mandals()
RETURNS TABLE (name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT DISTINCT c.name
    FROM public.ap_constituencies c
    JOIN public.ap_mandals m ON m.constituency_id = c.id AND m.is_active
   WHERE public.is_admin()
   ORDER BY 1;
$$;

REVOKE ALL ON FUNCTION public.admin_constituencies_with_mandals() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_constituencies_with_mandals() TO authenticated;

-- ── Leader handles & photos table ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_leaders_with_handles()
RETURNS TABLE (
  assignment_id uuid, leader_id uuid, leader_name text, role text,
  place text, photo_url text, platforms text[]
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT la.id, lm.id, lm.name, la.role,
         coalesce(la.mandal, la.constituency, la.district),
         lm.photo_url,
         coalesce((SELECT array_agg(lh.platform::text ORDER BY lh.platform)
                     FROM public.leader_handles lh WHERE lh.leader_id = lm.id), '{}')
    FROM public.leader_assignments la
    JOIN public.leaders_master lm ON lm.id = la.leader_id
   WHERE public.is_admin() AND la.is_active AND lm.is_active
   ORDER BY la.role, lm.name
   LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.admin_leaders_with_handles() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_leaders_with_handles() TO authenticated;

CREATE OR REPLACE FUNCTION public.add_leader_handle(p_leader_id uuid, p_platform text, p_url text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  IF p_url !~* '^https?://' THEN
    RAISE EXCEPTION 'url must start with http:// or https://' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.leader_handles (leader_id, platform, url, added_by)
  VALUES (p_leader_id, p_platform::public.handle_platform, btrim(p_url), auth.uid())
  ON CONFLICT (leader_id, platform) DO UPDATE SET url = EXCLUDED.url, added_by = EXCLUDED.added_by, added_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.add_leader_handle(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.add_leader_handle(uuid, text, text) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'Admin Local Connect RPCs ready';
END $$;
