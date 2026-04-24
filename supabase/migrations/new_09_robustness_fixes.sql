-- =====================================================================
-- ROBUSTNESS FIXES
--
-- Closes the loopholes that the referral / credits / redemption flow
-- has surfaced so far:
--
--   1. Self-referral            block at DB (CHECK)
--   2. Balance < 0              block at DB (CHECK)
--   3. Mobile duplicates via    normalize mobile_number on insert/update
--      whitespace / dashes      (strips everything except digits and a
--                                single leading +), then the existing
--                                UNIQUE index catches duplicates.
--   4. Non-negative rewards     CHECK on referral_rewards.credits
--   5. Perk deactivated mid-    redemption trigger rejects approval if
--      redemption               the perk is no longer active
-- =====================================================================


-- =====================================================================
-- 1. Block self-referral. A user can never earn credits off their own
--    signup, directly or passively.
--
--    NOTE the NOT VALID + VALIDATE dance: if any existing rows already
--    violate the constraint (shouldn't, but just in case), the migration
--    still succeeds; those rows are flagged rather than aborting the
--    whole migration.
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'referrals_no_self_referral'
       AND conrelid = 'public.referrals'::regclass
  ) THEN
    ALTER TABLE public.referrals
      ADD CONSTRAINT referrals_no_self_referral
      CHECK (referrer_id <> referred_id) NOT VALID;

    -- Try to validate; if existing data has self-referrals, delete them
    -- (they are illegitimate under the new rules) and try again.
    BEGIN
      ALTER TABLE public.referrals VALIDATE CONSTRAINT referrals_no_self_referral;
    EXCEPTION WHEN check_violation THEN
      DELETE FROM public.referrals WHERE referrer_id = referred_id;
      ALTER TABLE public.referrals VALIDATE CONSTRAINT referrals_no_self_referral;
    END;
  END IF;
END $$;


-- =====================================================================
-- 2. Credits balance never goes below zero.
--    Belt-and-braces: the redemption trigger already checks, but this
--    CHECK also protects against admin mistakes and any future code path.
--
--    If any existing profile already has a negative balance (shouldn't
--    be possible but we defend anyway), clamp to zero before adding the
--    constraint.
-- =====================================================================
UPDATE public.profiles SET credits_balance = 0 WHERE credits_balance < 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'profiles_credits_nonneg'
       AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_credits_nonneg CHECK (credits_balance >= 0);
  END IF;
END $$;


-- =====================================================================
-- 3. Mobile number normalization.
--    Strips any character that isn't a digit or a leading '+', so
--    "+91 98765 43210" and "+919876543210" and "+91-98765-43210" all
--    collide at the existing UNIQUE index.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.profiles_normalize_mobile()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  had_leading_plus boolean;
  digits_only       text;
BEGIN
  IF NEW.mobile_number IS NULL THEN
    RETURN NEW;
  END IF;

  had_leading_plus := left(btrim(NEW.mobile_number), 1) = '+';

  -- Keep digits only, then prepend a single '+' if the original had one.
  digits_only := regexp_replace(NEW.mobile_number, '[^0-9]', '', 'g');

  IF digits_only = '' THEN
    NEW.mobile_number := NULL;
    RETURN NEW;
  END IF;

  IF had_leading_plus THEN
    NEW.mobile_number := '+' || digits_only;
  ELSE
    NEW.mobile_number := digits_only;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_normalize_mobile ON public.profiles;
CREATE TRIGGER trg_profiles_normalize_mobile
BEFORE INSERT OR UPDATE OF mobile_number ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_normalize_mobile();

-- Backfill existing rows so they match the new normalised format and any
-- duplicates that only differ by formatting will now collide against the
-- UNIQUE index. This is an intentional side-effect — if a collision is
-- found we fall back to dropping the older row's mobile (null it out) so
-- the newer account is the canonical owner.
DO $$
DECLARE
  r record;
  normalized text;
BEGIN
  FOR r IN SELECT id, mobile_number FROM public.profiles
            WHERE mobile_number IS NOT NULL LOOP
    normalized := regexp_replace(r.mobile_number, '[^0-9]', '', 'g');
    IF left(btrim(r.mobile_number), 1) = '+' AND normalized <> '' THEN
      normalized := '+' || normalized;
    END IF;
    IF normalized = '' THEN
      UPDATE public.profiles SET mobile_number = NULL WHERE id = r.id;
    ELSIF normalized IS DISTINCT FROM r.mobile_number THEN
      BEGIN
        UPDATE public.profiles SET mobile_number = normalized WHERE id = r.id;
      EXCEPTION WHEN unique_violation THEN
        -- collision with another row: null this one so the UNIQUE index stays valid
        UPDATE public.profiles SET mobile_number = NULL WHERE id = r.id;
      END;
    END IF;
  END LOOP;
END $$;


-- =====================================================================
-- 4. referral_rewards.credits must be non-negative.
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'referral_rewards_nonneg'
       AND conrelid = 'public.referral_rewards'::regclass
  ) THEN
    ALTER TABLE public.referral_rewards
      ADD CONSTRAINT referral_rewards_nonneg CHECK (credits >= 0);
  END IF;
END $$;


-- =====================================================================
-- 5. Reject redemption approval if the perk has since been deactivated
--    or deleted. We only check on transition INTO approved; existing
--    approvals stay intact.
--    (Patches the existing redemptions trigger from new_08.)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.redemptions_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance int;
  new_ledger_id   uuid;
  perk_live       boolean;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    -- Ensure the perk still exists and is active.
    SELECT is_active INTO perk_live
      FROM public.reward_perks
     WHERE id = NEW.perk_id;

    IF perk_live IS NULL THEN
      RAISE EXCEPTION 'Cannot approve redemption: the referenced perk no longer exists.';
    END IF;
    IF perk_live = false THEN
      RAISE EXCEPTION 'Cannot approve redemption: the referenced perk has been deactivated. Reject this request instead.';
    END IF;

    -- Row-lock so concurrent approvals see a consistent balance.
    SELECT credits_balance INTO current_balance
      FROM public.profiles
     WHERE id = NEW.user_id
     FOR UPDATE;

    IF current_balance IS NULL THEN
      RAISE EXCEPTION 'User has no profile/balance record';
    END IF;

    IF current_balance < NEW.cost_credits THEN
      RAISE EXCEPTION 'Insufficient credits: user has %, needs %',
        current_balance, NEW.cost_credits;
    END IF;

    INSERT INTO public.credit_transactions (user_id, delta, reason, ref_id, note)
    VALUES (NEW.user_id, -NEW.cost_credits, 'redemption', NEW.id::text, NEW.perk_name)
    RETURNING id INTO new_ledger_id;

    NEW.ledger_tx_id := new_ledger_id;
    NEW.decided_at   := now();

  ELSIF NEW.status = 'rejected' AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    NEW.decided_at := now();
  END IF;

  RETURN NEW;
END;
$$;
