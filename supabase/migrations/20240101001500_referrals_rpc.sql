-- =====================================================================
-- RPC: get_my_referrals(source[])
--
-- Returns the joined view of referrals + the referred user's display info
-- (name, mobile, location, public_user_code) for the calling user only.
--
-- Why: profiles RLS is "user can SELECT own profile only" (correctly
-- restrictive). That means the embedded PostgREST join
--   referrals { profiles:referred_id (first_name, ...) }
-- returns NULLs for the referred user's columns — so the dashboard shows
-- "Member" with no details.
--
-- This RPC runs SECURITY DEFINER, joining referrals → profiles inside the
-- function. Access is still scoped to auth.uid() so users only see their
-- own referral tree, not anyone else's.
-- =====================================================================

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
  -- Reject if no auth context (anon callers shouldn't reach this).
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
  ORDER BY r.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_referrals(text[]) TO authenticated;
