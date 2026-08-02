-- =====================================================================
-- One President and one Global Coordinator, globally.
--
-- Background:
--   The earlier unique-index migrations enforced per-district uniqueness
--   for AC / DP / RC. Two other roles are also singleton-by-definition:
--     • President         — single party head (YS Jagan)
--     • Global Coordinator — single NRI-Wing coordinator (Samba)
--   These rows have district = NULL, so a "per-district" unique index
--   wouldn't work. We use a partial index on `role` only — i.e. only
--   one active row may carry each of these role values.
--
-- Pre-flight dedupe identical in spirit to new_35 / new_36:
--   keep the most recent active row per role and soft-deactivate
--   the older ones. Idempotent.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Pre-flight cleanup
-- ---------------------------------------------------------------------
DO $dedupe$
DECLARE
  v_pres_dup int := 0;
  v_glob_dup int := 0;
BEGIN
  -- President
  WITH ranked AS (
    SELECT id,
           row_number() OVER (
             PARTITION BY role
             ORDER BY created_at DESC, id DESC
           ) AS rn
      FROM public.leader_assignments
     WHERE role = 'President' AND is_active = true
  ),
  upd AS (
    UPDATE public.leader_assignments la
       SET is_active = false
      FROM ranked r
     WHERE la.id = r.id AND r.rn > 1
     RETURNING la.id
  )
  SELECT count(*) INTO v_pres_dup FROM upd;

  -- Global Coordinator
  WITH ranked AS (
    SELECT id,
           row_number() OVER (
             PARTITION BY role
             ORDER BY created_at DESC, id DESC
           ) AS rn
      FROM public.leader_assignments
     WHERE role = 'Global Coordinator' AND is_active = true
  ),
  upd AS (
    UPDATE public.leader_assignments la
       SET is_active = false
      FROM ranked r
     WHERE la.id = r.id AND r.rn > 1
     RETURNING la.id
  )
  SELECT count(*) INTO v_glob_dup FROM upd;

  RAISE NOTICE
    'Pre-flight dedupe: % President duplicates and % Global Coordinator '
    'duplicates were soft-deactivated. Most recent active row was kept; '
    'older rows are now is_active=false (visible to admins for review or '
    're-activation).',
    v_pres_dup, v_glob_dup;
END $dedupe$;

-- ---------------------------------------------------------------------
-- 1. Unique active President
-- ---------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS leader_assignments_president_unique
  ON public.leader_assignments ((true))
  WHERE role = 'President' AND is_active = true;

-- ---------------------------------------------------------------------
-- 2. Unique active Global Coordinator
-- ---------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS leader_assignments_global_unique
  ON public.leader_assignments ((true))
  WHERE role = 'Global Coordinator' AND is_active = true;

-- ---------------------------------------------------------------------
-- Sanity-check NOTICE
-- ---------------------------------------------------------------------
DO $verify$
DECLARE
  v_pres int;
  v_glob int;
BEGIN
  SELECT count(*) INTO v_pres
    FROM public.leader_assignments
   WHERE role = 'President' AND is_active = true;
  SELECT count(*) INTO v_glob
    FROM public.leader_assignments
   WHERE role = 'Global Coordinator' AND is_active = true;
  RAISE NOTICE
    'Singletons enforced. Currently % active President and % active '
    'Global Coordinator (both must be <= 1).',
    v_pres, v_glob;
END $verify$;
