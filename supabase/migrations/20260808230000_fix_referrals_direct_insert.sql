-- =====================================================================
-- 20260808230000 — close a direct-REST bypass on public.referrals
--
-- FOUND BY THE ADVERSARIAL SECURITY PASS over this session's whole
-- batch (not a new feature's own migration): referrals_insert's WITH
-- CHECK, in place since 20240101000100, only constrains referred_id
-- (= auth.uid() OR is_admin()) — it never constrains referrer_id at
-- all. process_my_referral() enforces the real rules (no self-
-- referral, can't credit an admin, one-time-only) entirely in PL/pgSQL,
-- but every one of those rules lives ONLY inside that function. A
-- direct POST to /rest/v1/referrals, bypassing the RPC entirely, was
-- confirmed live to let any member insert an arbitrary referrer_id —
-- including crediting themselves as their own referrer, or crediting
-- an admin, both of which process_my_referral() explicitly refuses.
--
-- This became newly load-bearing this session: admin_member_list()
-- (20260808110000) surfaces referred_count computed from this exact
-- table on the a-members admin screen, and a-talent's copy calls
-- people who show up there "your future office bearers." A gap that
-- was merely incorrect in 2024 is now a real gaming vector on a stat
-- admins act on.
--
-- FIX: same "funnel entirely through the SECURITY DEFINER RPC" pattern
-- already used this session for appointment_ranges and welcome_messages,
-- applied here instead of trying to replicate process_my_referral()'s
-- business rules a second time inside a WITH CHECK clause (which would
-- duplicate logic in two places that can drift). process_my_referral()
-- already INSERTs into this table itself and is SECURITY DEFINER, so
-- it keeps working unchanged — only the direct table path closes.
-- referrals_insert is left in place rather than dropped: harmless once
-- the grant is gone, and a real second layer if anyone ever re-grants
-- INSERT without reading this comment.
-- =====================================================================

REVOKE INSERT ON public.referrals FROM authenticated, anon, public;

DO $$
BEGIN
  RAISE NOTICE 'referrals: direct INSERT revoked, process_my_referral() is now the only write path';
END $$;
