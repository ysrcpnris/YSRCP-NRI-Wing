-- =====================================================================
-- 20260806140000 — Team & Groups (screen `c-team`)
--
-- LESS NEW SCHEMA THAN IT LOOKED LIKE AT FIRST
--   City leads and the committee both already have full backing —
--   wing_roles_list() (self-scoping) + grant_wing_role()/revoke_wing_role()
--   already do everything RoleManager.tsx uses for exactly this. City
--   leads are role='chapter_lead' rows, filtered client-side; the
--   committee is role='team_lead' rows with a free-text title — already
--   uncapped, no fixed 15-seat list to build, per explicit instruction.
--   Nothing added here for either.
--
--   Social handles' WRITE path is already real too — a chapter_lead or
--   country_coordinator can already INSERT/UPDATE their own chapter's
--   handles (handles_chapter_write, can_write_chapter()). And
--   social_handles WITH platform='whatsapp' already IS the WhatsApp
--   groups tracker — its own 20260804220000 header says so directly.
--   So "WhatsApp group management" is mostly a UI gap, not a schema one.
--
-- WHAT'S GENUINELY NEW
--   expires_at — social_handles never tracked link expiry. Nullable,
--   meaningful for whatsapp rows (the mock's "Rotate" / "Expired 28
--   Jul" concept), harmless elsewhere.
--
--   social_handle_joins — member_count/count_as_of on social_handles
--   is explicitly documented as a MANUAL, periodic figure ("WhatsApp
--   exposes no group-size API"). The mock's "Joined via portal" column
--   is a different, genuinely-trackable number: how many members
--   actually clicked through this app. Kept as its own log rather than
--   overloading member_count, so the manual total and the portal-
--   attributable count can never be confused for each other.
-- =====================================================================

ALTER TABLE public.social_handles ADD COLUMN IF NOT EXISTS expires_at timestamptz;

CREATE TABLE IF NOT EXISTS public.social_handle_joins (
  handle_id  uuid NOT NULL REFERENCES public.social_handles(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (handle_id, profile_id)
);
ALTER TABLE public.social_handle_joins ENABLE ROW LEVEL SECURITY;

-- A member reads their own join rows only (so a client can show "you
-- already joined this"); nothing is writable directly — only via
-- log_handle_join(), matching the write-through-RPC pattern used
-- everywhere else a count must be trustworthy.
CREATE POLICY social_handle_joins_own_read ON public.social_handle_joins
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());
REVOKE ALL ON public.social_handle_joins FROM authenticated, anon;
GRANT SELECT ON public.social_handle_joins TO authenticated;

-- ── a member clicking a WhatsApp/handle link records that they did ────
CREATE OR REPLACE FUNCTION public.log_handle_join(p_handle_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.social_handles WHERE id = p_handle_id AND is_active) THEN
    RAISE EXCEPTION 'no such handle' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.social_handle_joins (handle_id, profile_id)
  VALUES (p_handle_id, auth.uid())
  ON CONFLICT (handle_id, profile_id) DO NOTHING;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.log_handle_join(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.log_handle_join(uuid) TO authenticated;

-- ── add a handle to one of the caller's own chapters ───────────────────
-- Wraps the already-permitted direct INSERT in one place so
-- validation (URL shape, scope shape) lives server-side rather than
-- being re-implemented by every future caller.
CREATE OR REPLACE FUNCTION public.add_chapter_handle(
  p_chapter_id uuid,
  p_platform   text,
  p_label      text,
  p_url        text,
  p_handle     text DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_country text; v_id uuid;
BEGIN
  SELECT country INTO v_country FROM public.chapters WHERE id = p_chapter_id;
  IF v_country IS NULL THEN
    RAISE EXCEPTION 'no such chapter' USING ERRCODE = '22023';
  END IF;
  IF NOT public.can_write_chapter(p_chapter_id) THEN
    RAISE EXCEPTION 'not authorized to add a handle for this chapter' USING ERRCODE = '42501';
  END IF;
  IF p_url !~* '^https?://' THEN
    RAISE EXCEPTION 'url must start with http:// or https://' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.social_handles (scope, platform, label, url, handle, chapter_id, country, description)
  VALUES ('chapter', p_platform::public.handle_platform, btrim(p_label), p_url, nullif(btrim(coalesce(p_handle,'')), ''),
          p_chapter_id, v_country, nullif(btrim(coalesce(p_description,'')), ''))
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.add_chapter_handle(uuid, text, text, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.add_chapter_handle(uuid, text, text, text, text, text) TO authenticated;

-- ── rotate a WhatsApp (or any) link + its expiry, chapter-scoped ──────
CREATE OR REPLACE FUNCTION public.rotate_chapter_handle(
  p_handle_id  uuid,
  p_new_url    text,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_chapter_id uuid;
BEGIN
  SELECT chapter_id INTO v_chapter_id FROM public.social_handles WHERE id = p_handle_id AND scope = 'chapter';
  IF v_chapter_id IS NULL THEN
    RAISE EXCEPTION 'no such chapter handle' USING ERRCODE = '22023';
  END IF;
  IF NOT public.can_write_chapter(v_chapter_id) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_new_url !~* '^https?://' THEN
    RAISE EXCEPTION 'url must start with http:// or https://' USING ERRCODE = '22023';
  END IF;

  UPDATE public.social_handles SET url = p_new_url, expires_at = p_expires_at, updated_at = now()
   WHERE id = p_handle_id;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.rotate_chapter_handle(uuid, text, timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rotate_chapter_handle(uuid, text, timestamptz) TO authenticated;

-- ── the coordinator's own admin view: every chapter they can write to,
--    with real joined-via-portal counts alongside the manual figure ────
CREATE OR REPLACE FUNCTION public.my_chapter_handles_admin()
RETURNS TABLE (
  id            uuid,
  chapter_id    uuid,
  chapter_name  text,
  platform      text,
  label         text,
  handle        text,
  url           text,
  member_count  int,
  count_as_of   date,
  expires_at    timestamptz,
  joined_via_portal bigint,
  can_write     boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT sh.id, sh.chapter_id, cl.name, sh.platform::text, sh.label, sh.handle, sh.url,
         sh.member_count, sh.count_as_of, sh.expires_at,
         (SELECT count(*) FROM public.social_handle_joins j WHERE j.handle_id = sh.id),
         public.can_write_chapter(sh.chapter_id)
    FROM public.social_handles sh
    JOIN public.chapters cl ON cl.id = sh.chapter_id
   WHERE sh.scope = 'chapter'
     AND sh.is_active
     AND (public.is_admin() OR sh.chapter_id = ANY (public.my_chapter_ids())
          OR sh.country = ANY (public.my_countries()))
   ORDER BY cl.name, sh.sort_order, sh.label;
$$;

REVOKE ALL ON FUNCTION public.my_chapter_handles_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_chapter_handles_admin() TO authenticated;
