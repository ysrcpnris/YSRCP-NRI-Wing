-- =====================================================================
-- 20260806141000 — my_social_handles() gains id
--
-- Needed so the member-facing click on a handle (Abroad Connect) can
-- call log_handle_join(id) — a real "joined via portal" count for
-- Team & Groups (20260806140000) — rather than only ever jumping
-- straight to the external link with nothing recorded.
-- =====================================================================

DROP FUNCTION IF EXISTS public.my_social_handles();
CREATE OR REPLACE FUNCTION public.my_social_handles()
RETURNS TABLE (
  id           uuid,
  scope        public.handle_scope,
  platform     public.handle_platform,
  label        text,
  url          text,
  handle       text,
  chapter      text,
  member_count int,
  count_as_of  date,
  description  text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT sh.id, sh.scope, sh.platform, sh.label, sh.url, sh.handle,
         cl.name, sh.member_count, sh.count_as_of, sh.description
    FROM public.social_handles sh
    LEFT JOIN public.chapters cl ON cl.id = sh.chapter_id
   WHERE sh.is_active
     AND (
       sh.scope = 'national'
       OR sh.chapter_id = (
         SELECT public.chapter_for_city(p.country_of_residence, p.city_abroad)
           FROM public.profiles p WHERE p.id = auth.uid()
       )
     )
   ORDER BY sh.scope DESC, sh.sort_order, sh.label;
$$;

REVOKE ALL ON FUNCTION public.my_social_handles() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_social_handles() TO authenticated;
