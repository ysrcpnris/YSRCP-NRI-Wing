-- =====================================================================
-- 20260808200000 — Overview (a-home), the Admin Console landing page
--
-- CHECKED WITH THE USER: replaces the legacy "Coordinator Dashboard"
--   currentPage === "dashboard" today renders a real, pre-redesign
--   continent -> country -> state drill-down over raw `registrations`
--   rows with an Export-to-Excel button — not a placeholder. The mock
--   has no equivalent at all. Superseded outright (same precedent as
--   a-digital/a-abroad superseding thinner WingManagement.tsx tabs);
--   if the Export capability turns out to matter operationally later,
--   that is a distinct, explicit follow-up, not silently preserved
--   here by accident.
--
-- ALMOST NOTHING NEW — a-home is a composite of RPCs that already
-- exist:
--   Countries active / top countries      -> admin_abroad_stats() / admin_abroad_countries()   (a-abroad)
--   On the voter roll % / confirmed count -> admin_voter_stats()                                (a-vote)
--   Members by country (bar list)         -> admin_abroad_countries()                           (a-abroad)
--   Appointment requests pending          -> pending_bookings_i_manage()                        (a-appt)
--   Assistance open / unanswered          -> admin_assistance_stats()                            (pre-redesign, live)
--   Grievances open / past SLA            -> admin_grievance_stats()                              (pre-redesign, live)
--   Feedback awaiting triage              -> admin_feedback_stats(), summed across heads          (a-feedback)
--   Constituency strength table           -> admin_voter_by_constituency()                        (a-vote) — see below
-- All composed client-side in AdminHome.tsx; no new RPC needed for any
-- of the above.
--
-- ONE GENUINE GAP: "Mandal cover" (e.g. "5/6")
--   No existing RPC counts distinct mandals-with-a-member per
--   constituency. admin_voter_by_constituency() gets a faithful diff:
--   +mandal_cover_have (distinct ap_mandals resolved via
--   resolve_mandal(), scoped per constituency per its own docstring —
--   mandal names repeat across constituencies) and
--   +mandal_cover_total (real mandal count for that constituency from
--   ap_mandals). Everything else about the function — gate, existing
--   columns, ordering — is unchanged. a-vote's own screen ignores the
--   two new trailing columns; nothing else calls this function.
--
-- "VERIFIED MEMBERS" IS A LABEL FIX, NOT A FILTER
--   profiles.status defaults to 'pending' and is never set to anything
--   else anywhere in this codebase (checked: no UPDATE profiles SET
--   status anywhere) — there is no real "verified" gate distinct from
--   "registered." Rendered as "Total members," matching intel_headline()'s
--   own gloss ("total registered"), not filtered by a status value that
--   would silently return the honest number: zero.
--
-- "+204 AWAITING IMPORT" — DROPPED
--   Already established: no bulk-import mechanism exists anywhere in
--   this codebase (20260808110000's own comment, a-members). Not
--   rebuilt here either.
--
-- "OPEN QUEUES" / "PAST SLA" TOTALS DON'T REDUCE TO THE MOCK'S OWN
-- NUMBERS
--   The mock's illustrative 44/9 aren't internally consistent (44
--   excludes feedback's 17; past-SLA sums to 7, not 9; appointments
--   have no past-SLA concept at all) — not a formula to reverse-engineer.
--   AdminHome.tsx sums all four real open-queue counts (appointments +
--   assistance + grievances + feedback) honestly, and shows past-SLA
--   only from the two sources that actually have a time-window concept
--   (grievances, assistance) rather than forcing a total that doesn't
--   exist.
--
-- GATE FRAGMENTATION IS PRE-EXISTING, NOT FIXED HERE
--   admin_grievance_stats()/admin_assistance_stats()/admin_feedback_stats()
--   are all is_admin()-only (not has_global_scope()); admin_abroad_stats()/
--   admin_voter_stats()/pending_bookings_i_manage() use has_global_scope().
--   A secretariat caller therefore sees a genuinely partial page — that
--   mirrors what each source screen already does for that caller, not
--   a new inconsistency introduced here. Not touched: changing another
--   screen's established gate is out of scope for this migration.
-- =====================================================================

DROP FUNCTION IF EXISTS public.admin_voter_by_constituency();
CREATE OR REPLACE FUNCTION public.admin_voter_by_constituency()
RETURNS TABLE (
  constituency_id     smallint,
  constituency        text,
  district             text,
  members              bigint,
  voters               bigint,
  epic_supplied        bigint,
  roll_pct             numeric,
  priority             text,
  mandal_cover_have    bigint,
  mandal_cover_total   bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_global_scope() THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH matched AS (
    SELECT p.has_vote AS m_has_vote, p.epic_number AS m_epic_number, p.mandal AS m_mandal,
           ac.id AS m_constituency_id, ac.name AS m_constituency_name, d.name AS m_district_name
      FROM public.profiles p
      JOIN public.ap_constituencies ac
        ON ac.id = public.resolve_constituency(coalesce(nullif(btrim(p.voter_constituency), ''), p.assembly_constituency))
      JOIN public.ap_districts d ON d.id = ac.district_id
  ),
  mandal_totals AS (
    SELECT am.constituency_id AS mt_constituency_id, count(*) AS mt_total
      FROM public.ap_mandals am
     GROUP BY am.constituency_id
  )
  SELECT
    matched.m_constituency_id,
    matched.m_constituency_name,
    matched.m_district_name,
    count(*),
    count(*) FILTER (WHERE matched.m_has_vote),
    count(*) FILTER (WHERE matched.m_has_vote AND matched.m_epic_number IS NOT NULL),
    round(100.0 * count(*) FILTER (WHERE matched.m_has_vote) / nullif(count(*), 0), 1),
    CASE
      WHEN round(100.0 * count(*) FILTER (WHERE matched.m_has_vote) / nullif(count(*), 0), 1) >= 65 THEN 'hold'
      WHEN round(100.0 * count(*) FILTER (WHERE matched.m_has_vote) / nullif(count(*), 0), 1) >= 45 THEN 'chase_epic'
      ELSE 'verify'
    END,
    count(DISTINCT public.resolve_mandal(matched.m_constituency_id, matched.m_mandal)),
    coalesce(max(mandal_totals.mt_total), 0::bigint)
  FROM matched
  LEFT JOIN mandal_totals ON mandal_totals.mt_constituency_id = matched.m_constituency_id
  GROUP BY matched.m_constituency_id, matched.m_constituency_name, matched.m_district_name
  ORDER BY count(*) FILTER (WHERE matched.m_has_vote) DESC, count(*) DESC;
END $$;

REVOKE ALL ON FUNCTION public.admin_voter_by_constituency() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_voter_by_constituency() TO authenticated;

COMMENT ON FUNCTION public.admin_voter_by_constituency() IS
  'ADMIN ONLY. mandal_cover_have/mandal_cover_total added for '
  'a-home''s "Constituency strength" table (20260808200000). '
  'Everything else about this function, including its priority '
  'thresholds, is unchanged from 20260808130000. Empty row set for '
  'non-admins.';

DO $$
BEGIN
  RAISE NOTICE 'admin_voter_by_constituency extended with mandal cover for a-home';
END $$;
