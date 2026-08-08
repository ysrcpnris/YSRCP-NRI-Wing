-- =====================================================================
-- 20260808210001 — fix a real bug in 20260808210000: retired versions
-- were indistinguishable from the mutable draft
--
-- CAUGHT LIVE: publishing a SECOND time exposed that `is_published =
-- false` means two different things — a genuine untouched draft, and
-- a version that WAS live and has just been retired by a newer
-- publish. admin_welcome_ensure_draft()'s `WHERE NOT is_published
-- LIMIT 1` can't tell them apart, so after the second publish it
-- handed the editor the just-retired historical row as "the draft."
-- Saving from there would have overwritten that row's content in
-- place — silently rewriting history the migration's own comment
-- promised never happens ("a permanent historical record... never
-- updated again"). Caught before it actually corrupted anything, by
-- re-reading actual table state after a real two-publish sequence
-- rather than trusting the RPCs' own return values.
--
-- THE FIX: publish_welcome_message() sets published_at exactly once,
-- on first publish, and 20260808210000 never touches it again for any
-- row (retiring only flips is_published, not published_at). So
-- `published_at IS NULL` is the one column that is permanently true
-- for a row that has NEVER been live and permanently false the moment
-- it has — draft identity, not publish state. Every place that
-- previously searched "the draft" by is_published alone now requires
-- both.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.admin_welcome_ensure_draft()
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_draft_id uuid; v_pub public.welcome_messages;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_draft_id FROM public.welcome_messages
   WHERE NOT is_published AND published_at IS NULL LIMIT 1;
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
   WHERE id = p_id AND NOT is_published AND published_at IS NULL;

  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.publish_welcome_message(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.welcome_messages
     WHERE id = p_id AND NOT is_published AND published_at IS NULL
  ) THEN
    RETURN false;
  END IF;

  UPDATE public.welcome_messages SET is_published = false WHERE is_published;
  UPDATE public.welcome_messages SET is_published = true, published_at = now() WHERE id = p_id;

  RETURN true;
END $$;

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

  SELECT id INTO v_existing_draft FROM public.welcome_messages
   WHERE NOT is_published AND published_at IS NULL LIMIT 1;
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

DO $$
BEGIN
  RAISE NOTICE 'welcome draft identity fixed: published_at IS NULL, not just is_published';
END $$;
