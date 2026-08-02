-- =====================================================================
-- Extend get_event_applicants() to also return the applicant's gender.
--
-- Why:
--   Admins viewing the applicants of an event want to see gender
--   alongside name / contact / location. The previous version of this
--   RPC (in new_35) didn't surface it, so the admin had to cross-
--   reference the All Users page manually.
--
-- Postgres won't let CREATE OR REPLACE change the return shape, so we
-- DROP and re-create. Idempotent.
-- =====================================================================

DROP FUNCTION IF EXISTS public.get_event_applicants(uuid);

CREATE FUNCTION public.get_event_applicants(p_event_id uuid)
RETURNS TABLE (
  application_id         uuid,
  applied_at             timestamptz,
  user_id                uuid,
  full_name              text,
  email                  text,
  mobile_number          text,
  gender                 text,
  country_of_residence   text,
  city_abroad            text,
  indian_state           text,
  district               text,
  assembly_constituency  text,
  public_user_code       text
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.applied_at,
    a.user_id,
    NULLIF(
      trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')),
      ''
    ) AS full_name,
    p.email,
    p.mobile_number,
    p.gender,
    p.country_of_residence,
    p.city_abroad,
    p.indian_state,
    p.district,
    p.assembly_constituency,
    p.public_user_code
  FROM public.event_applications a
  JOIN public.profiles  p ON p.id = a.user_id
  WHERE a.event_id = p_event_id
  ORDER BY a.applied_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_applicants(uuid) TO authenticated;
