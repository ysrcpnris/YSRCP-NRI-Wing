-- =====================================================================
-- Optional profile photo on leaders_master.
--
-- Why: the admin Master Data page wants a "photo" field per leader so
-- users can see a face on each leader card. Photos are optional — a NULL
-- photo_url just means "no avatar; render the initials placeholder".
--
-- Storage:
--   • New bucket `leader-photos` (public read so the user dashboard can
--     fetch the image without auth, admin-only write).
--   • Files are uploaded as `<leader_id>_<timestamp>.<ext>` so an upload
--     for the same leader replaces any old object, and orphan objects
--     can be cleaned up later by id prefix.
--
-- Idempotent. ALTER uses ADD COLUMN IF NOT EXISTS, bucket insert uses
-- ON CONFLICT DO NOTHING, policies use DROP IF EXISTS + CREATE.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Add the column
-- ---------------------------------------------------------------------
ALTER TABLE public.leaders_master
  ADD COLUMN IF NOT EXISTS photo_url text;


-- ---------------------------------------------------------------------
-- 2. Create the storage bucket (public for read, admin for write).
--    File size cap 5 MB, JPEG/PNG/WEBP only.
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'leader-photos',
  'leader-photos',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------------------
-- 3. Storage policies — anyone can read, only admins can write/delete.
--    Pattern matches news-images / gallery-images / homepage-banners
--    (FOR ALL with `is_admin()` guard).
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "leader_photos_public_read" ON storage.objects;
CREATE POLICY "leader_photos_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'leader-photos');

DROP POLICY IF EXISTS "leader_photos_admin_write" ON storage.objects;
CREATE POLICY "leader_photos_admin_write" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'leader-photos' AND public.is_admin())
  WITH CHECK (bucket_id = 'leader-photos' AND public.is_admin());


-- ---------------------------------------------------------------------
-- 4. Sanity NOTICE
-- ---------------------------------------------------------------------
DO $verify$
DECLARE
  v_col   int;
  v_bucket int;
BEGIN
  SELECT count(*) INTO v_col FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'leaders_master'
     AND column_name = 'photo_url';
  SELECT count(*) INTO v_bucket FROM storage.buckets WHERE id = 'leader-photos';
  RAISE NOTICE 'Leader photos ready — photo_url column=%, leader-photos bucket=%',
    v_col, v_bucket;
END
$verify$;
