-- =====================================================================
-- 20260805235000 — real mandal-level leader tracking
--
-- The prototype's Local Connect screen (m-connect) shows a "Mandal
-- President" card and a table of every mandal in the member's
-- constituency with a president, village count and household count.
-- None of that existed: leader_assignments only ever scoped to
-- constituency/district/state (my_local_connect's three tiers). This
-- adds the missing tier the same way the existing three already work —
-- same table, same admin surface, not a parallel system.
--
-- WHAT THIS DOES
--   1. leader_assignments gets a `mandal` column, exactly like its
--      existing `district`/`constituency` free-text scope columns.
--      "Mandal President" becomes a real, admin-assignable role.
--   2. my_local_connect() gains a 4th tier for the caller's own mandal.
--   3. my_constituency_mandals() — new: every mandal in the caller's
--      constituency, LEFT JOINed to its president, so an unfilled seat
--      shows as genuinely vacant rather than absent.
--
-- WHAT THIS DELIBERATELY DOES NOT DO
--   ap_mandals.villages_count / households_count are added NULLABLE,
--   with no seed data and no admin screen to enter them. There is no
--   real source for these figures, and building a data-entry surface
--   to hold empty fields would be inventing scope nobody asked for.
--   The member screen must render them as "not yet recorded" — a
--   fabricated household count would be worse than an honest blank,
--   and it must never look identical to a genuine zero.
-- =====================================================================

ALTER TABLE public.ap_mandals
  ADD COLUMN IF NOT EXISTS villages_count   int,
  ADD COLUMN IF NOT EXISTS households_count int;

COMMENT ON COLUMN public.ap_mandals.villages_count IS
  'Nullable by design — no real source yet. NULL means "not recorded", not zero.';
COMMENT ON COLUMN public.ap_mandals.households_count IS
  'Nullable by design — no real source yet. NULL means "not recorded", not zero.';

ALTER TABLE public.leader_assignments
  ADD COLUMN IF NOT EXISTS mandal text;

CREATE INDEX IF NOT EXISTS leader_assignments_mandal_idx
  ON public.leader_assignments (mandal);

-- ── resolve a mandal name within a specific constituency ─────────────
-- Mandal names repeat across constituencies (ap_mandals' own comment),
-- so resolution must be scoped, unlike resolve_constituency/_district.
CREATE OR REPLACE FUNCTION public.resolve_mandal(p_constituency_id int, p_name text)
RETURNS bigint
LANGUAGE sql STABLE
AS $$
  SELECT id FROM public.ap_mandals
   WHERE constituency_id = p_constituency_id AND name = btrim(p_name)
  UNION ALL
  SELECT id FROM public.ap_mandals
   WHERE constituency_id = p_constituency_id AND lower(name) = lower(btrim(p_name))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_mandal(int, text) TO anon, authenticated;

-- ── my_local_connect(): add the mandal tier ───────────────────────────
DROP FUNCTION IF EXISTS public.my_local_connect();
CREATE FUNCTION public.my_local_connect()
RETURNS TABLE (
  tier text, role text, leader_name text, whatsapp text,
  whatsapp_alt text, photo_url text, place text, sort_order int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH me AS (
    SELECT public.resolve_constituency(assembly_constituency) AS cid, mandal AS my_mandal
      FROM public.profiles WHERE id = auth.uid()
  ),
  my_did AS (
    SELECT c.district_id AS did FROM me
      JOIN public.ap_constituencies c ON c.id = me.cid
  ),
  rows AS (
    SELECT 'mandal'::text tier, la.role, lm.name, lm.whatsapp_number,
           lm.whatsapp_number_2, lm.photo_url, la.mandal place, 0 so
      FROM public.leader_assignments la
      JOIN public.leaders_master lm ON lm.id = la.leader_id
      CROSS JOIN me
     WHERE la.is_active AND lm.is_active AND me.cid IS NOT NULL
       AND la.role = 'Mandal President'
       AND public.resolve_constituency(la.constituency) = me.cid
       AND me.my_mandal IS NOT NULL
       AND la.mandal IS NOT NULL
       AND lower(btrim(la.mandal)) = lower(btrim(me.my_mandal))

    UNION ALL

    SELECT 'constituency', la.role, lm.name, lm.whatsapp_number,
           lm.whatsapp_number_2, lm.photo_url, la.constituency, 1
      FROM public.leader_assignments la
      JOIN public.leaders_master lm ON lm.id = la.leader_id
      CROSS JOIN me
     WHERE la.is_active AND lm.is_active AND me.cid IS NOT NULL
       AND la.role = 'Assembly Coordinator'
       AND public.resolve_constituency(la.constituency) = me.cid

    UNION ALL

    SELECT 'district', la.role, lm.name, lm.whatsapp_number,
           lm.whatsapp_number_2, lm.photo_url, la.district, 2
      FROM public.leader_assignments la
      JOIN public.leaders_master lm ON lm.id = la.leader_id
     WHERE la.is_active AND lm.is_active
       AND la.role = 'District President'
       AND public.resolve_district(la.district) IN (SELECT did FROM my_did)

    UNION ALL

    SELECT 'state', la.role, lm.name, lm.whatsapp_number,
           lm.whatsapp_number_2, lm.photo_url, NULL, 3
      FROM public.leader_assignments la
      JOIN public.leaders_master lm ON lm.id = la.leader_id
     WHERE la.is_active AND lm.is_active
       AND la.role IN ('President', 'Global Coordinator', 'Regional Coordinator')
  )
  SELECT * FROM rows ORDER BY so;
$$;

REVOKE ALL ON FUNCTION public.my_local_connect() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_local_connect() TO authenticated;

-- ── every mandal in the caller's constituency, president if assigned ──
CREATE OR REPLACE FUNCTION public.my_constituency_mandals()
RETURNS TABLE (
  mandal_name      text,
  villages_count   int,
  households_count int,
  president_name   text,
  whatsapp         text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH me AS (
    SELECT public.resolve_constituency(assembly_constituency) AS cid
      FROM public.profiles WHERE id = auth.uid()
  )
  SELECT m.name, m.villages_count, m.households_count,
         lm.name, lm.whatsapp_number
    FROM public.ap_mandals m
    CROSS JOIN me
    LEFT JOIN public.leader_assignments la
           ON la.role = 'Mandal President' AND la.is_active
          AND public.resolve_constituency(la.constituency) = m.constituency_id
          AND la.mandal IS NOT NULL
          AND lower(btrim(la.mandal)) = lower(btrim(m.name))
    LEFT JOIN public.leaders_master lm ON lm.id = la.leader_id AND lm.is_active
   WHERE m.constituency_id = me.cid AND m.is_active
   ORDER BY m.name;
$$;

REVOKE ALL ON FUNCTION public.my_constituency_mandals() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_constituency_mandals() TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='leader_assignments' AND column_name='mandal') THEN
    RAISE EXCEPTION 'leader_assignments.mandal was not created';
  END IF;
  RAISE NOTICE 'mandal tracking ready';
END $$;
