-- =====================================================================
-- Robustness pass — addresses three of the points raised by the client:
--   • One Assembly Coordinator per (district, constituency).
--   • One District President per district.
--   • Stop auto-deleting event_applications after 7 days — keep them
--     forever so admin always has the historical list.
--
-- Idempotent. Re-runnable.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Pre-flight cleanup — auto-resolve any pre-existing duplicates so
--    the unique indexes below can be created.
--
-- Strategy: keep the MOST RECENT active row per (role + scope) and
-- soft-deactivate the older ones (is_active = false). The deactivated
-- rows stay in the database for audit, and admin can re-activate via
-- the Master Data UI if a different choice was intended.
--
-- Done before the index creation because Postgres validates the index
-- against existing data — duplicates would abort the CREATE UNIQUE
-- INDEX. Soft-deactivating deduplicates without losing history.
-- ---------------------------------------------------------------------
DO $dedupe$
DECLARE
  v_ac_deactivated int := 0;
  v_dp_deactivated int := 0;
BEGIN
  -- Assembly Coordinator: one per (district, constituency).
  WITH ranked AS (
    SELECT id,
           row_number() OVER (
             PARTITION BY district, constituency
             ORDER BY created_at DESC, id DESC
           ) AS rn
      FROM public.leader_assignments
     WHERE role = 'Assembly Coordinator'
       AND is_active = true
       AND district IS NOT NULL
       AND constituency IS NOT NULL
  ),
  upd AS (
    UPDATE public.leader_assignments la
       SET is_active = false
      FROM ranked r
     WHERE la.id = r.id AND r.rn > 1
     RETURNING la.id
  )
  SELECT count(*) INTO v_ac_deactivated FROM upd;

  -- District President: one per district.
  WITH ranked AS (
    SELECT id,
           row_number() OVER (
             PARTITION BY district
             ORDER BY created_at DESC, id DESC
           ) AS rn
      FROM public.leader_assignments
     WHERE role = 'District President'
       AND is_active = true
       AND district IS NOT NULL
  ),
  upd AS (
    UPDATE public.leader_assignments la
       SET is_active = false
      FROM ranked r
     WHERE la.id = r.id AND r.rn > 1
     RETURNING la.id
  )
  SELECT count(*) INTO v_dp_deactivated FROM upd;

  RAISE NOTICE
    'Pre-flight dedupe: % AC duplicates and % DP duplicates were soft-deactivated. '
    'Most recent active row was kept; older rows are now is_active=false (visible '
    'to admins for review or re-activation).',
    v_ac_deactivated, v_dp_deactivated;
END $dedupe$;

-- ---------------------------------------------------------------------
-- 1. Unique-per-constituency for Assembly Coordinator
-- ---------------------------------------------------------------------
-- A unique INDEX (rather than CONSTRAINT) is used so the predicate
-- below can scope the rule to *active* AC rows only — soft-deleted
-- (is_active=false) rows must be allowed to coexist alongside their
-- replacement.
CREATE UNIQUE INDEX IF NOT EXISTS leader_assignments_ac_unique
  ON public.leader_assignments (district, constituency)
  WHERE role = 'Assembly Coordinator'
    AND is_active = true
    AND district IS NOT NULL
    AND constituency IS NOT NULL;

-- ---------------------------------------------------------------------
-- 2. Unique-per-district for District President
-- ---------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS leader_assignments_dp_unique
  ON public.leader_assignments (district)
  WHERE role = 'District President'
    AND is_active = true
    AND district IS NOT NULL;

-- ---------------------------------------------------------------------
-- 3. Drop the 7-day TTL on event_applications.
--    The previous version of get_event_applicants filtered out rows
--    whose event ended more than 7 days ago, and the
--    purge_expired_event_applications function actually deleted them.
--    The client wants both behaviours removed — keep the data forever.
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
  JOIN public.profiles  p ON p.id = a.user_id
  WHERE a.event_id = p_event_id
  ORDER BY a.applied_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_applicants(uuid) TO authenticated;

-- Replace the purge function with a no-op shell so any scheduled cron
-- still resolves but actually deletes nothing. Safer than dropping it
-- (callers stay valid).
CREATE OR REPLACE FUNCTION public.purge_expired_event_applications()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  -- Auto-deletion has been disabled by the client — keep the data.
  RETURN 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_expired_event_applications() TO authenticated;

-- ---------------------------------------------------------------------
-- Sanity-check NOTICE
-- ---------------------------------------------------------------------
DO $verify$
DECLARE
  v_ac_dups int;
  v_dp_dups int;
BEGIN
  -- Surface any pre-existing duplicates so admin knows what to clean
  -- up manually. The unique index above will already have refused to
  -- create itself if duplicates existed, so if we got here we're safe.
  SELECT count(*) INTO v_ac_dups FROM (
    SELECT district, constituency
      FROM public.leader_assignments
     WHERE role = 'Assembly Coordinator'
       AND is_active = true
       AND district IS NOT NULL
       AND constituency IS NOT NULL
     GROUP BY district, constituency
    HAVING count(*) > 1
  ) dupes;
  SELECT count(*) INTO v_dp_dups FROM (
    SELECT district
      FROM public.leader_assignments
     WHERE role = 'District President'
       AND is_active = true
       AND district IS NOT NULL
     GROUP BY district
    HAVING count(*) > 1
  ) dupes;
  RAISE NOTICE
    'Robustness migration: AC duplicate groups=%, DP duplicate groups=% (should both be 0).',
    v_ac_dups, v_dp_dups;
END $verify$;
