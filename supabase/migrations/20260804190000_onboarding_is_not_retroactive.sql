-- =====================================================================
-- 20260804190000 — finishing onboarding is permanent
--
-- THE EDGE THE ADAPTIVE MANDAL RULE CREATED
--   profile_is_complete() requires a mandal only where that
--   constituency has mandals loaded (20260804110000). That is the right
--   rule for someone filling the form today. It has one consequence I
--   did not think through when writing it:
--
--     A member from Nandyal completes onboarding in March. Nandyal has
--     no mandals loaded, so mandal is not required, and they are
--     stamped complete. In August we seed Nandyal's mandals. The rule
--     tightens. The member has not changed anything — and the gate now
--     throws them back into the wizard.
--
--   Observed on a staging fixture: stamped = true, complete = false.
--   In production that is a member who finished, and is told to finish
--   again, because we loaded a table.
--
-- THE RULE
--   The stamp is a fact about something the member did, not a
--   recomputation of current state. Once set it is never cleared. The
--   wizard can still ASK for a newly-required mandal — a soft prompt in
--   the profile — but the hard redirect at ProtectedRoute belongs to
--   people who genuinely never finished.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.stamp_onboarding_complete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Never un-stamp. Tightening reference data must not retroactively
  -- un-complete a member who finished under the rules of the day.
  IF OLD.onboarding_completed_at IS NOT NULL THEN
    NEW.onboarding_completed_at := OLD.onboarding_completed_at;
    RETURN NEW;
  END IF;

  IF public.profile_is_complete(NEW) THEN
    NEW.onboarding_completed_at := now();
  END IF;

  RETURN NEW;
END $$;

-- INSERT has no OLD row, so it needs its own trigger function.
CREATE OR REPLACE FUNCTION public.stamp_onboarding_complete_ins()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.onboarding_completed_at IS NULL
     AND public.profile_is_complete(NEW) THEN
    NEW.onboarding_completed_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_onboarding_complete ON public.profiles;

CREATE TRIGGER trg_onboarding_complete_ins
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.stamp_onboarding_complete_ins();

CREATE TRIGGER trg_onboarding_complete_upd
  BEFORE UPDATE OF country_of_residence, city_abroad,
                   assembly_constituency, mandal, gender
  ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.stamp_onboarding_complete();

-- What the profile page uses to ask for a newly-required field WITHOUT
-- gating on it: "complete" is the permanent fact, "missing_mandal" is
-- the softer prompt.
CREATE OR REPLACE FUNCTION public.my_onboarding_status()
RETURNS TABLE (
  completed          boolean,
  needs_country      boolean,
  needs_city         boolean,
  needs_constituency boolean,
  needs_mandal       boolean,
  needs_gender       boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p.onboarding_completed_at IS NOT NULL,
    coalesce(p.country_of_residence,  '') = '',
    coalesce(p.city_abroad,           '') = '',
    coalesce(p.assembly_constituency, '') = '',
    coalesce(p.mandal, '') = ''
      AND public.constituency_has_mandals(p.assembly_constituency),
    coalesce(p.gender, '') = ''
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

COMMENT ON COLUMN public.profiles.onboarding_completed_at IS
  'When the member finished onboarding. Write-once — never cleared, so '
  'later reference data cannot un-complete someone who already finished.';
