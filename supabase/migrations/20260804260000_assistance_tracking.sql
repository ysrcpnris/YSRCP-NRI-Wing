-- =====================================================================
-- 20260804260000 — make grievances and student requests usable
--
-- WHAT WAS ACTUALLY THERE
--   Both tables exist with sound, country-scoped policies (verified: a
--   USA member's grievance is invisible and unwritable to the Germany
--   coordinator; the member cannot close their own case). What was
--   missing is everything around them.
--
--   grievances is written by nothing and read by nothing. The only
--   mentions in the app are marketing copy — JoinUs.tsx advertises
--   "Submit and track grievances" as a member benefit that does not
--   exist. student_requests has no UI at all.
--
-- WHAT THIS ADDS
--   1. A reference number. "Your grievance was received" is useless if
--      neither side can name which one. GRV-2026-0001 / STU-2026-0001,
--      generated in the database so it cannot be skipped by a client.
--   2. Status as a constrained set rather than free text — every one of
--      these tables had `status text` with nothing stopping 'Open',
--      'open', 'OPEN' and 'in progress' from coexisting.
--   3. updated_at maintained by trigger, so "no reply in 3 weeks" is a
--      question that can be asked.
--   4. A per-member view of their own cases across all three types, so
--      "track" in that marketing line becomes true.
--
-- WHAT THIS DELIBERATELY DOES NOT DO
--   It does not touch the existing policies. They were audited and are
--   correct; rewriting working security to match a new feature is how
--   holes get made.
-- =====================================================================

-- ── reference numbers ────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.grievance_ref_seq;
CREATE SEQUENCE IF NOT EXISTS public.student_ref_seq;

ALTER TABLE public.grievances
  ADD COLUMN IF NOT EXISTS reference_no text,
  ADD COLUMN IF NOT EXISTS resolved_at  timestamptz;

ALTER TABLE public.student_requests
  ADD COLUMN IF NOT EXISTS reference_no text,
  ADD COLUMN IF NOT EXISTS resolved_at  timestamptz;

CREATE OR REPLACE FUNCTION public.assign_grievance_ref()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.reference_no IS NULL THEN
    NEW.reference_no := 'GRV-' || to_char(now(), 'YYYY') || '-' ||
                        lpad(nextval('public.grievance_ref_seq')::text, 4, '0');
  END IF;
  -- Stamp the moment a case is closed, so "how long did this take" is
  -- answerable without trawling an audit log.
  IF NEW.status IN ('resolved', 'closed') AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.resolved_at := coalesce(NEW.resolved_at, now());
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.assign_student_ref()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.reference_no IS NULL THEN
    NEW.reference_no := 'STU-' || to_char(now(), 'YYYY') || '-' ||
                        lpad(nextval('public.student_ref_seq')::text, 4, '0');
  END IF;
  IF NEW.status IN ('resolved', 'closed') AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.resolved_at := coalesce(NEW.resolved_at, now());
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_grievance_ref ON public.grievances;
CREATE TRIGGER trg_grievance_ref
  BEFORE INSERT OR UPDATE ON public.grievances
  FOR EACH ROW EXECUTE FUNCTION public.assign_grievance_ref();

DROP TRIGGER IF EXISTS trg_student_ref ON public.student_requests;
CREATE TRIGGER trg_student_ref
  BEFORE INSERT OR UPDATE ON public.student_requests
  FOR EACH ROW EXECUTE FUNCTION public.assign_student_ref();

-- Backfill anything already filed (none in staging, possibly some in
-- production) so no row is left without a reference.
UPDATE public.grievances
   SET reference_no = 'GRV-' || to_char(coalesce(created_at, now()), 'YYYY') || '-' ||
                      lpad(nextval('public.grievance_ref_seq')::text, 4, '0')
 WHERE reference_no IS NULL;

UPDATE public.student_requests
   SET reference_no = 'STU-' || to_char(coalesce(created_at, now()), 'YYYY') || '-' ||
                      lpad(nextval('public.student_ref_seq')::text, 4, '0')
 WHERE reference_no IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS grievances_reference_no_idx
  ON public.grievances (reference_no);
CREATE UNIQUE INDEX IF NOT EXISTS student_requests_reference_no_idx
  ON public.student_requests (reference_no);

-- ── status as a fixed set ────────────────────────────────────────────
-- Normalise first: a CHECK added over inconsistent free text would
-- reject the table's own existing rows.
UPDATE public.grievances
   SET status = lower(btrim(coalesce(status, 'open')))
 WHERE status IS DISTINCT FROM lower(btrim(coalesce(status, 'open')));
UPDATE public.grievances SET status = 'in_progress'
 WHERE status IN ('in progress', 'inprogress', 'progress');
UPDATE public.grievances SET status = 'open'
 WHERE status NOT IN ('open', 'in_progress', 'resolved', 'closed', 'rejected');

UPDATE public.student_requests
   SET status = lower(btrim(coalesce(status, 'open')))
 WHERE status IS DISTINCT FROM lower(btrim(coalesce(status, 'open')));
UPDATE public.student_requests SET status = 'in_progress'
 WHERE status IN ('in progress', 'inprogress', 'progress');
UPDATE public.student_requests SET status = 'open'
 WHERE status NOT IN ('open', 'in_progress', 'resolved', 'closed', 'rejected');

ALTER TABLE public.grievances
  DROP CONSTRAINT IF EXISTS grievances_status_check,
  ADD  CONSTRAINT grievances_status_check
       CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'rejected'));

ALTER TABLE public.student_requests
  DROP CONSTRAINT IF EXISTS student_requests_status_check,
  ADD  CONSTRAINT student_requests_status_check
       CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'rejected'));

ALTER TABLE public.grievances       ALTER COLUMN status SET DEFAULT 'open';
ALTER TABLE public.student_requests ALTER COLUMN status SET DEFAULT 'open';

-- ── the member's own cases, all three types in one list ──────────────
-- This is what makes "Submit and track grievances" true. Reads only the
-- caller's own rows — it is not a coordinator view.
CREATE OR REPLACE FUNCTION public.my_requests()
RETURNS TABLE (
  kind          text,
  id            uuid,
  reference_no  text,
  title         text,
  detail        text,
  status        text,
  response      text,
  created_at    timestamptz,
  updated_at    timestamptz,
  resolved_at   timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT 'grievance', g.id, g.reference_no, g.subject, g.description,
         g.status, g.response, g.created_at, g.updated_at, g.resolved_at
    FROM public.grievances g
   WHERE g.profile_id = auth.uid()

  UNION ALL

  SELECT 'student', s.id, s.reference_no,
         coalesce(s.request_type, 'Student assistance'), s.description,
         s.status, NULL, s.created_at, s.updated_at, s.resolved_at
    FROM public.student_requests s
   WHERE s.profile_id = auth.uid()

  UNION ALL

  -- service_requests uses user_id, not profile_id — the three tables
  -- were built at different times and never reconciled. Renaming the
  -- column would break the admin UI that already reads it, so the
  -- difference is absorbed here rather than in the schema.
  SELECT 'service', r.id, NULL,
         coalesce(r.service_category, r.service_type, 'Service request'),
         r.description, r.status, r.team_reply, r.created_at, NULL,
         r.team_resolved_at
    FROM public.service_requests r
   WHERE r.user_id = auth.uid()

   ORDER BY 8 DESC;
$$;

REVOKE ALL ON FUNCTION public.my_requests() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_requests() TO authenticated;

COMMENT ON FUNCTION public.my_requests() IS
  'Every case the caller has filed — grievances, student requests and '
  'service requests — in one list. Own rows only.';

DO $$
DECLARE missing int;
BEGIN
  SELECT count(*) INTO missing FROM public.grievances WHERE reference_no IS NULL;
  IF missing > 0 THEN
    RAISE EXCEPTION '% grievances still have no reference number', missing;
  END IF;
  RAISE NOTICE 'assistance tracking ready';
END $$;
