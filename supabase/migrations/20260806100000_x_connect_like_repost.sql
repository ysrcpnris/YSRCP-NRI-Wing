-- =====================================================================
-- 20260806100000 — connect a member's own X account to like/repost
--
-- DIFFERENT FROM, AND NOT A WORKAROUND FOR, 20260804310000's DECISION
--   Digital Army already decided — correctly, and that decision stands
--   unchanged — that reading WHO liked or reposted a campaign tweet is
--   off the table: X's Developer Policy names "political affiliation
--   or beliefs" as a category apps must never derive or infer, and
--   matching that back to a member identity would need opt-in consent
--   we do not collect for it.
--
--   This is the other direction: a member connects THEIR OWN X account
--   (OAuth 2.0 + PKCE, explicit opt-in, revocable) and then explicitly
--   clicks "Like" / "Repost" on a specific campaign post. The app never
--   reads anyone's engagement — it performs exactly one write, for
--   exactly the member who asked for it, using a token that member
--   granted for that purpose. No inference, no off-platform matching:
--   the member IS the one linking their own identity, on purpose.
--
-- WHY THIS TABLE HAS ZERO POSTGREST ACCESS, NOT JUST RESTRICTED ACCESS
--   member_x_connections holds live OAuth credentials that can post as
--   a real member on their real X account. A leaked row here is not a
--   data leak, it's account takeover. So unlike every other table in
--   this schema, this one is not "readable by the owner, writable by
--   nobody" — it is REVOKE ALL from authenticated AND anon, full stop.
--   Every access path is a SECURITY DEFINER RPC that returns connection
--   STATUS (connected yes/no, x_username, connected_at) and NEVER the
--   token columns, or the service-role key held only inside the Edge
--   Functions (supabase/functions/x-oauth-start, x-oauth-callback,
--   x-action) that do the actual OAuth exchange and API calls. Disk-
--   level encryption at rest is Supabase Cloud's standard for every
--   table; a bespoke pgsodium column-encryption layer was considered
--   and skipped — it adds real key-management risk of its own without
--   closing a gap that still exists once PostgREST access is zero.
--
-- DARK BY DEFAULT
--   Ships fully wired but inert: the Edge Functions no-op with a clear
--   "not configured" error until X_CLIENT_ID / X_CLIENT_SECRET secrets
--   are set (requires registering a Developer App on X, which only the
--   team can do), and the UI stays hidden behind VITE_X_INTEGRATION_ENABLED
--   until the team decides to turn it on. See docs/deploy-to-production.md.
-- =====================================================================

CREATE TABLE public.member_x_connections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  x_user_id         text NOT NULL,
  x_username        text NOT NULL,
  access_token      text NOT NULL,
  refresh_token     text NOT NULL,
  token_expires_at  timestamptz NOT NULL,
  scope             text NOT NULL,
  connected_at      timestamptz NOT NULL DEFAULT now(),
  revoked_at        timestamptz
);

-- One pending PKCE handshake per member, short-lived. x-oauth-start
-- writes the code_verifier here keyed by `state`; x-oauth-callback
-- reads it once and deletes it. A member starting a second connect
-- attempt simply overwrites their own pending row.
CREATE TABLE public.x_oauth_pending (
  state          text PRIMARY KEY,
  profile_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code_verifier  text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX x_oauth_pending_created_idx ON public.x_oauth_pending (created_at);

-- Audit log AND idempotency guard: one row per (member, campaign,
-- action). Lets the UI show "already liked" without a live X call, and
-- stops a double-click from spending twice on X's pay-per-use pricing.
CREATE TABLE public.x_actions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  campaign_id   uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  action        text NOT NULL CHECK (action IN ('like', 'repost')),
  x_post_id     text NOT NULL,
  status        text NOT NULL CHECK (status IN ('ok', 'failed')),
  error_message text,
  performed_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX x_actions_once_idx
  ON public.x_actions (profile_id, campaign_id, action) WHERE status = 'ok';

-- The X post a campaign should be liked/reposted on. Nullable — not
-- every campaign is X-specific, and existing campaigns predate this.
ALTER TABLE public.campaigns ADD COLUMN x_post_id text;

ALTER TABLE public.member_x_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.x_oauth_pending      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.x_actions            ENABLE ROW LEVEL SECURITY;

-- No policies, no grants for authenticated/anon on connections or the
-- pending-PKCE table — service role (Edge Functions) only. Explicit
-- REVOKE rather than relying on "no policy = no access", matching how
-- write paths were closed elsewhere in this schema (20260805092000).
REVOKE ALL ON public.member_x_connections FROM authenticated, anon;
REVOKE ALL ON public.x_oauth_pending      FROM authenticated, anon;

-- x_actions: a member reads their own action history (so "already
-- liked" survives a page refresh without another RPC); nothing is
-- writable directly — only x-action's service-role insert.
CREATE POLICY x_actions_own_read ON public.x_actions
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());
REVOKE ALL ON public.x_actions FROM authenticated, anon;
GRANT SELECT ON public.x_actions TO authenticated;

-- ── status only, never the token ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.my_x_connection_status()
RETURNS TABLE (connected boolean, x_username text, connected_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT true, c.x_username, c.connected_at
    FROM public.member_x_connections c
   WHERE c.profile_id = auth.uid() AND c.revoked_at IS NULL
  UNION ALL
  SELECT false, NULL, NULL
   WHERE NOT EXISTS (
     SELECT 1 FROM public.member_x_connections c
      WHERE c.profile_id = auth.uid() AND c.revoked_at IS NULL
   );
$$;

REVOKE ALL ON FUNCTION public.my_x_connection_status() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_x_connection_status() TO authenticated;

-- Soft-revoke from the app side. The Edge Function that calls this
-- (or a direct RPC path — revocation has no sensitive payload) should
-- also call X's own token-revocation endpoint; this is the record of
-- record either way, and my_x_connection_status() stops reporting
-- connected the instant this runs, regardless of whether X's side
-- succeeds.
CREATE OR REPLACE FUNCTION public.disconnect_x()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.member_x_connections
     SET revoked_at = now()
   WHERE profile_id = auth.uid() AND revoked_at IS NULL;
  SELECT true;
$$;

REVOKE ALL ON FUNCTION public.disconnect_x() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.disconnect_x() TO authenticated;

-- ── my_campaigns() gains x_post_id and this member's like/repost state ──
-- CREATE OR REPLACE cannot change a function's OUT-parameter row type.
DROP FUNCTION IF EXISTS public.my_campaigns();
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
  my_clicks    bigint,
  x_post_id    text,
  x_liked      boolean,
  x_reposted   boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.title, c.brief, c.share_text, c.target_url, c.hashtags,
         c.image_url, c.platforms::text[], c.ends_at,
         count(DISTINCT s.id),
         count(k.id),
         c.x_post_id,
         bool_or(a.action = 'like'   AND a.status = 'ok'),
         bool_or(a.action = 'repost' AND a.status = 'ok')
    FROM public.campaigns c
    LEFT JOIN public.campaign_shares s
           ON s.campaign_id = c.id AND s.profile_id = auth.uid()
    LEFT JOIN public.campaign_clicks k ON k.share_id = s.id
    LEFT JOIN public.x_actions a
           ON a.campaign_id = c.id AND a.profile_id = auth.uid()
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

DO $$
BEGIN
  IF to_regclass('public.member_x_connections') IS NULL
     OR to_regclass('public.x_actions') IS NULL
     OR to_regclass('public.x_oauth_pending') IS NULL THEN
    RAISE EXCEPTION 'X connect schema did not get created';
  END IF;
  RAISE NOTICE 'X connect schema ready — dark until X_CLIENT_ID/SECRET are set and VITE_X_INTEGRATION_ENABLED=true';
END $$;
