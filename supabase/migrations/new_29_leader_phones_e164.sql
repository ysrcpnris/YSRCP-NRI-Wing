-- =====================================================================
-- Normalize leader phone numbers to E.164 (+91…) so wa.me links open
-- the correct India contact regardless of the user's device locale.
--
-- Why:
--   The seed (new_16) stored 10-digit Indian mobile numbers without a
--   country code (e.g. '9848172411'). When the user's browser is set to
--   a non-IN locale (typical for NRIs), `https://wa.me/9848172411` is
--   interpreted in their local country, which fails.
--
-- Strategy:
--   • 10-digit numbers (typical Indian mobile, no country code) →
--     prepend '+91'.
--   • 12-digit numbers already starting with '91' (country code present
--     but missing the leading '+') → just prepend '+'.
--   • Numbers that already start with '+' are E.164 already → skipped.
--   • The YS Jagan placeholder '0000000000' is left untouched.
--   • Anything else (malformed, 11 digits, foreign mobile lengths) is
--     left alone — admin should fix manually.
--
-- Both whatsapp_number and whatsapp_number_2 are updated.
-- Re-running the migration is a no-op (the WHERE filters already-+
-- prefixed rows out).
-- =====================================================================

DO $norm$
DECLARE
  v_pri10  int := 0;
  v_pri12  int := 0;
  v_sec10  int := 0;
  v_sec12  int := 0;
BEGIN
  -- Primary number: 10 digits → '+91' prefix
  WITH t AS (
    UPDATE public.leaders_master
       SET whatsapp_number = '+91' || regexp_replace(whatsapp_number, '\D', '', 'g')
     WHERE whatsapp_number IS NOT NULL
       AND whatsapp_number !~ '^\+'
       AND regexp_replace(whatsapp_number, '\D', '', 'g') <> '0000000000'
       AND length(regexp_replace(whatsapp_number, '\D', '', 'g')) = 10
     RETURNING 1
  )
  SELECT count(*) INTO v_pri10 FROM t;

  -- Primary number: 12 digits starting with 91 → just add '+'
  WITH t AS (
    UPDATE public.leaders_master
       SET whatsapp_number = '+' || regexp_replace(whatsapp_number, '\D', '', 'g')
     WHERE whatsapp_number IS NOT NULL
       AND whatsapp_number !~ '^\+'
       AND regexp_replace(whatsapp_number, '\D', '', 'g') ~ '^91'
       AND length(regexp_replace(whatsapp_number, '\D', '', 'g')) = 12
     RETURNING 1
  )
  SELECT count(*) INTO v_pri12 FROM t;

  -- Secondary number: 10 digits → '+91' prefix
  WITH t AS (
    UPDATE public.leaders_master
       SET whatsapp_number_2 = '+91' || regexp_replace(whatsapp_number_2, '\D', '', 'g')
     WHERE whatsapp_number_2 IS NOT NULL
       AND whatsapp_number_2 <> ''
       AND whatsapp_number_2 !~ '^\+'
       AND regexp_replace(whatsapp_number_2, '\D', '', 'g') <> '0000000000'
       AND length(regexp_replace(whatsapp_number_2, '\D', '', 'g')) = 10
     RETURNING 1
  )
  SELECT count(*) INTO v_sec10 FROM t;

  -- Secondary number: 12 digits starting with 91 → just add '+'
  WITH t AS (
    UPDATE public.leaders_master
       SET whatsapp_number_2 = '+' || regexp_replace(whatsapp_number_2, '\D', '', 'g')
     WHERE whatsapp_number_2 IS NOT NULL
       AND whatsapp_number_2 <> ''
       AND whatsapp_number_2 !~ '^\+'
       AND regexp_replace(whatsapp_number_2, '\D', '', 'g') ~ '^91'
       AND length(regexp_replace(whatsapp_number_2, '\D', '', 'g')) = 12
     RETURNING 1
  )
  SELECT count(*) INTO v_sec12 FROM t;

  RAISE NOTICE
    'Leader phone normalization — primary: % (10-digit), % (12-digit). secondary: % (10-digit), % (12-digit).',
    v_pri10, v_pri12, v_sec10, v_sec12;
END $norm$;

-- ---------------------------------------------------------------------
-- Sanity check: report any remaining rows that look unnormalized.
-- ---------------------------------------------------------------------
DO $verify$
DECLARE
  v_unnormalized int;
BEGIN
  SELECT count(*) INTO v_unnormalized
    FROM public.leaders_master
   WHERE whatsapp_number IS NOT NULL
     AND whatsapp_number !~ '^\+'
     AND regexp_replace(whatsapp_number, '\D', '', 'g') <> '0000000000'
     AND whatsapp_number <> '';
  IF v_unnormalized > 0 THEN
    RAISE NOTICE
      'WARNING: % leader rows still have non-E.164 primary numbers (likely malformed lengths). Review manually.',
      v_unnormalized;
  ELSE
    RAISE NOTICE 'All leader primary numbers are now E.164 (or placeholder).';
  END IF;
END $verify$;
