-- =====================================================================
-- Backfill `constituency` on District President assignments where it is
-- currently NULL by copying it from a matching Assembly Coordinator
-- assignment for the same person (matched on whatsapp_number) in the
-- same district.
--
-- Why: District Presidents in Andhra Pradesh are typically also MLAs of a
-- specific constituency in their home district. The seed (new_16) only
-- recorded the district for DPs and stored their constituency under a
-- separate AC row. With the rule change that DPs do need a constituency,
-- this migration recovers it without manual data entry.
--
-- Strategy:
--   • Find every active DP assignment with constituency IS NULL.
--   • For each one, look for an active AC assignment whose
--     leaders_master.whatsapp_number = the DP leader's whatsapp_number
--     and whose district matches.
--   • If exactly one such AC row exists, copy its constituency over.
--   • If zero or multiple match, the DP row is left untouched — admin
--     can fill it from the Master Data page.
--
-- Idempotent. Re-running only touches DP rows still NULL.
-- =====================================================================

UPDATE public.leader_assignments dp_la
   SET constituency = ac.constituency
  FROM public.leaders_master dp_lm,
       (
         -- Distinct (mobile, district) → constituency map built from AC rows.
         SELECT DISTINCT
           lm.whatsapp_number,
           la.district,
           FIRST_VALUE(la.constituency) OVER (
             PARTITION BY lm.whatsapp_number, la.district
             ORDER BY la.created_at
           ) AS constituency,
           COUNT(*) OVER (
             PARTITION BY lm.whatsapp_number, la.district
           ) AS match_count
         FROM public.leader_assignments la
         JOIN public.leaders_master lm ON lm.id = la.leader_id
         WHERE la.role = 'Assembly Coordinator'
           AND la.is_active = true
           AND la.constituency IS NOT NULL
           AND la.constituency <> ''
       ) ac
 WHERE dp_la.role = 'District President'
   AND dp_la.is_active = true
   AND dp_la.constituency IS NULL
   AND dp_la.leader_id = dp_lm.id
   AND ac.whatsapp_number IS NOT NULL
   AND ac.whatsapp_number = dp_lm.whatsapp_number
   AND ac.district = dp_la.district
   -- Only copy when exactly one AC entry exists for this (person, district)
   -- pair, so we never guess between two ACs.
   AND ac.match_count = 1;

DO $verify$
DECLARE
  v_total_dp     int;
  v_dp_with_c    int;
  v_dp_null      int;
BEGIN
  SELECT count(*) INTO v_total_dp
    FROM public.leader_assignments
   WHERE role = 'District President' AND is_active = true;
  SELECT count(*) INTO v_dp_with_c
    FROM public.leader_assignments
   WHERE role = 'District President'
     AND is_active = true
     AND constituency IS NOT NULL
     AND constituency <> '';
  v_dp_null := v_total_dp - v_dp_with_c;

  RAISE NOTICE
    'District President backfill: % total active DP rows, % now have a constituency, % still NULL.',
    v_total_dp, v_dp_with_c, v_dp_null;
END $verify$;
