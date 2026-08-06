import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Step 1 of connecting a member's own X account.
 *
 * Called by the browser (Digital Army's "Connect X" button) with the
 * member's own session. Returns the X authorize URL to redirect to.
 * Generates the PKCE pair here and stashes the verifier server-side —
 * a public SPA cannot hold a client secret, so PKCE is what stands in
 * for one; the verifier must never reach the browser.
 *
 * Dark until X_CLIENT_ID / X_REDIRECT_URI are set as function secrets
 * (`supabase secrets set X_CLIENT_ID=... X_REDIRECT_URI=...`) — that
 * requires a Developer App registered on X's side, which only the team
 * can do. Until then this returns 501, and the frontend is expected to
 * treat that as "integration not configured yet", not an error to alarm on.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") as string,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string
);

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function pkcePair() {
  const verifierBytes = crypto.getRandomValues(new Uint8Array(64));
  const codeVerifier = base64url(verifierBytes);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(codeVerifier)
  );
  const codeChallenge = base64url(new Uint8Array(digest));
  return { codeVerifier, codeChallenge };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const clientId = Deno.env.get("X_CLIENT_ID");
  const redirectUri = Deno.env.get("X_REDIRECT_URI");
  if (!clientId || !redirectUri) {
    return new Response(
      JSON.stringify({ error: "not_configured", message: "X integration is not set up yet." }),
      { status: 501, headers: { ...CORS, "Content-Type": "application/json" } }
    );
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

  const { codeVerifier, codeChallenge } = await pkcePair();
  const state = base64url(crypto.getRandomValues(new Uint8Array(24)));

  // Overwrites any prior pending attempt for this member — starting a
  // fresh connect supersedes an abandoned one rather than stacking rows.
  await supabaseAdmin.from("x_oauth_pending").delete().eq("profile_id", profileId);
  const { error: insertErr } = await supabaseAdmin
    .from("x_oauth_pending")
    .insert({ state, profile_id: profileId, code_verifier: codeVerifier });
  if (insertErr) {
    console.error("x-oauth-start: failed to store PKCE state:", insertErr);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const scope = "like.write tweet.write users.read offline.access";
  const url =
    `https://x.com/i/oauth2/authorize` +
    `?response_type=code&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${encodeURIComponent(state)}` +
    `&code_challenge=${encodeURIComponent(codeChallenge)}` +
    `&code_challenge_method=S256`;

  return new Response(JSON.stringify({ url }), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
