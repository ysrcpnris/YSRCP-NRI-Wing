-- =====================================================================
-- 20260807110001 — SECURITY FIX: grievances/student_requests protected
-- columns were silently reopened, found while exploit-testing a-griev
--
-- WHAT HAPPENED
--   20260805092000 protected status/response/assigned_to (grievances)
--   and status/assigned_mentor_id (student_requests) with column-level
--   REVOKE + a re-GRANT covering every OTHER column, forcing writes to
--   those fields through respond_to_case()/assign_case() only.
--
--   20260805233000 then fixed a real outage — nobody, admin included,
--   could resolve a case, because UPDATE had never been granted on
--   either table AT ALL — by issuing a blanket
--   `GRANT UPDATE ON public.grievances TO authenticated` (and the same
--   for student_requests). That fixed the outage but is a TABLE-level
--   grant, which in Postgres is a separate, independent privilege from
--   a column-level one. It reopened every column the earlier migration
--   had protected — REVOKE UPDATE (col) does not touch a table-level
--   grant that already covers that column, so the protection silently
--   stopped applying to anyone the row policy lets through (any
--   country coordinator, or the current assignee).
--
-- HOW THIS WAS FOUND
--   Not inferred — reproduced directly against staging. As the Germany
--   coordinator (has row access via can_write_country), a raw PATCH:
--     PATCH /rest/v1/grievances?id=eq.<id>
--     {"status":"closed","response":"DIRECT REST BYPASS TEST"}
--   returned 200 and the row actually changed (confirmed via a
--   follow-up admin read) — completely bypassing respond_to_case()'s
--   status normalisation and scope checks. This was caught while
--   building a-griev's assigned_leader_id column, whose own REVOKE
--   turned out to have exactly the same problem for the same reason —
--   which is what prompted checking the OTHER protected columns too,
--   rather than assuming the fix for one column meant the others were
--   fine.
--
-- THE FIX
--   REVOKE the blanket table-level grants entirely, then re-apply the
--   column-list GRANT pattern from 20260805092000/20260805092000,
--   extended to also protect the new assigned_leader_id column added
--   in 20260807110000. respond_to_case()/assign_case()/
--   assign_grievance_leader() are all SECURITY DEFINER and run as the
--   table owner, so none of them need a grant — this only removes
--   direct-REST access, not the RPCs' ability to write.
-- =====================================================================

REVOKE UPDATE ON public.grievances       FROM authenticated;
REVOKE UPDATE ON public.student_requests FROM authenticated;

DO $$
DECLARE protected text[] := ARRAY['id','profile_id','status','response','assigned_to',
                                  'assigned_leader_id','reference_no','resolved_at','created_at'];
        cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ') INTO cols
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='grievances'
     AND column_name <> ALL (protected);
  EXECUTE format('GRANT UPDATE (%s) ON public.grievances TO authenticated', cols);
END $$;

DO $$
DECLARE protected text[] := ARRAY['id','profile_id','status','assigned_mentor_id',
                                  'reference_no','resolved_at','created_at'];
        cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ') INTO cols
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='student_requests'
     AND column_name <> ALL (protected);
  EXECUTE format('GRANT UPDATE (%s) ON public.student_requests TO authenticated', cols);
END $$;

-- ── assert the fix, the same way the original migration did ──────────
DO $$
DECLARE bad text;
BEGIN
  SELECT string_agg(format('%s.%s', table_name, column_name), ', ')
    INTO bad
    FROM information_schema.column_privileges
   WHERE table_schema = 'public'
     AND grantee = 'authenticated'
     AND privilege_type = 'UPDATE'
     AND (
       (table_name = 'grievances' AND column_name IN
         ('id','profile_id','status','response','assigned_to','assigned_leader_id',
          'reference_no','resolved_at','created_at'))
       OR (table_name = 'student_requests' AND column_name IN
         ('id','profile_id','status','assigned_mentor_id','reference_no','resolved_at','created_at'))
     );
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'still directly writable: %', bad;
  END IF;

  RAISE NOTICE 'protected columns restored on grievances and student_requests';
END $$;
