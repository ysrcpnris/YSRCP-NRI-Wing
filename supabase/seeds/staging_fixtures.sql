-- =====================================================================
-- staging_fixtures.sql — one test account per role. STAGING ONLY.
--
-- DO NOT RUN THIS AGAINST PRODUCTION.
--
-- Nine slices were built and reported complete with no test that ever
-- ran as an admin, a cluster lead or a team lead. A review then found
-- that admins could not read the user list, could not delete feedback,
-- and got zero rows from the chapter RPCs — all latent from the slice
-- that introduced them. Cluster and team leads, meanwhile, silently
-- held whole-country authority.
--
-- Every one of those is caught by scripts/auth-matrix.sh, and only if
-- these accounts exist. A role with no fixture is a role nobody tests.
--
--   t.us.a   member, United States   no wing role
--   t.de.a   country_coordinator     Germany
--   t.de.b   member, Germany         no wing role
--   t.cl.a   cluster_lead            Germany chapter
--   t.tl.a   team_lead               Germany (read-only)
--   t.ae.a   admin                   profiles.role = 'admin'
--
-- Password for all of them: StagingTest!2026
-- =====================================================================

DO $$
DECLARE real_profiles int;
BEGIN
  SELECT count(*) INTO real_profiles
    FROM public.profiles WHERE email NOT LIKE '%@example.test';
  IF real_profiles > 100 THEN
    RAISE EXCEPTION
      'refusing to seed fixtures: % real profiles present, this is not staging',
      real_profiles;
  END IF;
END $$;

-- ── auth users ───────────────────────────────────────────────────────
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, is_super_admin)
SELECT '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
       'authenticated', 'authenticated', v.email,
       crypt('StagingTest!2026', gen_salt('bf')),
       now(), now(), now(), '', '', '', '',
       '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false
  FROM (VALUES
    ('t.us.a@example.test'), ('t.de.a@example.test'), ('t.de.b@example.test'),
    ('t.cl.a@example.test'), ('t.tl.a@example.test'), ('t.ae.a@example.test')
  ) v(email)
 WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.email = v.email);

-- Reset the password every run, so a fixture whose password drifted
-- does not quietly disable the whole matrix.
UPDATE auth.users
   SET encrypted_password = crypt('StagingTest!2026', gen_salt('bf')),
       email_confirmed_at = coalesce(email_confirmed_at, now())
 WHERE email IN ('t.us.a@example.test','t.de.a@example.test','t.de.b@example.test',
                 't.cl.a@example.test','t.tl.a@example.test','t.ae.a@example.test');

-- ── profiles ─────────────────────────────────────────────────────────
INSERT INTO public.profiles (
  id, email, first_name, last_name, full_name, gender,
  country_of_residence, city_abroad, assembly_constituency, district, role)
SELECT u.id, u.email, v.first, 'Fixture', v.first || ' Fixture', 'Male',
       v.country, v.city, 'Nandyal', 'Nandyal', v.prole
  FROM (VALUES
    ('t.us.a@example.test', 'Member US',   'United States', 'San Jose',  'user'),
    ('t.de.a@example.test', 'Coordinator', 'Germany',       'Frankfurt', 'user'),
    ('t.de.b@example.test', 'Member DE',   'Germany',       'Berlin',    'user'),
    ('t.cl.a@example.test', 'Cluster',     'Germany',       'Munich',    'user'),
    ('t.tl.a@example.test', 'Team',        'Germany',       'Hamburg',   'user'),
    ('t.ae.a@example.test', 'Admin',       'UAE',           'Dubai',     'admin')
  ) v(email, first, country, city, prole)
  JOIN auth.users u ON u.email = v.email
 WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

-- role is privileged and the guard trigger restores it for non-admins,
-- so the admin fixture is set here as the table owner rather than
-- through the app.
UPDATE public.profiles SET role = 'admin' WHERE email = 't.ae.a@example.test';

-- ── wing roles ───────────────────────────────────────────────────────
-- member_roles_scope_ck: country_coordinator and team_lead carry a
-- country and no cluster; cluster_lead carries both.
INSERT INTO public.member_roles (profile_id, role, country, cluster_id, title)
SELECT p.id, v.wrole::public.wing_role, 'Germany',
       CASE WHEN v.wrole = 'cluster_lead'
            THEN (SELECT id FROM public.clusters WHERE name = 'Germany') END,
       v.title
  FROM (VALUES
    ('t.de.a@example.test', 'country_coordinator', 'Germany Coordinator'),
    ('t.cl.a@example.test', 'cluster_lead',        'Germany Chapter Lead'),
    ('t.tl.a@example.test', 'team_lead',           'Student Assistance Lead')
  ) v(email, wrole, title)
  JOIN public.profiles p ON p.email = v.email
 WHERE NOT EXISTS (
   SELECT 1 FROM public.member_roles mr
    WHERE mr.profile_id = p.id AND mr.revoked_at IS NULL);

-- ── a manual appointment slot for the authorization matrix ──────────
-- The booking checks used to depend on whatever slot happened to exist,
-- and skipped silently when none did — so the suite could report
-- success having tested nothing. The slot is part of the fixture now.
INSERT INTO public.appointment_slots
  (title, starts_at, ends_at, capacity, mode, country, is_published, notes_label)
SELECT 'FIXTURE manual slot',
       now() + interval '30 days', now() + interval '30 days 1 hour',
       5, 'manual', 'Germany', true, 'Why would you like to attend?'
 WHERE NOT EXISTS (
   SELECT 1 FROM public.appointment_slots WHERE title = 'FIXTURE manual slot');

-- ── a second country for the cross-scope rank test ──────────────────
-- One person holding country_coordinator in Germany AND cluster_lead in
-- the USA is the shape that broke my_role_rank(): coordinator rank
-- presented against USA scope. Without this fixture the exploit cannot
-- be tested, and the scoped helper could be reverted with every check
-- still green.
INSERT INTO public.member_roles (profile_id, role, country, cluster_id, title)
SELECT p.id, 'cluster_lead', 'United States',
       (SELECT id FROM public.clusters WHERE country = 'United States'
         ORDER BY name LIMIT 1),
       'USA chapter lead (dual-role fixture)'
  FROM public.profiles p
 WHERE p.email = 't.de.a@example.test'
   AND NOT EXISTS (
     SELECT 1 FROM public.member_roles mr
      WHERE mr.profile_id = p.id AND mr.role = 'cluster_lead'
        AND mr.revoked_at IS NULL);

DO $$
DECLARE n_users int; n_roles int; n_admin int; n_slot int; n_dual int;
BEGIN
  SELECT count(*) INTO n_users FROM public.profiles
   WHERE email LIKE 't.%@example.test';
  SELECT count(*) INTO n_roles FROM public.member_roles mr
    JOIN public.profiles p ON p.id = mr.profile_id
   WHERE p.email LIKE 't.%@example.test' AND mr.revoked_at IS NULL;
  SELECT count(*) INTO n_admin FROM public.profiles
   WHERE email LIKE 't.%@example.test' AND role = 'admin';

  IF n_users < 6 THEN
    RAISE EXCEPTION 'expected 6 fixture profiles, found %', n_users;
  END IF;
  IF n_roles < 3 THEN
    RAISE EXCEPTION 'expected 3 wing roles, found % — auth-matrix will not be meaningful', n_roles;
  END IF;
  IF n_admin < 1 THEN
    RAISE EXCEPTION 'no admin fixture — admin-only paths would go untested';
  END IF;

  SELECT count(*) INTO n_slot FROM public.appointment_slots
   WHERE title = 'FIXTURE manual slot';
  IF n_slot < 1 THEN
    RAISE EXCEPTION 'no fixture appointment — the booking checks would skip silently';
  END IF;

  SELECT count(*) INTO n_dual FROM public.member_roles mr
    JOIN public.profiles p ON p.id = mr.profile_id
   WHERE p.email = 't.de.a@example.test' AND mr.revoked_at IS NULL;
  IF n_dual < 2 THEN
    RAISE EXCEPTION 'the dual-role fixture is missing — the cross-scope rank exploit cannot be tested';
  END IF;

  RAISE NOTICE 'fixtures ready: % profiles, % wing roles, % admin', n_users, n_roles, n_admin;
END $$;
