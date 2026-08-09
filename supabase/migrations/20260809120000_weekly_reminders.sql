-- =====================================================================
-- 20260809120000 — weekly reminder emails, tracking tables only
--
-- USER-REQUESTED: "Not Registered: send 1 reminder email per week to
-- incomplete registrations" and "Incomplete Profiles: send 1 reminder
-- email per week to complete their profile."
--
-- RESEARCHED FIRST, NOT ASSUMED: this codebase has zero custom email-
-- sending infrastructure. Every email today is Supabase Auth's own
-- built-in mail (OTP codes), sent by Supabase's own infrastructure —
-- there was nothing to hook into. This stands up the whole path:
-- tracking tables here, the actual send logic in a new edge function
-- (supabase/functions/send-weekly-reminders/), and a pg_cron schedule
-- in a follow-up migration once the function is deployed.
--
-- TWO COHORTS, TWO TRACKING MECHANISMS, BECAUSE ONE OF THEM HAS NO
-- profiles ROW YET:
--   "Not registered" = an auth.users row exists (they started signup)
--   but email_confirmed_at is still NULL — this app's flow never
--   creates a profiles row until after verification (applyVerifiedSession
--   in AuthContext.tsx), so there is nothing on `profiles` to track
--   against. registration_reminders is keyed on auth.users.id directly.
--
--   "Incomplete profile" = profiles exists, onboarding_completed_at
--   IS NULL. Tracked with a single new column on profiles itself,
--   same as every other admin/system-only bookkeeping field in this
--   schema.
--
-- NO RLS POLICIES ON PURPOSE, MATCHING THE welcome_messages/
-- appointment_ranges FUNNEL PATTERN: both are written exclusively by
-- the edge function using the service-role key, which bypasses RLS
-- entirely — no member or admin session ever needs to touch either
-- directly, so there is nothing to grant.
-- =====================================================================

CREATE TABLE public.registration_reminders (
  user_id        uuid PRIMARY KEY,
  email          text NOT NULL,
  first_sent_at  timestamptz NOT NULL DEFAULT now(),
  last_sent_at   timestamptz NOT NULL DEFAULT now(),
  send_count     int NOT NULL DEFAULT 1
);

ALTER TABLE public.registration_reminders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.registration_reminders FROM public, anon, authenticated;

COMMENT ON TABLE public.registration_reminders IS
  'Weekly-reminder cadence for accounts that started signup but never '
  'verified their email, so no profiles row exists to track this on. '
  'Written only by the send-weekly-reminders edge function via the '
  'service-role key. user_id is auth.users.id, no FK — cross-schema '
  'references to auth are not enforceable the normal way.';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_reminder_last_sent_at timestamptz;

COMMENT ON COLUMN public.profiles.profile_reminder_last_sent_at IS
  'Weekly-reminder cadence for members who verified but never finished '
  'the "Complete your profile" wizard (onboarding_completed_at IS NULL). '
  'Written only by the send-weekly-reminders edge function via the '
  'service-role key, which bypasses guard_privileged_profile_columns() '
  '— no grant needed, no member or admin ever writes this directly.';

DO $$
BEGIN
  RAISE NOTICE 'weekly-reminder tracking tables created';
END $$;
