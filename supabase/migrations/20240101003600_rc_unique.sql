-- =====================================================================
-- One Regional Coordinator per district.
--
-- A single Regional Coordinator may cover multiple districts (e.g. one
-- RC overseeing 4 districts is normal), but each district must have
-- exactly one RC. The frontend Master Data form already does a
-- friendly pre-save check; this index enforces the rule at the DB
-- level too, so even direct API calls or admin SQL can't slip past it.
--
-- Includes a pre-flight dedupe identical in spirit to new_35: keep the
-- most recent active row per district and soft-deactivate the rest.
-- Idempotent.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Pre-flight cleanup — soft-deactivate older duplicate RC rows so
--    the unique index below can be created.
-- ---------------------------------------------------------------------
DO $dedupe$
DECLARE
  v_rc_deactivated int := 0;
BEGIN
  WITH ranked AS (
    SELECT id,
           row_number() OVER (
             PARTITION BY district
             ORDER BY created_at DESC, id DESC
           ) AS rn
      FROM public.leader_assignments
     WHERE role = 'Regional Coordinator'
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
  SELECT count(*) INTO v_rc_deactivated FROM upd;

  RAISE NOTICE
    'Pre-flight dedupe: % RC duplicates were soft-deactivated. '
    'Most recent active row per district was kept; older rows are now '
    'is_active=false (visible to admins for review or re-activation).',
    v_rc_deactivated;
END $dedupe$;

-- ---------------------------------------------------------------------
-- 1. Unique-per-district for Regional Coordinator
-- ---------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS leader_assignments_rc_unique
  ON public.leader_assignments (district)
  WHERE role = 'Regional Coordinator'
    AND is_active = true
    AND district IS NOT NULL;

-- ---------------------------------------------------------------------
-- Sanity-check NOTICE
-- ---------------------------------------------------------------------
DO $verify$
DECLARE
  v_rc_dups int;
BEGIN
  SELECT count(*) INTO v_rc_dups FROM (
    SELECT district
      FROM public.leader_assignments
     WHERE role = 'Regional Coordinator'
       AND is_active = true
       AND district IS NOT NULL
     GROUP BY district
    HAVING count(*) > 1
  ) dupes;
  RAISE NOTICE
    'RC unique migration complete. Remaining duplicate-district groups: % (should be 0).',
    v_rc_dups;
END $verify$;
