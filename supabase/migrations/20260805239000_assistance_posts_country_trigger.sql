-- =====================================================================
-- 20260805239000 — close the direct-REST bypass on assistance_posts.country
--
-- Caught by exploit test, not inspection: post_assistance_request()
-- derives country/city from the caller's own profile, but the INSERT
-- RLS policy (profile_id = auth.uid()) never constrained the country/
-- city columns themselves. A plain member posting straight to
-- POST /rest/v1/assistance_posts with an arbitrary country succeeded
-- with 201 — verified live on staging as t.us.a, posting a fabricated
-- country="Germany" row. Locking the RPC is not a boundary while the
-- table itself accepts anything through the front door it shares with
-- Postgrest. Exactly the class of gap CLAUDE.md calls out: test the
-- direct REST path, not just the RPC.
--
-- Fix: a BEFORE INSERT trigger that overwrites country/city from the
-- caller's own profile unconditionally, so whatever the client sends
-- for those two columns is discarded server-side — the RPC's
-- behaviour becomes the ONLY possible behaviour, not just the
-- intended one. profile_id is still checked by the existing RLS
-- policy; this only removes the client's ability to lie about where
-- the poster lives.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.assistance_posts_stamp_location()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  SELECT country_of_residence, city_abroad
    INTO NEW.country, NEW.city
    FROM public.profiles WHERE id = NEW.profile_id;

  IF NEW.country IS NULL THEN
    RAISE EXCEPTION 'complete your profile before posting' USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS assistance_posts_stamp_location_trg ON public.assistance_posts;
CREATE TRIGGER assistance_posts_stamp_location_trg
  BEFORE INSERT ON public.assistance_posts
  FOR EACH ROW EXECUTE FUNCTION public.assistance_posts_stamp_location();

-- Remove the two rows the exploit test itself created (t.us.a posting
-- with a fabricated country="Germany"), not real data.
DELETE FROM public.assistance_posts WHERE title = 'REST bypass test';

-- =====================================================================
-- Same class of gap, same fix shape: offer_help() refuses a poster
-- offering on their own request, but the INSERT policy on
-- assistance_offers only checks helper_id = auth.uid() — nothing
-- stopped that same poster from POSTing straight to
-- /rest/v1/assistance_offers with their own id as helper_id too.
-- Verified live: t.de.a self-offered on their own post, 201.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.assistance_offers_block_self()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_poster uuid;
BEGIN
  SELECT profile_id INTO v_poster FROM public.assistance_posts WHERE id = NEW.post_id;
  IF v_poster = NEW.helper_id THEN
    RAISE EXCEPTION 'you cannot offer help on your own request' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS assistance_offers_block_self_trg ON public.assistance_offers;
CREATE TRIGGER assistance_offers_block_self_trg
  BEFORE INSERT ON public.assistance_offers
  FOR EACH ROW EXECUTE FUNCTION public.assistance_offers_block_self();

-- Remove the self-offer row the exploit test itself created.
DELETE FROM public.assistance_offers
 WHERE post_id = (SELECT id FROM public.assistance_posts WHERE title = 'Need help with visa paperwork')
   AND message = 'self offer test';
