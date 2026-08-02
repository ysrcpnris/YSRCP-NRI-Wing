-- =====================================================================
-- Extend get_my_referrals so passive rows also carry the "direct"
-- referrer's profile — i.e. the person in the middle of the chain.
--
-- Why:
--   Network shape: A referred B; B referred C. From A's perspective,
--   C is a passive referral, and B is the user who actually brought C
--   in. The user dashboard wants to surface B's name on every passive
--   row (in a hover popover) so the viewer can see *who* connected
--   that passive member into their network.
--
-- Strategy:
--   For each row in `referrals` (already keyed by the calling user),
--   LEFT JOIN LATERAL to the active/direct referral that brought the
--   same `referred_id` into the system, and pull that referrer's
--   profile fields. Active rows have no "upstream" — the join simply
--   returns NULLs and the frontend hides the popover.
--
-- All upstream_* columns are nullable. Existing callers ignore them
-- harmlessly; the dashboard reads them only on passive rows.
--
-- Note: Postgres rejects changing the RETURNS TABLE shape of an existing
-- function via CREATE OR REPLACE — we have to DROP it first. Dropping
-- the function does NOT affect the underlying `referrals` /
-- `profiles` tables; only callers (the dashboard) need the new shape,
-- and they already account for the new columns.
-- =====================================================================

DROP FUNCTION IF EXISTS public.get_my_referrals(text[]);

CREATE FUNCTION public.get_my_referrals(p_source text[])
RETURNS TABLE (
  id                              uuid,
  created_at                      timestamptz,
  source                          text,
  referred_id                     uuid,
  first_name                      text,
  last_name                       text,
  mobile_number                   text,
  country_of_residence            text,
  state_abroad                    text,
  city_abroad                     text,
  indian_state                    text,
  district                        text,
  assembly_constituency           text,
  public_user_code                text,
  -- New: details of the active/direct referrer who brought this person
  -- into the network. NULL on rows that already are active/direct.
  upstream_first_name             text,
  upstream_last_name              text,
  upstream_mobile_number          text,
  upstream_country_of_residence   text,
  upstream_state_abroad           text,
  upstream_city_abroad            text,
  upstream_indian_state           text,
  upstream_district               text,
  upstream_assembly_constituency  text,
  upstream_public_user_code       text
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
    p.public_user_code,
    up.first_name              AS upstream_first_name,
    up.last_name               AS upstream_last_name,
    up.mobile_number           AS upstream_mobile_number,
    up.country_of_residence    AS upstream_country_of_residence,
    up.state_abroad            AS upstream_state_abroad,
    up.city_abroad             AS upstream_city_abroad,
    up.indian_state            AS upstream_indian_state,
    up.district                AS upstream_district,
    up.assembly_constituency   AS upstream_assembly_constituency,
    up.public_user_code        AS upstream_public_user_code
  FROM public.referrals r
  JOIN public.profiles  p ON p.id = r.referred_id
  -- Join the row that originally brought `referred_id` into the
  -- network (a direct/active referral). For passive rows this resolves
  -- to the "middle" user; for direct/active rows it'd resolve to
  -- themselves, which is fine but we hide it on the frontend.
  LEFT JOIN LATERAL (
    SELECT prof.first_name,
           prof.last_name,
           prof.mobile_number,
           prof.country_of_residence,
           prof.state_abroad,
           prof.city_abroad,
           prof.indian_state,
           prof.district,
           prof.assembly_constituency,
           prof.public_user_code
      FROM public.referrals up_r
      JOIN public.profiles prof ON prof.id = up_r.referrer_id
     WHERE up_r.referred_id = r.referred_id
       AND up_r.source IN ('direct', 'active')
       AND COALESCE(prof.role, 'user') <> 'admin'
     LIMIT 1
  ) up ON r.source = 'passive'
  WHERE r.referrer_id = auth.uid()
    AND r.source = ANY(p_source)
    AND COALESCE(p.role, 'user') <> 'admin'
  ORDER BY r.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_referrals(text[]) TO authenticated;
