import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Step 3: the actual "Like" / "Repost" button. Called by the browser
 * with the member's own session and { campaign_id, action }. Uses that
 * member's own connected token — never anyone else's — to perform
 * exactly the one write they asked for.
 *
 * Idempotent: x_actions has a unique (profile_id, campaign_id, action)
 * index where status='ok'. A repeat click after success returns the
 * cached result without spending another API call (X's pay-per-use
 * pricing is per action).
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") as string,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string
);

async function refreshIfNeeded(conn: {
  profile_id: string; refresh_token: string; token_expires_at: string; access_token: string;
}) {
  const expiresInMs = new Date(conn.token_expires_at).getTime() - Date.now();
  if (expiresInMs > 2 * 60 * 1000) return conn.access_token; // >2 min left, fine as-is

  const clientId = Deno.env.get("X_CLIENT_ID")!;
  const clientSecret = Deno.env.get("X_CLIENT_SECRET")!;
  const basic = btoa(`${clientId}:${clientSecret}`);

  const resp = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${basic}` },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: conn.refresh_token }),
  });
  if (!resp.ok) {
    throw new Error(`token refresh failed: ${await resp.text()}`);
  }
  const tokens = await resp.json();
  await supabaseAdmin
    .from("member_x_connections")
    .update({
      access_token: tokens.access_token,
      // X may or may not rotate the refresh token; keep the old one if not reissued.
      refresh_token: tokens.refresh_token ?? conn.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq("profile_id", conn.profile_id);
  return tokens.access_token as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const clientId = Deno.env.get("X_CLIENT_ID");
  const clientSecret = Deno.env.get("X_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ error: "not_configured" }), {
      status: 501, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer /i, "");
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
  const profileId = userData.user.id;

  let body: { campaign_id?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "bad_request" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
  const { campaign_id, action } = body;
  if (!campaign_id || (action !== "like" && action !== "repost")) {
    return new Response(JSON.stringify({ error: "bad_request" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  // Already done? Return the cached result rather than spending another call.
  const { data: existing } = await supabaseAdmin
    .from("x_actions")
    .select("id")
    .eq("profile_id", profileId).eq("campaign_id", campaign_id).eq("action", action).eq("status", "ok")
    .maybeSingle();
  if (existing) {
    return new Response(JSON.stringify({ ok: true, already_done: true }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const { data: campaign } = await supabaseAdmin
    .from("campaigns").select("x_post_id").eq("id", campaign_id).maybeSingle();
  if (!campaign?.x_post_id) {
    return new Response(JSON.stringify({ error: "campaign_not_x_enabled" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const { data: conn } = await supabaseAdmin
    .from("member_x_connections")
    .select("profile_id, x_user_id, access_token, refresh_token, token_expires_at")
    .eq("profile_id", profileId).is("revoked_at", null).maybeSingle();
  if (!conn) {
    return new Response(JSON.stringify({ error: "not_connected" }), {
      status: 409, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  let accessToken: string;
  try {
    accessToken = await refreshIfNeeded(conn);
  } catch (e) {
    console.error("x-action: refresh failed:", e);
    return new Response(JSON.stringify({ error: "refresh_failed" }), {
      status: 502, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const endpoint = action === "like"
    ? `https://api.x.com/2/users/${conn.x_user_id}/likes`
    : `https://api.x.com/2/users/${conn.x_user_id}/retweets`;

  const xResp = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ tweet_id: campaign.x_post_id }),
  });
  const ok = xResp.ok;
  const resultText = ok ? null : await xResp.text();
  if (!ok) console.error(`x-action: ${action} failed:`, resultText);

  await supabaseAdmin.from("x_actions").insert({
    profile_id: profileId,
    campaign_id,
    action,
    x_post_id: campaign.x_post_id,
    status: ok ? "ok" : "failed",
    error_message: ok ? null : (resultText ?? "").slice(0, 500),
  });

  return new Response(JSON.stringify({ ok }), {
    status: ok ? 200 : 502,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
