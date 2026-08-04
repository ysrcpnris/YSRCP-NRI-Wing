-- =====================================================================
-- 20260805160000 — chapter appointments are private to that chapter
--
-- (1) THE ROW POLICY DID NOT MATCH THE RPC
--   open_slots() filters a chapter slot to that chapter's members and
--   withholds virtual_link until a booking is confirmed. slots_read did
--   neither: it allowed any member in the COUNTRY to select the row
--   straight from /appointment_slots, meeting link included.
--
--   Proven: a Germany member outside the Germany chapter read
--   "https://secret.example.com/room" from the table API while
--   open_slots() correctly hid the slot from them.
--
--   Careful RPC logic beside a loose row policy is not a boundary. The
--   policy now mirrors open_slots(), and virtual_link is revoked at the
--   COLUMN level so no table query can return it at all — open_slots()
--   is SECURITY DEFINER and reads it as the owner, which is the only
--   path that should.
--
-- (2) book_slot() NEVER CHECKED THE CHAPTER
--   It validated the member's country and ignored chapter_id entirely,
--   so a member from another chapter in the same country could book a
--   chapter slot by UUID even when it was correctly hidden from them.
--   Proven: booking succeeded and returned "Your appointment is
--   confirmed."
--
-- (4) THE FK CASCADED, AND THE MIGRATION DELETED SILENTLY
--   appointment_slots_chapter_country_fk was ON DELETE CASCADE, so
--   removing a chapter would take its appointments and every booking
--   with them. Attendance history is a record of who met whom; it
--   should outlive a reorganisation of the chapter map. Now RESTRICT —
--   deleting a chapter with appointments fails loudly and the operator
--   decides.
-- =====================================================================

-- ── (1) visibility mirrors open_slots() ──────────────────────────────
DROP POLICY IF EXISTS slots_read ON public.appointment_slots;
CREATE POLICY slots_read ON public.appointment_slots
  FOR SELECT TO authenticated
  USING (
    public.has_global_scope()
    OR public.can_manage_slot(id)
    OR (
      is_published
      AND (
        CASE
          -- A slot naming a chapter belongs to that chapter's members.
          WHEN chapter_id IS NOT NULL THEN
            chapter_id = (
              SELECT public.chapter_for_city(p.country_of_residence, p.city_abroad)
                FROM public.profiles p WHERE p.id = auth.uid())
          WHEN country IS NOT NULL THEN
            country = (SELECT p.country_of_residence
                         FROM public.profiles p WHERE p.id = auth.uid())
          ELSE true            -- wing-wide; only an admin can create one
        END
      )
    )
  );

-- The meeting link is never readable through the table. open_slots()
-- runs as the owner and releases it only to a confirmed attendee.
--
-- Built by EXCLUSION, not "grant the table then revoke one column":
-- table-level SELECT implies every column and a later REVOKE of a
-- subset is a no-op. The assertion at the foot caught exactly that.
REVOKE SELECT ON public.appointment_slots FROM authenticated;
DO $$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ') INTO cols
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='appointment_slots'
     AND column_name <> 'virtual_link';
  EXECUTE format('GRANT SELECT (%s) ON public.appointment_slots TO authenticated', cols);
END $$;

-- ── (2) booking respects the chapter ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.book_slot(
  p_slot_id uuid,
  p_note    text DEFAULT NULL
)
RETURNS TABLE (ok boolean, status text, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  s          public.appointment_slots;
  v_taken    int;
  v_country  text;
  v_city     text;
  v_chapter  uuid;
  v_status   public.booking_status;
BEGIN
  SELECT * INTO s FROM public.appointment_slots
   WHERE appointment_slots.id = p_slot_id FOR UPDATE;

  IF s.id IS NULL OR NOT s.is_published THEN
    RETURN QUERY SELECT false, NULL::text, 'That appointment is not available.';
    RETURN;
  END IF;

  IF s.starts_at <= now() THEN
    RETURN QUERY SELECT false, NULL::text, 'That appointment has already started.';
    RETURN;
  END IF;

  SELECT p.country_of_residence, p.city_abroad INTO v_country, v_city
    FROM public.profiles p WHERE p.id = auth.uid();
  v_chapter := public.chapter_for_city(v_country, v_city);

  IF s.country IS NOT NULL AND s.country IS DISTINCT FROM v_country THEN
    RETURN QUERY SELECT false, NULL::text, 'That appointment is not open to your country.';
    RETURN;
  END IF;

  -- The check that was missing. Hiding a slot in open_slots() is not a
  -- control while the UUID still books.
  IF s.chapter_id IS NOT NULL AND s.chapter_id IS DISTINCT FROM v_chapter THEN
    RETURN QUERY SELECT false, NULL::text, 'That appointment is not open to your chapter.';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.appointment_bookings b
     WHERE b.slot_id = p_slot_id AND b.profile_id = auth.uid()
       AND b.status IN ('pending', 'confirmed')
  ) THEN
    RETURN QUERY SELECT false, NULL::text, 'You have already booked this one.';
    RETURN;
  END IF;

  SELECT count(*) INTO v_taken
    FROM public.appointment_bookings b
   WHERE b.slot_id = p_slot_id AND b.status = 'confirmed';

  IF s.mode = 'auto' THEN
    IF v_taken >= s.capacity THEN
      RETURN QUERY SELECT false, NULL::text, 'That appointment is now full.';
      RETURN;
    END IF;
    v_status := 'confirmed';
  ELSE
    v_status := 'pending';
  END IF;

  INSERT INTO public.appointment_bookings (slot_id, profile_id, status, member_note)
  VALUES (p_slot_id, auth.uid(), v_status, nullif(btrim(p_note), ''));

  RETURN QUERY SELECT true, v_status::text,
    CASE WHEN v_status = 'confirmed'
         THEN 'Your appointment is confirmed.'
         ELSE 'Your request has been sent for approval.' END;
END $$;

REVOKE ALL ON FUNCTION public.book_slot(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.book_slot(uuid, text) TO authenticated;

-- ── (4) appointment history survives a chapter being removed ─────────
ALTER TABLE public.appointment_slots
  DROP CONSTRAINT IF EXISTS appointment_slots_chapter_country_fk;
ALTER TABLE public.appointment_slots
  ADD  CONSTRAINT appointment_slots_chapter_country_fk
       FOREIGN KEY (chapter_id, country)
       REFERENCES public.chapters (id, country)
       ON DELETE RESTRICT;

DO $$
DECLARE v_del char;
BEGIN
  SELECT confdeltype INTO v_del FROM pg_constraint
   WHERE conname = 'appointment_slots_chapter_country_fk';
  IF v_del <> 'r' THEN
    RAISE EXCEPTION 'appointment FK is % not RESTRICT — deleting a chapter would destroy bookings', v_del;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.column_privileges
     WHERE table_schema='public' AND table_name='appointment_slots'
       AND grantee='authenticated' AND privilege_type='SELECT'
       AND column_name='virtual_link') THEN
    RAISE EXCEPTION 'virtual_link is still directly readable';
  END IF;

  RAISE NOTICE 'appointment read and booking scope closed';
END $$;
