-- =====================================================================
-- READ-ONLY audit of production constituency and mandal values.
--
-- Nothing is installed and nothing is written. Safe to run on prod.
--
-- Finds values damaged by the unanchored normalizeAssembly regex, which
-- ran when a profile was loaded INTO the edit form — so saving wrote
-- the mangled value back:
--
--     value.replace(/assembly constituency|ac/i, "")
--     'Achanta'       -> 'hanta'
--     'Macherla'      -> 'Mherla'
--     'Mandalapalle'  -> 'apalle'   (normalizeMandal, same flaw)
--
-- WHY THE EARLIER VERSION FOUND NOTHING
--   It compared lower(replace(name, 'ac', '')). replace() is
--   case-SENSITIVE, so 'Achanta' (capital A, then 'c') contains no
--   lowercase 'ac' and came through untouched — the headline example
--   could never match. Lowercase first, then strip.
--
-- It also used a hardcoded list of a dozen names. This version derives
-- from ap_constituencies (all 175) and ap_mandals, so it covers every
-- real place rather than the ones I happened to think of.
-- =====================================================================

-- 1. THE SIGNAL: a stored value that becomes a real constituency when
--    the stripped 'ac' is restored.
SELECT 'LIKELY CORRUPTED CONSTITUENCY' AS finding,
       p.assembly_constituency          AS stored_value,
       c.name                           AS probably_meant,
       count(*)                         AS members
  FROM public.profiles p
  JOIN public.ap_constituencies c
    ON replace(lower(c.name), 'ac', '') = lower(btrim(p.assembly_constituency))
   AND lower(c.name) <> lower(btrim(p.assembly_constituency))
 WHERE p.assembly_constituency IS NOT NULL
   AND btrim(p.assembly_constituency) <> ''
 GROUP BY 1, 2, 3

UNION ALL

-- 2. Same test for mandal, against every seeded mandal.
SELECT 'LIKELY CORRUPTED MANDAL',
       p.mandal, m.name, count(*)
  FROM public.profiles p
  JOIN public.ap_mandals m
    ON replace(lower(m.name), 'mandal', '') = lower(btrim(p.mandal))
   AND lower(m.name) <> lower(btrim(p.mandal))
 WHERE p.mandal IS NOT NULL AND btrim(p.mandal) <> ''
 GROUP BY 1, 2, 3

UNION ALL

-- 3. Constituencies that match nothing at all, canonical or alias.
--    Some are spelling variants worth an alias row; some are damage.
SELECT 'UNMATCHED CONSTITUENCY',
       p.assembly_constituency, NULL, count(*)
  FROM public.profiles p
 WHERE p.assembly_constituency IS NOT NULL
   AND btrim(p.assembly_constituency) <> ''
   AND NOT EXISTS (
     SELECT 1 FROM public.ap_constituencies c
      WHERE lower(btrim(c.name)) = lower(btrim(p.assembly_constituency)))
   AND NOT EXISTS (
     SELECT 1 FROM public.ap_constituency_aliases a
      WHERE lower(btrim(a.alias)) = lower(btrim(p.assembly_constituency)))
 GROUP BY 1, 2, 3

UNION ALL

-- 4. Suspiciously short. Advisory only — verified false positives on
--    staging: 'Tuni' and 'Undi' are genuine four-letter constituencies.
SELECT 'SUSPICIOUSLY SHORT (advisory)',
       p.assembly_constituency, NULL, count(*)
  FROM public.profiles p
 WHERE p.assembly_constituency IS NOT NULL
   AND length(btrim(p.assembly_constituency)) BETWEEN 1 AND 4
 GROUP BY 1, 2, 3

 ORDER BY 1, 4 DESC;
