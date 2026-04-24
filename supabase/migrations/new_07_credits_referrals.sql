-- =====================================================================
-- CREDITS + REFERRAL ROBUSTNESS
--
-- Design:
--   - Append-only ledger: every credit change is a row in credit_transactions.
--     profiles.credits_balance is a denormalised cached SUM, kept in sync by a
--     trigger. Nothing outside the ledger can move balance.
--   - Auto-generated codes: profiles.public_user_code (shown in UI) and
--     profiles.referral_code (used in /ref/:code link) are generated in the DB.
--   - Credits are posted by triggers:
--       * Active referral  -> +50 to the referrer
--       * Passive referral -> +10 to the referrer
--       * Signup bonus     -> +25 to the new user (only once)
--     All values are configurable via the referral_rewards table.
--   - Every post happens in the same transaction as the event that caused it,
--     so the referrer's balance updates in real time.
-- =====================================================================


-- =====================================================================
-- 1. Profile columns: public_user_code, credits_balance
-- =====================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS public_user_code text UNIQUE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credits_balance int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS profiles_public_user_code_idx
  ON public.profiles(public_user_code);


-- =====================================================================
-- 2. Short random code generator (used by both referral_code and public_user_code)
--    Uses pgcrypto. Excludes ambiguous chars (0/O, 1/I/L).
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.gen_short_code(len int DEFAULT 8)
RETURNS text
LANGUAGE plpgsql
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


-- =====================================================================
-- 3. Auto-fill referral_code and public_user_code on profile insert
--    (only when the incoming row has NULL, so existing seeded rows
--     with a pre-set code aren't overwritten).
-- =====================================================================
CREATE OR REPLACE FUNCTION public.profiles_autofill_codes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  attempt int;
  candidate text;
BEGIN
  -- referral_code (8 chars)
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    FOR attempt IN 1..10 LOOP
      candidate := public.gen_short_code(8);
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = candidate) THEN
        NEW.referral_code := candidate;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  -- public_user_code (NRI-XXXX-XX format)
  IF NEW.public_user_code IS NULL OR NEW.public_user_code = '' THEN
    FOR attempt IN 1..10 LOOP
      candidate := 'NRI-' || public.gen_short_code(4) || '-' || public.gen_short_code(2);
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE public_user_code = candidate) THEN
        NEW.public_user_code := candidate;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_autofill_codes ON public.profiles;
CREATE TRIGGER trg_profiles_autofill_codes
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_autofill_codes();


-- =====================================================================
-- 4. Backfill codes for any existing profile rows
-- =====================================================================
DO $$
DECLARE
  r record;
  candidate text;
  attempt int;
BEGIN
  -- referral_code backfill
  FOR r IN SELECT id FROM public.profiles WHERE referral_code IS NULL OR referral_code = '' LOOP
    FOR attempt IN 1..10 LOOP
      candidate := public.gen_short_code(8);
      BEGIN
        UPDATE public.profiles SET referral_code = candidate WHERE id = r.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- collision, try again
      END;
    END LOOP;
  END LOOP;

  -- public_user_code backfill
  FOR r IN SELECT id FROM public.profiles WHERE public_user_code IS NULL OR public_user_code = '' LOOP
    FOR attempt IN 1..10 LOOP
      candidate := 'NRI-' || public.gen_short_code(4) || '-' || public.gen_short_code(2);
      BEGIN
        UPDATE public.profiles SET public_user_code = candidate WHERE id = r.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- collision, try again
      END;
    END LOOP;
  END LOOP;
END $$;


-- =====================================================================
-- 5. Referral reward config (admin-editable)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  reason     text PRIMARY KEY,          -- 'active' | 'passive' | 'signup'
  credits    int NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.referral_rewards (reason, credits) VALUES
  ('active',  50),
  ('passive', 10),
  ('signup',  25)
ON CONFLICT (reason) DO NOTHING;

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referral_rewards_read_auth" ON public.referral_rewards;
CREATE POLICY "referral_rewards_read_auth" ON public.referral_rewards
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "referral_rewards_admin_write" ON public.referral_rewards;
CREATE POLICY "referral_rewards_admin_write" ON public.referral_rewards
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- =====================================================================
-- 6. Credit ledger (append-only)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  delta      int  NOT NULL,             -- positive (earn) or negative (spend/reversal)
  reason     text NOT NULL,             -- 'active' | 'passive' | 'signup' | 'admin_adjustment' | 'redemption'
  ref_id     text,                      -- id of the event that caused this (referral id, admin user id, etc)
  note       text,                      -- optional free-text (admin adjustments)
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS credit_transactions_user_idx
  ON public.credit_transactions(user_id, created_at DESC);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- User can read their own ledger; admin can read all.
DROP POLICY IF EXISTS "credit_transactions_read_own_or_admin" ON public.credit_transactions;
CREATE POLICY "credit_transactions_read_own_or_admin" ON public.credit_transactions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Only admins can INSERT directly. Triggers (SECURITY DEFINER) bypass this to post automatic credits.
DROP POLICY IF EXISTS "credit_transactions_admin_insert" ON public.credit_transactions;
CREATE POLICY "credit_transactions_admin_insert" ON public.credit_transactions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- Append-only: no UPDATE, no DELETE for anyone via the API. Reversals are new rows.
-- (We don't create UPDATE/DELETE policies at all, so they're implicitly forbidden under RLS.)


-- =====================================================================
-- 7. Trigger: keep profiles.credits_balance in sync with the ledger
-- =====================================================================
CREATE OR REPLACE FUNCTION public.credit_transactions_update_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
     SET credits_balance = COALESCE(credits_balance, 0) + NEW.delta
   WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credit_transactions_balance ON public.credit_transactions;
CREATE TRIGGER trg_credit_transactions_balance
AFTER INSERT ON public.credit_transactions
FOR EACH ROW EXECUTE FUNCTION public.credit_transactions_update_balance();


-- =====================================================================
-- 8. Trigger: post credits when a referral row is inserted
--    (source 'active' or 'passive')
-- =====================================================================
CREATE OR REPLACE FUNCTION public.referrals_post_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reward_amount int;
BEGIN
  SELECT credits INTO reward_amount
    FROM public.referral_rewards
   WHERE reason = NEW.source;

  IF reward_amount IS NULL OR reward_amount = 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.credit_transactions (user_id, delta, reason, ref_id)
  VALUES (NEW.referrer_id, reward_amount, NEW.source, NEW.id::text);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referrals_post_credits ON public.referrals;
CREATE TRIGGER trg_referrals_post_credits
AFTER INSERT ON public.referrals
FOR EACH ROW EXECUTE FUNCTION public.referrals_post_credits();


-- =====================================================================
-- 9. Trigger: signup bonus (+25) when a profile row is first created
-- =====================================================================
CREATE OR REPLACE FUNCTION public.profiles_post_signup_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bonus int;
BEGIN
  SELECT credits INTO bonus
    FROM public.referral_rewards
   WHERE reason = 'signup';

  IF bonus IS NULL OR bonus = 0 THEN
    RETURN NEW;
  END IF;

  -- Guard against double-posting if this trigger ever re-runs for the same user
  IF EXISTS (
    SELECT 1 FROM public.credit_transactions
     WHERE user_id = NEW.id AND reason = 'signup'
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.credit_transactions (user_id, delta, reason, ref_id)
  VALUES (NEW.id, bonus, 'signup', NEW.id::text);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_signup_bonus ON public.profiles;
CREATE TRIGGER trg_profiles_signup_bonus
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_post_signup_bonus();
