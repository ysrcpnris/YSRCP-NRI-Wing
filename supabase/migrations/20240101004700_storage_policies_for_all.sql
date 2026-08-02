-- =============================================
-- FIX: Storage policies for all buckets
-- Replaces the narrow INSERT/UPDATE/DELETE policies
-- with FOR ALL policies so upload({upsert:true}) works.
-- =============================================

-- Drop any existing policies with the old names
DROP POLICY IF EXISTS "profile_photos_auth_upload"    ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_auth_update"    ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_auth_delete"    ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_auth_all"       ON storage.objects;

DROP POLICY IF EXISTS "news_images_admin_write"       ON storage.objects;
DROP POLICY IF EXISTS "news_images_admin_delete"      ON storage.objects;
DROP POLICY IF EXISTS "news_images_admin_all"         ON storage.objects;

DROP POLICY IF EXISTS "gallery_images_admin_write"    ON storage.objects;
DROP POLICY IF EXISTS "gallery_images_admin_delete"   ON storage.objects;
DROP POLICY IF EXISTS "gallery_images_admin_all"      ON storage.objects;

DROP POLICY IF EXISTS "homepage_banners_admin_write"  ON storage.objects;
DROP POLICY IF EXISTS "homepage_banners_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "homepage_banners_admin_all"    ON storage.objects;

-- Recreate with FOR ALL (covers INSERT, UPDATE, DELETE, SELECT in one policy)

-- profile-photos: any authenticated user
CREATE POLICY "profile_photos_auth_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'profile-photos')
  WITH CHECK (bucket_id = 'profile-photos');

-- news-images: admin only
CREATE POLICY "news_images_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'news-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'news-images' AND public.is_admin());

-- gallery-images: admin only
CREATE POLICY "gallery_images_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'gallery-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'gallery-images' AND public.is_admin());

-- homepage-banners: admin only
CREATE POLICY "homepage_banners_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'homepage-banners' AND public.is_admin())
  WITH CHECK (bucket_id = 'homepage-banners' AND public.is_admin());

-- Verify
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects';
