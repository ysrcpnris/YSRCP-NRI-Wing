-- =====================================================================
-- 20260804300000 — feedback: scope it, and stop granting anon TRUNCATE
--
-- Unlike grievances, suggestions is genuinely wired up — a public page,
-- a dashboard tab and an admin screen all use it. So this migration
-- fixes two specific things and leaves the working parts alone.
--
-- 1. THE GRANTS
--    anon and authenticated both hold DELETE, INSERT, SELECT, UPDATE,
--    TRUNCATE, TRIGGER and REFERENCES on this table. RLS is currently
--    stopping the damage — verified: an anonymous DELETE and a
--    non-admin DELETE both changed nothing. But that is defence in
--    depth pointing the wrong way. A grant of TRUNCATE to anon means
--    the table is one dropped policy away from being emptied by anyone
--    holding the publicly shipped anon key, and TRUNCATE is not
--    filtered by RLS the way DELETE is.
--
--    Narrowed to what each role actually needs: anon inserts (the
--    public feedback form), authenticated inserts and reads its own,
--    admin does the rest.
--
-- 2. NO COUNTRY SCOPE
--    Only is_admin() can read feedback. Every other member-facing table
--    in this app — grievances, service_requests, student_requests,
--    profiles — lets a coordinator see their own country. Feedback from
--    the Germany chapter should reach the Germany coordinator without
--    going through central admin, which is the entire premise of the
--    chapter model.
--
-- WHAT IS NOT CHANGED
--    The public insert policy stays open. Feedback from someone who has
--    not logged in is the point of a public suggestions page, and
--    closing it would break the Contact and Suggestions pages.
-- =====================================================================

-- ── grants ───────────────────────────────────────────────────────────
REVOKE ALL ON public.suggestions FROM anon, authenticated;

-- anon may INSERT and nothing else. It deliberately holds no SELECT
-- policy, so an anonymous caller can write feedback and never read the
-- table — not their own row, not anyone's.
--
-- The consequence, verified rather than assumed: an anonymous insert
-- sent with `Prefer: return=representation` fails, because PostgREST
-- fulfils that header by SELECTing the row back and there is no policy
-- permitting it. A plain insert returns 201. That is the correct
-- trade — a public form does not need the row echoed to it, and the
-- alternative is letting unauthenticated callers read feedback rows.
--
-- Client code must therefore use `.insert(...)` without a trailing
-- `.select()` on the public path. The app already does; this comment
-- exists so the next person does not "fix" the 401 by widening the
-- policy.
GRANT INSERT ON public.suggestions TO anon;
GRANT INSERT, SELECT, UPDATE ON public.suggestions TO authenticated;
-- DELETE stays with admin, whose policy already gates it, and TRUNCATE
-- is granted to nobody: it bypasses row policies entirely.

-- ── attribution ──────────────────────────────────────────────────────
-- A signed-in submission must belong to the caller. Previously the
-- INSERT policy was CHECK (true), so the only thing preventing a member
-- from filing feedback under someone else's user_id was that they could
-- not read other members' ids. That is an accident, not a control.
DROP POLICY IF EXISTS suggestions_public_insert ON public.suggestions;

CREATE POLICY suggestions_anon_insert ON public.suggestions
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);       -- anonymous feedback claims nobody

CREATE POLICY suggestions_member_insert ON public.suggestions
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- ── reading ──────────────────────────────────────────────────────────
-- Own feedback, plus the coordinator's own countries, plus admin.
DROP POLICY IF EXISTS suggestions_own_read ON public.suggestions;

CREATE POLICY suggestions_read ON public.suggestions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR (
      public.is_coordinator()
      AND country IS NOT NULL
      AND country = ANY (public.my_countries())
    )
  );

-- The country column is free text supplied by the form, so it is only
-- as good as what was typed. For a signed-in member the profile is the
-- better source; this backfills it and a trigger keeps it true.
UPDATE public.suggestions s
   SET country = p.country_of_residence
  FROM public.profiles p
 WHERE p.id = s.user_id
   AND s.user_id IS NOT NULL
   AND (s.country IS NULL OR btrim(s.country) = ''
        OR s.country IS DISTINCT FROM p.country_of_residence);

CREATE OR REPLACE FUNCTION public.stamp_suggestion_country()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Scope is decided by the profile, never by the form field. Otherwise
  -- a member could type another country and land in that coordinator's
  -- queue — the same class of mistake as trusting grievances.country.
  IF NEW.user_id IS NOT NULL THEN
    SELECT p.country_of_residence INTO NEW.country
      FROM public.profiles p WHERE p.id = NEW.user_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_suggestion_country ON public.suggestions;
CREATE TRIGGER trg_suggestion_country
  BEFORE INSERT OR UPDATE OF user_id ON public.suggestions
  FOR EACH ROW EXECUTE FUNCTION public.stamp_suggestion_country();

-- ── the coordinator's feedback list ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.feedback_for_my_countries(
  p_limit  int DEFAULT 100,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id           uuid,
  name         text,
  suggestion   text,
  country      text,
  email        text,
  mobile_number text,
  is_member    boolean,
  submitted_at timestamptz,
  total_count  bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.name, s.suggestion, s.country, s.email, s.mobile_number,
         s.user_id IS NOT NULL,
         s.suggestion_date,
         count(*) OVER ()
    FROM public.suggestions s
   WHERE public.is_admin()
      OR (s.country IS NOT NULL AND s.country = ANY (public.my_countries()))
   ORDER BY s.suggestion_date DESC NULLS LAST
   LIMIT greatest(1, least(coalesce(p_limit, 100), 500))
  OFFSET greatest(0, coalesce(p_offset, 0));
$$;

REVOKE ALL ON FUNCTION public.feedback_for_my_countries(int, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.feedback_for_my_countries(int, int) TO authenticated;

COMMENT ON TABLE public.suggestions IS
  'Member and public feedback. Anonymous submissions are allowed and '
  'carry no user_id; a signed-in submission is bound to the caller by '
  'policy. country is set from the submitter''s profile, not the form, '
  'so it can be trusted for coordinator scope.';
