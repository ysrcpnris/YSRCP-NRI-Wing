-- =====================================================================
-- new_46 — collapse whitespace when composing full_name
--
-- new_45 composed with TRIM(first_name || ' ' || last_name). TRIM only
-- strips the ENDS, so a name column carrying its own trailing space
-- produced a double space in the middle:
--
--     'Sathi Mukesh ' || ' ' || 'Reddy'  ->  'Sathi Mukesh  Reddy'
--
-- Found on 8 rows in the post-repair verification. The trailing spaces
-- come from the original form input, so they also affect first_name and
-- last_name wherever those are displayed directly — this migration
-- cleans the source columns as well as the derived one.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.sync_profile_full_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Collapse any run of whitespace to a single space, then trim the ends.
  NEW.full_name := COALESCE(
    NULLIF(
      TRIM(REGEXP_REPLACE(
        COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''),
        '\s+', ' ', 'g')),
      ''),
    NULLIF(TRIM(COALESCE(NEW.full_name, '')), '')
  );
  RETURN NEW;
END;
$$;

-- Trigger definition itself is unchanged from new_45; CREATE OR REPLACE
-- above swaps the function body underneath it.


-- =====================================================================
-- Clean the source columns. Doing this BEFORE the full_name backfill
-- means the trigger recomputes from already-clean parts.
--
-- updated_at deliberately untouched — this is a data repair, not member
-- activity.
-- =====================================================================
UPDATE public.profiles
   SET first_name = NULLIF(TRIM(REGEXP_REPLACE(first_name, '\s+', ' ', 'g')), ''),
       last_name  = NULLIF(TRIM(REGEXP_REPLACE(last_name,  '\s+', ' ', 'g')), '')
 WHERE first_name IS DISTINCT FROM NULLIF(TRIM(REGEXP_REPLACE(COALESCE(first_name,''), '\s+', ' ', 'g')), '')
    OR last_name  IS DISTINCT FROM NULLIF(TRIM(REGEXP_REPLACE(COALESCE(last_name,''),  '\s+', ' ', 'g')), '');


-- Re-backfill full_name for anything the trigger didn't already catch.
UPDATE public.profiles
   SET full_name = NULLIF(
         TRIM(REGEXP_REPLACE(
           COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''),
           '\s+', ' ', 'g')), '')
 WHERE NULLIF(TRIM(REGEXP_REPLACE(
         COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''),
         '\s+', ' ', 'g')), '')
       IS DISTINCT FROM full_name;


-- =====================================================================
-- Verify — both expect 0.
-- =====================================================================
--   -- names with leading/trailing/double spaces
--   SELECT count(*) FROM public.profiles
--    WHERE first_name <> TRIM(REGEXP_REPLACE(first_name, '\s+', ' ', 'g'))
--       OR last_name  <> TRIM(REGEXP_REPLACE(last_name,  '\s+', ' ', 'g'));
--
--   -- full_name disagreeing with its parts
--   SELECT count(*) FROM public.profiles
--    WHERE NULLIF(TRIM(REGEXP_REPLACE(
--            COALESCE(first_name,'') || ' ' || COALESCE(last_name,''),
--            '\s+', ' ', 'g')), '') IS DISTINCT FROM full_name;
