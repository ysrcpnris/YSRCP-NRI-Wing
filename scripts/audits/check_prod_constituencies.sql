-- =====================================================================
-- READ-ONLY audit of production constituency and mandal values.
--
-- SELF-CONTAINED ON PURPOSE. It reads only public.profiles, which
-- production already has. An earlier version joined ap_constituencies,
-- ap_mandals and ap_constituency_aliases — all introduced by
-- post-cutoff migrations — so following the documented order (audit
-- FIRST, then migrate) would have failed with "relation does not
-- exist". The audit has to run on production as it stands today.
--
-- WHAT IT LOOKS FOR
--   The unanchored normalizeAssembly regex ran when a profile was
--   loaded INTO the edit form, so saving wrote its own corruption back:
--
--     value.replace(/assembly constituency|ac/i, "")
--     'Achanta'   -> 'hanta'
--     'Macherla'  -> 'Mherla'
--
--   The regex is fixed. That stops new corruption and repairs nothing
--   already stored, which is what this is for.
--
-- THE EMBEDDED LIST IS NOT A GUESS
--   These are exactly the constituencies out of the real 175 whose
--   lowercased name contains 'ac' — the only ones that regex could
--   damage. Generated from ap_constituencies on staging:
--     select name from ap_constituencies where position('ac' in lower(name)) > 0;
--   Seven of 175. Every other seat is untouchable by that pattern.
--
--   An earlier version wrote lower(replace(name,'ac','')). replace() is
--   case-SENSITIVE, so 'Achanta' (capital A, then 'c') contains no
--   lowercase 'ac' and passed through unchanged — the headline example
--   could never match. Lowercase first, then strip.
-- =====================================================================

WITH corruptible(name) AS (
  VALUES ('Achanta','Macherla','Machilipatnam','Palacole','Ramachandrapuram','Rampachodavaram','Rayachoti')
),
damaged AS (
  SELECT c.name AS probably_meant,
         replace(lower(c.name), 'ac', '') AS corrupted_form
    FROM corruptible c
)
SELECT 'LIKELY CORRUPTED' AS finding,
       p.assembly_constituency AS stored_value,
       d.probably_meant,
       count(*)                AS members
  FROM public.profiles p
  JOIN damaged d
    ON lower(btrim(p.assembly_constituency)) = d.corrupted_form
 WHERE p.assembly_constituency IS NOT NULL
   AND btrim(p.assembly_constituency) <> ''
 GROUP BY 1, 2, 3

UNION ALL

-- Advisory. Verified false positives on staging: 'Tuni' and 'Undi' are
-- genuine four-letter constituencies.
SELECT 'SUSPICIOUSLY SHORT (advisory)',
       p.assembly_constituency, NULL, count(*)
  FROM public.profiles p
 WHERE p.assembly_constituency IS NOT NULL
   AND length(btrim(p.assembly_constituency)) BETWEEN 1 AND 4
 GROUP BY 1, 2, 3

UNION ALL

-- Mandal, same pattern via normalizeMandal. No canonical list is
-- embedded because no seeded mandal contains the substring 'mandal';
-- this catches the shape directly instead.
SELECT 'POSSIBLE MANDAL DAMAGE',
       p.mandal, NULL, count(*)
  FROM public.profiles p
 WHERE p.mandal IS NOT NULL
   AND btrim(p.mandal) <> ''
   AND length(btrim(p.mandal)) <= 6
 GROUP BY 1, 2, 3

 ORDER BY 1, 4 DESC;
