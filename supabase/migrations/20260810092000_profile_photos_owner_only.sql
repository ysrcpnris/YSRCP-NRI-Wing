-- =====================================================================
-- 20260810092000 — a profile photo can be changed only by its owner
--
-- Reported externally (report "P3 — storage"): profile_photos_auth_all
-- (20240101004700) was FOR ALL TO authenticated with only a bucket check,
-- so any signed-in account could list the bucket (every filename starts
-- with its owner's user id), overwrite anyone's photo with upsert, or
-- delete it.
--
-- The other three buckets the report names (news-images, gallery-images,
-- homepage-banners) are already is_admin()-gated; they were reachable
-- only through the profiles.role escalation closed in 20260805111000.
--
-- OWNERSHIP RULE
--   The member Dashboard uploads to `<auth.uid()>_<epoch ms>.<ext>` at the
--   bucket root (src/components/Dashboard.tsx, handleUploadPhoto). The
--   first 37 characters of the object name — uuid plus underscore — are
--   the owner. Compared with left(), not LIKE, because `_` is a LIKE
--   wildcard.
--
-- DISPLAY IS UNAFFECTED
--   The bucket is public (20240101000100), and /storage/v1/object/public/
--   does not consult RLS, so every <img src> keeps working. What changes
--   is the authenticated API: list / upsert / update / delete.
--
-- ADMIN
--   Keeps read and delete on every object (moderation). Admin does not
--   get insert/update into another member's name — nothing in the app
--   does that.
-- =====================================================================

DROP POLICY IF EXISTS "profile_photos_auth_all"    ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_own_select"  ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_own_insert"  ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_own_update"  ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_own_delete"  ON storage.objects;

-- SELECT is required by upload({ upsert: true }) as well as by list.
CREATE POLICY "profile_photos_own_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (left(name, 37) = auth.uid()::text || '_' OR public.is_admin())
  );

CREATE POLICY "profile_photos_own_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND left(name, 37) = auth.uid()::text || '_'
  );

CREATE POLICY "profile_photos_own_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND left(name, 37) = auth.uid()::text || '_'
  )
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND left(name, 37) = auth.uid()::text || '_'
  );

CREATE POLICY "profile_photos_own_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (left(name, 37) = auth.uid()::text || '_' OR public.is_admin())
  );

DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n
    FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects'
     AND policyname LIKE 'profile_photos_%';
  IF n <> 4 THEN
    RAISE EXCEPTION 'expected 4 profile_photos policies, found %', n;
  END IF;
  RAISE NOTICE 'profile-photos: owner-only writes, owner/admin reads and deletes';
END $$;
