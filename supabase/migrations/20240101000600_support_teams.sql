-- =====================================================================
-- SUPPORT TEAMS
-- Teams that admins can assign to service requests.
-- Admin can add / remove / toggle teams; the dropdown in Assistance
-- reads from this table.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.support_teams (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  description text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_teams_active_idx ON public.support_teams(is_active);

-- Seed the default team (idempotent)
INSERT INTO public.support_teams (name, description)
VALUES ('General Support Team', 'Default team for unassigned service requests')
ON CONFLICT (name) DO NOTHING;

-- Keep updated_at in sync
CREATE OR REPLACE FUNCTION public.support_teams_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_teams_updated_at ON public.support_teams;
CREATE TRIGGER trg_support_teams_updated_at
BEFORE UPDATE ON public.support_teams
FOR EACH ROW EXECUTE FUNCTION public.support_teams_touch_updated_at();

-- =====================================================================
-- RLS: everyone authenticated can READ the team list
-- (users need it to see the team assigned to their request; admins need it
-- to populate the assign dropdown). Only admins can INSERT / UPDATE / DELETE.
-- =====================================================================
ALTER TABLE public.support_teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_teams_read_auth" ON public.support_teams;
CREATE POLICY "support_teams_read_auth" ON public.support_teams
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "support_teams_admin_insert" ON public.support_teams;
CREATE POLICY "support_teams_admin_insert" ON public.support_teams
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "support_teams_admin_update" ON public.support_teams;
CREATE POLICY "support_teams_admin_update" ON public.support_teams
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "support_teams_admin_delete" ON public.support_teams;
CREATE POLICY "support_teams_admin_delete" ON public.support_teams
  FOR DELETE TO authenticated
  USING (public.is_admin());
