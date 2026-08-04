-- =====================================================================
-- 20260805233000 — UPDATE was never granted on grievances/student_requests
--
-- Found while exploit-verifying grievance_progress (20260805232000): an
-- admin PATCH to resolve a test grievance returned 42501 "permission
-- denied for table grievances" — not an RLS rejection (which reads
-- "row-level security policy"), a missing table-level GRANT. Postgres
-- checks the GRANT before RLS is ever consulted, so grievances_update
-- and student_requests_update — both correctly scoped, both edited
-- more than once (20260804091500, 20260805092000, 20260805120000) —
-- have been unreachable by anyone, admin included, the whole time.
--
-- Checked via information_schema.table_privileges, not assumed:
--   grievances        authenticated: DELETE INSERT REFERENCES SELECT
--                     TRIGGER TRUNCATE  — no UPDATE
--   student_requests  same shape — no UPDATE
--   service_requests  HAS UPDATE — this table was fine
--
-- Practical effect: resolving a grievance or a student request from any
-- admin or coordinator screen has been failing since whichever slice
-- built grievances_update, and nothing surfaced it because the error
-- reads identically to "you don't have write scope here" rather than
-- "no one does" — the two are easy to conflate without checking the
-- SQLSTATE and message text specifically, which is what caught it here.
-- =====================================================================

GRANT UPDATE ON public.grievances       TO authenticated;
GRANT UPDATE ON public.student_requests TO authenticated;

-- grievance_progress is append-only by design (a recorded stage is
-- historical fact). RLS currently blocks UPDATE/DELETE only because no
-- policy exists for those commands — true, but silent: a caller gets
-- "0 rows affected" rather than a clear denial, which is the exact
-- PostgREST trap this project's own review history flags repeatedly.
-- REVOKE makes the boundary an explicit 42501 instead.
REVOKE UPDATE, DELETE ON public.grievance_progress FROM authenticated;

DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(t.tbl, ', ') INTO missing
    FROM (VALUES ('grievances'), ('student_requests')) AS t(tbl)
   WHERE NOT EXISTS (
     SELECT 1 FROM information_schema.table_privileges
      WHERE table_schema='public' AND table_name=t.tbl
        AND grantee='authenticated' AND privilege_type='UPDATE');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'still missing UPDATE grant: %', missing;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_privileges
     WHERE table_schema='public' AND table_name='grievance_progress'
       AND grantee='authenticated' AND privilege_type IN ('UPDATE','DELETE')) THEN
    RAISE EXCEPTION 'grievance_progress is still writable after the revoke';
  END IF;

  RAISE NOTICE 'grants fixed';
END $$;
