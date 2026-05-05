-- =====================================================================
-- Testimonials — admin-curated quotes for the "Voices of Our Global
-- Community" marquee on the home page.
--
-- Why:
--   The section was hardcoded inside the React component, so adding,
--   editing, or removing a quote required a code change + redeploy.
--   The client wants admin control: pick the country from the existing
--   country list, type a name + message, save.
--
-- Strategy:
--   • Single table `testimonials` (uuid PK).
--   • Country is a free text field (matching the names from
--     src/lib/countryCodes.ts so the home-page dropdown stays the
--     authoritative list).
--   • sort_order lets admin reorder. is_active soft-hides without
--     losing the row. Public SELECT, admin-only writes — same RLS
--     pattern used for service_categories / featured videos.
--
-- Idempotent — safe to re-run.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.testimonials (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  location    text NOT NULL,            -- country name from countriesData
  message     text NOT NULL,
  sort_order  int     DEFAULT 0,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS testimonials_active_sort_idx
  ON public.testimonials (is_active, sort_order, created_at DESC);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Public can read active (or any) testimonials. Filtering by is_active
-- happens on the client so admin can see hidden rows in the panel.
DROP POLICY IF EXISTS "testimonials_read" ON public.testimonials;
CREATE POLICY "testimonials_read" ON public.testimonials
  FOR SELECT USING (true);

-- Only admins can insert / update / delete.
DROP POLICY IF EXISTS "testimonials_admin_write" ON public.testimonials;
CREATE POLICY "testimonials_admin_write" ON public.testimonials
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Keep updated_at fresh on every UPDATE so the admin can sort by recency.
CREATE OR REPLACE FUNCTION public.testimonials_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS testimonials_touch_updated_at ON public.testimonials;
CREATE TRIGGER testimonials_touch_updated_at
BEFORE UPDATE ON public.testimonials
FOR EACH ROW EXECUTE FUNCTION public.testimonials_touch_updated_at();

-- ---------------------------------------------------------------------
-- Sanity-check NOTICE
-- ---------------------------------------------------------------------
DO $verify$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.testimonials;
  RAISE NOTICE
    'Testimonials table ready. % rows currently stored. Admins can manage via the Testimonials page.',
    v_count;
END $verify$;
