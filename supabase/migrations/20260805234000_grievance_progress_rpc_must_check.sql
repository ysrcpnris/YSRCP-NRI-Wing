-- =====================================================================
-- 20260805234000 — add_grievance_progress() never actually checked anything
--
-- Caught by the same exploit pass as 20260805233000: the member who
-- FILED a test grievance called add_grievance_progress() on their own
-- case and it succeeded — status 200, the stage landed. It should have
-- been rejected; only admin, the assigned handler, or someone with
-- write scope over the grievance's country may add a stage.
--
-- The bug: the function is SECURITY DEFINER, which runs as the
-- function's OWNER, not the caller — and that owner is exempt from RLS.
-- The INSERT policy on grievance_progress is real and correctly scoped,
-- but it is NEVER CONSULTED from inside this function. The comment in
-- 20260805232000 claiming "the policy does the authorisation... a
-- caller outside it gets 42501" was wrong, and is exactly the kind of
-- comment CLAUDE.md warns about — describing a check that doesn't
-- happen. Every other write RPC in this codebase (grant_wing_role,
-- revoke_wing_role, update_my_private_profile) does its own explicit
-- check for this reason; this one didn't, and should have from the
-- start.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.add_grievance_progress(
  p_grievance_id uuid, p_stage_label text,
  p_actor_label text DEFAULT NULL, p_note text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ok boolean;
BEGIN
  SELECT (
    public.has_global_scope()
    OR g.assigned_to = auth.uid()
    OR EXISTS (
         SELECT 1 FROM public.profiles p
          WHERE p.id = g.profile_id
            AND public.can_write_country(p.country_of_residence))
  ) INTO v_ok
    FROM public.grievances g
   WHERE g.id = p_grievance_id;

  IF v_ok IS NOT TRUE THEN
    RAISE EXCEPTION 'not authorised to update this grievance' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.grievance_progress
    (grievance_id, stage_label, actor_label, note, created_by)
  VALUES (p_grievance_id, btrim(p_stage_label), nullif(btrim(p_actor_label), ''),
          nullif(btrim(p_note), ''), auth.uid());
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.add_grievance_progress(uuid, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.add_grievance_progress(uuid, text, text, text) TO authenticated;
