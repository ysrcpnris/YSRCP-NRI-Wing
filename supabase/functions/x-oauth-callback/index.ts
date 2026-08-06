import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Step 2: X redirects the member's browser here directly (this is the
 * `redirect_uri` registered on the Developer App and passed to
 * x-oauth-start). Not called by our frontend — this IS the frontend for
 * the ~1 second it takes to exchange the code and bounce back.
 *
 * The token exchange happens here, server-side, because it needs the
 * client secret — the one credential that must never reach the browser,
 * PKCE or not. X's token endpoint expects the confidential-client Basic
 * auth header alongside PKCE for a first-party app; both are sent.
 */

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") as string,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string
);

// Query params go BEFORE the hash, never inside it — Dashboard.tsx's
// tab router reads window.location.hash verbatim against a fixed list
// of tab ids ("army", "profile", ...); a hash like "#army?x_connected=1"
// would fail that exact match and silently fall back to the default
// tab, burying the very state this redirect exists to communicate.
function appRedirectToArmy(params: Record<string, string>) {
  const appUrl = Deno.env.get("APP_URL") ?? "https://www.ysrcpnriwing.org";
  const qs = new URLSearchParams(params).toString();
  return new Response(null, {
    status: 302,
    headers: { Location: `${appUrl}/dashboard?${qs}#army` },
  });
}

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError || !code || !state) {
    return appRedirectToArmy({ x_error: oauthError ?? "missing_code" });
  }

  const clientId = Deno.env.get("X_CLIENT_ID");
  const clientSecret = Deno.env.get("X_CLIENT_SECRET");
  const redirectUri = Deno.env.get("X_REDIRECT_URI");
  if (!clientId || !clientSecret || !redirectUri) {
    return appRedirectToArmy({ x_error: "not_configured" });
  }

  const { data: pending, error: pendingErr } = await supabaseAdmin
    .from("x_oauth_pending")
    .select("profile_id, code_verifier, created_at")
    .eq("state", state)
    .maybeSingle();

  if (pendingErr || !pending) {
    return appRedirectToArmy({ x_error: "expired_state" });
  }
  // 10-minute window — an abandoned tab shouldn't leave a forever-usable
  // authorization code lying around tied to a valid verifier.
  if (Date.now() - new Date(pending.created_at).getTime() > 10 * 60 * 1000) {
    await supabaseAdmin.from("x_oauth_pending").delete().eq("state", state);
    return appRedirectToArmy({ x_error: "expired_state" });
  }

  const basic = btoa(`${clientId}:${clientSecret}`);
  const tokenResp = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: pending.code_verifier,
    }),
  });

  await supabaseAdmin.from("x_oauth_pending").delete().eq("state", state);

  if (!tokenResp.ok) {
    console.error("x-oauth-callback: token exchange failed:", await tokenResp.text());
    return appRedirectToArmy({ x_error: "token_exchange_failed" });
  }
  const tokens = await tokenResp.json();

  const meResp = await fetch("https://api.x.com/2/users/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!meResp.ok) {
    console.error("x-oauth-callback: /users/me failed:", await meResp.text());
    return appRedirectToArmy({ x_error: "profile_fetch_failed" });
  }
  const me = await meResp.json();

  const { error: upsertErr } = await supabaseAdmin
    .from("member_x_connections")
    .upsert({
      profile_id: pending.profile_id,
      x_user_id: me.data.id,
      x_username: me.data.username,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      scope: tokens.scope,
      connected_at: new Date().toISOString(),
      revoked_at: null,
    }, { onConflict: "profile_id" });

  if (upsertErr) {
    console.error("x-oauth-callback: upsert failed:", upsertErr);
    return appRedirectToArmy({ x_error: "save_failed" });
  }

  return appRedirectToArmy({ x_connected: "1" });
});
