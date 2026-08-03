-- =====================================================================
-- 20260804170000 — Local Connect
--
-- WHAT IT ANSWERS
--   "Who represents my home constituency, and how do I reach them?"
--   A member in Frankfurt whose family is in Nandyal gets Nandyal's
--   assembly coordinator, Nandyal district's president, and the state
--   leadership — with WhatsApp numbers, because reaching them is the
--   entire point of the feature.
--
-- DATA IT RUNS ON (all real, none seeded for the demo)
--   leaders_master      305 leaders, 305 with a WhatsApp number
--   leader_assignments  238 postings — 178 assembly coordinators
--                       covering 176 constituencies, 28 district
--                       presidents, plus state-level roles
--
-- WHY resolve_constituency AND NOT A JOIN ON NAME
--   leader_assignments.constituency is free text: 'Palamaneru' for
--   Palamaner, 'Nandyala' for Nandyal, 'Pulivendula' for Pulivendla.
--   A plain name join drops 24 constituencies — those members would be
--   told no coordinator exists when one does (migration ...160000).
--
-- WHY SECURITY DEFINER
--   leaders_master holds phone numbers and is not readable by members
--   directly. This function is the only path to them, it returns
--   leaders and never members, and it is scoped to the caller's OWN
--   constituency — so it cannot be used to enumerate the roster.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.my_local_connect()
RETURNS TABLE (
  tier          text,     -- 'constituency' | 'district' | 'state'
  role          text,
  leader_name   text,
  whatsapp      text,
  whatsapp_alt  text,
  photo_url     text,
  place         text,
  sort_order    int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH me AS (
    SELECT assembly_constituency AS ac,
           public.resolve_constituency(assembly_constituency) AS cid
      FROM public.profiles WHERE id = auth.uid()
  ),
  -- The member's district is derived from their constituency rather
  -- than read from profiles.district: the profile field is free text
  -- (39 spellings for 26 districts in the production export), while
  -- the constituency is now a resolved reference.
  my_district AS (
    SELECT d.name FROM me
      JOIN public.ap_constituencies c ON c.id = me.cid
      JOIN public.ap_districts d      ON d.id = c.district_id
  )
  SELECT 'constituency', la.role, lm.name, lm.whatsapp_number,
         lm.whatsapp_number_2, lm.photo_url, la.constituency, 1
    FROM public.leader_assignments la
    JOIN public.leaders_master lm ON lm.id = la.leader_id
    CROSS JOIN me
   WHERE la.is_active AND lm.is_active
     AND me.cid IS NOT NULL
     AND public.resolve_constituency(la.constituency) = me.cid

  UNION ALL

  SELECT 'district', la.role, lm.name, lm.whatsapp_number,
         lm.whatsapp_number_2, lm.photo_url, la.district, 2
    FROM public.leader_assignments la
    JOIN public.leaders_master lm ON lm.id = la.leader_id
   WHERE la.is_active AND lm.is_active
     AND la.role = 'District President'
     AND lower(btrim(la.district)) IN (SELECT lower(btrim(name)) FROM my_district)

  UNION ALL

  SELECT 'state', la.role, lm.name, lm.whatsapp_number,
         lm.whatsapp_number_2, lm.photo_url, NULL, 3
    FROM public.leader_assignments la
    JOIN public.leaders_master lm ON lm.id = la.leader_id
   WHERE la.is_active AND lm.is_active
     AND la.role IN ('President', 'Global Coordinator', 'Regional Coordinator')
     AND coalesce(la.constituency, '') = ''

  ORDER BY 8, 2;
$$;

COMMENT ON FUNCTION public.my_local_connect() IS
  'Leaders for the caller''s own home constituency, its district, and '
  'the state. Returns leader contact details only — never members. '
  'Scoped to auth.uid() so it cannot enumerate the roster.';

REVOKE ALL ON FUNCTION public.my_local_connect() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_local_connect() TO authenticated;

-- Coverage, for the admin view and for honest empty states: a member
-- whose constituency has no coordinator should be told that plainly
-- rather than shown a spinner that never resolves.
CREATE OR REPLACE VIEW public.constituency_leader_coverage AS
  SELECT c.id, c.name AS constituency, d.name AS district,
         count(la.id) FILTER (WHERE la.role = 'Assembly Coordinator'
                                AND la.is_active) AS coordinators
    FROM public.ap_constituencies c
    JOIN public.ap_districts d ON d.id = c.district_id
    LEFT JOIN public.leader_assignments la
           ON public.resolve_constituency(la.constituency) = c.id
   GROUP BY c.id, c.name, d.name;

GRANT SELECT ON public.constituency_leader_coverage TO authenticated;

DO $$
DECLARE covered int; total int;
BEGIN
  SELECT count(*) FILTER (WHERE coordinators > 0), count(*)
    INTO covered, total FROM public.constituency_leader_coverage;
  RAISE NOTICE 'Local Connect: %/% constituencies have a coordinator', covered, total;
END $$;
