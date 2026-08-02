-- =====================================================================
-- Let authenticated users read their OWN suggestions.
--
-- Why: the Dashboard's Suggestions panel queries
--   SELECT … FROM public.suggestions WHERE user_id = auth.uid()
-- to show "Your previous suggestions". Before this migration the only
-- SELECT policy was `suggestions_admin_read`, so non-admin users
-- silently got an empty list (and PostgREST returned a 400 once a
-- non-existent column was also being selected — that frontend bug is
-- fixed separately).
--
-- This adds a second SELECT policy: a user can see suggestions where
-- their auth.uid() equals the suggestion's user_id. Admins are already
-- covered by suggestions_admin_read; both policies are ORed by RLS.
--
-- Idempotent: DROP IF EXISTS + CREATE.
-- =====================================================================

DROP POLICY IF EXISTS "suggestions_own_read" ON public.suggestions;
CREATE POLICY "suggestions_own_read" ON public.suggestions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
