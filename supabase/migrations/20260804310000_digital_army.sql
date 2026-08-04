-- =====================================================================
-- 20260804310000 — Digital Army: campaigns, shares and click tracking
--
-- WHAT WE CAN AND CANNOT MEASURE
--   We cannot tell who liked a post, and we are not going to try.
--     · X's developer terms forbid deriving political affiliation from
--       platform data, which is exactly what "who liked the party's
--       tweet" is.
--     · Instagram's Basic Display API was shut down in December 2024;
--       there is no supported route to a member's engagement.
--     · Roughly 700 members are in the EU, where political opinion is
--       an Article 9 special category — inferring it from likes needs
--       explicit consent we do not have and should not collect for
--       this.
--
--   What we CAN measure is our own property: a link we generated, on a
--   domain we own, clicked by whoever clicked it. That is a first-party
--   measurement of our own campaign, not surveillance of a member's
--   social account.
--
-- SO THE MODEL IS
--   campaign            what admin wants shared
--   campaign_share      a member asked for their link (intent)
--   campaign_click      someone followed that link (reach)
--
--   The member's existing profiles.referral_code is reused as the
--   tracking token rather than minting a second identity. One code,
--   already on their profile, already routable at /ref/:code.
--
-- WHAT IS DELIBERATELY NOT STORED ON A CLICK
--   No IP address, no user agent, no cookie, no fingerprint. A click
--   row records which share was followed and when — nothing that
--   identifies the person who clicked. That keeps a public campaign
--   link from becoming a log of who read party material, which in the
--   EU would be the same Article 9 problem by another route.
-- =====================================================================

CREATE TYPE public.campaign_platform AS ENUM
  ('x', 'facebook', 'whatsapp', 'instagram', 'youtube', 'link');

CREATE TABLE public.campaigns (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text NOT NULL,
  brief          text,
  -- What the member is asked to post. Pre-written so the message stays
  -- consistent and nobody has to compose party messaging themselves.
  share_text     text NOT NULL,
  target_url     text NOT NULL,
  hashtags       text,
  image_url      text,
  platforms      public.campaign_platform[] NOT NULL DEFAULT
                   ARRAY['x','whatsapp','facebook']::public.campaign_platform[],
  -- Null = every member. Set = that country only, so a chapter campaign
  -- does not clutter the whole wing.
  country        text,
  starts_at      timestamptz NOT NULL DEFAULT now(),
  ends_at        timestamptz,
  is_published   boolean NOT NULL DEFAULT false,
  created_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT campaign_window CHECK (ends_at IS NULL OR ends_at > starts_at),
  CONSTRAINT campaign_target_is_url CHECK (target_url ~* '^https?://')
);

CREATE INDEX campaigns_live_idx ON public.campaigns (starts_at DESC)
  WHERE is_published;

CREATE TABLE public.campaign_shares (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  profile_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform     public.campaign_platform NOT NULL,
  -- The member's referral_code, copied at share time. Kept here so a
  -- click can be resolved even if the profile's code is later changed.
  share_token  text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- One row per member per campaign per platform: re-opening the share
-- sheet is not a second share.
CREATE UNIQUE INDEX campaign_shares_once_idx
  ON public.campaign_shares (campaign_id, profile_id, platform);

CREATE INDEX campaign_shares_token_idx ON public.campaign_shares (share_token);

CREATE TABLE public.campaign_clicks (
  id           bigserial PRIMARY KEY,
  share_id     uuid NOT NULL REFERENCES public.campaign_shares(id) ON DELETE CASCADE,
  clicked_at   timestamptz NOT NULL DEFAULT now()
  -- Nothing else. See the header: no IP, no agent, no cookie.
);

CREATE INDEX campaign_clicks_share_idx ON public.campaign_clicks (share_id);

ALTER TABLE public.campaigns       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_clicks ENABLE ROW LEVEL SECURITY;

-- ── campaigns ────────────────────────────────────────────────────────
CREATE POLICY campaigns_read ON public.campaigns
  FOR SELECT TO authenticated
  USING (
    is_published
    AND starts_at <= now()
    AND (ends_at IS NULL OR ends_at > now())
    AND (
      country IS NULL
      OR country = (SELECT p.country_of_residence FROM public.profiles p WHERE p.id = auth.uid())
    )
  );

CREATE POLICY campaigns_admin_all ON public.campaigns
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- A coordinator runs campaigns for their own countries. A wing-wide
-- campaign (country IS NULL) is admin's, same rule as appointment slots.
CREATE POLICY campaigns_coordinator_write ON public.campaigns
  FOR ALL TO authenticated
  USING (
    public.is_coordinator() AND country IS NOT NULL
    AND country = ANY (public.my_countries())
  )
  WITH CHECK (
    public.is_coordinator() AND country IS NOT NULL
    AND country = ANY (public.my_countries())
  );

-- ── shares ───────────────────────────────────────────────────────────
CREATE POLICY shares_own_read ON public.campaign_shares
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.campaigns c
       WHERE c.id = campaign_id AND c.country IS NOT NULL
         AND c.country = ANY (public.my_countries())
    )
  );

-- Shares are created by record_share() only, so the token cannot be
-- forged and a member cannot log a share on another member's behalf.
GRANT SELECT ON public.campaign_shares TO authenticated;
GRANT SELECT ON public.campaigns TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;

-- Clicks are counted by a SECURITY DEFINER function called from the
-- public redirect. No role reads this table directly.
CREATE POLICY clicks_admin_read ON public.campaign_clicks
  FOR SELECT TO authenticated
  USING (public.is_admin());
GRANT SELECT ON public.campaign_clicks TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_campaign()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_campaigns_touch BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.touch_campaign();

-- ── recording a share ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_share(
  p_campaign_id uuid,
  p_platform    text
)
-- Returns the share id and token, not a full URL. Building the URL here
-- would mean hardcoding a hostname, and staging would then hand members
-- links pointing at production — the exact bug that would only surface
-- once somebody actually posted one. The client composes the URL from
-- its own origin.
RETURNS TABLE (share_id uuid, token text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_token   text;
  v_country text;
  c         public.campaigns;
  v_share   uuid;
BEGIN
  SELECT * INTO c FROM public.campaigns WHERE id = p_campaign_id;
  IF c.id IS NULL OR NOT c.is_published THEN
    RAISE EXCEPTION 'campaign not available';
  END IF;

  SELECT p.referral_code, p.country_of_residence INTO v_token, v_country
    FROM public.profiles p WHERE p.id = auth.uid();

  IF c.country IS NOT NULL AND c.country IS DISTINCT FROM v_country THEN
    RAISE EXCEPTION 'campaign not available in your country';
  END IF;

  IF v_token IS NULL OR btrim(v_token) = '' THEN
    RAISE EXCEPTION 'no referral code on your profile';
  END IF;

  INSERT INTO public.campaign_shares (campaign_id, profile_id, platform, share_token)
  VALUES (p_campaign_id, auth.uid(), p_platform::public.campaign_platform, v_token)
  ON CONFLICT (campaign_id, profile_id, platform) DO UPDATE
    SET share_token = EXCLUDED.share_token
  RETURNING id INTO v_share;

  -- The client builds `${origin}/c/${share_id}` from this. /c/ is the
  -- campaign redirect, distinct from /ref/ which is recruitment.
  RETURN QUERY SELECT v_share, v_token;
END $$;

REVOKE ALL ON FUNCTION public.record_share(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.record_share(uuid, text) TO authenticated;

-- ── counting a click ─────────────────────────────────────────────────
-- Called by the public redirect page, which is why anon may execute it.
-- It writes one row and returns where to send the visitor. It cannot be
-- used to read anything.
CREATE OR REPLACE FUNCTION public.register_click(p_share_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_target text;
BEGIN
  SELECT c.target_url INTO v_target
    FROM public.campaign_shares s
    JOIN public.campaigns c ON c.id = s.campaign_id
   WHERE s.id = p_share_id;

  IF v_target IS NULL THEN
    RETURN NULL;                       -- unknown link; caller sends home
  END IF;

  INSERT INTO public.campaign_clicks (share_id) VALUES (p_share_id);
  RETURN v_target;
END $$;

REVOKE ALL ON FUNCTION public.register_click(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.register_click(uuid) TO anon, authenticated;

-- ── what the member sees ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.my_campaigns()
RETURNS TABLE (
  id           uuid,
  title        text,
  brief        text,
  share_text   text,
  target_url   text,
  hashtags     text,
  image_url    text,
  platforms    text[],
  ends_at      timestamptz,
  my_shares    bigint,
  my_clicks    bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.title, c.brief, c.share_text, c.target_url, c.hashtags,
         c.image_url, c.platforms::text[], c.ends_at,
         count(DISTINCT s.id),
         count(k.id)
    FROM public.campaigns c
    LEFT JOIN public.campaign_shares s
           ON s.campaign_id = c.id AND s.profile_id = auth.uid()
    LEFT JOIN public.campaign_clicks k ON k.share_id = s.id
   WHERE c.is_published
     AND c.starts_at <= now()
     AND (c.ends_at IS NULL OR c.ends_at > now())
     AND (
       c.country IS NULL
       OR c.country = (SELECT p.country_of_residence FROM public.profiles p WHERE p.id = auth.uid())
     )
   GROUP BY c.id
   ORDER BY c.starts_at DESC;
$$;

REVOKE ALL ON FUNCTION public.my_campaigns() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_campaigns() TO authenticated;

-- ── campaign performance, for whoever runs it ────────────────────────
CREATE OR REPLACE FUNCTION public.campaign_stats(p_campaign_id uuid DEFAULT NULL)
RETURNS TABLE (
  campaign_id   uuid,
  title         text,
  country       text,
  sharers       bigint,
  shares        bigint,
  clicks        bigint,
  clicks_per_share numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.title, c.country,
         count(DISTINCT s.profile_id),
         count(DISTINCT s.id),
         count(k.id),
         round(count(k.id)::numeric / nullif(count(DISTINCT s.id), 0), 1)
    FROM public.campaigns c
    LEFT JOIN public.campaign_shares s ON s.campaign_id = c.id
    LEFT JOIN public.campaign_clicks k ON k.share_id = s.id
   WHERE (p_campaign_id IS NULL OR c.id = p_campaign_id)
     AND (
       public.is_admin()
       OR (c.country IS NOT NULL AND c.country = ANY (public.my_countries()))
     )
   GROUP BY c.id, c.title, c.country
   ORDER BY count(k.id) DESC;
$$;

REVOKE ALL ON FUNCTION public.campaign_stats(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.campaign_stats(uuid) TO authenticated;

COMMENT ON TABLE public.campaign_clicks IS
  'One row per click on a member''s campaign link. Deliberately holds '
  'no IP, user agent or cookie — this counts reach for our own link, it '
  'is not a log of who read party material.';
