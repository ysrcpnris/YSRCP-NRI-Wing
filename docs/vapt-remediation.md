# VAPT Remediation Status

Tracks the fix applied for every finding in `VAPT_Report_ysrcpnriwing_org.md`.

## V-01 — Unauthenticated PII Exposure (CRITICAL) — FIXED

**Fix:** Migration [supabase/migrations/new_42_tighten_pii_rls.sql](../supabase/migrations/new_42_tighten_pii_rls.sql) — RLS SELECT policy on `leaders_master`, `leader_assignments`, `coordinators`, `local_leaders` is now `TO authenticated` only (was `USING (true)` for PUBLIC).

**Verified:** the V-01 proof-of-concept curl request with the anon key now returns `[]` instead of the 217-leader phone-number dump.

## V-02 — Supabase Anon JWT in Public JS Bundle (HIGH) — NEUTRALIZED

The anon key being in the bundle is *by design* in Supabase's architecture; it's only dangerous when RLS isn't enforced. With V-01 + V-04 fixed, the key can no longer be used to read PII.

**Optional extra hardening — rotate the anon key:**

1. Supabase Dashboard → **Project Settings → API → JWT Settings**
2. Click **Reset JWT secret** (this issues new anon + service-role keys)
3. Copy the new `anon public` key
4. Update `VITE_SUPABASE_ANON_KEY` in:
   - Local `.env`
   - Vercel → Project → Settings → Environment Variables (both Production and Preview)
5. Redeploy on Vercel

Note: rotating the JWT secret invalidates ALL existing user sessions — every signed-in user will need to log in again. Schedule it for low-traffic time.

## V-03 — PostgREST Schema Hints Leak (MEDIUM) — RESIDUAL RISK ACCEPTED

Cannot be fully suppressed on Supabase Cloud — `PGRST_DB_CONFIG` and related env vars aren't user-configurable on the managed plan. The only true fix is to route every request through a Supabase Edge Function that strips error metadata, which is disproportionate to the threat.

**Impact assessment after V-01/V-04 fix:** knowing the table names is information-only. RLS now blocks the actual data behind them, so the disclosure is no longer chained to an exploit.

**If you want to revisit later:** an Edge Function gateway can be added as a separate workstream; not blocking.

## V-04 — Tables Readable Without Authentication (MEDIUM) — FIXED (PII) / ACCEPTED (Public)

The 22 tables flagged were a mix:

**Locked down (fixed in V-01 migration):** `leaders_master`, `leader_assignments`, `coordinators`, `local_leaders`.

**Already protected by row-level policy (verified during audit):** `profiles` (own-row), `service_requests` (own + admin), `event_applications` (own + admin), `suggestions` (own + admin), `grievances` (own + assigned + admin), `job_applications` (own + admin), `nri_visits` (admin-only), `referrals` (own + admin), `user_contributions` (own).

**Intentionally public (keep readable to anon):** `countries`, `continents`, `news`, `news_articles` (with `published=true` gate), `events`, `service_categories`, `service_options`, `youtube_videos`, `testimonials`, `homepage_banners`, `gallery_images`, `media_gallery`, `wings`, `contribution_types`, `app_settings`, `content_live_links`, `support_teams` (signup form lists teams), `volunteer_tasks`, `job_postings`. None of these carry personal data.

**Verified by `audit-rls.cjs`** before remediation.

## V-05 — CSP via Meta Tag + Missing Headers (LOW) — FIXED

**Fix:** [vercel.json](../vercel.json) now sends these HTTP response headers on every route:

- `X-Frame-Options: DENY` — clickjacking blocked
- `X-Content-Type-Options: nosniff` — MIME-sniffing blocked
- `Referrer-Policy: strict-origin-when-cross-origin` — referer leakage limited
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()` — feature-policy locked
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` — HTTPS-only enforced (browser remembers for 2 years)
- `Content-Security-Policy: ...; frame-ancestors 'none'; base-uri 'self'; form-action 'self';` — full CSP as a real HTTP header (in addition to the `<meta>` fallback already in `index.html`)

**`style-src 'unsafe-inline'` retained:** the codebase uses dynamic inline styles in several places (`style={{ width: pct + "%" }}` etc.) and Recharts injects inline styles into SVGs. Removing `'unsafe-inline'` from `style-src` without a refactor would break charts and progress bars. Trade-off accepted; XSS protection is still strong because `script-src` is tightly scoped and `frame-ancestors 'none'` prevents framing.

**Note about `access-control-allow-origin: *`:** that header was being set on the Vercel-served HTML page by Vercel's defaults. It's fine for static HTML (the file contains no secrets) but if you want it removed, add `{"key": "Access-Control-Allow-Origin", "value": "https://www.ysrcpnriwing.org"}` to the headers array.

## Verification commands

After the next Vercel deploy, run these to confirm fixes are live:

```bash
# V-01 / V-04 — should return [] (not the leader list)
curl -s "https://rcpcmjrahhzayqxexpkv.supabase.co/rest/v1/leaders_master?select=*" \
  -H "apikey: <anon-key>" -H "Authorization: Bearer <anon-key>" | head -c 100

# V-05 — should print all the new security headers
curl -sI https://www.ysrcpnriwing.org/ | grep -iE \
  "x-frame-options|x-content-type|referrer-policy|permissions-policy|strict-transport|content-security"
```

## Summary

| ID  | Severity | Status |
|-----|----------|--------|
| V-01 | CRITICAL | **FIXED** — migration applied, verified live |
| V-02 | HIGH     | **NEUTRALIZED** — RLS removes the attack surface. Optional key-rotation steps documented above. |
| V-03 | MEDIUM   | **ACCEPTED** — Supabase Cloud limitation; no longer chains to data exploit |
| V-04 | MEDIUM   | **FIXED** — PII tables locked, public tables intentionally open |
| V-05 | LOW      | **FIXED** — `vercel.json` carries the full header set; takes effect on next deploy |

Run `vercel --prod` (or push to the main branch if auto-deploy is on) to ship the V-05 header changes.
