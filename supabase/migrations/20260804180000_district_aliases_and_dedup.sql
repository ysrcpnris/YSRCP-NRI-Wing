-- =====================================================================
-- 20260804180000 — district aliases, and stop repeating state leaders
--
-- Both defects below were invisible in SQL and obvious the moment
-- my_local_connect() was called with a real member's JWT. Worth
-- recording: the migration passed its own assertion, the coverage view
-- read 170/175, and the feature was still broken in two ways.
--
-- DEFECT 1 — the district tier never appeared
--   leader_assignments.district has the same free-text problem the
--   constituency column had, one level up:
--     Nandyala / Nandyal      YSR / YSR Kadapa
--     Ananthapuramu / Anantapur   Annamaya / Annamayya
--   So a member in Nandyal saw their assembly coordinator and the state
--   leadership, and nothing in between — the district president exists
--   and was silently skipped.
--
--   'Hyderabad' also appears as a district president posting. It is in
--   Telangana and matches no AP district; it is left unmapped, like
--   Jubilee Hills in the constituency aliases.
--
-- DEFECT 2 — 28 state rows, ~9 actual people
--   Regional Coordinators hold several district postings each. Filtering
--   on constituency = '' kept every posting, so Dr. Y.V. Subba Reddy
--   appeared five times and the one leader who actually matters — the
--   member's own coordinator — was buried under two dozen repeats.
--   DISTINCT ON collapses them to one row per leader per role.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.ap_district_aliases (
  alias       text PRIMARY KEY,
  district_id int NOT NULL REFERENCES public.ap_districts(id) ON DELETE CASCADE,
  note        text
);

ALTER TABLE public.ap_district_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS district_alias_read ON public.ap_district_aliases;
CREATE POLICY district_alias_read ON public.ap_district_aliases
  FOR SELECT TO anon, authenticated USING (true);

-- Every canonical name below is spelled exactly as ap_districts holds
-- it. Two earlier attempts ('SPS Nellore', 'Anakapalle') matched no
-- district and this INSERT ... SELECT dropped them without any error —
-- so the assertion at the foot of this file counts the rows that landed
-- rather than trusting the statement to have inserted them.
INSERT INTO public.ap_district_aliases (alias, district_id, note)
SELECT v.alias, d.id, v.note
  FROM (VALUES
    ('Nandyala',      'Nandyal',      'leader_assignments spelling'),
    ('YSR',           'YSR Kadapa',   'short form'),
    ('Ananthapuramu', 'Anantapur',    'Telugu transliteration'),
    ('Annamaya',      'Annamayya',    'leader_assignments spelling'),
    ('Anakapalle',    'Anakapalli',   'leader_assignments spelling'),
    ('SPS Nellore',   'Sri Potti Sriramulu Nellore', 'the usual abbreviation'),
    ('Nellore',       'Sri Potti Sriramulu Nellore', 'short form'),
    ('Konaseema',     'Dr. B.R. Ambedkar Konaseema', 'short form'),
    ('Sathya Sai',    'Sri Sathya Sai', 'short form'),
    ('Manyam',        'Parvathipuram Manyam', 'short form')
  ) AS v(alias, canonical, note)
  JOIN public.ap_districts d ON d.name = v.canonical
ON CONFLICT (alias) DO UPDATE
  SET district_id = EXCLUDED.district_id, note = EXCLUDED.note;

DO $$
DECLARE landed int;
BEGIN
  SELECT count(*) INTO landed FROM public.ap_district_aliases;
  IF landed <> 10 THEN
    RAISE EXCEPTION 'expected 10 district aliases, % landed — a canonical '
                    'name above does not match ap_districts', landed;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.resolve_district(p_name text)
RETURNS int
LANGUAGE sql STABLE
AS $$
  SELECT id FROM public.ap_districts WHERE lower(name) = lower(btrim(p_name))
  UNION ALL
  SELECT district_id FROM public.ap_district_aliases
   WHERE lower(alias) = lower(btrim(p_name))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_district(text) TO anon, authenticated;

-- Rebuilt: district tier now resolves, and each state leader appears once.
CREATE OR REPLACE FUNCTION public.my_local_connect()
RETURNS TABLE (
  tier text, role text, leader_name text, whatsapp text,
  whatsapp_alt text, photo_url text, place text, sort_order int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH me AS (
    SELECT public.resolve_constituency(assembly_constituency) AS cid
      FROM public.profiles WHERE id = auth.uid()
  ),
  my_did AS (
    SELECT c.district_id AS did FROM me
      JOIN public.ap_constituencies c ON c.id = me.cid
  ),
  rows AS (
    SELECT 'constituency'::text tier, la.role, lm.name, lm.whatsapp_number,
           lm.whatsapp_number_2, lm.photo_url, la.constituency place, 1 so
      FROM public.leader_assignments la
      JOIN public.leaders_master lm ON lm.id = la.leader_id
      CROSS JOIN me
     WHERE la.is_active AND lm.is_active AND me.cid IS NOT NULL
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
       AND la.role IN ('President', 'Global Coordinator')
       AND coalesce(la.constituency, '') = ''
  )
  -- One row per person per role. A Regional Coordinator with five
  -- district postings is still one human being to contact.
  SELECT DISTINCT ON (tier, role, name)
         tier, role, name, whatsapp_number, whatsapp_number_2,
         photo_url, place, so
    FROM rows
   ORDER BY tier, role, name;
$$;

REVOKE ALL ON FUNCTION public.my_local_connect() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_local_connect() TO authenticated;

COMMENT ON FUNCTION public.my_local_connect() IS
  'Leaders for the caller''s own constituency, district and the state '
  'leadership — deduplicated, contact details for leaders only, never '
  'members. Scoped to auth.uid().';

DO $$
DECLARE dp_ok int; dp_total int;
BEGIN
  SELECT count(*) FILTER (WHERE public.resolve_district(district) IS NOT NULL),
         count(*)
    INTO dp_ok, dp_total
    FROM (SELECT DISTINCT district FROM public.leader_assignments
           WHERE role = 'District President') s;
  -- Hyderabad (Telangana) is the one expected miss.
  IF dp_total - dp_ok > 1 THEN
    RAISE EXCEPTION '% district-president districts unresolved', dp_total - dp_ok;
  END IF;
  RAISE NOTICE 'district presidents resolve: %/%', dp_ok, dp_total;
END $$;
