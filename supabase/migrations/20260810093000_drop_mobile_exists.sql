-- =====================================================================
-- 20260810093000 — drop mobile_exists()
--
-- Reported externally (report "P2 — user enumeration"): mobile_exists()
-- answered true/false for any phone number, to anyone, unauthenticated.
--
-- 20260805190000 already revoked it from anon, which closed the report on
-- develop — and broke signup, because the signup form (running as anon)
-- still called it as a pre-check and treated the permission error as
-- "Unable to register". Signed-in callers could still enumerate.
--
-- The pre-check is removed from src/contexts/AuthContext.tsx in the same
-- commit; the UNIQUE index on profiles.mobile_number
-- (20240101000500) is what actually enforces uniqueness, and its
-- violation is translated into a message that does not say which field
-- collided. Nothing else calls this function.
-- =====================================================================

DROP FUNCTION IF EXISTS public.mobile_exists(text);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p
               JOIN pg_namespace n ON n.oid = p.pronamespace
              WHERE n.nspname = 'public' AND p.proname = 'mobile_exists') THEN
    RAISE EXCEPTION 'a mobile_exists overload still exists';
  END IF;
  RAISE NOTICE 'mobile_exists() dropped';
END $$;
