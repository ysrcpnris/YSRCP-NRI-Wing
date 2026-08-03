-- =====================================================================
-- 20260804160000 — constituency aliases, so Local Connect can match
--
-- THE PROBLEM
--   leader_assignments.constituency is free text written by whoever
--   entered the leader. 153 of its 177 distinct values match the
--   canonical list; 24 do not:
--     Palamaneru/Palamaner   Gunthakal/Guntakal   Ponnur/Ponnuru
--     Nandyala/Nandyal       Rayachoty/Rayachoti  Pulivendula/Pulivendla
--     Tadipatri, Ichapuram, Anaparthi, Bheemili, Railway Kodur, …
--
--   Every one of those is a member whose constituency HAS an assembly
--   coordinator, who would be told nobody is assigned to them. Local
--   Connect is the feature; a name mismatch silently empties it.
--
-- WHY ALIASES AND NOT A RENAME
--   The canonical names are the ECI's and must stay that way — reports,
--   EPIC lookups and any future official import all key off them.
--   Aliases add the spellings the world actually uses without moving
--   the anchor.
--
-- TWO THAT A FUZZY MATCH WOULD GET WRONG
--   'P. Gannavaram' is the KONASEEMA seat (46). Plain 'Gannavaram' is
--   the KRISHNA seat (71). The prefix is the only thing separating two
--   real, different constituencies — nearest-string-match would send
--   Konaseema's members to a Krishna coordinator. Same shape for
--   'Prathipadu (SC)', which is Kakinada's (36), not Guntur's (93).
--   This is why levenshtein was not used to build this table.
--
-- TWO THAT ARE NOT AP SEATS AT ALL
--   'Jubilee Hills' is in Telangana. 'Srisailam' is a temple town in
--   Nandikotkur constituency, not a constituency. Both are left
--   unmapped deliberately — inventing a match would be worse than the
--   honest "no coordinator listed" the UI already handles.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.ap_constituency_aliases (
  alias           text PRIMARY KEY,
  constituency_id int NOT NULL REFERENCES public.ap_constituencies(id) ON DELETE CASCADE,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ap_constituency_aliases IS
  'Alternate spellings seen in real data, mapped to canonical ECI '
  'constituencies. Add rows here rather than renaming ap_constituencies.';

ALTER TABLE public.ap_constituency_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS alias_read ON public.ap_constituency_aliases;
CREATE POLICY alias_read ON public.ap_constituency_aliases
  FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.ap_constituency_aliases (alias, constituency_id, note) VALUES
  ('Palamaneru',        174, 'leader_assignments spelling'),
  ('Gunthakal',         150, 'leader_assignments spelling'),
  ('Parchuru',          104, 'leader_assignments spelling'),
  ('Chinthalapudi',      68, 'leader_assignments spelling'),
  ('Nuzivid',            73, 'Nuzvid'),
  ('Ponnur',             88, 'Ponnuru'),
  ('Ichapuram',           1, 'Ichchapuram'),
  ('Bheemili',           20, 'Bhimili'),
  ('Chilakaluripeta',    96, 'Chilakaluripet'),
  ('Railway Kodur',     127, 'Kodur — known locally as Railway Kodur'),
  ('Anaparthi',          40, 'Anaparthy'),
  ('Nandyala',          143, 'Nandyal'),
  ('Rajampeta',         125, 'Rajampet'),
  ('Pulivendula',       129, 'Pulivendla'),
  ('Araku',              28, 'Araku Valley'),
  ('Payakaraopeta',      33, 'Payakaraopet'),
  ('Ananthapur Urban',  153, 'Anantapur Urban'),
  ('Sattenapalli',       98, 'Sattenapalle'),
  ('Narasaraopeta',      97, 'Narasaraopet'),
  ('Rayachoty',         128, 'Rayachoti'),
  ('Tadipatri',         152, 'Tadpatri'),
  ('Nagari (P)',        170, 'Nagari'),
  -- The two that disambiguate rather than correct:
  ('P. Gannavaram',      46, 'Konaseema seat — NOT Gannavaram (71) in Krishna'),
  ('Prathipadu (SC)',    36, 'Kakinada seat — NOT Prathipadu (93) in Guntur')
ON CONFLICT (alias) DO UPDATE
  SET constituency_id = EXCLUDED.constituency_id, note = EXCLUDED.note;

-- Resolve any spelling to a canonical constituency. Exact match wins,
-- then case-insensitive, then the alias table — so a correct name never
-- pays for the alias lookup and never risks being overridden by one.
CREATE OR REPLACE FUNCTION public.resolve_constituency(p_name text)
RETURNS int
LANGUAGE sql STABLE
AS $$
  SELECT id FROM public.ap_constituencies WHERE name = btrim(p_name)
  UNION ALL
  SELECT id FROM public.ap_constituencies
   WHERE lower(name) = lower(btrim(p_name))
  UNION ALL
  SELECT constituency_id FROM public.ap_constituency_aliases
   WHERE lower(alias) = lower(btrim(p_name))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_constituency(text) TO anon, authenticated;

DO $$
DECLARE unresolved int;
BEGIN
  SELECT count(*) INTO unresolved FROM (
    SELECT DISTINCT constituency FROM public.leader_assignments
     WHERE constituency IS NOT NULL AND constituency <> ''
       AND public.resolve_constituency(constituency) IS NULL) u;
  -- Jubilee Hills (Telangana) and Srisailam (not a constituency) are the
  -- two expected leftovers.
  IF unresolved > 2 THEN
    RAISE EXCEPTION '% leader constituencies still unresolved', unresolved;
  END IF;
  RAISE NOTICE 'leader constituencies resolve: % unmappable (expected 2)', unresolved;
END $$;
