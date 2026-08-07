-- =====================================================================
-- 20260808110001 — my_chapter_new_joinees(): fix referred_by join
--
-- FOUND WHILE BUILDING a-members, NOT RELATED TO THAT SCREEN
--   20260806150000 joined `ref.public_user_code = p.referred_by` to
--   compute "referred by" for the c-home "New joinees this week"
--   table. That column is wrong twice over: profiles.referred_by is
--   meant to hold the referrer's referral_code, not public_user_code
--   (confirmed via process_my_referral()'s own lookup and the live
--   "Copy invite link" in Dashboard.tsx) — but reproducing a real
--   referral live found referred_by is ALSO never actually written:
--   guard_privileged_profile_columns() (20260805114000/20260805230000)
--   silently reverts NEW.referred_by := OLD.referred_by on every
--   profiles UPDATE unless app.private_profile_write is set, which
--   process_my_referral() (written months earlier) never learned to
--   do. Fixed at the source in 20260808110002.
--
--   Rather than depend on that fragile denormalised column at all,
--   this join reads the `referrals` table (referrer_id/referred_id) —
--   the row process_my_referral() DOES reliably insert, confirmed
--   live: called it as a real fixture, a real referrals row landed
--   immediately. Correct regardless of whether referred_by itself
--   ever gets fixed.
-- =====================================================================

DROP FUNCTION IF EXISTS public.my_chapter_new_joinees(int);
CREATE OR REPLACE FUNCTION public.my_chapter_new_joinees(p_days int DEFAULT 7)
RETURNS TABLE (
  id uuid, full_name text, city_abroad text, created_at timestamptz,
  referred_by_name text, core_fields_complete boolean, welcomed_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.city_abroad, p.created_at,
         ref.full_name,
         (p.mobile_number IS NOT NULL AND p.dob IS NOT NULL AND p.gender IS NOT NULL
          AND p.assembly_constituency IS NOT NULL AND p.city_abroad IS NOT NULL),
         p.welcomed_at
    FROM public.profiles p
    LEFT JOIN public.referrals rf ON rf.referred_id = p.id AND rf.source = 'active'
    LEFT JOIN public.profiles ref ON ref.id = rf.referrer_id
   WHERE public.member_in_scope(p.country_of_residence, p.city_abroad)
     AND p.created_at > now() - make_interval(days => greatest(1, least(coalesce(p_days, 7), 90)))
   ORDER BY p.created_at DESC
   LIMIT 100;
$$;

REVOKE ALL ON FUNCTION public.my_chapter_new_joinees(int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_chapter_new_joinees(int) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'referred_by join corrected';
END $$;
