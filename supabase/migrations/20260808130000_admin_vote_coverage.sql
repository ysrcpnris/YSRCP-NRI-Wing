-- =====================================================================
-- 20260808130000 — Voter Coverage (a-vote)
--
-- public.voter_coverage (20260804093000_voter_fields.sql) has never
-- worked: it is `security_invoker = true`, so Postgres re-checks the
-- QUERYING role's own column privileges on profiles for every column
-- the view touches. has_vote/epic_number were revoked from
-- `authenticated` the same day, one migration later
-- (20260804094500_column_privileges.sql) — so any authenticated
-- caller, admin included, gets a bare permission-denied the moment
-- they select from it. It is referenced nowhere in src/ and has
-- presumably never been queried outside the SQL editor as a
-- superuser. Dropped below; replaced with the SECURITY DEFINER RPC
-- pattern every other admin screen already uses, which runs as the
-- function owner and so isn't subject to the caller's column grants.
--
-- Two RPCs, matching the mock's two data needs:
--   admin_voter_stats()          — the 4 stat cards, unconditional
--                                   over all profiles (mirrors the
--                                   mock: its 4 card values sum to the
--                                   full member count).
--   admin_voter_by_constituency() — the ranked table, one row per
--                                   resolved AP constituency.
--
-- CONSTITUENCY FIELD — checked with the user, not guessed:
--   profiles has two constituency fields kept deliberately separate
--   (20260805230000_profile_mock_fields.sql): voter_constituency is
--   where a member is registered to VOTE; assembly_constituency is
--   where they are FROM. The correct field for a voter-roll screen is
--   voter_constituency — but on staging it is 0/139 populated (the
--   MyProfile field exists, nobody has used it yet), while
--   assembly_constituency resolves cleanly for 136/139. Asked the
--   user: coalesce, preferring voter_constituency whenever a member
--   has supplied it, falling back to assembly_constituency so the
--   screen is useful today and self-corrects as members complete the
--   voter-roll question. Documented tradeoff: a member who moved
--   without updating their registration is counted under their home
--   constituency until they fill in voter_constituency.
--
-- PRIORITY — the mock shows a Hold/Chase EPIC/Verify pill with no
-- stated formula (just illustrative roll-% bands: ~69-74% Hold,
-- ~55-57% Chase EPIC, <40% Verify). Unlike Join-org/Import-cohort
-- (dropped elsewhere this batch for having literally no backing
-- column), this IS a real, always-computable classification over
-- real columns (roll_pct) — not a fabricated signal — so it's built
-- as a derived field, not dropped. Thresholds (>=65 hold, >=45
-- chase_epic, else verify) are my own judgment call sitting inside
-- the mock's illustrative bands, not a formula the mock stated
-- outright.
-- =====================================================================

DROP VIEW IF EXISTS public.voter_coverage;

CREATE OR REPLACE FUNCTION public.admin_voter_stats()
RETURNS TABLE (
  total_members     bigint,
  confirmed_voters  bigint,
  epic_supplied     bigint,
  no_vote           bigint,
  unanswered        bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_global_scope() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    count(*),
    count(*) FILTER (WHERE p.has_vote),
    count(*) FILTER (WHERE p.has_vote AND p.epic_number IS NOT NULL),
    count(*) FILTER (WHERE p.has_vote IS FALSE),
    count(*) FILTER (WHERE p.has_vote IS NULL)
  FROM public.profiles p;
END $$;

REVOKE ALL ON FUNCTION public.admin_voter_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_voter_stats() TO authenticated;

COMMENT ON FUNCTION public.admin_voter_stats() IS
  'ADMIN ONLY. Unconditional counts over all profiles — the 4 stat '
  'cards on the Voter Coverage screen. Empty row set for non-admins, '
  'same convention as admin_member_list().';

CREATE OR REPLACE FUNCTION public.admin_voter_by_constituency()
RETURNS TABLE (
  constituency_id smallint,
  constituency    text,
  district        text,
  members         bigint,
  voters          bigint,
  epic_supplied   bigint,
  roll_pct        numeric,
  priority        text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_global_scope() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ac.id,
    ac.name,
    d.name,
    count(*),
    count(*) FILTER (WHERE p.has_vote),
    count(*) FILTER (WHERE p.has_vote AND p.epic_number IS NOT NULL),
    round(100.0 * count(*) FILTER (WHERE p.has_vote) / nullif(count(*), 0), 1),
    CASE
      WHEN round(100.0 * count(*) FILTER (WHERE p.has_vote) / nullif(count(*), 0), 1) >= 65 THEN 'hold'
      WHEN round(100.0 * count(*) FILTER (WHERE p.has_vote) / nullif(count(*), 0), 1) >= 45 THEN 'chase_epic'
      ELSE 'verify'
    END
  FROM public.profiles p
  JOIN public.ap_constituencies ac
    ON ac.id = public.resolve_constituency(coalesce(nullif(btrim(p.voter_constituency), ''), p.assembly_constituency))
  JOIN public.ap_districts d ON d.id = ac.district_id
  GROUP BY ac.id, ac.name, d.name
  ORDER BY count(*) FILTER (WHERE p.has_vote) DESC, count(*) DESC;
END $$;

REVOKE ALL ON FUNCTION public.admin_voter_by_constituency() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_voter_by_constituency() TO authenticated;

COMMENT ON FUNCTION public.admin_voter_by_constituency() IS
  'ADMIN ONLY. Groups by resolve_constituency(coalesce(voter_constituency, '
  'assembly_constituency)) — see migration header for why. Empty row '
  'set for non-admins.';

DO $$
BEGIN
  RAISE NOTICE 'admin_voter_stats / admin_voter_by_constituency created; voter_coverage dropped';
END $$;
