-- =====================================================================
-- 20260806170000 — Chapter Events (c-events): real chapter-scoped events
--
-- `events` TODAY: wing-wide, admin-only writes, public reads, zero
-- chapter scoping. There is already a full admin CRUD screen
-- (AdminDashboard/EventsNotifications.tsx) operating on the same
-- table wing-wide — that screen is untouched by this migration.
-- Chapter coordinators get their OWN write path, entirely through new
-- SECURITY DEFINER RPCs; the direct table stays admin-only exactly as
-- it already was (events_admin_write, unchanged).
--
-- "WHO CAN SEE IT" IS ACTUALLY ENFORCED, NOT JUST STORED
--   The mock's audience select offers "All Germany members / Frankfurt
--   only / Students group only / Team leads only". Built the first,
--   second and fourth for real, with a matching RLS read policy — a
--   Frankfurt-only event is actually invisible to a Berlin member, not
--   just hidden by the UI. "Students group only" is dropped: there is
--   no student-cohort/group-membership concept anywhere in this schema
--   (assistance_posts.category='student' means "posted a student
--   request once", not membership in a group) and inventing an
--   audience nobody can join for real is worse than not offering it.
--
-- STATUS FOLLOWS THE EXISTING REAL CONVENTION, NOT THE MOCK'S
--   events.status has no CHECK constraint; its actual, ever-used
--   values (confirmed in EventsNotifications.tsx and in staging data)
--   are 'Draft' and 'Sent' — the column comment's 'upcoming' /
--   'completed' / 'cancelled' were never implemented anywhere. New
--   chapter events use the same two real values; past-vs-scheduled is
--   a date comparison, matching how the admin screen already treats
--   it. The mock's "Recurring" status has no backing (no recurrence
--   concept exists) and is not built.
--
-- ATTENDANCE IS A NEW, MINIMAL, REAL ADDITION
--   event_applications was four columns — no attended flag anywhere.
--   Added attended_at (nullable timestamp, mirrors welcomed_at's
--   shape from c-home). The mock's "Past events" table presents
--   Registered/Attended/Turnout as settled historical fact with no
--   visible way to produce it; that number would be fabricated
--   without a real marking mechanism, so mark_event_attendance() and
--   chapter_event_registrants() exist to make it real, even though
--   the mock itself doesn't draw that control.
--
-- NO AUTO-GENERATED JOIN LINKS
--   The mock's copy says "online meetings generate a join link
--   automatically." No meeting-provider integration exists anywhere
--   in this codebase (checked: appointment_slots.virtual_link is
--   plain user-typed text, no Zoom/Meet API calls anywhere). Same
--   here: a coordinator pastes their own link.
-- =====================================================================

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS audience text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS audience_city text;

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_audience_valid;
ALTER TABLE public.events ADD CONSTRAINT events_audience_valid
  CHECK (audience IS NULL OR audience IN ('country', 'city', 'team'));

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_chapter_needs_audience;
ALTER TABLE public.events ADD CONSTRAINT events_chapter_needs_audience
  CHECK (chapter_id IS NULL OR audience IS NOT NULL);

ALTER TABLE public.event_applications ADD COLUMN IF NOT EXISTS attended_at timestamptz;

-- ── audience is enforced on read, not just stored ─────────────────────
-- Wing-wide events (chapter_id IS NULL) keep exactly the old "public can
-- read" behaviour — this policy only narrows visibility for the NEW
-- chapter-scoped rows, it never widens anything that was already open.
DROP POLICY IF EXISTS events_read ON public.events;
CREATE POLICY events_read ON public.events
  FOR SELECT
  USING (
    chapter_id IS NULL
    OR public.is_admin()
    OR public.can_write_chapter(chapter_id)
    OR (
      audience = 'country' AND EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
          AND lower(btrim(p.country_of_residence)) = lower(btrim(events.country))
      )
    )
    OR (
      audience = 'city' AND EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
          AND lower(btrim(p.city_abroad)) = lower(btrim(events.audience_city))
          AND lower(btrim(p.country_of_residence)) = lower(btrim(events.country))
      )
    )
    OR (
      audience = 'team' AND EXISTS (
        SELECT 1 FROM public.member_roles mr
         WHERE mr.profile_id = auth.uid() AND mr.revoked_at IS NULL
           AND mr.chapter_id = events.chapter_id AND mr.role IN ('team_lead', 'chapter_lead')
      )
    )
  );

-- events_admin_write is untouched — direct table writes stay admin-only.
-- Everything below is a SECURITY DEFINER RPC, same shape as
-- create_chapter()/add_chapter_handle() earlier this session.

CREATE OR REPLACE FUNCTION public.create_chapter_event(
  p_chapter_id uuid, p_title text, p_date date, p_time text DEFAULT NULL,
  p_venue text DEFAULT NULL, p_virtual_link text DEFAULT NULL,
  p_audience text DEFAULT 'country', p_audience_city text DEFAULT NULL,
  p_capacity int DEFAULT NULL, p_details text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_country text; v_id uuid;
BEGIN
  SELECT country INTO v_country FROM public.chapters WHERE id = p_chapter_id;
  IF v_country IS NULL THEN
    RAISE EXCEPTION 'no such chapter' USING ERRCODE = '22023';
  END IF;
  IF NOT public.can_write_chapter(p_chapter_id) THEN
    RAISE EXCEPTION 'not authorized to schedule an event for this chapter' USING ERRCODE = '42501';
  END IF;
  IF btrim(coalesce(p_title, '')) = '' THEN
    RAISE EXCEPTION 'title is required' USING ERRCODE = '22023';
  END IF;
  IF p_date IS NULL THEN
    RAISE EXCEPTION 'date is required' USING ERRCODE = '22023';
  END IF;
  IF p_audience NOT IN ('country', 'city', 'team') THEN
    RAISE EXCEPTION 'unknown audience: %', p_audience USING ERRCODE = '22023';
  END IF;
  IF p_audience = 'city' AND btrim(coalesce(p_audience_city, '')) = '' THEN
    RAISE EXCEPTION 'audience_city is required when audience is city' USING ERRCODE = '22023';
  END IF;
  IF btrim(coalesce(p_venue, '')) = '' AND btrim(coalesce(p_virtual_link, '')) = '' THEN
    RAISE EXCEPTION 'give either a venue or an online link' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.events (
    title, description, date, time, venue, virtual_link, country,
    chapter_id, audience, audience_city, max_attendees, organizer_id,
    kind, status
  )
  VALUES (
    btrim(p_title), nullif(btrim(coalesce(p_details, '')), ''), p_date, p_time,
    nullif(btrim(coalesce(p_venue, '')), ''), nullif(btrim(coalesce(p_virtual_link, '')), ''), v_country,
    p_chapter_id, p_audience, nullif(btrim(coalesce(p_audience_city, '')), ''), p_capacity, auth.uid(),
    'event', 'Sent'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.create_chapter_event(uuid, text, date, text, text, text, text, text, int, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_chapter_event(uuid, text, date, text, text, text, text, text, int, text) TO authenticated;

-- ── the Scheduled table: yours plus Central Command's wing-wide calls ──
CREATE OR REPLACE FUNCTION public.chapter_events_scheduled()
RETURNS TABLE (
  id uuid, title text, event_date date, event_time text, venue text, virtual_link text,
  chapter_id uuid, chapter_name text, audience text, audience_city text,
  called_by text, is_mine boolean, registered bigint, capacity int, status_label text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT e.id, e.title, e.date::date, e.time, e.venue, e.virtual_link,
         e.chapter_id, cl.name, e.audience, e.audience_city,
         CASE WHEN e.chapter_id IS NULL THEN 'Central Command'
              WHEN e.organizer_id = auth.uid() THEN 'You'
              ELSE coalesce(og.full_name, 'Chapter')
         END,
         e.organizer_id = auth.uid(),
         (SELECT count(*) FROM public.event_applications ea WHERE ea.event_id = e.id),
         e.max_attendees,
         CASE WHEN e.chapter_id IS NULL THEN 'Read-only'
              WHEN e.status = 'Draft' THEN 'Draft'
              ELSE 'Open'
         END
    FROM public.events e
    LEFT JOIN public.chapters cl ON cl.id = e.chapter_id
    LEFT JOIN public.profiles og ON og.id = e.organizer_id
   WHERE e.kind = 'event'
     AND (e.date IS NULL OR e.date::date >= current_date)
     AND (
       e.chapter_id IS NULL
       OR public.can_write_chapter(e.chapter_id)
     )
     AND (
       public.has_global_scope()
       OR array_length(public.my_countries(), 1) IS NOT NULL
       OR array_length(public.my_chapter_ids(), 1) IS NOT NULL
     )
   ORDER BY e.date ASC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.chapter_events_scheduled() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.chapter_events_scheduled() TO authenticated;

-- ── the Past events table: real Registered / Attended / Turnout ───────
CREATE OR REPLACE FUNCTION public.chapter_events_past()
RETURNS TABLE (
  id uuid, title text, event_date date, registered bigint, attended bigint, turnout_pct int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT e.id, e.title, e.date::date,
         count(ea.id),
         count(ea.id) FILTER (WHERE ea.attended_at IS NOT NULL),
         CASE WHEN count(ea.id) = 0 THEN 0
              ELSE round(100.0 * count(ea.id) FILTER (WHERE ea.attended_at IS NOT NULL) / count(ea.id))::int
         END
    FROM public.events e
    LEFT JOIN public.event_applications ea ON ea.event_id = e.id
   WHERE e.kind = 'event'
     AND e.chapter_id IS NOT NULL
     AND e.date IS NOT NULL AND e.date::date < current_date
     AND public.can_write_chapter(e.chapter_id)
   GROUP BY e.id, e.title, e.date
   ORDER BY e.date DESC
   LIMIT 50;
$$;

REVOKE ALL ON FUNCTION public.chapter_events_past() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.chapter_events_past() TO authenticated;

-- ── registrants for one event, so attendance can be marked for real ──
CREATE OR REPLACE FUNCTION public.chapter_event_registrants(p_event_id uuid)
RETURNS TABLE (user_id uuid, full_name text, applied_at timestamptz, attended_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_chapter_id uuid;
BEGIN
  SELECT chapter_id INTO v_chapter_id FROM public.events WHERE id = p_event_id;
  IF v_chapter_id IS NULL OR NOT public.can_write_chapter(v_chapter_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT ea.user_id, p.full_name, ea.applied_at, ea.attended_at
    FROM public.event_applications ea
    JOIN public.profiles p ON p.id = ea.user_id
   WHERE ea.event_id = p_event_id
   ORDER BY ea.applied_at ASC;
END $$;

REVOKE ALL ON FUNCTION public.chapter_event_registrants(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.chapter_event_registrants(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_event_attendance(p_event_id uuid, p_user_id uuid, p_attended boolean)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_chapter_id uuid;
BEGIN
  SELECT chapter_id INTO v_chapter_id FROM public.events WHERE id = p_event_id;
  IF v_chapter_id IS NULL OR NOT public.can_write_chapter(v_chapter_id) THEN
    RETURN false;
  END IF;

  UPDATE public.event_applications
     SET attended_at = CASE WHEN p_attended THEN now() ELSE NULL END
   WHERE event_id = p_event_id AND user_id = p_user_id;

  RETURN FOUND;
END $$;

REVOKE ALL ON FUNCTION public.mark_event_attendance(uuid, uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mark_event_attendance(uuid, uuid, boolean) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'Chapter events RPCs ready';
END $$;
