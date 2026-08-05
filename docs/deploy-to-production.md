# Deploying

- [Staging](#deploying-develop-to-staging) — do this first, and keep it
- [Production](#deploying-develop-to-production)

---

# Deploying `develop` to staging

**There is no staging frontend today.** `staging.ysrcpnriwing.org` has no
DNS record and never has; the only mention of it in the repo is a
build-time placeholder in `ci.yml`, next to a comment saying the value is
irrelevant to a build. Staging has so far been a *database only*
(`vaomqjcupmlfsivkrelx`), exercised over the REST API. This section
stands the web tier up for the first time.

The staging database is already current — `supabase db push --dry-run`
reports `upToDate: true`, all 107 migrations applied. So this is a
frontend-only deploy, and unlike production it has **no ordering hazard**:
the DB is already ahead, so the new bundle is the thing that makes them
agree again.

### The one setting that matters

Vite inlines `VITE_*` at build time, so the Vercel **Preview**
environment decides which database the staging site talks to.

- Unset → `src/lib/supabase.ts` throws on import → white screen.
- Inheriting Production values → **your staging site reads and writes the
  live member database.** This is the failure to avoid.

In Vercel → Settings → Environment Variables, add these to the
**Preview** scope only (branch-scoped to `develop` if your plan allows):

```
VITE_SUPABASE_URL       https://vaomqjcupmlfsivkrelx.supabase.co
VITE_SUPABASE_ANON_KEY  <staging anon key — it is in .env.local>
VITE_APP_URL            https://staging.ysrcpnriwing.org
VITE_STAGING_MODE       true
```

**`VITE_STAGING_MODE` must NEVER be set on the Production environment.**
It switches on `StagingQuickLogin` (src/components/StagingQuickLogin.tsx)
— a button per fixture account that signs in directly and stamps
`otp_verified_at` itself, skipping the real email-OTP hand-off
entirely. That's exactly right for `@example.test` accounts with no
real inbox, and exactly wrong for a real member. The component also
refuses to render on the production hostname as a second, independent
gate — but the env var is the one that actually matters. If you ever
see the amber "Staging quick sign-in" box on www.ysrcpnriwing.org,
this variable leaked into the wrong Vercel environment; unset it
immediately.

`vercel.json` and `index.html` already list **both** Supabase refs in the
CSP `connect-src`, so no CSP change is needed for staging.

`VITE_APP_URL` is not read anywhere in `src/` — auth redirects use
`window.location.origin` at runtime. Set it for consistency, but it is
not what makes login work. See the Supabase step below for what does.

### Deploy

Git integration (nothing to install; `develop` is already pushed):

1. Vercel → Project → Settings → Git → confirm Preview deployments are
   enabled for branches other than `main`.
2. Set the Preview env vars above.
3. Push to `develop`, or hit **Redeploy** on the latest `develop`
   deployment so it picks up the new env vars. *Env var changes do not
   apply to existing deployments — you must redeploy.*
4. Copy the preview URL.

Or with the CLI (`npm i -g vercel`, then `vercel login` — interactive):

```bash
vercel link
vercel env add VITE_SUPABASE_URL preview
vercel env add VITE_SUPABASE_ANON_KEY preview
vercel deploy            # no --prod: this targets preview
```

### Allow the URL in Supabase, or logins will fail

Staging Supabase → Authentication → URL Configuration. Add the staging
URL to **Site URL** and **Redirect URLs**.

Vercel gives every preview deployment a *different* random hostname, and
email verification and password reset both bounce off
`window.location.origin`. So either:

- add a wildcard such as `https://*-<team>.vercel.app/**`, or
- **preferred** — assign a stable domain (`staging.ysrcpnriwing.org`) to
  the `develop` branch in Vercel → Settings → Domains, add the CNAME it
  gives you, and allow-list just that.

A stable hostname is worth the ten minutes; random URLs mean auth breaks
on every redeploy.

### Then actually open it

This is the first time the app can be exercised the way a member reaches
it, which `CLAUDE.md` requires and which no amount of REST testing
substitutes for. Sign in as each fixture — password `StagingTest!2026`:

| Account | Role |
|---|---|
| `t.us.a@example.test` | member |
| `t.de.a@example.test` | country coordinator (DE) + chapter lead (US) |
| `t.cl.a@example.test` | chapter lead |
| `t.tl.a@example.test` | team lead |
| `t.ae.a@example.test` | admin |
| `t.sec.a@example.test` | secretariat |
| `t.nc.a@example.test` | member in a chapterless country (Norway) |

Check for the two defect classes that only appear on screen: a redirect
loop to `/complete-profile`, and a field that saves an empty string over
real data. Then check the Chapters rename reads correctly in the UI.

If Vercel's Deployment Protection is on, preview URLs are SSO/password
gated — turn it off for this deployment or share access, or testers will
see a login wall that is not yours.

---

# Deploying `develop` to production

Written for the first production release since the nine-slice rebuild.
www.ysrcpnriwing.org is live and serving real members, so this is not a
routine push.

Verified state at time of writing:

| | |
|---|---|
| `develop` ahead of `main` | 41 commits, and `main` has nothing `develop` lacks — a clean fast-forward |
| Migrations in repo | 107 · 47 already on production under their old `new_NN_*` names · **60 to run** |
| Production Supabase | `rcpcmjrahhzayqxexpkv` |
| Staging Supabase | `vaomqjcupmlfsivkrelx` ← **currently the linked project** |
| Hosting | Vercel. `vercel.json` already allows both Supabase refs in the CSP, so no CSP change is needed |
| CI | Has no `push` or `pull_request` trigger. **The pre-merge gate is a person.** |

---

## Read this first: neither order is safe on its own

The database migration and the frontend deploy are **not independent**.
Each one breaks the other's counterpart, and this was confirmed rather
than assumed:

- **Database first** → the live frontend does `.select("*")` on
  `profiles` at `src/contexts/AuthContext.tsx:40`. Migrations
  `20260804094500` / `20260805090000` / `20260805111000` revoke `dob`
  and the `family_*` columns from `authenticated`. Postgres rejects the
  whole statement with `42501` when a `SELECT *` touches a column the
  role cannot read — so **every signed-in member's profile load fails**.
- **Frontend first** → the new frontend selects `onboarding_completed_at`,
  which is added by `20260804100000_onboarding_completion.sql` — a
  post-cutoff migration that is **not on production yet**. PostgREST
  answers `42703` (no such column) and `ProtectedRoute` gates on that
  exact field, so every user redirects to `/complete-profile` forever.

So there is a window where the site is broken no matter what. The job is
to make it as short as possible and to be present while it is open.

**Consequence for rollback, which is the part people miss:** once the
database is migrated, rolling the *frontend* back to old `main`
re-creates the `42501` break. **A frontend-only rollback does not
work after Phase 3.** Roll forward, not back.

---

## Phase 0 — before the window (safe, no user impact)

### 0.1 Run the gates. CI will not do it for you.

```bash
npm run test:auth      # 98 checks
npm run smoke          # 12 checks
npm run typecheck:ci   # 117 errors, must be unchanged
npm run lint:ci        # 287 problems, none new
npm run build
```

All five were green on `develop` at `0c3fe5e`. Re-run if anything has
landed since.

### 0.2 Confirm the Vercel production environment

Vercel → Project → Settings → Environment Variables → **Production**:

```
VITE_SUPABASE_URL       https://rcpcmjrahhzayqxexpkv.supabase.co
VITE_SUPABASE_ANON_KEY  <production anon key>
VITE_APP_URL            https://www.ysrcpnriwing.org
```

`src/lib/supabase.ts` throws on import if the first two are missing, so
a wrong value here is a white screen, not a degraded page.

### 0.3 Back up the production database

Supabase dashboard → Database → Backups → take one now, or:

```bash
supabase db dump --linked -f prod-backup-$(date +%F).sql   # AFTER linking, Phase 1
```

Migrations here are forward-only. This backup is the only DB rollback
that exists, and restoring it loses every member write made since.

### 0.4 Audit the constituency corruption (read only)

```bash
supabase db query --linked --file scripts/audits/check_prod_constituencies.sql
```

Keep the output. `LIKELY CORRUPTED` is the real signal;
`SUSPICIOUSLY SHORT` is advisory — `Tuni` and `Undi` are genuine
four-letter constituencies. **Repair is a separate job needing per-value
sign-off** (Phase 6); do not fold it into this release.

---

## Phase 1 — point the CLI at production

This is the single most dangerous command in the runbook. Right now the
linked project is **staging**, and everything so far has correctly gone
there.

```bash
supabase link --project-ref rcpcmjrahhzayqxexpkv
cat supabase/.temp/project-ref     # must print rcpcmjrahhzayqxexpkv
```

From here on, every `supabase db …` hits **production**.

> **Never run these against production:**
> `scripts/auth-matrix.sh` (it grants and revokes real roles),
> `supabase/seeds/staging_fixtures.sql`, `supabase/seeds/staging_members.sql`
> (they create test accounts and 130 synthetic members).
> `supabase db push` does not run seed files — the push output reports
> `"seeds":[]` — but nothing stops you running them by hand.

---

## Phase 2 — reconcile the migration history (irreversible)

Production ran its first 47 migrations under old `new_NN_*` filenames.
They were renamed to timestamps, so production's `supabase_migrations`
table describes files that no longer exist. **Until this is repaired,
`supabase db push` will try to replay all 107 from scratch.**

```bash
supabase migration list                              # see the mismatch
scripts/audits/repair_migration_history.sh           # dry run
```

The dry run must print exactly:

```
  47 migrations at or before 20260803000000 — mark as applied
  60 migrations after  20260803000000 — leave alone, these must run
```

If it refuses, **stop** — someone has added or removed a migration below
the cutoff, and marking the wrong set applied would permanently skip a
migration production never ran.

```bash
scripts/audits/repair_migration_history.sh --apply   # prompts for YES
supabase db push --dry-run                           # must list exactly 60
```

Read the dry-run list. Every entry must be `20260803…` or later. A
pre-cutoff version appearing here means the repair did not take.

---

## Phase 3 — the window

Pick a genuinely low-traffic hour from your own analytics. The audience
spans US, EU and Gulf timezones, so there is no universally quiet slot —
choose the least-bad one rather than assuming IST night is safe.

**Recommended: pre-build, then promote.** This shrinks the broken window
from a two-minute Vercel build to a few seconds.

```bash
# 1. Build and upload the new frontend WITHOUT sending traffic to it
vercel build --prod
vercel deploy --prebuilt --prod          # note the deployment URL it prints
```

Open that deployment URL and confirm it loads. It is talking to the
**un-migrated** production DB, so expect profile errors — that is normal
and expected at this point. You are only proving the bundle is good.

```bash
# 2. Migrate the database — the window opens here
supabase db push

# 3. Promote immediately — the window closes here
vercel promote <deployment-url>
```

**If you use the Vercel git integration instead** (simpler, longer
window — roughly the length of a Vercel build):

```bash
supabase db push
git checkout main && git merge --ff-only develop && git push origin main
```

Either way, merge `develop` into `main` afterwards so the branches agree:

```bash
git checkout main && git merge --ff-only develop && git push origin main
git checkout develop
```

---

## Phase 4 — verify on production

Per `CLAUDE.md`, "complete" means demonstrated. The automated suites
cannot run here — they need fixture logins that do not exist on
production, and `auth-matrix.sh` writes. So this phase is manual.

1. **Open the site in a private window.** Sign in as a real account.
   Confirm: no redirect loop to `/complete-profile`, the dashboard
   renders, and profile fields show real values rather than blanks.
   A field that saves an empty string over real data is invisible to
   every check except this one.
2. **As an admin**, open the member list, the chapter screens and
   feedback. Admin was broken from the slice that introduced it last
   time precisely because nobody signed in as one.
3. **Test a write, not just reads.** Edit a profile field, save, reload,
   confirm it persisted. Then confirm a member *cannot* escalate:
   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' -X PATCH \
     "$PROD_URL/rest/v1/profiles?id=eq.<own-id>" \
     -H "apikey: $PROD_ANON" -H "Authorization: Bearer $MEMBER_JWT" \
     -H "Content-Type: application/json" -d '{"role":"admin"}'
   ```
   Then **re-read the row** and confirm `role` is unchanged. PostgREST
   returns `204` with zero rows affected when RLS filters everything
   away, so the status code alone proves nothing.
4. **Confirm the test fixture refuses here.** As an admin, call
   `matrix_seed_ranking`. It must fail with
   `refusing: N real profiles present — this is not a test database`.
   A success would mean the guard is not doing its job on the one
   database where it matters.
5. **Confirm no test data leaked**: production should have zero
   `@example.test` profiles.
6. **Spot-check the Clusters → Chapters rename** in the UI. A bulk
   rename previously corrupted unrelated prose ("50+ industrial
   clusters" → "chapters") and that class of error only shows on screen.

---

## Phase 5 — if it goes wrong

| Symptom | Action |
|---|---|
| Bundle is broken, DB not yet migrated | `vercel promote` the previous deployment. Clean. |
| **DB already migrated** | **Do not roll the frontend back** — old `main` does `select("*")` and will fail with `42501` against the new column grants. Fix forward. |
| A migration failed part-way | `supabase migration list` to find where it stopped. Fix the migration, re-push. Do not hand-edit `supabase_migrations`. |
| Data damaged | Restore the Phase 0.3 backup. This loses member writes since the backup — last resort only. |

---

## Phase 6 — after the release

- Repair the corrupted constituencies found in 0.4, **with sign-off on
  each value**. The mapping is a judgement, not a rule.
- Consider restoring `push` / `pull_request` triggers in
  `.github/workflows/ci.yml` now that production depends on `main`. They
  are currently off by design (a cost decision), which is why the
  pre-merge gate is a person.
