-- =====================================================================
-- 20260808210000 — Welcome Message (a-welcome)
--
-- CHECKED WITH THE USER: build it for real, matching the mock's full
-- mechanism, not a-links' immediate-save shortcut.
--   Nothing backs this at all — no table, no RPC, and the onboarding
--   flow (CompleteProfilePage.tsx) goes straight to /dashboard today
--   with no end screen, not even static text. The mock's own copy
--   ("needs approval from his office," draft/publish, version history
--   with restore, per-country targeting, a one-time re-show-to-
--   existing-members flag) is a real content-versioning system, not a
--   settings row — a-links' "no draft/live concept anywhere it's used
--   today" reasoning doesn't apply here because nothing else in this
--   table needs staged review before a member sees it.
--
-- THE MODEL: every row is an immutable version once published
--   A row is either the one mutable draft (is_published = false) or a
--   permanent historical record (is_published = true, never updated
--   again). save_welcome_draft() updates the existing draft in place;
--   publish_welcome_message() flips it to published and un-publishes
--   whatever was live before (that row's content is untouched — it
--   just stops being current); restore_welcome_version() never
--   rewrites history, it copies an old version's content into a NEW
--   draft. A partial unique index enforces at most one published row
--   at a time.
--
-- GATE: is_admin() for every write and for the editor's own reads,
--   matching a-feedback/a-griev's "reserved capability, not
--   delegated" precedent — content signed by the party president is
--   at least as sensitive as AP-leader assignment. Member-facing reads
--   (current_welcome_message, welcome_message_needs_reshow,
--   mark_welcome_message_seen) are ordinary authenticated, self-scoped.
--
-- NO DIRECT TABLE GRANTS — same funnel-through-RPC pattern as
--   appointment_ranges: RLS enabled, no policies, REVOKE ALL from
--   every role. Every access goes through a SECURITY DEFINER function.
--
-- TWO NEW MEMBER-FACING SURFACES, NEITHER OF WHICH EXISTED BEFORE:
--   1. Onboarding end-screen — CompleteProfilePage.tsx currently
--      navigates straight to /dashboard; it now shows this message
--      first when show_at_onboarding is on and a published message
--      matches the member's country.
--   2. "Read it again" — a profile-area link, shown only when
--      retrievable_from_profile is on. The mock never designs this
--      surface's placement; MyProfile.tsx gets a simple modal trigger,
--      a judgment call, not a mock spec.
--
-- "RE-SHOW TO EXISTING MEMBERS" IS A REAL, PER-MEMBER MECHANIC, NOT A
-- BROADCAST
--   profiles.welcome_message_seen_id tracks the last version a member
--   has been shown (set when the onboarding screen or the reshow
--   banner is dismissed). welcome_message_needs_reshow() returns the
--   published message only when reshow_to_existing is on AND the
--   caller's onboarding is already complete AND they haven't seen
--   this exact version yet — so turning reshow on shows it once per
--   member, not on every dashboard load, and never to someone who's
--   about to see it via onboarding anyway.
-- =====================================================================

CREATE TABLE public.welcome_messages (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eyebrow                   text,
  heading_te                text,
  subheading                text,
  body                      text,
  signed_by_name            text,
  signed_by_title           text,
  signed_by_initials        text,
  audience                  text NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'countries', 'off')),
  audience_countries        text[],
  show_at_onboarding        boolean NOT NULL DEFAULT true,
  retrievable_from_profile  boolean NOT NULL DEFAULT true,
  reshow_to_existing        boolean NOT NULL DEFAULT false,
  is_published              boolean NOT NULL DEFAULT false,
  created_by                uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at                timestamptz NOT NULL DEFAULT now(),
  published_at              timestamptz,

  CONSTRAINT welcome_audience_countries_shape CHECK (
    (audience = 'countries' AND audience_countries IS NOT NULL AND array_length(audience_countries, 1) > 0)
    OR (audience <> 'countries')
  )
);

-- At most one published row at a time — the indexed expression is
-- constant for every qualifying row, so uniqueness caps it at one.
CREATE UNIQUE INDEX welcome_messages_one_published
  ON public.welcome_messages (is_published) WHERE is_published;

ALTER TABLE public.welcome_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.welcome_messages FROM public, anon, authenticated;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS welcome_message_seen_id uuid REFERENCES public.welcome_messages(id) ON DELETE SET NULL;
-- No grant — set only by mark_welcome_message_seen() below.

-- ── admin: version history ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_welcome_versions()
RETURNS TABLE (
  id            uuid,
  eyebrow       text,
  heading_te    text,
  is_published  boolean,
  created_by_name text,
  created_at    timestamptz,
  published_at  timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT w.id, w.eyebrow, w.heading_te, w.is_published, p.full_name, w.created_at, w.published_at
    FROM public.welcome_messages w
    LEFT JOIN public.profiles p ON p.id = w.created_by
   ORDER BY w.created_at DESC;
END $$;

REVOKE ALL ON FUNCTION public.admin_welcome_versions() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_welcome_versions() TO authenticated;

-- ── admin: full content of one version (draft or historical) ───────
CREATE OR REPLACE FUNCTION public.admin_welcome_version(p_id uuid)
RETURNS TABLE (
  id                        uuid,
  eyebrow                   text,
  heading_te                text,
  subheading                text,
  body                      text,
  signed_by_name            text,
  signed_by_title           text,
  signed_by_initials        text,
  audience                  text,
  audience_countries        text[],
  show_at_onboarding        boolean,
  retrievable_from_profile  boolean,
  reshow_to_existing        boolean,
  is_published              boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT w.id, w.eyebrow, w.heading_te, w.subheading, w.body,
         w.signed_by_name, w.signed_by_title, w.signed_by_initials,
         w.audience, w.audience_countries,
         w.show_at_onboarding, w.retrievable_from_profile, w.reshow_to_existing,
         w.is_published
    FROM public.welcome_messages w
   WHERE w.id = p_id;
END $$;

REVOKE ALL ON FUNCTION public.admin_welcome_version(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_welcome_version(uuid) TO authenticated;

-- ── admin: get (or create) the current mutable draft ────────────────
-- If a draft already exists, return it. If not, seed a new one from
-- the currently published version (or blank defaults if nothing has
-- ever been published) so the editor always has something to edit
-- without ever mutating a historical row.
CREATE OR REPLACE FUNCTION public.admin_welcome_ensure_draft()
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_draft_id uuid; v_pub public.welcome_messages;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_draft_id FROM public.welcome_messages WHERE NOT is_published LIMIT 1;
  IF v_draft_id IS NOT NULL THEN
    RETURN v_draft_id;
  END IF;

  SELECT * INTO v_pub FROM public.welcome_messages WHERE is_published LIMIT 1;

  INSERT INTO public.welcome_messages (
    eyebrow, heading_te, subheading, body, signed_by_name, signed_by_title, signed_by_initials,
    audience, audience_countries, show_at_onboarding, retrievable_from_profile, reshow_to_existing,
    is_published, created_by
  ) VALUES (
    v_pub.eyebrow, v_pub.heading_te, v_pub.subheading, v_pub.body,
    v_pub.signed_by_name, v_pub.signed_by_title, v_pub.signed_by_initials,
    coalesce(v_pub.audience, 'all'), v_pub.audience_countries,
    coalesce(v_pub.show_at_onboarding, true), coalesce(v_pub.retrievable_from_profile, true), false,
    false, auth.uid()
  ) RETURNING id INTO v_draft_id;

  RETURN v_draft_id;
END $$;

REVOKE ALL ON FUNCTION public.admin_welcome_ensure_draft() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_welcome_ensure_draft() TO authenticated;

-- ── admin: save the mutable draft in place ──────────────────────────
CREATE OR REPLACE FUNCTION public.save_welcome_draft(
  p_id                        uuid,
  p_eyebrow                   text,
  p_heading_te                text,
  p_subheading                text,
  p_body                      text,
  p_signed_by_name            text,
  p_signed_by_title           text,
  p_signed_by_initials        text,
  p_audience                  text,
  p_audience_countries        text[],
  p_show_at_onboarding        boolean,
  p_retrievable_from_profile  boolean,
  p_reshow_to_existing        boolean
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN false;
  END IF;
  IF p_audience NOT IN ('all', 'countries', 'off') THEN
    RAISE EXCEPTION 'audience must be all, countries or off' USING ERRCODE = '22023';
  END IF;

  UPDATE public.welcome_messages
     SET eyebrow = nullif(btrim(coalesce(p_eyebrow, '')), ''),
         heading_te = nullif(btrim(coalesce(p_heading_te, '')), ''),
         subheading = nullif(btrim(coalesce(p_subheading, '')), ''),
         body = nullif(btrim(coalesce(p_body, '')), ''),
         signed_by_name = nullif(btrim(coalesce(p_signed_by_name, '')), ''),
         signed_by_title = nullif(btrim(coalesce(p_signed_by_title, '')), ''),
         signed_by_initials = nullif(btrim(coalesce(p_signed_by_initials, '')), ''),
         audience = p_audience,
         audience_countries = CASE WHEN p_audience = 'countries' THEN p_audience_countries ELSE NULL END,
         show_at_onboarding = coalesce(p_show_at_onboarding, true),
         retrievable_from_profile = coalesce(p_retrievable_from_profile, true),
         reshow_to_existing = coalesce(p_reshow_to_existing, false)
   WHERE id = p_id AND NOT is_published;

  RETURN FOUND;
END $$;

REVOKE ALL ON FUNCTION public.save_welcome_draft(uuid, text, text, text, text, text, text, text, text, text[], boolean, boolean, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.save_welcome_draft(uuid, text, text, text, text, text, text, text, text, text[], boolean, boolean, boolean) TO authenticated;

-- ── admin: publish a draft, retiring whatever was live ──────────────
CREATE OR REPLACE FUNCTION public.publish_welcome_message(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.welcome_messages WHERE id = p_id AND NOT is_published) THEN
    RETURN false;
  END IF;

  UPDATE public.welcome_messages SET is_published = false WHERE is_published;
  UPDATE public.welcome_messages SET is_published = true, published_at = now() WHERE id = p_id;

  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.publish_welcome_message(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.publish_welcome_message(uuid) TO authenticated;

-- ── admin: copy an old version's content into a new draft ───────────
CREATE OR REPLACE FUNCTION public.restore_welcome_version(p_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_src public.welcome_messages; v_new_id uuid; v_existing_draft uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_src FROM public.welcome_messages WHERE id = p_id;
  IF v_src.id IS NULL THEN
    RAISE EXCEPTION 'no such version' USING ERRCODE = '22023';
  END IF;

  -- Restoring replaces whatever's currently being drafted, not stacks
  -- on top of it — one delete-then-insert, still never touching a
  -- published row.
  SELECT id INTO v_existing_draft FROM public.welcome_messages WHERE NOT is_published LIMIT 1;
  IF v_existing_draft IS NOT NULL THEN
    DELETE FROM public.welcome_messages WHERE id = v_existing_draft;
  END IF;

  INSERT INTO public.welcome_messages (
    eyebrow, heading_te, subheading, body, signed_by_name, signed_by_title, signed_by_initials,
    audience, audience_countries, show_at_onboarding, retrievable_from_profile, reshow_to_existing,
    is_published, created_by
  ) VALUES (
    v_src.eyebrow, v_src.heading_te, v_src.subheading, v_src.body,
    v_src.signed_by_name, v_src.signed_by_title, v_src.signed_by_initials,
    v_src.audience, v_src.audience_countries,
    v_src.show_at_onboarding, v_src.retrievable_from_profile, false,
    false, auth.uid()
  ) RETURNING id INTO v_new_id;

  RETURN v_new_id;
END $$;

REVOKE ALL ON FUNCTION public.restore_welcome_version(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.restore_welcome_version(uuid) TO authenticated;

-- ── member: the live message, if any, for the caller's own country ──
CREATE OR REPLACE FUNCTION public.current_welcome_message()
RETURNS TABLE (
  id                        uuid,
  eyebrow                   text,
  heading_te                text,
  subheading                text,
  body                      text,
  signed_by_name            text,
  signed_by_title           text,
  signed_by_initials        text,
  show_at_onboarding        boolean,
  retrievable_from_profile  boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_country text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT p.country_of_residence INTO v_country FROM public.profiles p WHERE p.id = auth.uid();

  RETURN QUERY
  SELECT w.id, w.eyebrow, w.heading_te, w.subheading, w.body,
         w.signed_by_name, w.signed_by_title, w.signed_by_initials,
         w.show_at_onboarding, w.retrievable_from_profile
    FROM public.welcome_messages w
   WHERE w.is_published
     AND w.audience <> 'off'
     AND (w.audience = 'all' OR (v_country IS NOT NULL AND v_country = ANY (w.audience_countries)));
END $$;

REVOKE ALL ON FUNCTION public.current_welcome_message() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.current_welcome_message() TO authenticated;

-- ── member: the live message IF this is a first-time reshow ─────────
CREATE OR REPLACE FUNCTION public.welcome_message_needs_reshow()
RETURNS TABLE (
  id             uuid,
  eyebrow        text,
  heading_te     text,
  subheading     text,
  body           text,
  signed_by_name text,
  signed_by_title text,
  signed_by_initials text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_country text; v_onboarded boolean; v_seen uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT p.country_of_residence, p.onboarding_completed_at IS NOT NULL, p.welcome_message_seen_id
    INTO v_country, v_onboarded, v_seen
    FROM public.profiles p WHERE p.id = auth.uid();

  IF NOT coalesce(v_onboarded, false) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT w.id, w.eyebrow, w.heading_te, w.subheading, w.body,
         w.signed_by_name, w.signed_by_title, w.signed_by_initials
    FROM public.welcome_messages w
   WHERE w.is_published
     AND w.reshow_to_existing
     AND w.audience <> 'off'
     AND (w.audience = 'all' OR (v_country IS NOT NULL AND v_country = ANY (w.audience_countries)))
     AND w.id IS DISTINCT FROM v_seen;
END $$;

REVOKE ALL ON FUNCTION public.welcome_message_needs_reshow() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.welcome_message_needs_reshow() TO authenticated;

-- ── member: mark a version seen (onboarding completion or reshow dismiss) ──
CREATE OR REPLACE FUNCTION public.mark_welcome_message_seen(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  UPDATE public.profiles SET welcome_message_seen_id = p_id WHERE id = auth.uid();
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.mark_welcome_message_seen(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mark_welcome_message_seen(uuid) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'welcome_messages + admin/member RPCs created';
END $$;
