-- =====================================================================
-- 20260805115000 — an administrator can see every chapter's handles
--
-- handles_read (20260804220000) predates has_global_scope(). It allows
-- national rows, the caller's own chapter, and countries from
-- my_countries(). An admin holds no member_roles row, so my_countries()
-- returns '{}' — and the admin fixture lives in Dubai, so their "own
-- chapter" is the UAE one.
--
-- Result: the wing administrator could not read the Germany chapter's
-- handles, which is precisely what the Handles tab of Wing Management
-- exists to show them. The Delete button was there; the rows were not.
--
-- Surfaced by the authorization matrix, when a check that inserted a
-- handle as the Germany chapter lead then read it back as admin and
-- found nothing. The insert had succeeded — the read was blind.
-- =====================================================================

DROP POLICY IF EXISTS handles_read ON public.social_handles;
CREATE POLICY handles_read ON public.social_handles
  FOR SELECT TO authenticated
  USING (
    public.has_global_scope()
    OR (
      is_active
      AND (
        scope = 'national'
        OR cluster_id = (
          SELECT public.chapter_for_city(p.country_of_residence, p.city_abroad)
            FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR country = ANY (public.my_countries())
        OR cluster_id = ANY (public.my_cluster_ids())
      )
    )
  );

-- Same blind spot on the other chapter-scoped tables: an admin holds no
-- member_roles row, so anything gated purely on my_countries() hid rows
-- from the one person meant to see everything.
DROP POLICY IF EXISTS slots_read ON public.appointment_slots;
CREATE POLICY slots_read ON public.appointment_slots
  FOR SELECT TO authenticated
  USING (
    public.has_global_scope()
    OR (
      is_published
      AND (
        country IS NULL
        OR country = (SELECT p.country_of_residence FROM public.profiles p WHERE p.id = auth.uid())
        OR country = ANY (public.my_countries())
      )
    )
  );

DROP POLICY IF EXISTS campaigns_read ON public.campaigns;
CREATE POLICY campaigns_read ON public.campaigns
  FOR SELECT TO authenticated
  USING (
    public.has_global_scope()
    OR (
      is_published
      AND starts_at <= now()
      AND (ends_at IS NULL OR ends_at > now())
      AND (
        country IS NULL
        OR country = (SELECT p.country_of_residence FROM public.profiles p WHERE p.id = auth.uid())
        OR country = ANY (public.my_countries())
      )
    )
  );
