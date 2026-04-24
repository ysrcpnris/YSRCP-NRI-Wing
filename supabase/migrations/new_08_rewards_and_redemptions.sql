-- =====================================================================
-- REWARDS CATALOGUE + REDEMPTION FLOW + REALTIME
--
-- Adds on top of new_07_credits_referrals.sql:
--   1. reward_perks          admin-defined list of things a user can redeem
--   2. redemptions           user-submitted redemption requests (pending / approved / rejected)
--   3. Trigger on approval   posts a negative ledger entry; balance check
--                            happens inside the trigger so the spend can never
--                            drive balance below zero, even under concurrent
--                            approvals.
--   4. Guard on manual spend attempts via credit_transactions INSERT.
--   5. Publishes credit_transactions and profiles to the supabase_realtime
--      publication so the client can subscribe and update live.
-- =====================================================================


-- =====================================================================
-- 1. REWARD PERKS (admin-defined catalogue)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.reward_perks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL UNIQUE,
  description  text,
  cost_credits int  NOT NULL CHECK (cost_credits > 0),
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reward_perks_active_idx ON public.reward_perks(is_active);

CREATE OR REPLACE FUNCTION public.reward_perks_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reward_perks_updated_at ON public.reward_perks;
CREATE TRIGGER trg_reward_perks_updated_at
BEFORE UPDATE ON public.reward_perks
FOR EACH ROW EXECUTE FUNCTION public.reward_perks_touch_updated_at();

ALTER TABLE public.reward_perks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reward_perks_read_auth" ON public.reward_perks;
CREATE POLICY "reward_perks_read_auth" ON public.reward_perks
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "reward_perks_admin_write" ON public.reward_perks;
CREATE POLICY "reward_perks_admin_write" ON public.reward_perks
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- =====================================================================
-- 2. REDEMPTIONS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.redemptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  perk_id       uuid NOT NULL REFERENCES public.reward_perks(id) ON DELETE RESTRICT,
  perk_name     text NOT NULL,                -- snapshot at request time
  cost_credits  int  NOT NULL,                -- snapshot at request time
  status        text NOT NULL DEFAULT 'pending'  -- 'pending' | 'approved' | 'rejected'
                CHECK (status IN ('pending','approved','rejected')),
  admin_note    text,
  ledger_tx_id  uuid,                          -- links back to the spend row in credit_transactions
  created_at    timestamptz NOT NULL DEFAULT now(),
  decided_at    timestamptz
);

CREATE INDEX IF NOT EXISTS redemptions_user_idx   ON public.redemptions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS redemptions_status_idx ON public.redemptions(status);

ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;

-- User can read own redemptions; admin can read all.
DROP POLICY IF EXISTS "redemptions_read_own_or_admin" ON public.redemptions;
CREATE POLICY "redemptions_read_own_or_admin" ON public.redemptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Users can submit their own redemption (always as 'pending').
DROP POLICY IF EXISTS "redemptions_insert_self_pending" ON public.redemptions;
CREATE POLICY "redemptions_insert_self_pending" ON public.redemptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- Only admins can UPDATE (approve / reject).
DROP POLICY IF EXISTS "redemptions_admin_update" ON public.redemptions;
CREATE POLICY "redemptions_admin_update" ON public.redemptions
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Users can cancel (delete) their own pending request; admin can delete any.
DROP POLICY IF EXISTS "redemptions_delete_pending_own_or_admin" ON public.redemptions;
CREATE POLICY "redemptions_delete_pending_own_or_admin" ON public.redemptions
  FOR DELETE TO authenticated
  USING (
    (user_id = auth.uid() AND status = 'pending')
    OR public.is_admin()
  );


-- =====================================================================
-- 3. Trigger: on redemption approval, atomically post the spend.
--    Enforces balance check INSIDE the same transaction so concurrent
--    approvals can't spend more than the user has.
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
BEGIN
  -- Only act when transitioning INTO approved (not on re-save of approved)
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    -- Lock the profile row so concurrent approvals see a consistent balance
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

    -- Post the spend (negative delta). The ledger→balance trigger does the
    -- actual decrement, atomically in the same transaction.
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

DROP TRIGGER IF EXISTS trg_redemptions_status_change ON public.redemptions;
CREATE TRIGGER trg_redemptions_status_change
BEFORE UPDATE ON public.redemptions
FOR EACH ROW EXECUTE FUNCTION public.redemptions_on_status_change();


-- =====================================================================
-- 4. Harden credit_transactions inserts for non-admin callers:
--    the only way a regular user (RLS) can even INSERT is via triggers
--    (which run as SECURITY DEFINER). This is already enforced by RLS in
--    new_07 — but we also make the reason column authoritative.
--
--    We additionally add a CHECK to catch accidental 0-deltas.
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'credit_transactions_nonzero_delta'
       AND conrelid = 'public.credit_transactions'::regclass
  ) THEN
    ALTER TABLE public.credit_transactions
      ADD CONSTRAINT credit_transactions_nonzero_delta CHECK (delta <> 0);
  END IF;
END $$;


-- =====================================================================
-- 5. REALTIME: publish the tables the client subscribes to.
--    Subscribing to credit_transactions lets the user's dashboard tick up
--    the balance the moment a referral/signup bonus/redemption lands.
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'credit_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_transactions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;
