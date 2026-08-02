-- =====================================================================
-- Add public.referrals to the supabase_realtime publication.
--
-- Why: the dashboard subscribes to INSERTs on `referrals` filtered by
--      referrer_id = auth.uid() so a user's "Active Referrals" / "Passive
--      Tree" panels update the moment someone signs up via their link.
--      Without the table being in the publication, the channel stays
--      silent — no events, no errors — and the panels never refresh.
--
-- Idempotent: only adds the table if it isn't already in the publication
-- (matching the pattern used in new_08 for credit_transactions and
-- profiles). Safe to run more than once.
-- =====================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname    = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename  = 'referrals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;
    RAISE NOTICE 'Added public.referrals to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'public.referrals is already in supabase_realtime — no change';
  END IF;
END $$;
