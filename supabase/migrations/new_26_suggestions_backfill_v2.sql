-- =====================================================================
-- Wider backfill for suggestions.mobile_number / email / user_id.
--
-- The first pass in new_25 only matched `profiles.full_name = s.name`,
-- but the user dashboard builds the suggestion's `name` from
-- first_name + last_name (full_name is often NULL on the profile). This
-- migration adds a second matching rule:
--   trim(first_name || ' ' || coalesce(last_name,'')) = s.name
-- and falls back to either rule, while still requiring a SINGLE match
-- so we never attach the wrong person.
--
-- Also fills `email` on suggestions whose user_id is already set but
-- whose mobile/email columns were left NULL by the original pass (e.g.
-- legacy rows where `name` matched but `email` came in as empty string).
--
-- Idempotent — only updates rows where the target column is still NULL.
-- =====================================================================

UPDATE public.suggestions s
   SET user_id       = COALESCE(s.user_id, p.id),
       mobile_number = COALESCE(s.mobile_number, p.mobile_number),
       email         = COALESCE(s.email,         p.email)
  FROM public.profiles p
 WHERE s.name IS NOT NULL
   AND (
     s.user_id IS NULL
     OR (s.mobile_number IS NULL AND p.mobile_number IS NOT NULL)
     OR (s.email         IS NULL AND p.email         IS NOT NULL)
   )
   AND (
     p.full_name = s.name
     OR trim(p.first_name || ' ' || coalesce(p.last_name, '')) = s.name
   )
   AND (
     -- exactly one profile in the whole table matches by either rule
     SELECT count(*) FROM public.profiles p2
      WHERE p2.full_name = s.name
         OR trim(p2.first_name || ' ' || coalesce(p2.last_name, '')) = s.name
   ) = 1;

DO $verify$
DECLARE
  v_total      int;
  v_with_mob   int;
  v_with_email int;
  v_with_user  int;
  v_no_match   int;
BEGIN
  SELECT count(*) INTO v_total      FROM public.suggestions;
  SELECT count(*) INTO v_with_mob   FROM public.suggestions WHERE mobile_number IS NOT NULL AND mobile_number <> '';
  SELECT count(*) INTO v_with_email FROM public.suggestions WHERE email         IS NOT NULL AND email         <> '';
  SELECT count(*) INTO v_with_user  FROM public.suggestions WHERE user_id IS NOT NULL;
  SELECT count(*) INTO v_no_match
    FROM public.suggestions s
   WHERE s.user_id IS NULL;
  RAISE NOTICE
    'Suggestions backfill v2: % rows total, % with mobile, % with email, % linked to profile, % still unmatched.',
    v_total, v_with_mob, v_with_email, v_with_user, v_no_match;
END $verify$;
