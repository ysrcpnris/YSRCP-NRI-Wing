-- =====================================================================
-- Remove the credit system (signup bonus, +50/+10 referral credits,
-- rewards catalogue, redemption flow) while preserving active/passive
-- referral tracking exactly as it is.
--
-- After this migration:
--   • Active and passive referrals continue to be inserted by the
--     `process_my_referral` SECURITY DEFINER RPC (unchanged).
--   • The "Active Referrals" / "Passive Tree" panels and live updates
--     keep working because the `referrals` table and its realtime
--     publication entry are untouched.
--   • Nothing posts credits. There is no balance, no ledger, no
--     redemptions, no perks, no signup bonus.
--
-- Idempotent: every drop uses IF EXISTS and CASCADE only where needed.
-- Re-running is safe — second run is a no-op.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Stop the triggers first so no INSERT into the surviving `referrals`
--    or `profiles` tables fires the dropped functions during DDL.
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_referrals_post_credits     ON public.referrals;
DROP TRIGGER IF EXISTS trg_profiles_signup_bonus      ON public.profiles;
DROP TRIGGER IF EXISTS trg_credit_transactions_balance ON public.credit_transactions;
DROP TRIGGER IF EXISTS trg_redemptions_status_change   ON public.redemptions;
DROP TRIGGER IF EXISTS trg_reward_perks_updated_at     ON public.reward_perks;


-- ---------------------------------------------------------------------
-- 2. Remove the dropped tables from the supabase_realtime publication
--    BEFORE we drop the tables themselves. Failing to do this first
--    leaves dangling publication entries.
-- ---------------------------------------------------------------------
DO $pub$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'credit_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.credit_transactions;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'redemptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.redemptions;
  END IF;
END
$pub$;


-- ---------------------------------------------------------------------
-- 3. Drop the dependent tables. CASCADE handles any leftover policies,
--    indexes, and constraints that referenced them.
--
--    Order respects FK dependencies, but CASCADE makes the order safe
--    either way.
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS public.redemptions          CASCADE;
DROP TABLE IF EXISTS public.reward_perks         CASCADE;
DROP TABLE IF EXISTS public.credit_transactions  CASCADE;
DROP TABLE IF EXISTS public.referral_rewards     CASCADE;


-- ---------------------------------------------------------------------
-- 4. Drop the credit-system functions. They have no callers left after
--    the triggers above are gone.
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.referrals_post_credits()         CASCADE;
DROP FUNCTION IF EXISTS public.profiles_post_signup_bonus()     CASCADE;
DROP FUNCTION IF EXISTS public.credit_transactions_update_balance() CASCADE;
DROP FUNCTION IF EXISTS public.redemptions_on_status_change()   CASCADE;


-- ---------------------------------------------------------------------
-- 5. Drop the credits_balance column from profiles (and any constraint
--    that referenced it, e.g. profiles_credits_nonneg from new_09).
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_credits_nonneg;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS credits_balance;


-- ---------------------------------------------------------------------
-- 6. Sanity NOTICE so the SQL Editor confirms what happened.
-- ---------------------------------------------------------------------
DO $verify$
DECLARE
  v_credit_tbl   int;
  v_perks_tbl    int;
  v_redempt_tbl  int;
  v_rewards_tbl  int;
  v_balance_col  int;
BEGIN
  SELECT count(*) INTO v_credit_tbl  FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name = 'credit_transactions';
  SELECT count(*) INTO v_perks_tbl   FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name = 'reward_perks';
  SELECT count(*) INTO v_redempt_tbl FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name = 'redemptions';
  SELECT count(*) INTO v_rewards_tbl FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name = 'referral_rewards';
  SELECT count(*) INTO v_balance_col FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'profiles'
     AND column_name = 'credits_balance';

  RAISE NOTICE 'Credit system removed — remaining: credit_transactions=%, reward_perks=%, redemptions=%, referral_rewards=%, profiles.credits_balance=%',
    v_credit_tbl, v_perks_tbl, v_redempt_tbl, v_rewards_tbl, v_balance_col;
END
$verify$;
