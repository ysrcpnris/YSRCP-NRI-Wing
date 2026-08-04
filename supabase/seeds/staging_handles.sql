-- =====================================================================
-- staging_handles.sql — PLACEHOLDER chapter handles, staging only
--
-- DO NOT RUN THIS AGAINST PRODUCTION.
--
-- Every URL here points at example.com and admits nobody. Real chapter
-- handles are added by chapter leads through the admin UI, because a
-- WhatsApp invite link is a live credential — inventing one would
-- either 404 or point at a real group nobody vetted.
--
-- The member counts are invented too, which is exactly why the column
-- is paired with count_as_of: the screen shows "≈120 members, as of
-- 12 Jul 2026" rather than implying it is live. WhatsApp exposes no
-- group-size API, so even in production this number is someone typing
-- what they last saw.
-- =====================================================================

DO $$
DECLARE real_profiles int;
BEGIN
  SELECT count(*) INTO real_profiles
    FROM public.profiles WHERE email NOT LIKE '%@example.test';
  IF real_profiles > 100 THEN
    RAISE EXCEPTION
      'refusing to seed placeholder handles: % real profiles present',
      real_profiles;
  END IF;
END $$;

INSERT INTO public.social_handles
  (scope, platform, label, url, handle, chapter_id, country,
   member_count, count_as_of, description, sort_order)
SELECT
  'chapter',
  v.platform::public.handle_platform,
  format(v.label_fmt, c.name),
  format('https://example.com/placeholder/%s/%s',
         lower(replace(replace(c.name, ' ', '-'), '—', '')), v.platform),
  NULL,
  c.id,
  c.country,
  v.member_count,
  DATE '2026-07-12',
  v.description,
  v.sort_order
FROM public.chapters c
CROSS JOIN (VALUES
  ('whatsapp', '%s — Members Group',    240, 'Main chapter group',            10),
  ('whatsapp', '%s — Events & Meetups', 130, 'Local events and volunteering', 20),
  ('x',        '%s Chapter',            NULL,'Chapter account',               30)
) AS v(platform, label_fmt, member_count, description, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.social_handles sh
   WHERE sh.chapter_id = c.id AND sh.sort_order = v.sort_order
);

DO $$
DECLARE n int; chapters int;
BEGIN
  SELECT count(*), count(DISTINCT chapter_id) INTO n, chapters
    FROM public.social_handles WHERE scope = 'chapter';
  RAISE NOTICE 'placeholder handles: % across % chapters', n, chapters;
END $$;
