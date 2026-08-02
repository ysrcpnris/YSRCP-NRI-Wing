-- =====================================================================
-- Service Categories & Options
--
-- Why: the user-facing /services page used to read its 3-level dropdown
-- (Service → Category → Option) from a hardcoded SERVICE_CONFIG object in
-- Dashboard.tsx. Admins want to add / rename / remove categories and
-- options at runtime. This migration adds two tables to hold those, keeps
-- the four parent service types as text codes (`student`, `legal`,
-- `career`, `local`) so the existing UI icons/colors keep working, and
-- seeds them with the values that were previously hardcoded.
--
-- service_requests.service_type / service_category / service_option stay
-- as plain text snapshots (no FK), so renaming a category later does NOT
-- rewrite history — past requests keep showing whatever was stored at
-- submit time.
--
-- Idempotent. Re-running is a no-op (CREATE TABLE IF NOT EXISTS, seed
-- uses ON CONFLICT DO NOTHING with a unique key).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_categories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 'student' | 'legal' | 'career' | 'local' (matches SERVICE_UI keys
  -- in Dashboard.tsx). We do NOT enforce a CHECK so adding a 5th type
  -- later is just a UI change.
  service_type text NOT NULL,
  name         text NOT NULL,
  sort_order   int  NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  -- Same name twice under the same service is meaningless, and the
  -- seed-on-conflict needs a unique target.
  UNIQUE (service_type, name)
);

CREATE INDEX IF NOT EXISTS service_categories_type_idx
  ON public.service_categories (service_type, sort_order);

CREATE TABLE IF NOT EXISTS public.service_options (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  uuid NOT NULL
                    REFERENCES public.service_categories(id) ON DELETE CASCADE,
  name         text NOT NULL,
  sort_order   int  NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, name)
);

CREATE INDEX IF NOT EXISTS service_options_category_idx
  ON public.service_options (category_id, sort_order);


-- ---------------------------------------------------------------------
-- 2. updated_at triggers (so admin UI can sort by recently-edited)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_categories_touch ON public.service_categories;
CREATE TRIGGER trg_service_categories_touch
BEFORE UPDATE ON public.service_categories
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_service_options_touch ON public.service_options;
CREATE TRIGGER trg_service_options_touch
BEFORE UPDATE ON public.service_options
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ---------------------------------------------------------------------
-- 3. RLS — public read, admin-only write
-- ---------------------------------------------------------------------
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_options    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_categories_read_all" ON public.service_categories;
CREATE POLICY "service_categories_read_all" ON public.service_categories
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "service_categories_admin_write" ON public.service_categories;
CREATE POLICY "service_categories_admin_write" ON public.service_categories
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "service_options_read_all" ON public.service_options;
CREATE POLICY "service_options_read_all" ON public.service_options
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "service_options_admin_write" ON public.service_options;
CREATE POLICY "service_options_admin_write" ON public.service_options
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ---------------------------------------------------------------------
-- 4. Realtime publication — so the user dashboard updates the moment
--    an admin saves a change, with no manual refresh.
-- ---------------------------------------------------------------------
DO $pub$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename  = 'service_categories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.service_categories;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename  = 'service_options'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.service_options;
  END IF;
END $pub$;


-- ---------------------------------------------------------------------
-- 5. Seed — copy the previously-hardcoded SERVICE_CONFIG so existing
--    behaviour is preserved on first deploy.
-- ---------------------------------------------------------------------
DO $seed$
DECLARE
  -- (service_type, category, sort_order, options[])
  rec record;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('student', 'Education Guidance', 10,
        ARRAY['Course Selection','University Shortlisting','Scholarship Assistance']),
      ('student', 'Visa Support',       20,
        ARRAY['Student Visa','Documentation Review','Interview Preparation']),

      ('legal',   'Immigration Law',    10,
        ARRAY['PR / Citizenship','Visa Extension']),
      ('legal',   'Property Issues',    20,
        ARRAY['Land Dispute','Registration Help']),

      ('career',  'Job Support',        10,
        ARRAY['Resume Review','Interview Preparation']),
      ('career',  'Career Switch',      20,
        ARRAY['IT Transition','Skill Roadmap']),

      ('local',   'Community Help',     10,
        ARRAY['Local Events','Volunteer Groups']),
      ('local',   'Government Services',20,
        ARRAY['Certificates','Office Guidance'])
    ) AS s(service_type, category, sort_order, options)
  LOOP
    -- Insert the category (no-op if it already exists).
    INSERT INTO public.service_categories (service_type, name, sort_order)
    VALUES (rec.service_type, rec.category, rec.sort_order)
    ON CONFLICT (service_type, name) DO NOTHING;

    -- Insert each option under the category.
    INSERT INTO public.service_options (category_id, name, sort_order)
    SELECT
      sc.id,
      opt,
      (idx * 10)
    FROM unnest(rec.options) WITH ORDINALITY AS o(opt, idx)
    JOIN public.service_categories sc
      ON sc.service_type = rec.service_type
     AND sc.name         = rec.category
    ON CONFLICT (category_id, name) DO NOTHING;
  END LOOP;
END
$seed$;


-- ---------------------------------------------------------------------
-- 6. Sanity NOTICE
-- ---------------------------------------------------------------------
DO $verify$
DECLARE
  v_categories int;
  v_options    int;
BEGIN
  SELECT count(*) INTO v_categories FROM public.service_categories;
  SELECT count(*) INTO v_options    FROM public.service_options;
  RAISE NOTICE 'Service taxonomy ready — categories=%, options=%', v_categories, v_options;
END
$verify$;
