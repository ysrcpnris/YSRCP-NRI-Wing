-- =====================================================================
-- 20260805100000 — let the client send updated_at, but never trust it
--
-- 20260805090000 put updated_at in the privileged set, so the profile
-- editor's payload — which has always included it — started failing
-- with 403. Members could not save their profile at all.
--
-- Caught by scripts/smoke-member-journey.mjs on its first run, which is
-- precisely the class of defect that walking the app's own data path
-- finds and a permission matrix does not: nothing was insecure, the
-- product simply stopped working.
--
-- updated_at is not an authorisation field. It is granted back, and a
-- trigger overwrites whatever arrives with now() so the column stays
-- truthful regardless of what a client claims.
-- =====================================================================

GRANT UPDATE (updated_at) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.stamp_profile_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- Name matters: BEFORE UPDATE triggers fire alphabetically, and this
-- must run after trg_guard_privileged_profile (g < s) so the guard's
-- restored values are still overwritten with a real timestamp.
DROP TRIGGER IF EXISTS trg_stamp_profile_updated_at ON public.profiles;
CREATE TRIGGER trg_stamp_profile_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.stamp_profile_updated_at();

DO $$
DECLARE can_write boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.column_privileges
     WHERE table_schema='public' AND table_name='profiles'
       AND grantee='authenticated' AND privilege_type='UPDATE'
       AND column_name='updated_at') INTO can_write;
  IF NOT can_write THEN
    RAISE EXCEPTION 'updated_at is still not writable — profile saves will 403';
  END IF;

  -- The columns that actually matter must still be closed.
  IF EXISTS (
    SELECT 1 FROM information_schema.column_privileges
     WHERE table_schema='public' AND table_name='profiles'
       AND grantee='authenticated' AND privilege_type='UPDATE'
       AND column_name IN ('role','status','email','epic_number','has_vote')) THEN
    RAISE EXCEPTION 'a privileged column became writable';
  END IF;
END $$;
