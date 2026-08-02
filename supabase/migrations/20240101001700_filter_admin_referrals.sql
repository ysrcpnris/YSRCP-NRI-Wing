-- =====================================================================
-- Filter admin accounts out of the referral system.
--
-- Why:
--   The referral pipeline (processReferralIfNeeded + new_14 backfill) didn't
--   filter by role, so admin accounts that signed up via someone's /ref/<code>
--   link ended up as that user's "Active Referral" — and the referrer was
--   incorrectly credited +50 (active) and the grandparent +10 (passive).
--
-- This migration:
--   1. Posts reversal entries in credit_transactions for every credit that
--      was awarded for an admin-targeted referral (auditable, append-only).
--   2. Deletes those referral rows so they stop showing on dashboards.
--   3. Replaces get_my_referrals() with a version that filters out admins,
--      so any future stray admin referral can never surface in the UI.
--
-- The frontend (AuthContext.processReferralIfNeeded) now also early-returns
-- when the new user is an admin, so the situation can't recur.
--
-- Idempotent: re-running is safe — the reversal step only acts on referrals
-- that still exist, and the RPC replacement is CREATE OR REPLACE.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Reverse credits for admin-targeted referrals, then delete the rows
-- ---------------------------------------------------------------------
DO $admin_ref_cleanup$
DECLARE
  r              record;
  v_reversed     int := 0;
  v_deleted      int := 0;
BEGIN
  -- For every credit_transactions row whose ref_id points to a referral
  -- whose referred_id is an admin, post the inverse entry. We match by
  -- ref_id (the referral's id::text written by referrals_post_credits).
  FOR r IN
    SELECT
      ct.id        AS ct_id,
      ct.user_id   AS user_id,
      ct.delta     AS delta,
      ct.reason    AS reason,
      ct.ref_id    AS ref_id
    FROM public.credit_transactions ct
    JOIN public.referrals  rf ON rf.id::text = ct.ref_id
    JOIN public.profiles   p  ON p.id = rf.referred_id
    WHERE ct.reason IN ('active', 'passive')
      AND p.role = 'admin'
      -- Skip if a reversal has already been posted for this exact ct row
      AND NOT EXISTS (
        SELECT 1 FROM public.credit_transactions ct2
         WHERE ct2.user_id = ct.user_id
           AND ct2.reason  = 'referral_reversal'
           AND ct2.ref_id  = ct.id::text
      )
  LOOP
    INSERT INTO public.credit_transactions
      (user_id, delta, reason, ref_id, note)
    VALUES
      (r.user_id, -r.delta, 'referral_reversal', r.ct_id::text,
       'Reversed: referred user is an admin (was reason=' || r.reason || ')');
    v_reversed := v_reversed + 1;
  END LOOP;

  -- Now delete the referral rows themselves (no trigger fires on DELETE).
  WITH del AS (
    DELETE FROM public.referrals rf
    USING public.profiles p
    WHERE p.id = rf.referred_id
      AND p.role = 'admin'
    RETURNING rf.id
  )
  SELECT count(*) INTO v_deleted FROM del;

  RAISE NOTICE
    'Admin referral cleanup: % credit reversals posted, % referral rows deleted',
    v_reversed, v_deleted;
END
$admin_ref_cleanup$;


-- ---------------------------------------------------------------------
-- 2. Replace get_my_referrals so admin profiles are filtered out
--    on read too — defence in depth.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_referrals(p_source text[])
RETURNS TABLE (
  id                     uuid,
  created_at             timestamptz,
  source                 text,
  referred_id            uuid,
  first_name             text,
  last_name              text,
  mobile_number          text,
  country_of_residence   text,
  state_abroad           text,
  city_abroad            text,
  indian_state           text,
  district               text,
  assembly_constituency  text,
  public_user_code       text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.created_at,
    r.source,
    r.referred_id,
    p.first_name,
    p.last_name,
    p.mobile_number,
    p.country_of_residence,
    p.state_abroad,
    p.city_abroad,
    p.indian_state,
    p.district,
    p.assembly_constituency,
    p.public_user_code
  FROM public.referrals r
  JOIN public.profiles  p ON p.id = r.referred_id
  WHERE r.referrer_id = auth.uid()
    AND r.source = ANY(p_source)
    -- Hide admin-role profiles from the referral lists. coalesce so legacy
    -- rows with NULL role (shouldn't exist, but be safe) are still shown.
    AND COALESCE(p.role, 'user') <> 'admin'
  ORDER BY r.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_referrals(text[]) TO authenticated;
