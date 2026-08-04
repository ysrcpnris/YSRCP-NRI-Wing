-- =====================================================================
-- 20260804290000 — book_slot: resolve an ambiguous column reference
--
-- book_slot() declared RETURNS TABLE (ok boolean, status text, ...) and
-- also queried appointment_bookings.status. Inside a PL/pgSQL function
-- the OUT parameter and the table column share a name, so
--
--   SELECT count(*) ... WHERE status = 'confirmed'
--
-- raised 42702 "column reference status is ambiguous" and every booking
-- failed. Both concurrent test calls errored identically, which is how
-- it surfaced — a single call would have looked like an ordinary
-- failure rather than a defect in the function.
--
-- The fix is to alias every table in the function body and qualify each
-- column reference (b.status, ab.status), rather than renaming the OUT
-- parameter. PostgREST names its JSON keys from the RETURNS TABLE list,
-- so renaming `status` there would change the response shape the UI
-- reads — a bigger change than the bug warrants. Local variables also
-- take a v_ prefix so they cannot collide with a column either.
-- =====================================================================

DROP FUNCTION IF EXISTS public.book_slot(uuid, text);

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
  v_status   public.booking_status;
BEGIN
  -- FOR UPDATE serialises concurrent bookings on the same slot. Without
  -- it, two members can both read "1 seat left" and both insert.
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

  SELECT p.country_of_residence INTO v_country
    FROM public.profiles p WHERE p.id = auth.uid();

  IF s.country IS NOT NULL AND s.country IS DISTINCT FROM v_country THEN
    RETURN QUERY SELECT false, NULL::text, 'That appointment is not open to your country.';
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

  -- Only confirmed bookings consume capacity. In manual mode a slot can
  -- collect more requests than seats — that is the point of the mode.
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

-- decide_booking() had the same shape of risk: it queries
-- appointment_bookings.status while declaring no `status` OUT parameter,
-- so it was not ambiguous — but the unqualified references are fixed
-- here too rather than left to be broken by a later signature change.
CREATE OR REPLACE FUNCTION public.decide_booking(
  p_booking_id uuid,
  p_decision   text,
  p_note       text DEFAULT NULL
)
RETURNS TABLE (ok boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  s       public.appointment_slots;
  b       public.appointment_bookings;
  v_taken int;
BEGIN
  IF p_decision NOT IN ('confirmed', 'declined') THEN
    RAISE EXCEPTION 'decision must be confirmed or declined, got %', p_decision;
  END IF;

  SELECT * INTO b FROM public.appointment_bookings ab WHERE ab.id = p_booking_id;
  IF b.id IS NULL THEN
    RETURN QUERY SELECT false, 'No such booking.';
    RETURN;
  END IF;

  SELECT * INTO s FROM public.appointment_slots aslot
   WHERE aslot.id = b.slot_id FOR UPDATE;

  IF NOT (public.is_admin()
          OR (s.country IS NOT NULL AND s.country = ANY (public.my_countries()))) THEN
    RETURN QUERY SELECT false, 'That appointment is outside the countries you cover.';
    RETURN;
  END IF;

  -- Capacity binds approvals too. Without this an admin working through
  -- a manual queue would quietly confirm more people than there are
  -- seats, and nothing would complain until everyone turned up.
  IF p_decision = 'confirmed' THEN
    SELECT count(*) INTO v_taken
      FROM public.appointment_bookings ab
     WHERE ab.slot_id = b.slot_id
       AND ab.status = 'confirmed'
       AND ab.id <> p_booking_id;
    IF v_taken >= s.capacity THEN
      RETURN QUERY SELECT false,
        format('That slot is full (%s of %s confirmed).', v_taken, s.capacity);
      RETURN;
    END IF;
  END IF;

  UPDATE public.appointment_bookings ab
     SET status     = p_decision::public.booking_status,
         admin_note = coalesce(nullif(btrim(p_note), ''), ab.admin_note),
         decided_by = auth.uid(),
         decided_at = now()
   WHERE ab.id = p_booking_id;

  RETURN QUERY SELECT true,
    CASE WHEN p_decision = 'confirmed' THEN 'Booking confirmed.'
         ELSE 'Booking declined.' END;
END $$;

REVOKE ALL ON FUNCTION public.decide_booking(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.decide_booking(uuid, text, text) TO authenticated;
