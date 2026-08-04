-- =====================================================================
-- staging_members.sql — SYNTHETIC members, staging only
--
-- DO NOT RUN THIS AGAINST PRODUCTION.
--
-- This file lives in seeds/ and not migrations/ precisely so that
-- `supabase db push` cannot pick it up. Production has 2,639 real
-- members; these 60 fabricated ones exist only so the chapter and admin
-- screens have plausible volume to render on staging.
--
-- Everything here is invented. Names are common Telugu given and family
-- names combined arithmetically, emails are @example.test (a reserved
-- TLD that cannot receive mail), and phone numbers are in the Ofcom
-- drama range +44 7700 900xxx, which is permanently unallocated.
--
-- profiles.id is a foreign key to auth.users, so an auth row is created
-- for each. Passwords are set to a hash no bcrypt output can equal, so
-- these accounts can be listed and counted but never signed into.
--
-- The guard below aborts if this is pointed at a database holding real
-- profiles.
-- =====================================================================

DO $$
DECLARE real_profiles int;
BEGIN
  SELECT count(*) INTO real_profiles
    FROM public.profiles WHERE email NOT LIKE '%@example.test';
  IF real_profiles > 100 THEN
    RAISE EXCEPTION
      'refusing to seed: this database holds % real profiles, it is not staging',
      real_profiles;
  END IF;
END $$;

-- Chapter cities and constituencies are picked from a numbered list, so
-- the assignment is deterministic — the same seed run twice produces the
-- same distribution.
--
-- The previous version used ORDER BY md5(...) LIMIT 1 inside a CROSS
-- JOIN LATERAL. After another join was added it silently produced NULL:
-- 60 members were inserted with no country and no city, the insert
-- reported success, and the chapter screens rendered zero. Numbering the
-- source rows makes the pick explicit and impossible to lose quietly.
WITH cities AS (
  SELECT country, city,
         row_number() OVER (ORDER BY country, city) - 1 AS n,
         count(*) OVER () AS total
    FROM public.cluster_cities
),
seats AS (
  SELECT c.name AS constituency, d.name AS district,
         row_number() OVER (ORDER BY c.id) - 1 AS n,
         count(*) OVER () AS total
    FROM public.ap_constituencies c
    JOIN public.ap_districts d ON d.id = c.district_id
),
people AS (
  SELECT
    g,
    format('seed.%s@example.test', g) AS email,
    (ARRAY['Ravi','Srinivas','Lakshmi','Padma','Venkat','Anitha','Kiran',
           'Sudha','Naveen','Swathi','Prasad','Divya','Mohan','Jyothi',
           'Ramesh','Sirisha','Vamsi','Deepthi','Sekhar','Bhavani'
          ])[1 + (g % 20)] AS first_name,
    (ARRAY['Reddy','Naidu','Rao','Chowdary','Prasad','Kumar','Varma',
           'Sarma','Raju','Gupta'])[1 + (g % 10)] AS last_name,
    -- Keyed off a different stride than the city pick (7). Using g % 3
    -- for gender and g * 7 for the city made the two align periodically,
    -- so Germany drew eight men in a row and the chapter screen showed
    -- "women: 0" on a seed that is 1-in-3 female overall.
    CASE WHEN (g * 5) % 8 < 3 THEN 'Female' ELSE 'Male' END AS gender,
    format('+4477009%05s', 10000 + g) AS mobile_number
  FROM generate_series(1, 60) AS g
),
new_users AS (
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    confirmation_token, recovery_token,
    email_change_token_new, email_change,
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  )
  SELECT
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    p.email,
    '$2a$10$' || repeat('.', 53),   -- bcrypt-shaped, matches no password
    now(), now() - (p.g || ' days')::interval, now(),
    '', '', '', '',                 -- GoTrue treats these as NOT NULL text
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"synthetic":true}'::jsonb,
    false
  FROM people p
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.email = p.email)
  RETURNING id, email
)
INSERT INTO public.profiles (
  id, email, first_name, last_name, full_name, gender, mobile_number,
  country_of_residence, city_abroad,
  assembly_constituency, district, created_at
)
SELECT
  nu.id, nu.email,
  pe.first_name, pe.last_name, pe.first_name || ' ' || pe.last_name,
  pe.gender, pe.mobile_number,
  ci.country, ci.city,
  se.constituency, se.district,
  now() - (pe.g || ' days')::interval
FROM new_users nu
JOIN people pe ON pe.email = nu.email
JOIN cities ci ON ci.n = (pe.g * 7)  % ci.total   -- stride 7 spreads across chapters
JOIN seats  se ON se.n = (pe.g * 13) % se.total;  -- stride 13 spreads across seats

DO $$
DECLARE n int; chapters int; nulls int;
BEGIN
  SELECT count(*) INTO n
    FROM public.profiles WHERE email LIKE 'seed.%@example.test';
  SELECT count(*) INTO nulls
    FROM public.profiles
   WHERE email LIKE 'seed.%@example.test'
     AND (country_of_residence IS NULL OR city_abroad IS NULL);
  SELECT count(DISTINCT public.chapter_for_city(country_of_residence, city_abroad))
    INTO chapters
    FROM public.profiles WHERE email LIKE 'seed.%@example.test';

  -- Catches the exact failure above: rows with NULL geography look like
  -- a successful seed right up until a chapter screen renders empty.
  IF nulls > 0 THEN
    RAISE EXCEPTION '% synthetic members have no country or city', nulls;
  END IF;
  IF n > 0 AND chapters < 5 THEN
    RAISE EXCEPTION 'synthetic members landed in only % chapters', chapters;
  END IF;
  RAISE NOTICE 'seeded % synthetic members across % chapters', n, chapters;
END $$;
