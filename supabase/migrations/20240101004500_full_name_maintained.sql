-- =====================================================================
-- new_45 — make profiles.full_name maintain itself
--
-- PROBLEM
--   full_name was only ever populated from signup metadata:
--       COALESCE(NEW.raw_user_meta_data->>'full_name', NULL)
--   and no member signup path sends one (/register and AuthModal both
--   send first_name + last_name only). So the column is NULL for every
--   regular member, and it never self-heals — the profile editor
--   doesn't write it either, so renaming yourself leaves it stale.
--
--   Read paths in the app mostly mask this by preferring
--   first_name + last_name and falling back, and new_40 already made
--   get_event_applicants() compose the name. The visible symptom is
--   therefore gone. What remains is that the stored column is wrong,
--   which shows up in raw DB exports and in any new query written
--   against it.
--
-- WHY A TRIGGER, NOT A GENERATED COLUMN
--   A GENERATED ALWAYS column cannot be written to, and
--   handle_new_user() inserts full_name explicitly — that INSERT would
--   start failing. Converting also means DROP + ADD, which discards the
--   existing values. A BEFORE trigger keeps every existing write path
--   working and simply overrides the value.
--
-- WHY THIS IS LOSSLESS
--   The only path that ever sent full_name is the support-team signup
--   (SupportTeamAuthPage.tsx), and it builds it as
--       [firstName, lastName].filter(Boolean).join(" ")
--   — the identical composition. No row anywhere holds a full_name
--   carrying information that first_name + last_name do not.
--
--   Note also that handle_new_user()'s reverse derivation
--       last_name := split_part(full_name, ' ', 2)
--   only ever captures the SECOND word, so a three-part name would
--   already have been truncated on the way in. Nothing to preserve.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.sync_profile_full_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Compose from the parts. If both parts are empty, keep whatever was
  -- already there rather than nulling a name we can't rebuild.
  NEW.full_name := COALESCE(
    NULLIF(TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '')), ''),
    NULLIF(TRIM(COALESCE(NEW.full_name, '')), '')
  );
  RETURN NEW;
END;
$$;

-- Fires only when a name column is actually part of the statement, so
-- ordinary profile updates (address, profession, …) skip it entirely.
DROP TRIGGER IF EXISTS trg_profiles_full_name ON public.profiles;
CREATE TRIGGER trg_profiles_full_name
  BEFORE INSERT OR UPDATE OF first_name, last_name, full_name
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_full_name();


-- =====================================================================
-- One-time backfill for existing rows.
--
-- updated_at is deliberately NOT touched: this is a derived-column
-- repair, not a change the member made, and updated_at is used to spot
-- real profile activity.
-- =====================================================================
UPDATE public.profiles
   SET full_name = NULLIF(
         TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')), '')
 WHERE NULLIF(TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')), '')
       IS DISTINCT FROM full_name;


-- =====================================================================
-- Verify
-- =====================================================================
-- Rows where full_name still disagrees with the parts — expect 0.
--   SELECT count(*) FROM public.profiles
--    WHERE NULLIF(TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')), '')
--          IS DISTINCT FROM full_name;
--
-- Rows with no usable name at all — these are the seeded placeholder
-- rows ("User change last name"), not a failure of this migration.
--   SELECT count(*) FROM public.profiles WHERE full_name IS NULL;
