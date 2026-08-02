-- =====================================================================
-- 20260803090000 — pipeline check, and the start of CLI-format migrations
--
-- WHY THIS FILE EXISTS
--   The Supabase GitHub integration was connected to the staging project
--   on 2026-08-03, syncing from the `develop` branch. This migration is
--   the first thing it has to apply, so it proves the pipeline works.
--
--   It also tests something we genuinely don't know: whether the
--   integration recognises the 46 existing migrations, which are named
--   `new_01_foundation.sql` … `new_46_full_name_whitespace.sql` rather
--   than the `<timestamp>_name.sql` format Supabase expects.
--
--   After this lands on `develop`, check the STAGING database:
--
--     select count(*) from information_schema.tables
--      where table_schema = 'public';
--
--     select version, name from supabase_migrations.schema_migrations
--      order by version;
--
--   Many tables + 46 rows  -> the old naming is understood; nothing to do.
--   Few tables + 1 row     -> only this file applied. The `new_NN_` files
--                             are invisible to the integration, so staging
--                             needs the schema-dump route in
--                             YCP/STAGING_SETUP.md step 3, and future
--                             migrations must use this timestamp format.
--
-- WHAT IT CHANGES
--   Nothing structural. It records a comment on the profiles table, which
--   is safe to apply to any environment in any order, and safe to reach
--   production when `develop` merges to `main`.
-- =====================================================================

COMMENT ON TABLE public.profiles IS
  'NRI Wing members. One row per auth.users row (id is both PK and FK). '
  'email is kept in sync with auth.users.email — correcting one without '
  'the other silently breaks password reset for that member. '
  'full_name is derived by trigger from first_name + last_name (new_45/46) '
  'and should not be written directly.';
