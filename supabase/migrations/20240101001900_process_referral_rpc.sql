-- =====================================================================
-- RPC: process_my_referral(p_code text)
--
-- Why this exists:
--   The frontend used to do referral processing in 3 client-side queries:
--     1. SELECT id FROM profiles WHERE referral_code = $code
--     2. INSERT INTO referrals (active row)
--     3. INSERT INTO referrals (passive row, after looking up grandparent)
--
--   But profiles RLS is "auth.uid() = id" — i.e. a user can only SELECT
--   their own profile. So step 1 returns zero rows for the new signup,
--   and the whole flow silently aborts. Result: profiles.referred_by is
--   stored correctly, but no referrals row is ever inserted, so the
--   referrer never gets +50 active credit, and the dashboard's "Active
--   Referrals" panel stays empty.
--
--   This RPC moves the whole flow server-side under SECURITY DEFINER so
--   it can read profiles by code, then inserts the active and (if
--   applicable) passive referral rows. The existing trigger
--   `referrals_post_credits` fires on each insert and posts +50 / +10 to
--   the referrer / grandparent automatically.
--
-- Idempotent:
--   - Skips if a referrals row for the calling user already exists.
--   - Skips self-referral (DB CHECK would reject it anyway).
--   - Skips if the referrer is an admin (we don't credit admins).
--
-- =====================================================================

CREATE OR REPLACE FUNCTION public.process_my_referral(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me              uuid;
  v_my_role         text;
  v_referrer_id     uuid;
  v_referrer_role   text;
  v_grandparent_id  uuid;
  v_active_inserted boolean := false;
  v_passive_inserted boolean := false;
BEGIN
  v_me := auth.uid();

  IF v_me IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_code');
  END IF;

  -- Don't credit admins. (Frontend already early-returns, but defence in depth.)
  SELECT role INTO v_my_role FROM public.profiles WHERE id = v_me;
  IF v_my_role = 'admin' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'caller_is_admin');
  END IF;

  -- Already processed for this user? Then we're done — keep the function
  -- safe to call multiple times from the same session.
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = v_me) THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'already_processed');
  END IF;

  -- Resolve the referrer by code (this is the bit that needed SECURITY DEFINER).
  SELECT id, role INTO v_referrer_id, v_referrer_role
    FROM public.profiles
   WHERE referral_code = p_code
   LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown_code');
  END IF;

  -- Self-referral guard.
  IF v_referrer_id = v_me THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'self_referral');
  END IF;

  -- Don't put admins anywhere in the tree as referrers either.
  IF v_referrer_role = 'admin' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'referrer_is_admin');
  END IF;

  -- Persist referred_by on the calling user's profile if it's not already set,
  -- so future restarts of the trigger / backfill can find the same code.
  UPDATE public.profiles
     SET referred_by = p_code
   WHERE id = v_me
     AND (referred_by IS NULL OR referred_by = '');

  -- Insert the active row. Trigger posts +50 to referrer.
  BEGIN
    INSERT INTO public.referrals (referrer_id, referred_id, source)
    VALUES (v_referrer_id, v_me, 'active');
    v_active_inserted := true;
  EXCEPTION WHEN unique_violation THEN
    -- Already exists; treat as success.
    NULL;
  END;

  -- Look up grandparent (the referrer's own referrer) and insert passive row.
  SELECT referrer_id INTO v_grandparent_id
    FROM public.referrals
   WHERE referred_id = v_referrer_id
   LIMIT 1;

  IF v_grandparent_id IS NOT NULL AND v_grandparent_id <> v_me THEN
    BEGIN
      INSERT INTO public.referrals (referrer_id, referred_id, source)
      VALUES (v_grandparent_id, v_me, 'passive');
      v_passive_inserted := true;
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'ok',                true,
    'active_inserted',   v_active_inserted,
    'passive_inserted',  v_passive_inserted,
    'referrer_id',       v_referrer_id,
    'grandparent_id',    v_grandparent_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_my_referral(text) TO authenticated;


-- =====================================================================
-- Backfill: now that the function exists, also fix every existing user
-- whose profile has `referred_by` set but who has no referrals row.
-- This catches MUTHYAPUWAR, ABC, Dinesh (and anyone like them).
--
-- Same logic as new_14, just rewritten to be self-contained here so the
-- migration is one-and-done.
-- =====================================================================
DO $$
DECLARE
  r              record;
  v_referrer_id  uuid;
  v_grandparent  uuid;
  v_inserted     int := 0;
  v_passive      int := 0;
  v_skipped      int := 0;
BEGIN
  FOR r IN
    SELECT
      p.id          AS referred_id,
      p.referred_by AS code
    FROM public.profiles p
    WHERE p.referred_by IS NOT NULL
      AND p.referred_by <> ''
      AND COALESCE(p.role, 'user') <> 'admin'
      AND NOT EXISTS (
        SELECT 1 FROM public.referrals rr WHERE rr.referred_id = p.id
      )
  LOOP
    SELECT id INTO v_referrer_id
      FROM public.profiles
     WHERE referral_code = r.code
       AND COALESCE(role, 'user') <> 'admin'
     LIMIT 1;

    IF v_referrer_id IS NULL OR v_referrer_id = r.referred_id THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    BEGIN
      INSERT INTO public.referrals (referrer_id, referred_id, source)
      VALUES (v_referrer_id, r.referred_id, 'active');
      v_inserted := v_inserted + 1;
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;

    SELECT referrer_id INTO v_grandparent
      FROM public.referrals
     WHERE referred_id = v_referrer_id
     LIMIT 1;

    IF v_grandparent IS NOT NULL AND v_grandparent <> r.referred_id THEN
      BEGIN
        INSERT INTO public.referrals (referrer_id, referred_id, source)
        VALUES (v_grandparent, r.referred_id, 'passive');
        v_passive := v_passive + 1;
      EXCEPTION WHEN unique_violation THEN
        NULL;
      END;
    END IF;
  END LOOP;

  RAISE NOTICE
    'Referral backfill (new_19): % active inserted, % passive inserted, % skipped',
    v_inserted, v_passive, v_skipped;
END $$;
