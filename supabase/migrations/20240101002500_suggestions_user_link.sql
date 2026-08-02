-- =====================================================================
-- Capture the requester's mobile + email + user_id on every suggestion.
--
-- Why: admin's "All Suggestions" table currently only shows name/country,
-- so there's no way to follow up with the user. This migration adds the
-- contact fields and a soft FK to profiles. Existing rows stay intact —
-- they'll just show "—" for mobile/email until they're refilled or new
-- suggestions arrive.
--
-- Idempotent: ALTER TABLE … ADD COLUMN IF NOT EXISTS, FK is a NO-OP
-- after the first run.
-- =====================================================================

ALTER TABLE public.suggestions
  ADD COLUMN IF NOT EXISTS user_id        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mobile_number  text,
  ADD COLUMN IF NOT EXISTS email          text;

-- Best-effort backfill: when a suggestion has the same `name` as exactly
-- one profile, copy that profile's mobile/email/id over. Rows where the
-- match is ambiguous (or missing) are left untouched.
UPDATE public.suggestions s
   SET user_id        = p.id,
       mobile_number  = p.mobile_number,
       email          = p.email
  FROM public.profiles p
 WHERE s.user_id IS NULL
   AND s.name IS NOT NULL
   AND p.full_name = s.name
   -- Only update when this name maps to a single profile, to avoid
   -- attaching the wrong person to a suggestion when two profiles share
   -- a display name.
   AND (
     SELECT count(*) FROM public.profiles p2 WHERE p2.full_name = s.name
   ) = 1;

DO $verify$
DECLARE
  v_total      int;
  v_with_mob   int;
  v_with_user  int;
BEGIN
  SELECT count(*) INTO v_total     FROM public.suggestions;
  SELECT count(*) INTO v_with_mob  FROM public.suggestions WHERE mobile_number IS NOT NULL AND mobile_number <> '';
  SELECT count(*) INTO v_with_user FROM public.suggestions WHERE user_id IS NOT NULL;
  RAISE NOTICE
    'Suggestions: % rows total, % with mobile, % linked to a profile.',
    v_total, v_with_mob, v_with_user;
END $verify$;
