-- =====================================================================
-- 20260808110002 — apply the referral fixes that landed too late for
-- 20260808110000/20260808110001 to take effect on their own (both
-- already applied — editing them in place is a documented no-op for
-- supabase db push), plus the root cause: process_my_referral()'s
-- own write to profiles.referred_by has been silently reverted since
-- guard_privileged_profile_columns() started policing that column.
--
-- Reproduced live, not inferred: called process_my_referral() as a
-- real fixture (t.de.b, code SDXSSUE4) — a real `referrals` row
-- landed immediately (referrer_id/referred_id/source='active'), but
-- profiles.referred_by stayed NULL. guard_privileged_profile_columns()
-- (20260805114000_private_write_channel.sql /
-- 20260805230000_profile_mock_fields.sql) resets
-- NEW.referred_by := OLD.referred_by on every profiles UPDATE unless
-- app.private_profile_write is set for that transaction —
-- process_my_referral() predates that guard by months and never
-- learned the escape hatch every other privileged-column writer uses
-- (my_private_profile()'s own save RPC, same file, sets it around its
-- UPDATE the same way this fix does).
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

  SELECT role INTO v_my_role FROM public.profiles WHERE id = v_me;
  IF v_my_role = 'admin' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'caller_is_admin');
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

  -- The fix: without this, guard_privileged_profile_columns() reverts
  -- the write below on every call, silently.
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

REVOKE ALL ON FUNCTION public.process_my_referral(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.process_my_referral(text) TO authenticated;

-- ── re-apply the corrected admin_member_list and my_chapter_new_joinees
--    (their source files were fixed after being applied, so the fix
--    itself lands here) ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_member_list(
  p_search text DEFAULT NULL,
  p_limit  int  DEFAULT 200,
  p_offset int  DEFAULT 0
)
RETURNS TABLE (
  id uuid, public_user_code text, first_name text, last_name text,
  full_name text, email text, mobile_number text, whatsapp_number text,
  gender text, dob text, contribution text, profession text,
  organization text, designation text,
  country_of_residence text, state_abroad text, city_abroad text,
  indian_state text, district text, assembly_constituency text,
  mandal text, village text,
  family_relation text, family_name text, family_mobile text,
  family_village text, family_designation text,
  referral_code text, referred_by text,
  role text, status text, onboarding_completed_at timestamptz,
  created_at timestamptz,
  has_vote boolean, epic_number text, contribution_areas text[],
  wing_role text, wing_role_country text, wing_role_chapter text,
  referred_count bigint,
  total_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_global_scope() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id, p.public_user_code, p.first_name, p.last_name, p.full_name,
         p.email, p.mobile_number, p.whatsapp_number, p.gender, p.dob,
         p.contribution, p.profession, p.organization, p.designation,
         p.country_of_residence, p.state_abroad, p.city_abroad,
         p.indian_state, p.district, p.assembly_constituency,
         p.mandal, p.village,
         p.family_relation, p.family_name, p.family_mobile,
         p.family_village, p.family_designation,
         p.referral_code, p.referred_by,
         p.role, p.status, p.onboarding_completed_at, p.created_at,
         p.has_vote, p.epic_number, p.contribution_areas,
         mr.role::text, mr.country, ch.name,
         (SELECT count(*) FROM public.referrals r WHERE r.referrer_id = p.id),
         count(*) OVER ()
    FROM public.profiles p
    LEFT JOIN LATERAL (
      SELECT m.role, m.country, m.chapter_id
        FROM public.member_roles m
       WHERE m.profile_id = p.id AND m.revoked_at IS NULL
       ORDER BY public.role_rank(m.role::text)
       LIMIT 1
    ) mr ON true
    LEFT JOIN public.chapters ch ON ch.id = mr.chapter_id
   WHERE (
       p_search IS NULL OR btrim(p_search) = ''
       OR p.full_name     ILIKE '%' || btrim(p_search) || '%'
       OR p.email         ILIKE '%' || btrim(p_search) || '%'
       OR p.mobile_number ILIKE '%' || btrim(p_search) || '%'
       OR p.city_abroad   ILIKE '%' || btrim(p_search) || '%'
       OR p.public_user_code ILIKE '%' || btrim(p_search) || '%'
     )
   ORDER BY p.created_at DESC
   LIMIT greatest(1, least(coalesce(p_limit, 200), 2000))
  OFFSET greatest(0, coalesce(p_offset, 0));
END $$;

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

DO $$
BEGIN
  RAISE NOTICE 'referral regressions fixed live';
END $$;
