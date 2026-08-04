-- =====================================================================
-- 20260805090000 — stop members writing privileged profile columns
--
-- THE DEFECT (release-blocking, exploitable in one request)
--   profiles_self_update allows `id = auth.uid()` for the whole row, and
--   `authenticated` held table-wide UPDATE. is_admin() trusts
--   profiles.role. So:
--
--     PATCH /rest/v1/profiles?id=eq.<self>  {"role":"admin"}  ->  204
--
--   Reproduced on staging: a plain member became an admin and could
--   then read every protected column in the database. The UI not
--   offering the field is not a control.
--
--   20260804094500 built a careful column-level READ boundary and I
--   verified it thoroughly. Nobody checked WRITE. A read boundary on a
--   table with table-wide UPDATE is not a boundary.
--
--   The same policy let a coordinator rewrite every column of every
--   profile in their country — including epic_number, dob, family_*,
--   email, role and referral_code — columns they cannot even read.
--
-- THE FIX
--   Column-level UPDATE grants, built by EXCLUSION so a column added
--   later is privileged by default and must be opted in. Same shape as
--   the read grants, for the same reason.
--
--   Privileged columns change only through SECURITY DEFINER RPCs with
--   their own authorisation, or not at all.
-- =====================================================================

REVOKE UPDATE ON public.profiles FROM authenticated;

DO $$
DECLARE
  -- Columns a member may never write about themselves, and a
  -- coordinator may never write about anyone.
  privileged text[] := ARRAY[
    'id', 'auth_user_id', 'email',            -- identity
    'role', 'status',                          -- authorisation
    'public_user_code', 'referral_code', 'referred_by',
    'onboarding_completed_at',                 -- set by trigger only
    'epic_number', 'has_vote',                 -- voter data
    'created_at', 'updated_at'
  ];
  cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
    INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'profiles'
     AND column_name <> ALL (privileged);

  EXECUTE format('GRANT UPDATE (%s) ON public.profiles TO authenticated', cols);
END $$;

-- Belt and braces. A future GRANT UPDATE on the whole table would
-- silently re-open escalation; this trigger makes that impossible
-- without also dropping the trigger, which is a deliberate act rather
-- than an oversight.
CREATE OR REPLACE FUNCTION public.guard_privileged_profile_columns()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- The service role and admins legitimately change these; everyone
  -- else gets the old value silently restored rather than an error, so
  -- an ordinary profile save with a stale payload cannot fail.
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

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_privileged_profile ON public.profiles;
CREATE TRIGGER trg_guard_privileged_profile
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_privileged_profile_columns();

-- The onboarding stamp trigger must still be able to set its own
-- column. It runs BEFORE UPDATE too; ordering is alphabetical by
-- trigger name, so trg_guard_privileged_profile fires before
-- trg_onboarding_complete_upd and the stamp still wins.
--   guard...(g) < onboarding...(o)  — verified by the assertion below.

-- Changing a member's role is an administrative act with an audit
-- trail, not a column write.
CREATE OR REPLACE FUNCTION public.set_member_role(
  p_profile_id uuid,
  p_role       text
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN false;
  END IF;
  IF p_role NOT IN ('user', 'admin', 'support') THEN
    RAISE EXCEPTION 'unknown role: %', p_role;
  END IF;
  IF p_profile_id = auth.uid() AND p_role <> 'admin' THEN
    -- An admin demoting themselves can lock everyone out of the wing.
    RAISE EXCEPTION 'an admin cannot remove their own admin role';
  END IF;

  UPDATE public.profiles SET role = p_role WHERE id = p_profile_id;
  INSERT INTO public.admin_overrides (actor_id, action, target_table, target_id, detail)
  VALUES (auth.uid(), 'set_role', 'profiles', p_profile_id,
          format('role -> %s', p_role));
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.set_member_role(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_member_role(uuid, text) TO authenticated;

DO $$
DECLARE has_role_grant boolean; guard_first boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.column_privileges
     WHERE table_schema='public' AND table_name='profiles'
       AND grantee='authenticated' AND privilege_type='UPDATE'
       AND column_name IN ('role','status','email','epic_number')
  ) INTO has_role_grant;

  IF has_role_grant THEN
    RAISE EXCEPTION 'authenticated still holds UPDATE on a privileged column';
  END IF;

  SELECT tgname < 'trg_onboarding_complete_upd' INTO guard_first
    FROM pg_trigger WHERE tgname = 'trg_guard_privileged_profile';
  IF NOT guard_first THEN
    RAISE EXCEPTION 'guard trigger would run after the onboarding stamp';
  END IF;

  RAISE NOTICE 'profile write privileges narrowed';
END $$;
