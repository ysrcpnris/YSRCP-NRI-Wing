-- =====================================================================
-- READ-ONLY audit of production constituency values.
--
-- Nothing is installed and nothing is written. Safe to run on prod.
--
-- Looks for values damaged by the unanchored normalizeAssembly regex
--   value.replace(/assembly constituency|ac/i, "")
-- which ran when a profile was loaded INTO the edit form, so saving
-- wrote the mangled value back:
--     Achanta      -> hanta
--     Macherla     -> Mherla
--     Mandalapalle -> apalle   (normalizeMandal, same flaw)
-- =====================================================================

-- 1. THE SMOKING GUN: values that become a real constituency when the
--    stripped 'ac' is put back. These are almost certainly corrupted.
WITH known AS (
  SELECT unnest(ARRAY[
    'Achanta','Macherla','Chandragiri','Pathapatnam','Palakonda',
    'Rajampet','Piduguralla','Darsi','Kaikaluru','Bhimavaram',
    'Nagari','Satyavedu','Kavali','Atmakur','Udayagiri'
  ]) AS name
)
SELECT 'LIKELY CORRUPTED' AS finding,
       p.assembly_constituency AS stored_value,
       k.name                  AS probably_meant,
       count(*)                AS members
  FROM public.profiles p
  JOIN known k
    ON lower(k.name) <> lower(p.assembly_constituency)
   AND (
     -- stored value + 'ac' reinserted anywhere == a real name
     lower(replace(k.name, 'ac', '')) = lower(btrim(p.assembly_constituency))
   )
 WHERE p.assembly_constituency IS NOT NULL
   AND btrim(p.assembly_constituency) <> ''
 GROUP BY 1, 2, 3

UNION ALL

-- 2. Same test for mandal.
SELECT 'LIKELY CORRUPTED MANDAL',
       p.mandal,
       m.name,
       count(*)
  FROM public.profiles p
  JOIN (SELECT unnest(ARRAY[
          'Mandalapalle','Mandapeta','Mandasa','Chintalapudi'
        ]) AS name) m
    ON lower(m.name) <> lower(p.mandal)
   AND lower(replace(m.name, 'mandal', '')) = lower(btrim(p.mandal))
 WHERE p.mandal IS NOT NULL AND btrim(p.mandal) <> ''
 GROUP BY 1, 2, 3

UNION ALL

-- 3. Anything suspiciously short — a real constituency name is never
--    fewer than 4 characters, so these are worth eyeballing whatever
--    the cause.
SELECT 'SUSPICIOUSLY SHORT',
       p.assembly_constituency,
       NULL,
       count(*)
  FROM public.profiles p
 WHERE p.assembly_constituency IS NOT NULL
   AND length(btrim(p.assembly_constituency)) BETWEEN 1 AND 4
 GROUP BY 1, 2, 3

 ORDER BY 1, 4 DESC;
