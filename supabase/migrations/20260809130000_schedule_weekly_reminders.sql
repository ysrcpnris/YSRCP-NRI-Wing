-- =====================================================================
-- 20260809130000 — schedule the weekly reminder run
--
-- Fires the already-deployed send-weekly-reminders edge function every
-- Monday at 09:00 UTC via pg_net.http_post. The shared secret it sends
-- as the Authorization header comes from Vault at EXECUTION time
-- (vault.decrypted_secrets), not from this file — the actual secret
-- value was generated and stored directly via `vault.create_secret()`
-- outside of any migration, specifically so it never appears in this
-- repo's git history. cron_shared_secret / CRON_SECRET (the edge
-- function's own env var) must stay in sync; both were set from the
-- same generated value when this was built.
--
-- The function itself enforces the real 7-day-per-recipient cooldown
-- (public.registration_reminders / profiles.profile_reminder_last_sent_at),
-- so this schedule firing weekly is a cadence, not the actual rate
-- limit — a missed or repeated cron run cannot double-send to anyone.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'weekly-member-reminders',
  '0 9 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://vaomqjcupmlfsivkrelx.supabase.co/functions/v1/send-weekly-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_shared_secret'
      ),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

DO $$
BEGIN
  RAISE NOTICE 'weekly-member-reminders cron job scheduled for Mondays 09:00 UTC';
END $$;
