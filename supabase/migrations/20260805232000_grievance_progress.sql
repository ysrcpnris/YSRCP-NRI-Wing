-- =====================================================================
-- 20260805232000 — a real progress timeline for grievances
--
-- The prototype's Grievances screen shows a stage-by-stage log:
-- Received and acknowledged -> Assigned to X -> escalation notes ->
-- Resolution. Nothing in the schema records that; grievances has only
-- a flat status, one response field and (since 20260804260000) a
-- resolved_at timestamp. This is not a UI gap, it is a missing table.
--
-- WHAT THIS ADDS
--   grievance_progress — one append-only row per stage. Two stages are
--   SYSTEM-GENERATED, not left to a human to remember:
--     · "Received and acknowledged" on INSERT
--     · "Resolved" / "Closed" on the status transition, mirroring how
--       resolved_at itself is already stamped by assign_grievance_ref()
--   Everything between those is added by whoever is handling the case.
--
-- WRITE BOUNDARY
--   Deliberately the SAME predicate as grievances_update
--   (20260805120000), not a new one: has_global_scope() OR
--   assigned_to = auth.uid() OR can_write_country() over the
--   grievance owner's country. Adding a progress entry is a form of
--   updating the case, and a second, slightly different boundary here
--   is exactly how the read/write confusion bug happened three times
--   already this project (profiles_self_update, member_roles_write,
--   grievances_update itself) — copy the checked predicate, don't
--   re-derive it.
--
-- READ BOUNDARY
--   Mirrors grievances_read: the member who filed it, whoever it is
--   assigned to, admin, or anyone with read scope over its country.
--   Read is more permissive than write on purpose, same as the
--   grievance itself.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.grievance_progress (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grievance_id uuid NOT NULL REFERENCES public.grievances(id) ON DELETE CASCADE,
  stage_label  text NOT NULL,
  -- Free text, not a strict FK: many of the people named here (a
  -- Mandal President, "Revenue Desk") do not hold a portal login.
  actor_label  text,
  actor_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  note         text,
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS grievance_progress_grievance_idx
  ON public.grievance_progress (grievance_id, occurred_at);

ALTER TABLE public.grievance_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS grievance_progress_read ON public.grievance_progress;
CREATE POLICY grievance_progress_read ON public.grievance_progress
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.grievances g
       WHERE g.id = grievance_progress.grievance_id
         AND (
           g.profile_id = auth.uid()
           OR g.assigned_to = auth.uid()
           OR public.is_admin()
           OR public.has_country_scope(
                (SELECT p.country_of_residence FROM public.profiles p WHERE p.id = g.profile_id))
         )
    )
  );

DROP POLICY IF EXISTS grievance_progress_insert ON public.grievance_progress;
CREATE POLICY grievance_progress_insert ON public.grievance_progress
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.grievances g
       WHERE g.id = grievance_progress.grievance_id
         AND (
           public.has_global_scope()
           OR g.assigned_to = auth.uid()
           OR EXISTS (
                SELECT 1 FROM public.profiles p
                 WHERE p.id = g.profile_id
                   AND public.can_write_country(p.country_of_residence))
         )
    )
  );
-- No UPDATE or DELETE policy. This is an append-only log — a recorded
-- stage is historical fact, not something to edit after the fact.

-- ── system-generated stages ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.seed_grievance_progress()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.grievance_progress (grievance_id, stage_label, actor_label, created_by)
  VALUES (NEW.id, 'Received and acknowledged', 'Automatic', NEW.profile_id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_seed_grievance_progress ON public.grievances;
CREATE TRIGGER trg_seed_grievance_progress
  AFTER INSERT ON public.grievances
  FOR EACH ROW EXECUTE FUNCTION public.seed_grievance_progress();

CREATE OR REPLACE FUNCTION public.close_grievance_progress()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('resolved', 'closed') AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.grievance_progress (grievance_id, stage_label, actor_label, note, created_by)
    VALUES (
      NEW.id,
      CASE NEW.status WHEN 'resolved' THEN 'Resolved' ELSE 'Closed' END,
      NULL, NEW.response, auth.uid()
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_close_grievance_progress ON public.grievances;
CREATE TRIGGER trg_close_grievance_progress
  AFTER UPDATE ON public.grievances
  FOR EACH ROW EXECUTE FUNCTION public.close_grievance_progress();

-- ── read RPC, ordered chronologically like the mock ──────────────────
CREATE OR REPLACE FUNCTION public.grievance_progress(p_grievance_id uuid)
RETURNS TABLE (
  stage_label text, actor_label text, note text, occurred_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT gp.stage_label, gp.actor_label, gp.note, gp.occurred_at
    FROM public.grievance_progress gp
    JOIN public.grievances g ON g.id = gp.grievance_id
   WHERE gp.grievance_id = p_grievance_id
     AND (
       g.profile_id = auth.uid()
       OR g.assigned_to = auth.uid()
       OR public.is_admin()
       OR public.has_country_scope(
            (SELECT p.country_of_residence FROM public.profiles p WHERE p.id = g.profile_id))
     )
   ORDER BY gp.occurred_at;
$$;

REVOKE ALL ON FUNCTION public.grievance_progress(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.grievance_progress(uuid) TO authenticated;

-- ── a way to add a stage without a raw table insert ───────────────────
CREATE OR REPLACE FUNCTION public.add_grievance_progress(
  p_grievance_id uuid, p_stage_label text,
  p_actor_label text DEFAULT NULL, p_note text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.grievance_progress
    (grievance_id, stage_label, actor_label, note, created_by)
  VALUES (p_grievance_id, btrim(p_stage_label), nullif(btrim(p_actor_label), ''),
          nullif(btrim(p_note), ''), auth.uid());
  RETURN true;
-- The INSERT policy above does the actual authorisation; a caller
-- outside it gets 42501 here exactly as a direct insert would.
END $$;

REVOKE ALL ON FUNCTION public.add_grievance_progress(uuid, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.add_grievance_progress(uuid, text, text, text) TO authenticated;

DO $$
BEGIN
  IF to_regclass('public.grievance_progress') IS NULL THEN
    RAISE EXCEPTION 'grievance_progress table did not get created';
  END IF;
  RAISE NOTICE 'grievance_progress ready';
END $$;
