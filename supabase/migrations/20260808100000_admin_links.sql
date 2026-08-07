-- =====================================================================
-- 20260808100000 — Handles & Links (a-links)
--
-- TERMS/PRIVACY — CHECKED WITH THE USER: BARE URL FIELDS
--   Admin supplies a URL; whether real policy text lives at that URL
--   is an operational responsibility, not something this migration can
--   guarantee either way. No new content system — reuses app_settings,
--   the same key/value table ContentControl.tsx already uses for
--   show_stay_connected.
--
-- "PUBLISH" BUTTON — DROPPED, MATCHING EXISTING PRECEDENT
--   app_settings has no draft/live concept anywhere it's used today
--   (ContentControl.tsx saves each field immediately). Adding a staged
--   publish workflow here would be inconsistent with every other
--   setting in the same table. Each field on this screen saves
--   immediately, like ContentControl.tsx's toggle already does.
--
-- REAL DISCREPANCY, NOT INVENTED: THE PARTY WEBSITE URL
--   20260804230000 seeded the national 'website' handle for "YSR
--   Congress Party" as https://www.ysrcparty.com. Footer.tsx
--   independently hardcodes https://www.ysrcongress.com. Rather than
--   silently pick one, Footer.tsx is changed to read the seeded
--   social_handles row — the one place already treated as the source
--   of truth for this URL (its own migration's comment: "so Local
--   Connect and the footer can both read their links from one place
--   rather than hard-coding them" — the footer half of that was never
--   actually done). If ysrcongress.com is in fact correct, that's now
--   a one-row admin edit instead of a second hardcoded copy to keep in
--   sync.
-- =====================================================================

INSERT INTO public.app_settings (key, value) VALUES
  ('footer_terms_url',     '""'::jsonb),
  ('footer_privacy_url',   '""'::jsonb),
  ('footer_contact_email', '"info@ysrcpnriwing.org"'::jsonb),
  ('footer_contact_phone', '"9515511111"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Extend with who published a chapter handle and when — the table
-- already has created_by/created_at, my_chapter_handles_admin() just
-- never selected them.
DROP FUNCTION IF EXISTS public.my_chapter_handles_admin();
CREATE OR REPLACE FUNCTION public.my_chapter_handles_admin()
RETURNS TABLE (
  id                 uuid,
  chapter_id         uuid,
  chapter_name       text,
  platform           text,
  label              text,
  handle             text,
  url                text,
  member_count       int,
  count_as_of        date,
  expires_at         timestamptz,
  joined_via_portal  bigint,
  can_write          boolean,
  published_by_name  text,
  published_at       timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT sh.id, sh.chapter_id, cl.name, sh.platform::text, sh.label, sh.handle, sh.url,
         sh.member_count, sh.count_as_of, sh.expires_at,
         (SELECT count(*) FROM public.social_handle_joins j WHERE j.handle_id = sh.id),
         public.can_write_chapter(sh.chapter_id),
         p.full_name, sh.created_at
    FROM public.social_handles sh
    JOIN public.chapters cl ON cl.id = sh.chapter_id
    LEFT JOIN public.profiles p ON p.id = sh.created_by
   WHERE sh.scope = 'chapter'
     AND sh.is_active
     AND (public.is_admin() OR sh.chapter_id = ANY (public.my_chapter_ids())
          OR sh.country = ANY (public.my_countries()))
   ORDER BY cl.name, sh.sort_order, sh.label;
$$;

REVOKE ALL ON FUNCTION public.my_chapter_handles_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_chapter_handles_admin() TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'a-links settings ready';
END $$;
