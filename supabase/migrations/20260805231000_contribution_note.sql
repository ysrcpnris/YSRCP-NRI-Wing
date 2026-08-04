-- =====================================================================
-- 20260805231000 — the mock's free-text "Tell us more" is not `contribution`
--
-- `contribution` is a single-select from 5 fixed categories at signup
-- (AuthModal.tsx: Tech Support / Social Media / Election Campaign Online
-- / Election Campaign Offline / Podcasting). The prototype's "Tell us
-- more (optional)" box under How can you contribute? is free text —
-- binding it to `contribution` would let a profile edit silently
-- replace a member's category with prose.
--
-- Same shape as participate_campaign (see the profile-mapping review):
-- an existing column keeps its existing meaning; the new concept gets
-- its own column.
-- =====================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contribution_note text;

COMMENT ON COLUMN public.profiles.contribution_note IS
  'Free text from My Profile "Tell us more" — distinct from contribution, '
  'which is the fixed-category select from signup. Do not conflate.';

GRANT SELECT (contribution_note), UPDATE (contribution_note)
  ON public.profiles TO authenticated;

DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(p.t, ',') INTO missing
    FROM (VALUES ('SELECT'),('UPDATE')) AS p(t)
   WHERE NOT EXISTS (
     SELECT 1 FROM information_schema.column_privileges
      WHERE table_schema='public' AND table_name='profiles'
        AND grantee='authenticated' AND column_name='contribution_note'
        AND privilege_type = p.t);
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'contribution_note is missing grants: %', missing;
  END IF;
  RAISE NOTICE 'contribution_note granted';
END $$;
