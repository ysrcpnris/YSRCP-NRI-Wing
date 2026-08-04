-- =====================================================================
-- 20260804220000 — social handles and WhatsApp groups
--
-- TWO SEPARATE RULES, OFTEN CONFUSED
--
--   VISIBILITY — a member sees handles for their OWN chapter, plus
--   everything national (India / AP / the wing itself). They do not see
--   other countries' handles, because a member in Frankfurt has no use
--   for the Dallas WhatsApp group and showing it just buries the one
--   that matters.
--
--   OWNERSHIP — Abroad Connect handles belong to the chapter: a chapter
--   lead creates and edits their own, and admin can edit anything.
--   Local Connect (India/AP) handles are admin-only; a chapter lead in
--   Toronto has no business editing the party's national X account.
--
-- These are enforced by two different policies. A chapter lead can SEE
-- national handles and cannot EDIT them, which one combined rule could
-- not express.
--
-- WHATSAPP GROUP SIZE IS NOT STORED AS A LIVE NUMBER
--   WhatsApp has no group-membership API: no size, no member list, no
--   way to verify a link still works. member_count is therefore a
--   manually maintained figure with the date it was checked, and the UI
--   presents it as "as of <date>" rather than implying it is live.
--   Recording when a number was last true is honest; showing a stale
--   number as current is not.
-- =====================================================================

CREATE TYPE public.handle_platform AS ENUM (
  'x', 'facebook', 'instagram', 'youtube', 'whatsapp', 'telegram', 'website'
);

-- 'national' covers India / AP / the wing itself and is visible to
-- every member regardless of where they live.
CREATE TYPE public.handle_scope AS ENUM ('national', 'chapter');

CREATE TABLE public.social_handles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope         public.handle_scope   NOT NULL,
  platform      public.handle_platform NOT NULL,
  label         text NOT NULL,
  url           text NOT NULL,
  handle        text,
  -- Set for scope='chapter', null for scope='national'.
  cluster_id    uuid REFERENCES public.clusters(id) ON DELETE CASCADE,
  country       text,
  -- WhatsApp groups only. Null everywhere else.
  member_count  int,
  count_as_of   date,
  description   text,
  sort_order    int NOT NULL DEFAULT 100,
  is_active     boolean NOT NULL DEFAULT true,
  created_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  -- A chapter handle must say which chapter; a national one must not.
  CONSTRAINT handle_scope_shape CHECK (
    (scope = 'chapter'  AND cluster_id IS NOT NULL AND country IS NOT NULL)
    OR
    (scope = 'national' AND cluster_id IS NULL     AND country IS NULL)
  ),
  -- A member count without a date is a number nobody can judge.
  CONSTRAINT count_needs_a_date CHECK (
    member_count IS NULL OR count_as_of IS NOT NULL
  ),
  CONSTRAINT url_is_a_url CHECK (url ~* '^https?://')
);

CREATE INDEX social_handles_scope_idx   ON public.social_handles (scope, is_active);
CREATE INDEX social_handles_cluster_idx ON public.social_handles (cluster_id)
  WHERE cluster_id IS NOT NULL;

ALTER TABLE public.social_handles ENABLE ROW LEVEL SECURITY;

-- ── VISIBILITY ───────────────────────────────────────────────────────
-- National handles: everyone. Chapter handles: only that chapter's
-- members, matched through the member's own city.
CREATE POLICY handles_read ON public.social_handles
  FOR SELECT TO authenticated
  USING (
    is_active
    AND (
      scope = 'national'
      OR cluster_id = (
        SELECT public.chapter_for_city(p.country_of_residence, p.city_abroad)
          FROM public.profiles p WHERE p.id = auth.uid()
      )
      -- A coordinator sees the handles of every country they are scoped
      -- to, not just the one city they happen to live in.
      OR country = ANY (public.my_countries())
    )
  );

-- ── OWNERSHIP ────────────────────────────────────────────────────────
-- Admin does everything.
CREATE POLICY handles_admin_all ON public.social_handles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- A chapter lead or coordinator manages their own chapter's handles.
-- The WITH CHECK repeats the condition so a row cannot be UPDATEd into
-- a country the caller does not hold — without it, a Germany lead could
-- move a handle to the USA and keep editing it.
CREATE POLICY handles_chapter_write ON public.social_handles
  FOR ALL TO authenticated
  USING (
    scope = 'chapter'
    AND public.is_coordinator()
    AND country = ANY (public.my_countries())
  )
  WITH CHECK (
    scope = 'chapter'
    AND public.is_coordinator()
    AND country = ANY (public.my_countries())
  );

CREATE OR REPLACE FUNCTION public.touch_social_handle()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_social_handles_touch
  BEFORE UPDATE ON public.social_handles
  FOR EACH ROW EXECUTE FUNCTION public.touch_social_handle();

-- What the member-facing screen calls. Returns both scopes in one go,
-- already ordered, so the client does no filtering of its own.
CREATE OR REPLACE FUNCTION public.my_social_handles()
RETURNS TABLE (
  scope        public.handle_scope,
  platform     public.handle_platform,
  label        text,
  url          text,
  handle       text,
  chapter      text,
  member_count int,
  count_as_of  date,
  description  text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT sh.scope, sh.platform, sh.label, sh.url, sh.handle,
         cl.name, sh.member_count, sh.count_as_of, sh.description
    FROM public.social_handles sh
    LEFT JOIN public.clusters cl ON cl.id = sh.cluster_id
   WHERE sh.is_active
     AND (
       sh.scope = 'national'
       OR sh.cluster_id = (
         SELECT public.chapter_for_city(p.country_of_residence, p.city_abroad)
           FROM public.profiles p WHERE p.id = auth.uid()
       )
     )
   ORDER BY sh.scope DESC, sh.sort_order, sh.label;
$$;

REVOKE ALL ON FUNCTION public.my_social_handles() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_social_handles() TO authenticated;

GRANT SELECT ON public.social_handles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.social_handles TO authenticated;

COMMENT ON TABLE public.social_handles IS
  'Party social handles and WhatsApp groups. National rows are visible '
  'to all members and editable only by admin; chapter rows are visible '
  'to that chapter and editable by its coordinators.';

COMMENT ON COLUMN public.social_handles.member_count IS
  'Manually recorded — WhatsApp exposes no group-size API. Always shown '
  'with count_as_of so a stale number reads as stale.';
