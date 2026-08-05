-- =====================================================================
-- 20260805236000 — the state tier showed one card per assignment, not per leader
--
-- Found by actually loading Local Connect in a browser: "Dr. Peddireddy
-- Ramachandra Reddy, MLA — Regional Coordinator" rendered FIVE times in
-- a row, "Dr. Y.V. Subba Reddy, MP" five times, others three and four.
-- A Regional Coordinator holds one leader_assignments row per district
-- they cover, and the state-tier query (role IN President/Global
-- Coordinator/Regional Coordinator, unscoped by district or
-- constituency) matched every one of them — five identical-looking
-- cards for one person.
--
-- This is not new breakage. The PREVIOUS version of this screen
-- (src/components/LocalConnect.tsx, being replaced) carried a comment
-- claiming my_local_connect() "also deduplicates: a Regional
-- Coordinator holding five district postings is one person to contact,
-- not five cards" — grepped both the RPC and the component for any
-- actual dedup logic and found none. The comment described behaviour
-- that was never implemented, and nobody had clicked through this
-- section to notice.
--
-- Fixed with DISTINCT ON (lm.id) on the state tier specifically. The
-- other three tiers do not need this: a member's own mandal,
-- constituency and district each resolve to at most one active
-- assignment per role by construction (verified: no equivalent
-- multi-row case exists there).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.my_local_connect()
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

    -- DISTINCT ON (lm.id): one card per leader, regardless of how many
    -- district/region rows they hold. Which specific row wins the tie
    -- doesn't matter — role/name/photo/whatsapp are identical across
    -- all of a person's own assignment rows. Parenthesised because a
    -- bare UNION ALL does not allow a mid-chain ORDER BY — without the
    -- parens this is a syntax error, not silently ignored.
    (SELECT DISTINCT ON (lm.id)
            'state', la.role, lm.name, lm.whatsapp_number,
            lm.whatsapp_number_2, lm.photo_url, NULL, 3
       FROM public.leader_assignments la
       JOIN public.leaders_master lm ON lm.id = la.leader_id
      WHERE la.is_active AND lm.is_active
        AND la.role IN ('President', 'Global Coordinator', 'Regional Coordinator')
      ORDER BY lm.id)
  )
  SELECT * FROM rows ORDER BY so;
$$;

REVOKE ALL ON FUNCTION public.my_local_connect() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_local_connect() TO authenticated;
