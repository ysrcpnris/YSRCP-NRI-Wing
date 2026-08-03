-- =====================================================================
-- 20260804093000 — voter status and EPIC number
--
-- Found while testing the chapter_members view: it was written to
-- exclude epic_number, and the exclusion silently passed because the
-- column did not exist. A boundary that holds only because the data is
-- missing is not a boundary.
--
-- WHY THE WING WANTS THIS
--   It is the number that separates a mailing list from a political
--   base. 2,611 members is a diaspora directory; "1,593 of them hold a
--   vote, spread across 38 constituencies" is an electoral asset.
--
-- WHY IT IS TREATED AS THE MOST SENSITIVE COLUMN IN THE DATABASE
--   Voter roll status is political-opinion data. Under GDPR Article 9
--   that is special-category for the ~700 members in the EU, and an
--   EPIC number is a government identifier. It stays with the
--   secretariat: not visible to coordinators, not in chapter_members,
--   never in any directory view.
-- =====================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_vote     boolean,
  ADD COLUMN IF NOT EXISTS epic_number  text;

COMMENT ON COLUMN public.profiles.has_vote IS
  'Registered on the AP electoral roll. NULL = not answered, which is '
  'distinct from false and must stay distinguishable in reporting.';

COMMENT ON COLUMN public.profiles.epic_number IS
  'Voter ID card number. Optional — constituency mapping works without '
  'it. Secretariat only: excluded from chapter_members by construction.';

-- Format check, deliberately loose. EPIC is conventionally three letters
-- and seven digits, but older cards vary by state and era. Rejecting a
-- member''s real card because it predates the convention would be worse
-- than storing an unusual one.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_epic_format_ck;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_epic_format_ck
  CHECK (epic_number IS NULL OR epic_number ~ '^[A-Za-z0-9/-]{6,20}$');

-- One EPIC belongs to one person. Two members claiming the same card is
-- either a typo or something worth looking at.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_epic_unique
  ON public.profiles (upper(epic_number))
  WHERE epic_number IS NOT NULL AND epic_number <> '';

-- Constituency-level voter coverage, for the admin screen. Aggregate
-- only — it reports how many members hold a vote, never who.
CREATE OR REPLACE VIEW public.voter_coverage
WITH (security_invoker = true) AS
SELECT
  p.assembly_constituency                                        AS constituency,
  p.district,
  count(*)                                                       AS members,
  count(*) FILTER (WHERE p.has_vote)                             AS voters,
  count(*) FILTER (WHERE p.has_vote AND p.epic_number IS NOT NULL) AS with_epic,
  count(*) FILTER (WHERE p.has_vote IS NULL)                     AS not_answered,
  round(100.0 * count(*) FILTER (WHERE p.has_vote) / nullif(count(*),0), 1) AS roll_pct
FROM public.profiles p
WHERE p.assembly_constituency IS NOT NULL AND p.assembly_constituency <> ''
GROUP BY p.assembly_constituency, p.district;

COMMENT ON VIEW public.voter_coverage IS
  'Aggregate voter counts per constituency. security_invoker means the '
  'caller''s RLS on profiles applies, so a coordinator sees only their '
  'own country''s members reflected here.';

GRANT SELECT ON public.voter_coverage TO authenticated;
