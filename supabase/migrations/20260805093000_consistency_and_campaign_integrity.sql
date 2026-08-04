-- =====================================================================
-- 20260805093000 — country/cluster consistency, and campaign integrity
--
-- (6) CROSS-CHAPTER INJECTION
--   social_handles stores country and cluster_id independently, and the
--   write policy checked only country. So a Germany coordinator could
--   write country='Germany' with a USA cluster_id: the write passed
--   because Germany is in scope, and USA members saw the row because
--   visibility follows cluster_id.
--
--   Reproduced end to end — a Germany coordinator planted
--   "https://evil.example.com/y" into the USA — West chapter and the USA
--   test member saw it. On a table whose whole purpose is WhatsApp
--   invite links, that is a phishing primitive.
--
--   Fixed with a composite foreign key, not an RPC check. The database
--   refuses the row; there is no code path, present or future, that can
--   assemble an inconsistent one.
--
-- (13) CAMPAIGN INTEGRITY
--   record_share() ignored starts_at, ends_at and the campaign's
--   configured platforms, so a share could be recorded on an expired
--   campaign or a platform it was never meant for.
--
--   register_click() is public by necessity — a visitor clicking a
--   shared link has no account. It is now idempotent per (share, hour)
--   rather than unbounded, which stops one script inflating a total to
--   arbitrary numbers without collecting anything about the clicker.
--   Counts remain raw hits and the UI says so.
-- =====================================================================

-- ── (6) a cluster belongs to exactly one country; say so structurally ─
ALTER TABLE public.clusters
  DROP CONSTRAINT IF EXISTS clusters_id_country_key,
  ADD  CONSTRAINT clusters_id_country_key UNIQUE (id, country);

-- Any pre-existing inconsistent rows must go before the FK can exist.
DELETE FROM public.social_handles sh
 WHERE sh.cluster_id IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.clusters c
      WHERE c.id = sh.cluster_id AND c.country = sh.country
   );

ALTER TABLE public.social_handles
  DROP CONSTRAINT IF EXISTS social_handles_cluster_country_fk,
  ADD  CONSTRAINT social_handles_cluster_country_fk
       FOREIGN KEY (cluster_id, country)
       REFERENCES public.clusters (id, country)
       ON DELETE CASCADE;

-- Writes are also narrowed to roles that may actually write. is_coordinator()
-- now means can_write_scope(), so a team_lead no longer passes here.
DROP POLICY IF EXISTS handles_chapter_write ON public.social_handles;
CREATE POLICY handles_chapter_write ON public.social_handles
  FOR ALL TO authenticated
  USING (
    scope = 'chapter' AND country IS NOT NULL
    AND public.can_write_country(country)
  )
  WITH CHECK (
    scope = 'chapter' AND country IS NOT NULL
    AND public.can_write_country(country)
  );

-- Appointment slots: same narrowing, same reason.
DROP POLICY IF EXISTS slots_coordinator_write ON public.appointment_slots;
CREATE POLICY slots_coordinator_write ON public.appointment_slots
  FOR ALL TO authenticated
  USING (country IS NOT NULL AND public.can_write_country(country))
  WITH CHECK (country IS NOT NULL AND public.can_write_country(country));

DROP POLICY IF EXISTS campaigns_coordinator_write ON public.campaigns;
CREATE POLICY campaigns_coordinator_write ON public.campaigns
  FOR ALL TO authenticated
  USING (country IS NOT NULL AND public.can_write_country(country))
  WITH CHECK (country IS NOT NULL AND public.can_write_country(country));

-- ── (12b) meeting links are for people who are actually coming ───────
-- open_slots() returned virtual_link to every eligible member before any
-- approval, so a manual-mode leadership appointment leaked its join URL
-- to everyone who could see the slot.
CREATE OR REPLACE FUNCTION public.open_slots()
RETURNS TABLE (
  id uuid, title text, description text, host_name text,
  venue text, virtual_link text, starts_at timestamptz, ends_at timestamptz,
  capacity int, confirmed bigint, seats_left int, mode text,
  notes_label text, country text, my_status text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.title, s.description, s.host_name, s.venue,
         -- Only once the caller is actually confirmed.
         CASE WHEN max(b.status::text) FILTER (
                WHERE b.profile_id = auth.uid() AND b.status = 'confirmed'
              ) IS NOT NULL
              THEN s.virtual_link END,
         s.starts_at, s.ends_at, s.capacity,
         count(b.id) FILTER (WHERE b.status = 'confirmed'),
         greatest(0, s.capacity - count(b.id) FILTER (WHERE b.status = 'confirmed'))::int,
         s.mode::text, s.notes_label, s.country,
         max(b.status::text) FILTER (WHERE b.profile_id = auth.uid()
                                       AND b.status IN ('pending', 'confirmed'))
    FROM public.appointment_slots s
    LEFT JOIN public.appointment_bookings b ON b.slot_id = s.id
   WHERE s.is_published
     AND s.starts_at > now()
     AND (
       s.country IS NULL
       OR s.country = (SELECT p.country_of_residence FROM public.profiles p WHERE p.id = auth.uid())
     )
   GROUP BY s.id
   ORDER BY s.starts_at;
$$;

REVOKE ALL ON FUNCTION public.open_slots() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.open_slots() TO authenticated;

-- ── (13) validate the share ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_share(
  p_campaign_id uuid,
  p_platform    text
)
RETURNS TABLE (share_id uuid, token text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_token text; v_country text; c public.campaigns; v_share uuid;
BEGIN
  SELECT * INTO c FROM public.campaigns WHERE id = p_campaign_id;

  IF c.id IS NULL OR NOT c.is_published THEN
    RAISE EXCEPTION 'campaign not available';
  END IF;
  IF c.starts_at > now() THEN
    RAISE EXCEPTION 'campaign has not started';
  END IF;
  IF c.ends_at IS NOT NULL AND c.ends_at <= now() THEN
    RAISE EXCEPTION 'campaign has ended';
  END IF;
  IF NOT (p_platform::public.campaign_platform = ANY (c.platforms)) THEN
    RAISE EXCEPTION 'campaign is not configured for %', p_platform;
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

  RETURN QUERY SELECT v_share, v_token;
END $$;

REVOKE ALL ON FUNCTION public.record_share(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.record_share(uuid, text) TO authenticated;

-- One counted hit per share per hour. A campaign report should not be
-- trivially inflatable by a loop, and this needs nothing about the
-- clicker — the bucket is derived from the share and the clock.
ALTER TABLE public.campaign_clicks
  ADD COLUMN IF NOT EXISTS hour_bucket timestamptz;

UPDATE public.campaign_clicks
   SET hour_bucket = date_trunc('hour', clicked_at)
 WHERE hour_bucket IS NULL;

ALTER TABLE public.campaign_clicks
  ALTER COLUMN hour_bucket SET NOT NULL;

-- Collapse any existing duplicates before the index can be created.
DELETE FROM public.campaign_clicks a
 USING public.campaign_clicks b
 WHERE a.id > b.id AND a.share_id = b.share_id AND a.hour_bucket = b.hour_bucket;

CREATE UNIQUE INDEX IF NOT EXISTS campaign_clicks_once_per_hour_idx
  ON public.campaign_clicks (share_id, hour_bucket);

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
    RETURN NULL;
  END IF;

  -- Redirecting always works; only the counting is rate-limited. A
  -- visitor must never be blocked because someone else clicked.
  INSERT INTO public.campaign_clicks (share_id, hour_bucket)
  VALUES (p_share_id, date_trunc('hour', now()))
  ON CONFLICT (share_id, hour_bucket) DO NOTHING;

  RETURN v_target;
END $$;

REVOKE ALL ON FUNCTION public.register_click(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.register_click(uuid) TO anon, authenticated;

COMMENT ON TABLE public.campaign_clicks IS
  'One counted hit per share per hour — raw, unverified reach, not '
  'unique visitors. Holds no IP, user agent or cookie by design.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'social_handles_cluster_country_fk'
  ) THEN
    RAISE EXCEPTION 'cluster/country consistency FK is missing';
  END IF;
  RAISE NOTICE 'consistency and campaign integrity applied';
END $$;
