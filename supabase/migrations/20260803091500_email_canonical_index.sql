-- =====================================================================
-- 20260803091500 — capture schema drift: email_canonical + unique index
--
-- WHY
--   These two objects already exist in PRODUCTION but in no migration
--   file. They were created by hand from YCP/finish_repair.sql on
--   2026-07-25, at the end of the email repair.
--
--   That means any new environment built from migrations alone — staging,
--   a future preview branch, a local dev database — would silently lack
--   the one constraint that stops duplicate members reappearing. The
--   repair would have to be discovered and redone.
--
--   Both statements are written to be safe against production, where the
--   objects already exist: CREATE OR REPLACE for the function, and
--   IF NOT EXISTS for the index.
--
-- WHAT THEY DO
--   email_canonical() folds Gmail's own matching rules — dots in the
--   local part are ignored, and googlemail.com is gmail.com — so
--   kalyankumar.s@gmail.com and kalyankumars@gmail.com resolve to one
--   value. The unique index then makes it impossible to hold both.
--
--   This is what closed the duplicate problem: 106 undeliverable
--   addresses, 28 duplicated members, ~580 members whose stored address
--   didn't match the one they would type at the login screen.
--
--   Blind spot, deliberately: a malformed DOMAIN is not canonicalised,
--   so x@gmailcom and x@gmail.com remain distinct. Domain typos are
--   caught on the way in, not by this index.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.email_canonical(e text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $canon$
  SELECT CASE
    WHEN e IS NULL OR e = '' THEN NULL
    WHEN split_part(lower(e), '@', 2) IN ('gmail.com', 'googlemail.com')
      THEN replace(split_part(lower(e), '@', 1), '.', '') || '@gmail.com'
    ELSE lower(e)
  END;
$canon$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_canonical_unique
  ON public.profiles ( public.email_canonical(email) )
  WHERE email IS NOT NULL AND email <> '';
