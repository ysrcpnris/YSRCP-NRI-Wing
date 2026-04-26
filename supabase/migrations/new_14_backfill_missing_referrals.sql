-- =====================================================================
-- Backfill: insert missing referral rows for users who already signed up
-- via /ref/CODE but whose referrals never landed in the referrals table.
--
-- Scenario this fixes:
--   1. New user clicks /ref/QR5MFGQJ.
--   2. Signs up. Their auth.users.raw_user_meta_data captures referred_by.
--   3. handle_new_user creates the profile.
--   4. processReferralIfNeeded was supposed to insert the referrals row,
--      but didn't because of a stale React closure (fixed in code now).
--
-- This script walks every profile, tries to find a matching referrer by
-- the referred_by code (looking in BOTH profiles.referred_by AND
-- auth.users.raw_user_meta_data->>'referred_by'), and inserts the missing
-- 'active' referral row plus the 'passive' grandparent row if applicable.
--
-- The credit-posting trigger fires automatically on each insert, so:
--   - referrer gets +50 (active)
--   - grandparent gets +10 (passive)
-- balances update via the existing balance trigger.
--
-- Idempotent: every insert uses ON CONFLICT (referrer_id, referred_id, source)
-- DO NOTHING, so re-running is harmless.
-- =====================================================================

DO $$
DECLARE
  r                 record;
  v_code            text;
  v_referrer_id     uuid;
  v_grandparent_id  uuid;
  v_inserted        int := 0;
  v_passive         int := 0;
  v_skipped_self    int := 0;
  v_skipped_nocode  int := 0;
  v_skipped_dup     int := 0;
BEGIN
  FOR r IN
    SELECT
      p.id            AS referred_id,
      p.referred_by   AS profile_code,
      au.raw_user_meta_data->>'referred_by' AS meta_code
    FROM public.profiles p
    LEFT JOIN auth.users au ON au.id = p.id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.referrals rr WHERE rr.referred_id = p.id
    )
  LOOP
    -- Pick whichever source has the code.
    v_code := COALESCE(NULLIF(r.profile_code, ''), NULLIF(r.meta_code, ''));

    IF v_code IS NULL THEN
      v_skipped_nocode := v_skipped_nocode + 1;
      CONTINUE;
    END IF;

    -- Look up the referrer by their referral_code.
    SELECT id INTO v_referrer_id
      FROM public.profiles
     WHERE referral_code = v_code
     LIMIT 1;

    IF v_referrer_id IS NULL THEN
      v_skipped_nocode := v_skipped_nocode + 1;
      CONTINUE;
    END IF;

    -- Skip self-referral (DB CHECK would reject it anyway).
    IF v_referrer_id = r.referred_id THEN
      v_skipped_self := v_skipped_self + 1;
      CONTINUE;
    END IF;

    -- Persist referred_by on the profile if we read it from metadata so
    -- future restarts of the trigger find the same code.
    IF r.profile_code IS NULL OR r.profile_code = '' THEN
      UPDATE public.profiles SET referred_by = v_code WHERE id = r.referred_id;
    END IF;

    -- Insert the active referral. The credit trigger posts +50 to referrer.
    BEGIN
      INSERT INTO public.referrals (referrer_id, referred_id, source)
      VALUES (v_referrer_id, r.referred_id, 'active');
      v_inserted := v_inserted + 1;
    EXCEPTION WHEN unique_violation THEN
      v_skipped_dup := v_skipped_dup + 1;
    END;

    -- Look up grandparent (the referrer's referrer).
    SELECT referrer_id INTO v_grandparent_id
      FROM public.referrals
     WHERE referred_id = v_referrer_id
     LIMIT 1;

    IF v_grandparent_id IS NOT NULL AND v_grandparent_id <> r.referred_id THEN
      BEGIN
        INSERT INTO public.referrals (referrer_id, referred_id, source)
        VALUES (v_grandparent_id, r.referred_id, 'passive');
        v_passive := v_passive + 1;
      EXCEPTION WHEN unique_violation THEN
        -- already there, ignore
        NULL;
      END;
    END IF;
  END LOOP;

  RAISE NOTICE
    'Referral backfill complete: % active inserted, % passive inserted, % skipped (no code), % skipped (self-ref), % skipped (dup)',
    v_inserted, v_passive, v_skipped_nocode, v_skipped_self, v_skipped_dup;
END $$;
