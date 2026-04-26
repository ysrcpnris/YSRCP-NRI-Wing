-- =====================================================================
-- ACTIVE FAMILY MEMBER (one per profile, optional)
--
-- Stored as flat columns on `profiles` because each user has at most one
-- "active family member in the party". Going with a separate table would
-- be overkill for a single optional record per user.
--
-- All columns nullable — only filled when the user identifies as an
-- active member.
-- =====================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS family_relation    text,    -- Father / Mother / Brother / Sister / Uncle / Cousin / Others
  ADD COLUMN IF NOT EXISTS family_name        text,
  ADD COLUMN IF NOT EXISTS family_mobile      text,
  ADD COLUMN IF NOT EXISTS family_village     text,
  ADD COLUMN IF NOT EXISTS family_designation text;

-- Optional: enforce the relation dropdown's allowed values at the DB.
-- Uses NOT VALID + VALIDATE so any pre-existing junk data won't block
-- the migration; the constraint applies cleanly going forward.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'profiles_family_relation_check'
       AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_family_relation_check
      CHECK (
        family_relation IS NULL
        OR family_relation IN ('Father','Mother','Brother','Sister','Uncle','Cousin','Others')
      ) NOT VALID;

    BEGIN
      ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_family_relation_check;
    EXCEPTION WHEN check_violation THEN
      -- Unknown legacy values: null them out, then validate.
      UPDATE public.profiles
         SET family_relation = NULL
       WHERE family_relation IS NOT NULL
         AND family_relation NOT IN ('Father','Mother','Brother','Sister','Uncle','Cousin','Others');
      ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_family_relation_check;
    END;
  END IF;
END $$;
