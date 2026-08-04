-- =====================================================================
-- 20260805230000 — the two fields the prototype needs and the schema lacks
--
-- docs/design/nri-wing-prototype.html is the design source. Its My Profile
-- screen needs two things the schema cannot express:
--
-- (1) contribution_areas text[]
--     "Areas you can help with" is a MULTI-select (Social Media /
--     Technology / Political) sitting beside a separate free-text box.
--     `contribution` is one text column, so it can hold one or the other,
--     not both. Serialising a list into it would make the prototype's own
--     stated purpose — "when a campaign needs fifty people who can run
--     social media in Telugu, this is the only way to find them quickly" —
--     a LIKE scan over prose. An array answers it with `&&`.
--
-- (2) voter_constituency text
--     The prototype asks for a constituency TWICE, and they are different
--     questions: "Registered constituency" under the voter roll is where
--     the member VOTES; "Assembly constituency" under Your place in AP is
--     where they are FROM. Binding both to assembly_constituency would let
--     the voter-roll answer silently overwrite 136 rows of live data.
--
--     native_constituency was the obvious candidate and is deliberately
--     NOT reused: it is from the 2024 foundation migration, holds zero
--     rows, is referenced nowhere but a TypeScript type, and its name
--     means the opposite of what this field records.
--
-- PRIVILEGE, WHICH IS THE PART THAT BITES
--   A new column is NOT covered by the existing grants. SELECT and UPDATE
--   on profiles were built by EXCLUSION (20260804094500, 20260805111000):
--   the table grant was revoked and the permitted columns named one by
--   one. So a column added later is unreadable and unwritable until it is
--   named — and conversely, forgetting to withhold one leaks it.
--
--   contribution_areas  -> granted. Ordinary member-editable data.
--   voter_constituency  -> withheld. It is voter-roll data, the same
--                          class as has_vote and epic_number, and it
--                          feeds the admin Voter Coverage screen. It goes
--                          through my_private_profile() like the rest.
-- =====================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contribution_areas text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS voter_constituency text;

COMMENT ON COLUMN public.profiles.contribution_areas IS
  'Multi-select: how the member can help. Queried with && by organisers.';
COMMENT ON COLUMN public.profiles.voter_constituency IS
  'RESTRICTED. Where the member is registered to VOTE — distinct from '
  'assembly_constituency, which is where they are from.';

-- ── grants ───────────────────────────────────────────────────────────
GRANT SELECT (contribution_areas), UPDATE (contribution_areas)
  ON public.profiles TO authenticated;
-- voter_constituency: no grant. Deliberate.

-- ── the guard must restore the new restricted column ─────────────────
CREATE OR REPLACE FUNCTION public.guard_privileged_profile_columns()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.is_admin()
     OR current_setting('role', true) = 'service_role'
     OR coalesce(current_setting('app.private_profile_write', true), '') = '1' THEN
    RETURN NEW;
  END IF;

  NEW.role                    := OLD.role;
  NEW.status                  := OLD.status;
  NEW.email                   := OLD.email;
  NEW.referral_code           := OLD.referral_code;
  NEW.referred_by             := OLD.referred_by;
  NEW.public_user_code        := OLD.public_user_code;
  NEW.epic_number             := OLD.epic_number;
  NEW.has_vote                := OLD.has_vote;
  NEW.voter_constituency      := OLD.voter_constituency;
  NEW.onboarding_completed_at := OLD.onboarding_completed_at;
  NEW.dob                     := OLD.dob;
  NEW.family_relation         := OLD.family_relation;
  NEW.family_name             := OLD.family_name;
  NEW.family_mobile           := OLD.family_mobile;
  NEW.family_village          := OLD.family_village;
  NEW.family_designation      := OLD.family_designation;

  RETURN NEW;
END $$;

-- ── read channel. RETURNS TABLE cannot be widened in place ───────────
DROP FUNCTION IF EXISTS public.my_private_profile();
CREATE FUNCTION public.my_private_profile()
RETURNS TABLE (
  dob                text,
  family_relation    text,
  family_name        text,
  family_mobile      text,
  family_village     text,
  family_designation text,
  has_vote           boolean,
  epic_number        text,
  voter_constituency text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.dob, p.family_relation, p.family_name, p.family_mobile,
         p.family_village, p.family_designation, p.has_vote, p.epic_number,
         p.voter_constituency
    FROM public.profiles p
   WHERE p.id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.my_private_profile() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_private_profile() TO authenticated;

-- ── write channel. Drop the old signature rather than overload it:
--    every parameter has a default, so two signatures would make every
--    call ambiguous (42725).
DROP FUNCTION IF EXISTS public.update_my_private_profile(
  text, text, text, text, text, text, boolean, text, boolean, boolean);

CREATE FUNCTION public.update_my_private_profile(
  p_dob                text    DEFAULT NULL,
  p_family_relation    text    DEFAULT NULL,
  p_family_name        text    DEFAULT NULL,
  p_family_mobile      text    DEFAULT NULL,
  p_family_village     text    DEFAULT NULL,
  p_family_designation text    DEFAULT NULL,
  p_has_vote           boolean DEFAULT NULL,
  p_epic_number        text    DEFAULT NULL,
  p_voter_constituency text    DEFAULT NULL,
  p_clear_dob          boolean DEFAULT false,
  p_clear_family       boolean DEFAULT false,
  p_clear_voter        boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  PERFORM set_config('app.private_profile_write', '1', true);

  UPDATE public.profiles p
     SET dob                = CASE WHEN p_clear_dob THEN NULL
                                   ELSE coalesce(nullif(btrim(p_dob), ''), p.dob) END,
         family_relation    = CASE WHEN p_clear_family THEN NULL
                                   ELSE coalesce(nullif(btrim(p_family_relation), ''), p.family_relation) END,
         family_name        = CASE WHEN p_clear_family THEN NULL
                                   ELSE coalesce(nullif(btrim(p_family_name), ''), p.family_name) END,
         family_mobile      = CASE WHEN p_clear_family THEN NULL
                                   ELSE coalesce(nullif(btrim(p_family_mobile), ''), p.family_mobile) END,
         family_village     = CASE WHEN p_clear_family THEN NULL
                                   ELSE coalesce(nullif(btrim(p_family_village), ''), p.family_village) END,
         family_designation = CASE WHEN p_clear_family THEN NULL
                                   ELSE coalesce(nullif(btrim(p_family_designation), ''), p.family_designation) END,
         has_vote           = coalesce(p_has_vote, p.has_vote),
         epic_number        = CASE WHEN p_clear_voter THEN NULL
                                   ELSE coalesce(nullif(btrim(p_epic_number), ''), p.epic_number) END,
         voter_constituency = CASE WHEN p_clear_voter THEN NULL
                                   ELSE coalesce(nullif(btrim(p_voter_constituency), ''), p.voter_constituency) END
   WHERE p.id = auth.uid();

  PERFORM set_config('app.private_profile_write', '0', true);
  RETURN FOUND;
END $$;

REVOKE ALL ON FUNCTION public.update_my_private_profile(
  text, text, text, text, text, text, boolean, text, text, boolean, boolean, boolean)
  FROM public, anon;
GRANT EXECUTE ON FUNCTION public.update_my_private_profile(
  text, text, text, text, text, text, boolean, text, text, boolean, boolean, boolean)
  TO authenticated;

-- ── assert what actually landed, not that the statements ran ─────────
DO $$
DECLARE leaked text; missing text;
BEGIN
  -- SELECT and UPDATE are the boundary, and the only two checked here.
  --
  -- INSERT and REFERENCES are NOT checked, and the first draft of this
  -- assertion failed because it did check them. They come from the
  -- table-level INSERT grant that signup needs, so they cover every
  -- column — epic_number carries them too. Asserting their absence
  -- demands something that has never been true of any restricted column
  -- on this table, which would have made the migration unrunnable while
  -- proving nothing about the boundary that matters.
  --
  -- Verified while fixing it: even an ADMIN gets 403 selecting
  -- epic_number over PostgREST, because column SELECT is revoked from
  -- `authenticated` outright. Admin screens go through
  -- admin_member_list(). voter_constituency now matches that shape.
  SELECT string_agg(privilege_type, ',') INTO leaked
    FROM information_schema.column_privileges
   WHERE table_schema='public' AND table_name='profiles'
     AND grantee='authenticated' AND column_name='voter_constituency'
     AND privilege_type IN ('SELECT','UPDATE');
  IF leaked IS NOT NULL THEN
    RAISE EXCEPTION 'voter_constituency is reachable by authenticated: %', leaked;
  END IF;

  SELECT string_agg(p.t, ',') INTO missing
    FROM (VALUES ('SELECT'),('UPDATE')) AS p(t)
   WHERE NOT EXISTS (
     SELECT 1 FROM information_schema.column_privileges
      WHERE table_schema='public' AND table_name='profiles'
        AND grantee='authenticated' AND column_name='contribution_areas'
        AND privilege_type = p.t);
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'contribution_areas is missing grants: %', missing;
  END IF;

  RAISE NOTICE 'contribution_areas granted; voter_constituency withheld';
END $$;
