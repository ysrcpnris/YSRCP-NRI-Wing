-- =====================================================================
-- Clear `constituency` on every active District President assignment.
--
-- Why:
--   The earlier migration `new_27_dp_constituency_backfill.sql` copied
--   each DP's constituency from their matching Assembly Coordinator row
--   so they could be displayed at constituency-level. The client has
--   since decided that District Presidents should NOT carry a
--   constituency — they are district-level leaders covering the entire
--   district. With a constituency set, the user-side query (which
--   filters by `constituency.ilike.X OR constituency.is.null`) would
--   surface a DP only to users in that single constituency rather than
--   to every user in the whole district.
--
-- Strategy:
--   Set constituency = NULL on every active DP row. AC rows are not
--   touched. The DP master record (and its district) is untouched.
--
-- Idempotent — only updates DP rows where constituency is currently set.
-- =====================================================================

DO $clear$
DECLARE
  v_cleared int;
BEGIN
  WITH t AS (
    UPDATE public.leader_assignments
       SET constituency = NULL
     WHERE role = 'District President'
       AND is_active = true
       AND constituency IS NOT NULL
       AND constituency <> ''
     RETURNING 1
  )
  SELECT count(*) INTO v_cleared FROM t;

  RAISE NOTICE
    'District President constituency clear: % rows updated.',
    v_cleared;
END $clear$;
