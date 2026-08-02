-- =============================================================
-- Enforce uniqueness on profiles.mobile_number
--
-- 1. Partial unique index (ignores NULL and empty strings so
--    legacy rows without a phone don't break the constraint).
-- 2. RPC callable by anon so the signup page can pre-check a
--    number before calling supabase.auth.signUp (RLS otherwise
--    hides all rows from anonymous visitors).
-- =============================================================

-- 1️⃣  Unique index on non-empty mobile_number (defense-in-depth)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_mobile_number_unique
  ON public.profiles (mobile_number)
  WHERE mobile_number IS NOT NULL
    AND mobile_number <> '';

-- 2️⃣  RPC — returns true if the phone is already taken
CREATE OR REPLACE FUNCTION public.mobile_exists(p_mobile text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE mobile_number = p_mobile
  );
$$;

-- Allow unauthenticated signup form + logged-in users to call it
GRANT EXECUTE ON FUNCTION public.mobile_exists(text) TO anon, authenticated;

SELECT 'Mobile uniqueness constraint + mobile_exists RPC installed' AS status;
