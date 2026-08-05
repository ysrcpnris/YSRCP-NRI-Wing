-- =====================================================================
-- 20260805238000 — the Assistance Board is a real community board
--
-- The prototype's Assistance Board (m-assist) is fundamentally
-- different from anything that already existed: "everyone in Germany
-- sees these", named requesters, "N members responded", an "Offer
-- help" workflow, and a closing note that the requester — not the
-- platform — decides whether to share their contact once someone
-- offers. Checked with the user before building, because the gap
-- wasn't a missing stat, it was a different visibility MODEL:
--
--   student_requests_read: profile_id = auth.uid() OR
--     assigned_mentor_id = auth.uid() OR is_admin() OR
--     has_country_scope(...) — a private ticket to a mentor/admin,
--     never visible to ordinary members in the same country.
--
--   No offers/responses table existed anywhere.
--
-- Decision: build the real thing, as its own subsystem — NOT a
-- retrofit of student_requests/service_requests, which keep their
-- existing purpose (formal help routed to an assigned mentor/team).
-- The mock's own copy frames this as something new being introduced,
-- not a new view onto old tickets.
--
-- WHAT THIS ADDS
--   assistance_posts   — a community request, country-scoped by the
--                         poster's own country at post time (denormalised
--                         so RLS and queries don't need a join back to a
--                         profile that might change city later).
--   assistance_offers  — one row per member who offers to help. The
--                         poster's decision to share contact lives here
--                         (contact_shared), never a blanket profile grant.
--
-- CONTACT SHARING, THE PART THE MOCK IS EXPLICIT ABOUT
--   "Your phone number and email are not [shown by default]... When you
--   offer help, the requester decides whether to share contact
--   details." Implemented literally: offering does NOT reveal anything.
--   share_contact_with_helper() is callable ONLY by the post's own
--   poster, flips contact_shared for one specific offer, and
--   assistance_contact() then lets ONLY that specific helper read the
--   poster's mobile/whatsapp — not a general profile read, scoped to
--   exactly the consent given.
--
-- WHAT THIS DELIBERATELY DOES NOT BUILD
--   No messaging/DM system — "offer help" records intent and a short
--   message; anything past a shared contact happens outside the app,
--   same as leaders_master's WhatsApp-link pattern already does.
--   No "matches your skills" tag — profession is free text with no
--   structured skills taxonomy; a fuzzy match would be wrong often
--   enough to be worse than not showing it. Category filters
--   (Student/Job) are real; that tag specifically is not built.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.assistance_posts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category     text NOT NULL CHECK (category IN ('student', 'job')),
  title        text NOT NULL,
  description  text NOT NULL,
  -- Denormalised at post time. A member who later moves city should not
  -- have old posts silently vanish from or reappear in a country board.
  country      text NOT NULL,
  city         text,
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz
);

CREATE INDEX IF NOT EXISTS assistance_posts_country_idx ON public.assistance_posts (country, status, created_at DESC);
CREATE INDEX IF NOT EXISTS assistance_posts_profile_idx ON public.assistance_posts (profile_id);

CREATE TABLE IF NOT EXISTS public.assistance_offers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id        uuid NOT NULL REFERENCES public.assistance_posts(id) ON DELETE CASCADE,
  helper_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message        text,
  contact_shared boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, helper_id)
);

CREATE INDEX IF NOT EXISTS assistance_offers_post_idx ON public.assistance_offers (post_id);

ALTER TABLE public.assistance_posts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistance_offers ENABLE ROW LEVEL SECURITY;

-- ── posts: readable by any member in the SAME country, or the poster
--    themselves regardless of where they've since moved, or staff ─────
CREATE POLICY assistance_posts_read ON public.assistance_posts
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.is_admin()
    OR public.has_country_scope(country)
    OR EXISTS (
         SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND lower(btrim(p.country_of_residence)) = lower(btrim(assistance_posts.country))
       )
  );

-- Posting is done via post_assistance_request() below, which stamps
-- country/city from the caller's own profile — never client-supplied,
-- so a member cannot post into a country they don't live in.
CREATE POLICY assistance_posts_insert ON public.assistance_posts
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY assistance_posts_update_own ON public.assistance_posts
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin())
  WITH CHECK (profile_id = auth.uid() OR public.is_admin());

REVOKE ALL ON public.assistance_posts FROM authenticated;
GRANT SELECT, INSERT ON public.assistance_posts TO authenticated;
GRANT UPDATE (status, resolved_at) ON public.assistance_posts TO authenticated;

-- ── offers: the poster sees every offer on their own post; a helper
--    sees only their own offer; nobody sees anyone else's ────────────
CREATE POLICY assistance_offers_read ON public.assistance_offers
  FOR SELECT TO authenticated
  USING (
    helper_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.assistance_posts ap
                WHERE ap.id = assistance_offers.post_id AND ap.profile_id = auth.uid())
  );

-- Offering is done via offer_help() below, which blocks a poster from
-- offering on their own post and stamps helper_id from the caller.
CREATE POLICY assistance_offers_insert ON public.assistance_offers
  FOR INSERT TO authenticated
  WITH CHECK (helper_id = auth.uid());

REVOKE ALL ON public.assistance_offers FROM authenticated;
GRANT SELECT, INSERT ON public.assistance_offers TO authenticated;
-- contact_shared is NOT grantable to authenticated at all — flipping it
-- goes exclusively through share_contact_with_helper(), which is the
-- one place that checks the caller is the post's own poster.

-- ── write RPCs ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.post_assistance_request(
  p_category text, p_title text, p_description text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid; v_country text; v_city text;
BEGIN
  IF p_category NOT IN ('student', 'job') THEN
    RAISE EXCEPTION 'unknown category: %', p_category USING ERRCODE = '22023';
  END IF;
  IF btrim(coalesce(p_title, '')) = '' OR btrim(coalesce(p_description, '')) = '' THEN
    RAISE EXCEPTION 'title and description are required' USING ERRCODE = '22023';
  END IF;

  SELECT country_of_residence, city_abroad INTO v_country, v_city
    FROM public.profiles WHERE id = auth.uid();
  IF v_country IS NULL THEN
    RAISE EXCEPTION 'complete your profile before posting' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.assistance_posts (profile_id, category, title, description, country, city)
  VALUES (auth.uid(), p_category, btrim(p_title), btrim(p_description), v_country, v_city)
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.post_assistance_request(text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.post_assistance_request(text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.offer_help(p_post_id uuid, p_message text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid; v_poster uuid;
BEGIN
  SELECT profile_id INTO v_poster FROM public.assistance_posts WHERE id = p_post_id;
  IF v_poster IS NULL THEN
    RAISE EXCEPTION 'no such request' USING ERRCODE = '22023';
  END IF;
  IF v_poster = auth.uid() THEN
    RAISE EXCEPTION 'you cannot offer help on your own request' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.assistance_offers (post_id, helper_id, message)
  VALUES (p_post_id, auth.uid(), nullif(btrim(p_message), ''))
  ON CONFLICT (post_id, helper_id) DO UPDATE SET message = EXCLUDED.message
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.offer_help(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.offer_help(uuid, text) TO authenticated;

-- The one function allowed to flip contact_shared. Checked explicitly
-- in the body — RLS is not consulted inside a SECURITY DEFINER
-- function, the exact bug already caught once tonight in
-- add_grievance_progress(). Not repeating it here.
CREATE OR REPLACE FUNCTION public.share_contact_with_helper(p_offer_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_poster uuid;
BEGIN
  SELECT ap.profile_id INTO v_poster
    FROM public.assistance_offers ao
    JOIN public.assistance_posts ap ON ap.id = ao.post_id
   WHERE ao.id = p_offer_id;

  IF v_poster IS NULL THEN
    RAISE EXCEPTION 'no such offer' USING ERRCODE = '22023';
  END IF;
  IF v_poster != auth.uid() THEN
    RAISE EXCEPTION 'only the requester can share contact for their own post' USING ERRCODE = '42501';
  END IF;

  UPDATE public.assistance_offers SET contact_shared = true WHERE id = p_offer_id;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.share_contact_with_helper(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.share_contact_with_helper(uuid) TO authenticated;

-- Narrow contact read: only the specific helper an offer's consent was
-- given to, and only after it was actually given.
CREATE OR REPLACE FUNCTION public.assistance_contact(p_offer_id uuid)
RETURNS TABLE (mobile text, whatsapp text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_helper uuid; v_shared boolean; v_poster uuid;
BEGIN
  SELECT ao.helper_id, ao.contact_shared, ap.profile_id
    INTO v_helper, v_shared, v_poster
    FROM public.assistance_offers ao
    JOIN public.assistance_posts ap ON ap.id = ao.post_id
   WHERE ao.id = p_offer_id;

  IF v_helper IS NULL OR v_helper != auth.uid() OR v_shared IS NOT TRUE THEN
    RETURN; -- empty result, not an error: "not shared (yet)" is a normal state
  END IF;

  RETURN QUERY SELECT p.mobile_number, p.whatsapp_number
    FROM public.profiles p WHERE p.id = v_poster;
END $$;

REVOKE ALL ON FUNCTION public.assistance_contact(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.assistance_contact(uuid) TO authenticated;

-- ── the board itself: posts in the caller's country, with each
--    post's own offer count and (if the caller posted it) their offers ──
CREATE OR REPLACE FUNCTION public.my_assistance_board()
RETURNS TABLE (
  id            uuid,
  category      text,
  title         text,
  description   text,
  poster_name   text,
  city          text,
  country       text,
  status        text,
  created_at    timestamptz,
  offer_count   bigint,
  is_own_post   boolean,
  my_offer_id   uuid,
  my_shared     boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH me AS (SELECT country_of_residence AS country FROM public.profiles WHERE id = auth.uid())
  SELECT ap.id, ap.category, ap.title, ap.description, p.full_name, ap.city, ap.country,
         ap.status, ap.created_at,
         (SELECT count(*) FROM public.assistance_offers ao WHERE ao.post_id = ap.id),
         ap.profile_id = auth.uid(),
         mine.id, mine.contact_shared
    FROM public.assistance_posts ap
    JOIN public.profiles p ON p.id = ap.profile_id
    CROSS JOIN me
    LEFT JOIN public.assistance_offers mine
           ON mine.post_id = ap.id AND mine.helper_id = auth.uid()
   WHERE ap.profile_id = auth.uid()
      OR public.is_admin()
      OR public.has_country_scope(ap.country)
      OR (me.country IS NOT NULL AND lower(btrim(ap.country)) = lower(btrim(me.country)))
   ORDER BY ap.status = 'open' DESC, ap.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.my_assistance_board() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_assistance_board() TO authenticated;

-- Every offer on one of the caller's own posts — the requester's view
-- of "who has offered", separate from the board itself so it isn't
-- fetched for every post on every load.
CREATE OR REPLACE FUNCTION public.offers_on_my_post(p_post_id uuid)
RETURNS TABLE (
  offer_id      uuid,
  helper_name   text,
  message       text,
  contact_shared boolean,
  created_at    timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT ao.id, p.full_name, ao.message, ao.contact_shared, ao.created_at
    FROM public.assistance_offers ao
    JOIN public.assistance_posts ap ON ap.id = ao.post_id
    JOIN public.profiles p ON p.id = ao.helper_id
   WHERE ao.post_id = p_post_id AND ap.profile_id = auth.uid()
   ORDER BY ao.created_at;
$$;

REVOKE ALL ON FUNCTION public.offers_on_my_post(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.offers_on_my_post(uuid) TO authenticated;

DO $$
BEGIN
  IF to_regclass('public.assistance_posts') IS NULL
     OR to_regclass('public.assistance_offers') IS NULL THEN
    RAISE EXCEPTION 'assistance board tables did not get created';
  END IF;
  RAISE NOTICE 'assistance board ready';
END $$;
