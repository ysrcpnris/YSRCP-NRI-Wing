-- =====================================================================
-- 20260803120000 — Andhra Pradesh administrative hierarchy
--
-- WHY
--   Onboarding asks for constituency and mandal, and Local Connect
--   matches a member to their MLA and mandal president. Both are free
--   text today, and the production export shows what that costs:
--
--     assembly_constituency   2,429 filled   240 distinct  (175 exist)
--     mandal                  1,523 filled   722 distinct
--
--   So ~65 constituency values are misspellings or wrong entries, and
--   mandal is worse. Nothing can be matched reliably against that.
--
-- SHAPE
--   district → constituency → mandal → village
--
--   A constituency belongs to exactly one district, so district is
--   DERIVED and never asked at signup. Mandal names are NOT unique
--   across the state — "Atmakur" is a mandal in Nandyal, Srisailam and
--   Anantapur Urban — so mandal is keyed by constituency, never alone.
--
-- WHAT THIS FILE DOES NOT DO
--   It creates the tables and leaves them empty. Seeding all 26
--   districts / 175 constituencies / ~670 mandals is a separate data
--   task, and inventing rows here would be worse than none.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Districts
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ap_districts (
  id          smallint     PRIMARY KEY,
  name        text         NOT NULL UNIQUE,
  name_te     text,                                   -- Telugu label
  region      text         CHECK (region IN ('Coastal Andhra','Rayalaseema')),
  is_active   boolean      NOT NULL DEFAULT true,
  created_at  timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ap_districts IS
  'The 26 districts of Andhra Pradesh after the 2022 reorganisation. '
  'Reference data — read by everyone, written by the secretariat only.';

-- ---------------------------------------------------------------------
-- Assembly constituencies
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ap_constituencies (
  id            smallint    PRIMARY KEY,              -- ECI constituency number 1..175
  name          text        NOT NULL,
  name_te       text,
  district_id   smallint    NOT NULL REFERENCES public.ap_districts(id),
  is_reserved   text        CHECK (is_reserved IN ('SC','ST')),  -- null = general
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, district_id)
);

CREATE INDEX IF NOT EXISTS ap_constituencies_district_idx
  ON public.ap_constituencies (district_id);

-- Typing "nandy" or "kurnool" must both find Nandyal, so the search
-- index covers the constituency name and its district name together.
CREATE INDEX IF NOT EXISTS ap_constituencies_search_idx
  ON public.ap_constituencies USING gin (to_tsvector('simple', name));

COMMENT ON TABLE public.ap_constituencies IS
  '175 assembly constituencies. id is the Election Commission number. '
  'district_id makes district derivable — onboarding never asks for it.';

-- ---------------------------------------------------------------------
-- Mandals
--   Name is unique only WITHIN a constituency. Atmakur exists in
--   Nandyal, Srisailam and Anantapur Urban as three different places.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ap_mandals (
  id                bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name              text        NOT NULL,
  name_te           text,
  constituency_id   smallint    NOT NULL REFERENCES public.ap_constituencies(id),
  is_municipality   boolean     NOT NULL DEFAULT false,
  is_active         boolean     NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, constituency_id)
);

CREATE INDEX IF NOT EXISTS ap_mandals_constituency_idx
  ON public.ap_mandals (constituency_id);

COMMENT ON TABLE public.ap_mandals IS
  'Mandals and municipalities, keyed by constituency. Names repeat across '
  'the state — never look a mandal up by name alone.';

-- ---------------------------------------------------------------------
-- Villages — optional everywhere, so kept deliberately thin
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ap_villages (
  id           bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name         text        NOT NULL,
  name_te      text,
  mandal_id    bigint      NOT NULL REFERENCES public.ap_mandals(id),
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, mandal_id)
);

CREATE INDEX IF NOT EXISTS ap_villages_mandal_idx
  ON public.ap_villages (mandal_id);

-- =====================================================================
-- RLS — reference data. Everyone reads, including anonymous visitors,
-- because the signup form needs it before an account exists. Only
-- admins write.
-- =====================================================================
ALTER TABLE public.ap_districts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ap_constituencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ap_mandals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ap_villages       ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['ap_districts','ap_constituencies','ap_mandals','ap_villages']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl||'_read', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (is_active)',
      tbl||'_read', tbl);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl||'_admin_write', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
      'USING (public.is_admin()) WITH CHECK (public.is_admin())',
      tbl||'_admin_write', tbl);
  END LOOP;
END $$;

GRANT SELECT ON public.ap_districts, public.ap_constituencies,
                public.ap_mandals, public.ap_villages TO anon, authenticated;

-- =====================================================================
-- Search RPC for the onboarding type-ahead.
--
-- Matches on constituency OR district name, so a member who remembers
-- "somewhere in Kurnool" gets there without knowing the constituency.
-- SECURITY DEFINER is deliberate: anonymous visitors must be able to
-- call this from the signup form.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.search_constituencies(q text)
RETURNS TABLE (
  constituency_id   smallint,
  constituency      text,
  district          text,
  district_id       smallint,
  mandal_count      bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT c.id, c.name, d.name, d.id,
         (SELECT count(*) FROM public.ap_mandals m
           WHERE m.constituency_id = c.id AND m.is_active)
  FROM public.ap_constituencies c
  JOIN public.ap_districts d ON d.id = c.district_id
  WHERE c.is_active
    AND (
      q IS NULL OR btrim(q) = ''
      OR c.name ILIKE '%' || btrim(q) || '%'
      OR d.name ILIKE '%' || btrim(q) || '%'
    )
  ORDER BY
    -- exact prefix match first, so "nandy" puts Nandyal above
    -- constituencies that merely sit in a matching district
    (c.name ILIKE btrim(q) || '%') DESC,
    c.name
  LIMIT 20;
$fn$;

GRANT EXECUTE ON FUNCTION public.search_constituencies(text) TO anon, authenticated;

COMMENT ON FUNCTION public.search_constituencies(text) IS
  'Type-ahead for the signup form. Searches constituency and district '
  'names. Returns mandal_count so the UI can say "6 mandals in Nandyal".';
