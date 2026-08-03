-- =====================================================================
-- 20260804150000 — correct two errors in the seeded constituency list
--
-- Found while seeding mandals: 'Allagadda' had no matching constituency,
-- so its five mandals were silently dropped by the ON CONFLICT clause.
--
-- CAUSE
--   The list in 20260803123000 contained both 'Emmiganur' (136) and
--   'Yemmiganur' (142). Those are two spellings of ONE constituency —
--   Yemmiganur in Kurnool district. The duplicate occupied a slot,
--   the count came to 175, the verification block passed, and Allagadda
--   was never entered at all.
--
--   Worth noting the check that did not catch this: counting to 175 says
--   nothing about whether the right 175 are present. A count is not a
--   validation.
--
-- FIX
--   136 becomes Allagadda (Kurnool), which is its correct ECI number.
--   142 remains Yemmiganur. Mandals seeded for Allagadda in
--   20260804140000 are re-applied here, since they were dropped.
--
-- NOT AN ERROR, deliberately left alone:
--   Gannavaram appears twice (46 Konaseema, 71 Krishna) and Prathipadu
--   twice (36 Kakinada, 93 Guntur). Those are genuinely distinct
--   constituencies that share a name — exactly why ap_mandals is keyed
--   by constituency_id and never by name.
-- =====================================================================

UPDATE public.ap_constituencies
   SET name        = 'Allagadda',
       district_id = (SELECT id FROM public.ap_districts WHERE name = 'Kurnool')
 WHERE id = 136;

-- Allagadda's mandals, dropped when the constituency was missing.
INSERT INTO public.ap_mandals (name, constituency_id)
SELECT m.name, c.id
  FROM (VALUES ('Allagadda'),('Chagalamarri'),('Dornipadu'),
               ('Rudravaram'),('Uyyalawada')) AS m(name)
  CROSS JOIN public.ap_constituencies c
 WHERE c.name = 'Allagadda'
ON CONFLICT (name, constituency_id) DO NOTHING;

-- A real validation this time: every constituency name must be unique
-- WITHIN its district. That permits Gannavaram in two districts and
-- forbids one district holding two spellings of the same seat, which is
-- the mistake this migration exists to correct.
DO $$
DECLARE dup int; missing int;
BEGIN
  SELECT count(*) INTO dup FROM (
    SELECT name, district_id FROM public.ap_constituencies
     GROUP BY name, district_id HAVING count(*) > 1) d;
  IF dup > 0 THEN
    RAISE EXCEPTION '% constituency names repeat within a single district', dup;
  END IF;

  SELECT count(*) INTO missing FROM (
    SELECT generate_series(1,175) AS id
    EXCEPT SELECT id FROM public.ap_constituencies) g;
  IF missing > 0 THEN
    RAISE EXCEPTION '% ECI numbers have no constituency', missing;
  END IF;

  RAISE NOTICE 'constituency list validated: 175 seats, no intra-district duplicates';
END $$;
