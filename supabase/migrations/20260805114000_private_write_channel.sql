-- =====================================================================
-- 20260805114000 — let the private-profile RPC through its own guard
--
-- 20260805111000 extended guard_privileged_profile_columns() to restore
-- dob and family_* from OLD for any non-admin caller. That is right for
-- a direct client UPDATE and wrong for update_my_private_profile(),
-- which is the SUPPORTED path to those fields.
--
-- SECURITY DEFINER does not change auth.uid(), so inside that function
-- is_admin() is still false and the trigger silently reverted its
-- writes. A member could set their date of birth, get a success, and
-- find it unchanged.
--
-- Caught by scripts/smoke-member-journey.mjs, which asserts the value
-- survives — the same test that caught the last self-inflicted
-- regression. A permission suite would have seen nothing wrong here
-- either: nothing leaked, the feature just stopped working.
--
-- THE CHANNEL
--   The RPC sets a transaction-local flag; the trigger honours it. It is
--   transaction-local (set_config with is_local => true), so it cannot
--   leak into another statement or another session, and a client cannot
--   set it — PostgREST does not expose set_config.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.guard_privileged_profile_columns()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.is_admin()
     OR current_setting('role', true) = 'service_role'
     -- Set only inside update_my_private_profile(), transaction-local.
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
  NEW.onboarding_completed_at := OLD.onboarding_completed_at;
  NEW.dob                     := OLD.dob;
  NEW.family_relation         := OLD.family_relation;
  NEW.family_name             := OLD.family_name;
  NEW.family_mobile           := OLD.family_mobile;
  NEW.family_village          := OLD.family_village;
  NEW.family_designation      := OLD.family_designation;

  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.update_my_private_profile(
  p_dob                text    DEFAULT NULL,
  p_family_relation    text    DEFAULT NULL,
  p_family_name        text    DEFAULT NULL,
  p_family_mobile      text    DEFAULT NULL,
  p_family_village     text    DEFAULT NULL,
  p_family_designation text    DEFAULT NULL,
  p_has_vote           boolean DEFAULT NULL,
  p_epic_number        text    DEFAULT NULL,
  p_clear_dob          boolean DEFAULT false,
  p_clear_family       boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- Transaction-local: gone at COMMIT, invisible to other sessions, and
  -- only ever set on the caller's own row below.
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
         epic_number        = coalesce(nullif(btrim(p_epic_number), ''), p.epic_number)
   WHERE p.id = auth.uid();

  PERFORM set_config('app.private_profile_write', '0', true);
  RETURN FOUND;
END $$;

REVOKE ALL ON FUNCTION public.update_my_private_profile(
  text, text, text, text, text, text, boolean, text, boolean, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.update_my_private_profile(
  text, text, text, text, text, text, boolean, text, boolean, boolean) TO authenticated;
