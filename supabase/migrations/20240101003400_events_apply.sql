-- =====================================================================
-- Events: Apply / RSVP feature.
--
-- Why:
--   Admin creates either a Notification (announce-only) or an Event
--   (date required, users can apply). For each Event, admin needs to
--   see the list of users who applied and download it as Excel. The
--   list auto-clears 7 days after the event date so old data doesn't
--   pile up.
--
-- This migration introduces:
--   1. events.kind  text  ('event' | 'notification')  — separates the
--      two flavours. Defaults to 'event' so existing rows stay
--      apply-able. Pairs with a CHECK that forces a non-null `date` on
--      events of kind = 'event'.
--   2. event_applications table — one row per (event, user) with
--      RLS that lets users insert/delete only their own and admins
--      see/manage all.
--   3. get_event_applicants(event_id) — admin-only RPC that joins
--      applications to profile fields and applies the 7-day TTL on
--      read so expired rows are invisible even if the purge job
--      hasn't run yet.
--   4. purge_expired_event_applications() — actually deletes the
--      expired rows. Run from the admin frontend on page load (or
--      schedule via pg_cron if/when you enable it).
--
-- Idempotent — re-running this migration is a no-op.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. events.kind column + integrity CHECK
-- ---------------------------------------------------------------------
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'event';

-- Replace any pre-existing CHECK and recreate so re-running this
-- migration always lands on the canonical definition.
ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_kind_valid;
ALTER TABLE public.events
  ADD CONSTRAINT events_kind_valid
  CHECK (kind IN ('event', 'notification'));

-- An event-kind row must have a date. Notifications can be undated.
-- We can't add this CHECK if existing rows would violate it, so first
-- patch any null-dated 'event' rows up to a sentinel — but the cleanest
-- migration path is: leave them as 'notification' instead, since
-- "event with no date" doesn't make sense going forward.
UPDATE public.events
   SET kind = 'notification'
 WHERE kind = 'event' AND date IS NULL;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_event_kind_requires_date;
ALTER TABLE public.events
  ADD CONSTRAINT events_event_kind_requires_date
  CHECK (kind = 'notification' OR date IS NOT NULL);

-- ---------------------------------------------------------------------
-- 2. event_applications table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_applications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.events(id)   ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  applied_at  timestamptz DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS event_applications_event_idx
  ON public.event_applications (event_id);
CREATE INDEX IF NOT EXISTS event_applications_user_idx
  ON public.event_applications (user_id);

ALTER TABLE public.event_applications ENABLE ROW LEVEL SECURITY;

-- Admins read everything; users read only their own.
DROP POLICY IF EXISTS "event_applications_read" ON public.event_applications;
CREATE POLICY "event_applications_read" ON public.event_applications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Users insert only their own row (prevents one user signing up for
-- another). UNIQUE (event_id, user_id) prevents duplicates.
DROP POLICY IF EXISTS "event_applications_self_insert" ON public.event_applications;
CREATE POLICY "event_applications_self_insert" ON public.event_applications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can cancel (delete their own); admins can purge any.
DROP POLICY IF EXISTS "event_applications_delete" ON public.event_applications;
CREATE POLICY "event_applications_delete" ON public.event_applications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- ---------------------------------------------------------------------
-- 3. Admin-only RPC: list applicants for an event with profile fields.
--
-- The 7-day TTL is applied here on read so admin never sees expired
-- rows even if the purge job hasn't run yet. Falls back to "no TTL"
-- when the event has no date (shouldn't happen for kind='event' due
-- to the CHECK, but defensive).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_event_applicants(p_event_id uuid)
RETURNS TABLE (
  application_id         uuid,
  applied_at             timestamptz,
  user_id                uuid,
  full_name              text,
  email                  text,
  mobile_number          text,
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
    p.country_of_residence,
    p.city_abroad,
    p.indian_state,
    p.district,
    p.assembly_constituency,
    p.public_user_code
  FROM public.event_applications a
  JOIN public.events    e ON e.id = a.event_id
  JOIN public.profiles  p ON p.id = a.user_id
  WHERE a.event_id = p_event_id
    AND (e.date IS NULL OR e.date + interval '7 days' >= now())
  ORDER BY a.applied_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_applicants(uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- 4. Auto-purge function. Returns the number of rows deleted so the
-- admin frontend can show a small toast when it runs.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_expired_event_applications()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted int := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  WITH del AS (
    DELETE FROM public.event_applications a
    USING public.events e
    WHERE a.event_id = e.id
      AND e.date IS NOT NULL
      AND e.date + interval '7 days' < now()
    RETURNING a.id
  )
  SELECT count(*) INTO v_deleted FROM del;

  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_expired_event_applications() TO authenticated;

-- ---------------------------------------------------------------------
-- Sanity-check NOTICE
-- ---------------------------------------------------------------------
DO $verify$
DECLARE
  v_events    int;
  v_apply_evt int;
  v_notif     int;
BEGIN
  SELECT count(*) INTO v_events    FROM public.events;
  SELECT count(*) INTO v_apply_evt FROM public.events WHERE kind = 'event';
  SELECT count(*) INTO v_notif     FROM public.events WHERE kind = 'notification';
  RAISE NOTICE
    'Events feature: % rows total — % apply-able events, % notifications.',
    v_events, v_apply_evt, v_notif;
END $verify$;
