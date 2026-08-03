-- =====================================================================
-- 20260804094500 — make the sensitive-column boundary real
--
-- WHAT THE TEST SHOWED
--   20260804091500 added a chapter_members view that omits epic_number,
--   dob and the family_* fields, on the reasoning that a column never
--   selected cannot leak. Testing it as an actual coordinator showed
--   that reasoning is incomplete:
--
--     GET /rest/v1/chapter_members?select=epic_number  -> 42703, good
--     GET /rest/v1/profiles?select=epic_number         -> RETURNED IT
--
--   RLS is row-level. Once a coordinator has scope over Germany's rows
--   they have every column of those rows, and nothing stops them
--   querying the base table instead of the view. The view was a
--   convention, not a boundary.
--
-- THE FIX
--   Postgres has column-level GRANTs. Revoke SELECT on the whole table
--   from authenticated, then grant it back column by column, leaving
--   the sensitive ones out. Now the database refuses, whatever the
--   query looks like.
--
-- WHY THE MEMBER STILL SEES THEIR OWN
--   A member editing their own EPIC number needs to read it back. That
--   goes through my_voter_details(), a SECURITY DEFINER function scoped
--   to auth.uid() — one row, always the caller's own.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Take the blanket grant away
-- ---------------------------------------------------------------------
REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;

-- ---------------------------------------------------------------------
-- 2. Give back everything except the protected columns.
--    Built dynamically so a column added later is EXCLUDED by default —
--    the safe direction. Anyone adding a sensitive field gets silence
--    rather than an accidental exposure.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  protected text[] := ARRAY[
    'epic_number',      -- government identifier
    'has_vote',         -- political opinion, GDPR Article 9
    'dob',              -- identity theft surface, not needed to organise
    'family_relation',  -- the four family_* columns describe a person who
    'family_name',      --   never signed up and cannot consent
    'family_mobile',
    'family_village',
    'family_designation'
  ];
  cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
    INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'profiles'
     AND column_name <> ALL (protected);

  EXECUTE format('GRANT SELECT (%s) ON public.profiles TO authenticated', cols);
  RAISE NOTICE 'granted SELECT on % columns, % withheld',
    array_length(string_to_array(cols, ','), 1), array_length(protected, 1);
END $$;

-- Writes are unchanged: RLS still decides which rows, and a member
-- updating their own row may set their own EPIC.
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- ---------------------------------------------------------------------
-- 3. The member's own way back in
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_voter_details()
RETURNS TABLE (has_vote boolean, epic_number text, assembly_constituency text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.has_vote, p.epic_number, p.assembly_constituency
    FROM public.profiles p
   WHERE p.id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.my_voter_details() TO authenticated;

COMMENT ON FUNCTION public.my_voter_details() IS
  'A member reading back their own voter fields. Scoped to auth.uid(), '
  'so it can only ever return one row — the caller''s.';

-- ---------------------------------------------------------------------
-- 4. And the secretariat's, since column grants apply to admins too
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_voter_rows()
RETURNS TABLE (
  id uuid, public_user_code text, full_name text, email text,
  country_of_residence text, assembly_constituency text, district text,
  has_vote boolean, epic_number text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.public_user_code, p.full_name, p.email,
         p.country_of_residence, p.assembly_constituency, p.district,
         p.has_vote, p.epic_number
    FROM public.profiles p
   WHERE public.is_admin();
$$;

GRANT EXECUTE ON FUNCTION public.admin_voter_rows() TO authenticated;

COMMENT ON FUNCTION public.admin_voter_rows() IS
  'Voter records for the secretariat. Returns nothing at all unless '
  'is_admin() — a coordinator calling it gets an empty set, not an error.';
