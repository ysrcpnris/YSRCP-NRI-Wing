-- =====================================================================
-- Fix: gen_random_bytes() not found during signup
--
-- Supabase installs pgcrypto in the `extensions` schema (not `public`).
-- Our gen_short_code function inherits its caller's search_path, which
-- the profile-autofill trigger explicitly sets to `public` — so when
-- gen_short_code calls gen_random_bytes(...) (and get_byte(...)), Postgres
-- can't find them and aborts the entire signup transaction with:
--
--   ERROR: function gen_random_bytes(integer) does not exist (SQLSTATE 42883)
--
-- Recreating gen_short_code with `SET search_path = public, extensions`
-- lets the function resolve pgcrypto helpers without the trigger needing
-- to know about it. We also create the extension into `extensions` if
-- it's somehow missing (idempotent).
-- =====================================================================

-- Make sure pgcrypto exists in a schema we can resolve.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Recreate the helper with an explicit search_path that includes extensions
-- so gen_random_bytes() and get_byte() are always findable, regardless of
-- whatever search_path the caller is running with.
CREATE OR REPLACE FUNCTION public.gen_short_code(len int DEFAULT 8)
RETURNS text
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  alphabet text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  out      text := '';
  i        int;
  r        int;
BEGIN
  FOR i IN 1..len LOOP
    r := (get_byte(gen_random_bytes(1), 0) % length(alphabet)) + 1;
    out := out || substr(alphabet, r, 1);
  END LOOP;
  RETURN out;
END;
$$;

-- Smoke test: should return a non-empty 8-char string.
-- Run this in the SQL editor to confirm the fix:
--   SELECT public.gen_short_code(8);
