-- =====================================================================
-- 20260804230000 — national social handles
--
-- These are the party's real, public accounts, and they go in a
-- migration because they are the same in every environment.
--
-- CHAPTER HANDLES ARE NOT SEEDED HERE
--   A WhatsApp group link is a live invite that admits whoever holds it.
--   Inventing one would either 404 or, worse, point somewhere real that
--   nobody vetted. Chapter leads add their own — that is precisely the
--   ownership split this table was built around. Placeholder chapter
--   rows for staging live in supabase/seeds/staging_handles.sql.
--
-- The wing's own site is included so Local Connect and the footer can
-- both read their links from one place rather than hard-coding them.
-- =====================================================================

INSERT INTO public.social_handles
  (scope, platform, label, url, handle, description, sort_order)
VALUES
  ('national', 'x',         'YSR Congress Party',
   'https://x.com/YSRCParty', '@YSRCParty',
   'Official party account', 10),

  ('national', 'facebook',  'YSR Congress Party',
   'https://www.facebook.com/YSRCongressParty', 'YSRCongressParty',
   'Official party page', 20),

  ('national', 'youtube',   'YSR Congress Party',
   'https://www.youtube.com/@YSRCongressParty', '@YSRCongressParty',
   'Speeches, campaigns and live streams', 30),

  ('national', 'instagram', 'YSR Congress Party',
   'https://www.instagram.com/ysrcongressparty/', 'ysrcongressparty',
   'Official party account', 40),

  ('national', 'website',   'YSRCP NRI Wing',
   'https://www.ysrcpnriwing.org', NULL,
   'This site', 50),

  ('national', 'website',   'YSR Congress Party',
   'https://www.ysrcparty.com', NULL,
   'Party website', 60)
ON CONFLICT DO NOTHING;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n
    FROM public.social_handles WHERE scope = 'national';
  IF n < 6 THEN
    RAISE EXCEPTION 'expected at least 6 national handles, % landed', n;
  END IF;
  RAISE NOTICE 'national handles: %', n;
END $$;
