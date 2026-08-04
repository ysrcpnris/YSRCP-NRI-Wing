-- =====================================================================
-- 20260805111000 — write policies must use a WRITE predicate
--
-- has_country_scope() is documented as a READ predicate and was widened
-- to include team_lead. Two older policies still used it to authorise
-- WRITES, so widening the read scope silently widened write access:
--
--   profiles_self_update      (20260804091500)
--   member_roles_write        (20260804090000)
--
--   Proven on staging. The Germany team lead — a role whose entire
--   definition is "reads their country, writes nothing" —
--     · overwrote another member's date of birth        HTTP 204
--     · created a cluster_lead role for that member     HTTP 201
--
--   The second is privilege escalation: a read-only role minting a
--   writing one.
--
-- ALSO FIXED HERE
--   dob and every family_* column were left out of the privileged
--   UPDATE exclusion list in 20260805090000. The migration protected
--   epic_number and has_vote and forgot the other six restricted
--   columns, so they stayed directly writable — and unreadable, which
--   is the worst combination: a caller can destroy a value they cannot
--   see. The guard trigger did not restore them either.
-- =====================================================================

-- ── profile column privileges, now covering every restricted column ──
REVOKE UPDATE ON public.profiles FROM authenticated;

DO $$
DECLARE
  privileged text[] := ARRAY[
    'id', 'auth_user_id', 'email',
    'role', 'status',
    'public_user_code', 'referral_code', 'referred_by',
    'onboarding_completed_at',
    'epic_number', 'has_vote',
    -- The six that were missed. They are unreadable by `authenticated`,
    -- so any client write is necessarily blind and destructive.
    'dob', 'family_relation', 'family_name', 'family_mobile',
    'family_village', 'family_designation',
    'created_at'
    -- updated_at is deliberately NOT here: the editor sends it and a
    -- trigger overwrites it (20260805100000).
  ];
  cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ') INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'profiles'
     AND column_name <> ALL (privileged);
  EXECUTE format('GRANT UPDATE (%s) ON public.profiles TO authenticated', cols);
END $$;

-- The guard restores every privileged column, not just the authorisation
-- ones, so a table-wide grant re-appearing later cannot reopen any of
-- them.
CREATE OR REPLACE FUNCTION public.guard_privileged_profile_columns()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.is_admin() OR current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  NEW.role                    := OLD.role;
  NEW.status                  := OLD.status;
  NEW.email                   := OLD.email;
  NEW.referral_code           := OLD.referral_code;
  NEW.referred_by             := OLD.referred_by;
  NEW.public_user_code        := OLD.public_user_code;
  NEW.epic_number             := OLD.epic_number;
  NEW.has_vote                := OLD.has_vote;
  NEW.onboarding_completed_at := OLD.onboarding_completed_at;
  NEW.dob                     := OLD.dob;
  NEW.family_relation         := OLD.family_relation;
  NEW.family_name             := OLD.family_name;
  NEW.family_mobile           := OLD.family_mobile;
  NEW.family_village          := OLD.family_village;
  NEW.family_designation      := OLD.family_designation;

  RETURN NEW;
END $$;

-- update_my_private_profile() is SECURITY DEFINER and runs as the owner,
-- so it bypasses both the grant and the trigger. It stays the only path
-- to these fields for a member, and it only ever touches auth.uid()'s
-- own row.

-- ── profiles UPDATE policy ───────────────────────────────────────────
DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR public.has_global_scope()
    OR public.can_write_country(country_of_residence)
  )
  WITH CHECK (
    id = auth.uid()
    OR public.has_global_scope()
    OR public.can_write_country(country_of_residence)
  );

-- ── member_roles ─────────────────────────────────────────────────────
-- Delegation happens through grant_wing_role() / revoke_wing_role(),
-- which check rank. Direct table writes are closed to everyone except
-- admin, so there is no second path that skips the hierarchy.
DROP POLICY IF EXISTS member_roles_write ON public.member_roles;
CREATE POLICY member_roles_write ON public.member_roles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

REVOKE INSERT, UPDATE, DELETE ON public.member_roles FROM authenticated;
GRANT INSERT, UPDATE, DELETE ON public.member_roles TO authenticated;
-- ^ table-level grant kept so an ADMIN can still act directly; the
--   policy above is what restricts it to them.

-- ── chapter-scoped tables use the cluster predicate ──────────────────
DROP POLICY IF EXISTS handles_chapter_write ON public.social_handles;
CREATE POLICY handles_chapter_write ON public.social_handles
  FOR ALL TO authenticated
  USING (scope = 'chapter' AND public.can_write_cluster(cluster_id))
  WITH CHECK (scope = 'chapter' AND public.can_write_cluster(cluster_id));

-- Appointment slots and campaigns are country-scoped by column, so a
-- cluster lead has no authority over them unless the slot names their
-- cluster. cluster_id exists on slots; campaigns have only country.
DROP POLICY IF EXISTS slots_coordinator_write ON public.appointment_slots;
CREATE POLICY slots_coordinator_write ON public.appointment_slots
  FOR ALL TO authenticated
  USING (
    (cluster_id IS NOT NULL AND public.can_write_cluster(cluster_id))
    OR (cluster_id IS NULL AND country IS NOT NULL AND public.can_write_country(country))
  )
  WITH CHECK (
    (cluster_id IS NOT NULL AND public.can_write_cluster(cluster_id))
    OR (cluster_id IS NULL AND country IS NOT NULL AND public.can_write_country(country))
  );

DROP POLICY IF EXISTS campaigns_coordinator_write ON public.campaigns;
CREATE POLICY campaigns_coordinator_write ON public.campaigns
  FOR ALL TO authenticated
  USING (country IS NOT NULL AND public.can_write_country(country))
  WITH CHECK (country IS NOT NULL AND public.can_write_country(country));

DO $$
DECLARE leaked text;
BEGIN
  SELECT string_agg(column_name, ', ') INTO leaked
    FROM information_schema.column_privileges
   WHERE table_schema='public' AND table_name='profiles'
     AND grantee='authenticated' AND privilege_type='UPDATE'
     AND column_name IN ('dob','family_relation','family_name','family_mobile',
                         'family_village','family_designation','role','status',
                         'email','epic_number','has_vote');
  IF leaked IS NOT NULL THEN
    RAISE EXCEPTION 'still directly writable: %', leaked;
  END IF;
  RAISE NOTICE 'write policies and column grants closed';
END $$;
