-- =====================================================================
-- Enforce email uniqueness on profiles at the database level.
--
-- Why: the frontend signUp flow checks for an existing email before
-- calling auth.signUp, but the check is case-sensitive (.eq) and a
-- race or migrated user could still slip a duplicate row through.
-- The mobile_number column already has a UNIQUE index; this brings
-- email to the same standard.
--
-- Strategy:
--   1. Normalise every existing email to LOWER(TRIM(email)) so the
--      uniqueness check has clean data to work against. (The audit
--      showed zero rows currently need normalisation, but doing it
--      pre-emptively keeps the constraint safe to add.)
--   2. Add a partial UNIQUE index on LOWER(email). Partial so NULL
--      / empty values don't conflict — same pattern used for
--      mobile_number_unique.
--   3. Match the case-sensitive auth.users.email side too: set a
--      trigger that lowercases the email on every insert/update.
-- =====================================================================

-- 1. Normalise existing profile emails
UPDATE public.profiles
   SET email = LOWER(TRIM(email))
 WHERE email IS NOT NULL
   AND email <> LOWER(TRIM(email));

-- 2. Partial unique index on lower(email). Skips NULL / empty so
--    legacy rows that never had an email don't all collide.
DROP INDEX IF EXISTS profiles_email_unique;
CREATE UNIQUE INDEX profiles_email_unique
  ON public.profiles ( LOWER(email) )
  WHERE email IS NOT NULL AND email <> '';

-- 3. Trigger that auto-lowercases the email on every write. Keeps
--    the unique index correct even if the application forgets to
--    normalise before INSERT/UPDATE.
CREATE OR REPLACE FUNCTION public.profiles_normalise_email()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    NEW.email := LOWER(TRIM(NEW.email));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_normalise_email_trigger ON public.profiles;
CREATE TRIGGER profiles_normalise_email_trigger
  BEFORE INSERT OR UPDATE OF email ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_normalise_email();

DO $verify$
DECLARE
  v_dup int;
BEGIN
  SELECT COUNT(*) INTO v_dup
    FROM (
      SELECT 1
        FROM public.profiles
       WHERE email IS NOT NULL AND email <> ''
       GROUP BY LOWER(email)
       HAVING COUNT(*) > 1
    ) d;
  IF v_dup > 0 THEN
    RAISE EXCEPTION 'Cannot enforce email uniqueness: % duplicate group(s) found', v_dup;
  END IF;
  RAISE NOTICE 'profiles.email uniqueness enforced. 0 duplicates.';
END $verify$;
