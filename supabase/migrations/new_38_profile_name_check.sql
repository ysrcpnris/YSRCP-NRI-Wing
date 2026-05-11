-- =====================================================================
-- DB-level name validation: profiles.first_name and profiles.last_name
-- must contain at least one letter character.
--
-- Frontend already enforces this (RegisterPage + Dashboard profile
-- edit), but a CHECK constraint at the DB level catches anything that
-- bypasses the frontend (direct REST/SQL calls, future code paths).
--
-- Strategy:
--   • POSIX regex `[[:alpha:]]` matches Latin letters in plain SQL.
--     For broader Unicode (Telugu, Devanagari, etc.) we use `~`
--     against `[^\d\s[:punct:]]` — i.e. the value must contain at
--     least one character that isn't a digit, whitespace, or
--     punctuation. That's the same intent as the frontend's
--     `/\p{L}/u` test.
--   • Marked NOT VALID so existing rows are not checked. New writes
--     (INSERT / UPDATE that touches the column) are validated.
--     Existing data stays untouched; admin can run
--     `ALTER TABLE … VALIDATE CONSTRAINT …` once they've audited
--     legacy rows.
--
-- Idempotent — re-running this is a no-op once the constraints exist.
-- =====================================================================

DO $names$
BEGIN
  -- first_name
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'profiles_first_name_has_letter'
       AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_first_name_has_letter
      CHECK (
        first_name IS NULL
        OR length(trim(first_name)) >= 2
        AND first_name ~ '[^[:digit:][:punct:][:space:]]'
      ) NOT VALID;
    RAISE NOTICE 'Added CHECK profiles_first_name_has_letter (NOT VALID).';
  END IF;

  -- last_name
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'profiles_last_name_has_letter'
       AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_last_name_has_letter
      CHECK (
        last_name IS NULL
        OR length(trim(last_name)) >= 2
        AND last_name ~ '[^[:digit:][:punct:][:space:]]'
      ) NOT VALID;
    RAISE NOTICE 'Added CHECK profiles_last_name_has_letter (NOT VALID).';
  END IF;
END $names$;

-- ---------------------------------------------------------------------
-- Report any existing rows that DON'T meet the rule. They are kept as
-- is (the NOT VALID flag exempts them) but surfaced here so admin can
-- choose to clean them up via the All Users page.
-- ---------------------------------------------------------------------
DO $report$
DECLARE
  v_bad_first int;
  v_bad_last  int;
BEGIN
  SELECT count(*) INTO v_bad_first
    FROM public.profiles
   WHERE first_name IS NOT NULL
     AND (
       length(trim(first_name)) < 2
       OR first_name !~ '[^[:digit:][:punct:][:space:]]'
     );
  SELECT count(*) INTO v_bad_last
    FROM public.profiles
   WHERE last_name IS NOT NULL
     AND (
       length(trim(last_name)) < 2
       OR last_name !~ '[^[:digit:][:punct:][:space:]]'
     );
  RAISE NOTICE
    'Existing rows with invalid names: % first_name(s), % last_name(s). '
    'These were grandfathered in (constraint is NOT VALID). Future '
    'INSERT/UPDATE that touches the column will be rejected. Once you '
    'clean the legacy rows from the All Users page, run: '
    'ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_first_name_has_letter; '
    'ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_last_name_has_letter;',
    v_bad_first, v_bad_last;
END $report$;
