-- =====================================================================
-- 20260809100000 — an already-onboarded member should not be creditable
-- as a fresh referral just because a referral code ends up in their
-- browser later
--
-- USER-REPORTED: "Existing users registered again should not increase
-- the referral count." Reproduced live before assuming it was real:
-- ReferralRedirect.tsx writes localStorage.referral_code for ANY
-- visitor to /ref/:code, including someone who is already a long-
-- established member and simply clicks a link out of curiosity, or is
-- asked to "check this out" by whoever owns it. process_my_referral()'s
-- only idempotency guard is "has this profile.id ever been referred
-- before" — it says nothing about whether the account is actually NEW.
-- An organic member who joined years ago with no referrer of their own
-- passes that guard every time, since it has never fired for them.
-- Confirmed against staging: a fixture with onboarding_completed_at
-- already set for days, referred_by NULL, zero prior referrals rows,
-- called process_my_referral() with a stranger's code and got
-- {"ok":true,"active_inserted":true} — a real row landed, inflating
-- that stranger's referred_count for someone who was never actually
-- recruited through their link. Reverted before this fix (deleted the
-- fabricated referrals row, reset the fixture's referred_by to NULL).
--
-- WHY onboarding_completed_at IS THE RIGHT SIGNAL, NOT profiles.created_at
-- or a new "is this really new" heuristic: it is already the app's own
-- definition of "still becoming a member" vs. "an existing member" —
-- ProtectedRoute gates the whole app on it, CompleteProfilePage.tsx's
-- own docstring calls it exactly that boundary. processReferralIfNeeded()
-- always fires from applyVerifiedSession(), which runs BEFORE the
-- member has ever reached the onboarding wizard — so for a genuine new
-- signup, onboarding_completed_at is still NULL at the one moment
-- referral crediting is supposed to happen. This doesn't touch or
-- replace the existing "already_processed" guard (still needed for
-- the mid-onboarding, already-credited-once case) — it closes a
-- different hole: crediting someone who is done being a prospect at all.
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
  v_my_onboarded    boolean;
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

  SELECT role, onboarding_completed_at IS NOT NULL
    INTO v_my_role, v_my_onboarded
    FROM public.profiles WHERE id = v_me;

  IF v_my_role = 'admin' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'caller_is_admin');
  END IF;

  -- An already-established member is not a prospect anymore, no matter
  -- what referral code is sitting in their browser.
  IF coalesce(v_my_onboarded, false) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_onboarded');
  END IF;

  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = v_me) THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'already_processed');
  END IF;

  SELECT id, role INTO v_referrer_id, v_referrer_role
    FROM public.profiles
   WHERE referral_code = p_code
   LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown_code');
  END IF;

  IF v_referrer_id = v_me THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'self_referral');
  END IF;

  IF v_referrer_role = 'admin' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'referrer_is_admin');
  END IF;

  PERFORM set_config('app.private_profile_write', '1', true);

  UPDATE public.profiles
     SET referred_by = p_code
   WHERE id = v_me
     AND (referred_by IS NULL OR referred_by = '');

  PERFORM set_config('app.private_profile_write', '0', true);

  BEGIN
    INSERT INTO public.referrals (referrer_id, referred_id, source)
    VALUES (v_referrer_id, v_me, 'active');
    v_active_inserted := true;
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

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

DO $$
BEGIN
  RAISE NOTICE 'process_my_referral: already-onboarded members can no longer be credited as a fresh referral';
END $$;
