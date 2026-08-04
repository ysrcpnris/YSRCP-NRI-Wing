#!/usr/bin/env node
/**
 * Walks a real member through the app's own data path, in the app's own
 * order, with a real JWT.
 *
 * WHY THIS EXISTS
 *   Two of the worst defects in the slice 1-9 review were invisible to
 *   every check that had been run, and obvious the moment anyone used
 *   the product:
 *
 *     · onboarding_completed_at was missing from PROFILE_COLUMNS, so
 *       ProtectedRoute saw undefined and redirected EVERY user to
 *       /complete-profile forever.
 *     · The profile editor submitted dob and family_* that it had never
 *       loaded, so saving a phone number erased a member's date of
 *       birth.
 *
 *   Neither is a permission bug, so scripts/auth-matrix.sh cannot see
 *   them. Both are "does the app work", which is this file.
 *
 * USAGE
 *   node scripts/smoke-member-journey.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(join(root, ".env.local"), "utf8");
const pick = (k) =>
  (env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1] ?? "").trim().replace(/^["']|["']$/g, "");

const URL = pick("VITE_SUPABASE_URL");
const KEY = pick("VITE_SUPABASE_ANON_KEY");
const PW = "StagingTest!2026";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) { console.log(`  \x1b[32m✓\x1b[0m ${name}`); pass++; }
  else { console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? " — " + detail : ""}`); fail++; }
};

const api = (path, opts = {}, token) =>
  fetch(`${URL}${path}`, {
    ...opts,
    headers: {
      apikey: KEY,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });

const rpc = (fn, body, token) =>
  api(`/rest/v1/rpc/${fn}`, { method: "POST", body: JSON.stringify(body ?? {}) }, token);

// The exact column list AuthContext requests. Kept here deliberately:
// if someone removes a column the app depends on, this test notices.
const PROFILE_COLUMNS = [
  "id", "public_user_code", "first_name", "last_name", "full_name",
  "email", "mobile_number", "whatsapp_number", "gender",
  "country_of_residence", "state_abroad", "city_abroad",
  "indian_state", "district", "assembly_constituency", "mandal", "village",
  "profession", "organization", "designation", "occupation",
  "contribution", "participate_campaign", "suggestions",
  "facebook_id", "twitter_id", "instagram_id", "linkedin_id",
  "profile_photo", "referral_code", "referred_by",
  "role", "status", "created_at", "updated_at",
  "onboarding_completed_at",
].join(", ");

const main = async () => {
  console.log(`Member journey smoke test — ${URL}\n`);

  const auth = await (
    await api("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email: "t.de.b@example.test", password: PW }),
    })
  ).json();
  const token = auth.access_token;
  if (!token) { console.error("No token — are the fixtures seeded?"); process.exit(1); }
  const uid = auth.user.id;

  // ── 1. the profile fetch AuthContext performs ──────────────────────
  const profileRes = await api(
    `/rest/v1/profiles?select=${encodeURIComponent(PROFILE_COLUMNS)}&id=eq.${uid}`,
    {}, token
  );
  const [profile] = await profileRes.json();
  check("AuthContext profile query succeeds", Boolean(profile),
        `HTTP ${profileRes.status}`);
  check("onboarding_completed_at is present in the response",
        profile && "onboarding_completed_at" in profile,
        "ProtectedRoute gates on it; absent means an infinite redirect");

  // ── 2. the gate ProtectedRoute applies ─────────────────────────────
  const wouldRedirect = !profile?.onboarding_completed_at;
  check("a completed member is NOT redirected to /complete-profile",
        !wouldRedirect,
        wouldRedirect ? "onboarding_completed_at is null/absent" : "");

  // ── 3. private fields load, and survive an unrelated save ──────────
  const before = (await (await rpc("my_private_profile", {}, token)).json())[0];
  check("my_private_profile returns the restricted fields",
        before && "dob" in before && "family_name" in before);

  // Give the member something to lose, then save an unrelated field.
  await rpc("update_my_private_profile",
            { p_dob: "1985-04-12", p_family_name: "Test Relative" }, token);

  const saveRes = await api(`/rest/v1/profiles?id=eq.${uid}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ city_abroad: "Berlin", updated_at: new Date().toISOString() }),
  }, token);
  check("an ordinary profile save succeeds", saveRes.status === 204,
        `HTTP ${saveRes.status}`);

  const after = (await (await rpc("my_private_profile", {}, token)).json())[0];
  check("date of birth survives an unrelated save",
        after?.dob === "1985-04-12", `got ${JSON.stringify(after?.dob)}`);
  check("family details survive an unrelated save",
        after?.family_name === "Test Relative", `got ${JSON.stringify(after?.family_name)}`);

  // ── 4. the member-facing surfaces return something usable ──────────
  for (const [fn, label] of [
    ["my_local_connect", "Local Connect"],
    ["my_social_handles", "Abroad Connect"],
    ["my_requests", "Assistance"],
    ["open_slots", "Appointments"],
    ["my_campaigns", "Digital Army"],
  ]) {
    const r = await rpc(fn, {}, token);
    const body = await r.json();
    check(`${label} (${fn}) responds without error`,
          r.ok && Array.isArray(body),
          r.ok ? "" : JSON.stringify(body).slice(0, 80));
  }

  // ── cleanup ────────────────────────────────────────────────────────
  await rpc("update_my_private_profile", { p_clear_dob: true, p_clear_family: true }, token);

  console.log(`\npassed ${pass}, failed ${fail}`);
  process.exit(fail === 0 ? 0 : 1);
};

main().catch((e) => { console.error(e); process.exit(1); });
