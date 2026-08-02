-- =====================================================================
-- Org Hierarchy: introduce the "President" role and seed Y.S. Jagan
-- Mohan Reddy at the top of the leadership chain.
--
-- Why:
--   The leadership tree spans 5 tiers (President → Global/NRI Coordinator
--   + Regional Coordinators → District Presidents → Assembly Coordinators).
--   Tiers 2-5 are already in the seed. This migration adds Tier 1 so the
--   user dashboard can render a "Reports to: … → YS Jagan" chain on every
--   leader card and the admin org-hierarchy view has a single root.
--
-- Strategy:
--   • leaders_master already has a row for Y.S. Jagan Mohan Reddy (created
--     by new_16 as the Assembly Coordinator for Pulivendula). We reuse
--     that row and add a SECOND assignment with role = 'President',
--     district / constituency NULL — same scoping pattern as the Global
--     Coordinator (visible to every user logically; in practice the user
--     dashboard only shows it inside the upward chain, not as a standalone
--     card).
--   • If the master row doesn't exist for any reason (e.g. seed wasn't
--     run), create it.
--
-- Sort order:
--   sort_order = -1 for President so it sorts ABOVE Global Coordinator (0).
--   Existing rows are unchanged.
--
-- Idempotent — re-running this file is a no-op after the first run.
-- =====================================================================

DO $org$
DECLARE
  v_jagan_id uuid;
BEGIN
  -- Find or create the master row for YS Jagan.
  SELECT id INTO v_jagan_id
    FROM public.leaders_master
   WHERE name = 'Y.S. Jagan Mohan Reddy'
     AND whatsapp_number = '0000000000'
   LIMIT 1;

  IF v_jagan_id IS NULL THEN
    INSERT INTO public.leaders_master (name, whatsapp_number, is_active)
    VALUES ('Y.S. Jagan Mohan Reddy', '0000000000', true)
    RETURNING id INTO v_jagan_id;
    RAISE NOTICE 'Created new leaders_master row for YS Jagan (id=%)', v_jagan_id;
  END IF;

  -- Add the President assignment if it doesn't already exist.
  INSERT INTO public.leader_assignments
    (leader_id, role, district, constituency, is_active, sort_order)
  SELECT v_jagan_id, 'President', NULL, NULL, true, -1
   WHERE NOT EXISTS (
     SELECT 1 FROM public.leader_assignments
      WHERE leader_id = v_jagan_id
        AND role      = 'President'
        AND district  IS NULL
        AND constituency IS NULL
   );
END $org$;

-- ---------------------------------------------------------------------
-- Helper view for the admin Org Hierarchy tab.
-- Pre-joins leaders_master + leader_assignments so the admin client can
-- fetch the full tree with one SELECT and no nested PostgREST embedding.
-- Read-only; respects existing RLS on the underlying tables.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.org_hierarchy_v AS
SELECT
  la.id            AS assignment_id,
  la.role,
  la.district,
  la.constituency,
  la.sort_order,
  la.is_active,
  lm.id            AS leader_id,
  lm.name,
  lm.whatsapp_number,
  lm.whatsapp_number_2,
  lm.photo_url
FROM public.leader_assignments la
JOIN public.leaders_master      lm ON lm.id = la.leader_id
WHERE la.is_active = true
  AND lm.is_active = true;

GRANT SELECT ON public.org_hierarchy_v TO anon, authenticated;

-- ---------------------------------------------------------------------
-- Sanity-check NOTICE
-- ---------------------------------------------------------------------
DO $verify$
DECLARE
  v_president  int;
  v_global     int;
  v_rc         int;
  v_dp         int;
  v_ac         int;
BEGIN
  SELECT count(*) INTO v_president FROM public.leader_assignments WHERE role = 'President'           AND is_active;
  SELECT count(*) INTO v_global    FROM public.leader_assignments WHERE role = 'Global Coordinator'  AND is_active;
  SELECT count(*) INTO v_rc        FROM public.leader_assignments WHERE role = 'Regional Coordinator' AND is_active;
  SELECT count(*) INTO v_dp        FROM public.leader_assignments WHERE role = 'District President'  AND is_active;
  SELECT count(*) INTO v_ac        FROM public.leader_assignments WHERE role = 'Assembly Coordinator' AND is_active;
  RAISE NOTICE
    'Org hierarchy: % President, % Global Coord, % RC, % DP, % AC active assignments.',
    v_president, v_global, v_rc, v_dp, v_ac;
END $verify$;
