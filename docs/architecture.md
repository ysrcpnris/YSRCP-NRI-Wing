# YSRCP NRI Wing Portal — Architecture & Developer Guide

The complete reference for any developer picking up this project. Read
top-to-bottom on first onboarding; after that use it as a map and a glossary.

---

## Table of Contents

1.  [What this project is](#1-what-this-project-is)
2.  [Tech stack](#2-tech-stack)
3.  [Folder layout](#3-folder-layout)
4.  [Routing map](#4-routing-map)
5.  [Auth flow end-to-end](#5-auth-flow-end-to-end)
6.  [Why AuthContext is split into two files](#6-why-authcontext-is-split-into-two-files)
7.  [Database — full table inventory](#7-database--full-table-inventory)
8.  [Privileged RPCs (full inventory)](#8-privileged-rpcs-full-inventory)
9.  [Row Level Security pattern](#9-row-level-security-pattern)
10. [Migration history (new_01 → new_40)](#10-migration-history-new_01--new_40)
11. [Feature: Registration & profile creation](#11-feature-registration--profile-creation)
12. [Feature: Referrals (direct + passive + upstream)](#12-feature-referrals-direct--passive--upstream)
13. [Feature: Events & Notifications](#13-feature-events--notifications)
14. [Feature: Service Requests (Assistance)](#14-feature-service-requests-assistance)
15. [Feature: Suggestions](#15-feature-suggestions)
16. [Feature: Support Teams](#16-feature-support-teams)
17. [Feature: Master Data — Leader directory](#17-feature-master-data--leader-directory)
18. [Feature: Org Hierarchy view](#18-feature-org-hierarchy-view)
19. [Feature: NRI Visits with Jagan Anna](#19-feature-nri-visits-with-jagan-anna)
20. [Feature: Featured Videos (YouTube)](#20-feature-featured-videos-youtube)
21. [Feature: Testimonials](#21-feature-testimonials)
22. [Feature: News](#22-feature-news)
23. [Feature: Content Control](#23-feature-content-control)
24. [Feature: User Dashboard](#24-feature-user-dashboard)
25. [Feature: Admin Dashboard](#25-feature-admin-dashboard)
26. [Feature: Password reset & email verification](#26-feature-password-reset--email-verification)
27. [Feature: Idle auto-logout](#27-feature-idle-auto-logout)
28. [Input sanitisation & validation](#28-input-sanitisation--validation)
29. [Phone number conventions](#29-phone-number-conventions)
30. [Content Security Policy](#30-content-security-policy)
31. [Environment variables](#31-environment-variables)
32. [Production hardening](#32-production-hardening)
33. [Local development](#33-local-development)
34. [Deployment](#34-deployment)
35. [Realtime subscriptions](#35-realtime-subscriptions)
36. [Excel export — multi-sheet format](#36-excel-export--multi-sheet-format)
37. [Common pitfalls](#37-common-pitfalls)
38. [Where to look first](#38-where-to-look-first)

---

## 1. What this project is

A single-page web portal for the **YSRCP NRI Wing** that lets NRIs (Non-Resident
Indians) register, connect with party leadership, apply to events, raise service
requests, submit suggestions, refer other NRIs, and browse static party
content (pillars, initiatives, news, testimonials, leadership directory).

Four distinct user surfaces share the same codebase:

| Surface              | Who uses it                                | Entry route                               |
|----------------------|--------------------------------------------|-------------------------------------------|
| **Public landing**   | Visitors, prospective members              | `/`                                       |
| **User Dashboard**   | Verified registered users                  | `/dashboard`                              |
| **Admin Dashboard**  | Internal admins                            | `/admin` and `/admin/dashboard`           |
| **Support Team**     | Field volunteers / coordinators            | `/support-teams`, `/support-team/dashboard` |

There is no separate "admin app" — the same React bundle renders both, and
authorisation is enforced server-side via Supabase Row Level Security (RLS).

---

## 2. Tech stack

### Frontend
- **React 18.3** + **TypeScript 5.5**
- **Vite 7** (dev server + bundler; production strips `console.*` / `debugger`)
- **React Router 7** for routing
- **Tailwind CSS 3.4** for styling, **lucide-react** for icons
- **react-toastify** for toasts, **react-easy-crop** for profile photo cropping
- **xlsx** for multi-sheet Excel export (admin dashboard)
- **recharts** for admin analytics charts
- **react-slick** for carousels
- **motion** (Framer Motion 12) for animations
- **@headlessui/react** for accessible dropdowns / listboxes
- Custom `BrandIcons.tsx` with inline-SVG brand logos (no FontAwesome dependency)

### Backend
- **Supabase** (managed Postgres + Auth + Storage + Edge Functions + Realtime)
- **PostgreSQL** with **Row Level Security (RLS)** on every table
- **PL/pgSQL SECURITY DEFINER** functions for privileged ops
- **PostgREST** auto-generates the REST API from the schema — all queries are
  parameterised, so SQL injection is structurally impossible
- **Realtime** (Postgres logical replication via WAL) for live admin updates
- **Storage** buckets for leader photos, news images, profile photos
- **Resend** for transactional email (configured in Supabase Dashboard → Auth →
  SMTP, *not* called from the frontend)

### Hosting
- Frontend: **Vercel** (URL from `VITE_APP_URL`)
- Backend: **Supabase Cloud** (URL from `VITE_SUPABASE_URL`)

---

## 3. Folder layout

```
nri-wing/
├── src/
│   ├── App.tsx                  Router + auth modal + top-level layout
│   ├── main.tsx                 React root + <BrowserRouter>
│   ├── components/              Reusable presentation components
│   │   ├── Header.tsx, Footer.tsx, Hero.tsx, About.tsx
│   │   ├── Mission.tsx, Initiatives.tsx, TenPillar.tsx
│   │   ├── PoliticalJourney.tsx, Events.tsx, News.tsx, NewsCarousel.tsx
│   │   ├── ImpactMap.tsx, Testimonials.tsx, Glimpse.tsx
│   │   ├── SocialMedia.tsx, JaganMark.tsx, Coordinators.tsx
│   │   ├── Dashboard.tsx        USER dashboard (profile, suggestions, events,
│   │   │                        service requests, referrals)
│   │   ├── AuthModal.tsx        Sign in / sign up / reset password modal
│   │   ├── ResetPassword.tsx    Forgot-password subview of AuthModal
│   │   ├── PasswordRules.tsx    Inline strength meter
│   │   ├── BrandIcons.tsx       Inline-SVG brand logos
│   │   ├── ProfileDropdown.tsx  Header menu when signed in
│   │   ├── NotificationsFeed.tsx, PillarPage.tsx, PillarDetailpage.tsx
│   │   ├── PillarDetailWrapper.tsx, MediaCenter.tsx, JoinUs.tsx
│   │   ├── Development.tsx, Contact.tsx
│   │   └── ...
│   ├── pages/                   Full-page routes (one per file)
│   │   ├── RegisterPage.tsx     Standalone multi-step signup page
│   │   ├── VerifyEmailPage.tsx, EmailVerifiedPage.tsx
│   │   ├── ResetPasswordPage.tsx, ResetPasswordConfirmPage.tsx
│   │   ├── SupportTeamAuthPage.tsx, SupportTeamDashboard.tsx
│   │   ├── ReferralRedirect.tsx /ref/:code → captures code, opens signup
│   │   ├── NewsDetail.tsx       /news/:id article page
│   │   ├── LiveStream.tsx       /live live-feed page
│   │   ├── Suggestions.tsx      legacy redirect target
│   │   ├── NriConnect.tsx       NRI Connect page
│   │   └── (pillar pages) Health.tsx, Agriculture.tsx, Education.tsx,
│   │                      Women.tsx, Studentyouth.tsx, AmmaVodi.tsx,
│   │                      Cheyutha.tsx, Gorumudda.tsx, Yuvanestham.tsx,
│   │                      VasathiDeevena.tsx, VidyaDeevena.tsx,
│   │                      WelfarePage.tsx
│   ├── AdminDashboard/          Admin-only screens
│   │   ├── AdminDashboard.tsx   Container + sidebar + tab routing + analytics
│   │   ├── Users.tsx            All Users tab (paginated, searchable)
│   │   ├── MasterData.tsx       Leader directory CRUD
│   │   ├── EventsNotifications.tsx  Events + Notifications CRUD + applicants
│   │   ├── Assistance.tsx       Service request triage
│   │   ├── ServiceCategories.tsx Service-category master list
│   │   ├── ServiceInbox.tsx     (legacy/secondary inbox view)
│   │   ├── Suggestions.tsx      Suggestions admin view
│   │   ├── TestimonialsAdmin.tsx
│   │   ├── FeaturedVideos.tsx
│   │   ├── OrgHierarchy.tsx     Visual org tree
│   │   ├── SupportTeams.tsx     Support-team CRUD + claim overview
│   │   ├── Visited.tsx          NRI Visits with Jagan Anna
│   │   ├── News.tsx             News CRUD
│   │   ├── ContentControl.tsx   Feature flags / app_settings
│   │   ├── ChangePassword.tsx   Admin password change
│   │   └── AdminProfileMenu.tsx Header avatar menu inside admin
│   ├── routes/                  Route guards
│   │   ├── AdminRoute.tsx       requires profile.role === "admin"
│   │   ├── ProtectedRoute.tsx   requires verified user + profile
│   │   └── SupportTeamRoute.tsx requires profile.role === "support_team"
│   ├── contexts/
│   │   ├── AuthContext.tsx      AuthProvider component (state + signUp/signIn)
│   │   └── useAuth.ts           Context shape + useAuth() hook
│   │                            (split for Vite Fast Refresh — see §6)
│   ├── lib/
│   │   ├── supabase.ts          createClient() + shared Profile type
│   │   ├── supabaseClient.ts    (legacy alias — prefer supabase.ts)
│   │   ├── sanitize.ts          Input sanitiser + isValidName /
│   │   │                        isValidIndianMobile / isValidUrl
│   │   ├── countryCodes.ts      Phone country codes + per-country lengths
│   │   ├── indianAddressData.ts State → District → Constituency → Mandal lookup
│   │   ├── locationData.ts      Country → State/Region/City lookup
│   │   ├── politicalJourneyData.ts  Static timeline data
│   │   ├── password.ts          Password strength rules
│   │   └── cropImage.ts         Canvas helper for profile-photo crop
│   ├── hooks/
│   │   └── useIdleLogout.ts     Auto-signout after inactivity
│   ├── constants/messages.ts    User-facing strings (toasts, errors)
│   └── vite-env.d.ts            import.meta.env typings
├── supabase/
│   └── migrations/              new_01_*.sql ... new_40_*.sql (numeric order)
├── public/                      Static assets served at /
├── docs/                        This file + planning docs
│   ├── architecture.md          (this file)
│   ├── andhra_pradesh_leadership_mapping.md
│   ├── org-hierarchy-proposal.md
│   └── organizationalstructure.md
├── index.html                   Has <meta http-equiv="Content-Security-Policy">
├── vite.config.ts               Adds dev-server CSP + esbuild console drop
├── tailwind.config.js
├── tsconfig*.json
├── package.json
└── .env                         VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
                                 VITE_APP_URL (gitignored)
```

---

## 4. Routing map

All routes are declared in [src/App.tsx](../src/App.tsx).

| Path                              | Guard              | Component                  |
|-----------------------------------|--------------------|----------------------------|
| `/`                               | public             | `MainLandingPage`          |
| `/about`                          | public             | `About` page               |
| `/services`                       | public             | `Initiatives`              |
| `/pillars`, `/pillars/:id`        | public             | `PillarPage` / `PillarDetailWrapper` |
| `/news/:id`                       | public             | `NewsDetail`               |
| `/live`                           | public             | `LiveStreamPage`           |
| `/glimpse`                        | public             | `Glimpse`                  |
| `/suggestions`                    | public             | redirects to `/glimpse`    |
| `/health`, `/education`, `/agriculture`, `/women`, `/students` | public | individual pillar pages |
| `/register`                       | public             | `RegisterPage`             |
| `/verify-email`, `/email-verified`| public (special)   | email-verification flow    |
| `/reset-password-confirm`         | public (token)     | `ResetPasswordConfirmPage` |
| `/ref/:code`                      | public             | `ReferralRedirect`         |
| `/dashboard`                      | `ProtectedRoute`   | `Dashboard`                |
| `/admin`, `/admin/dashboard`      | `AdminRoute`       | `AdminDashboard`           |
| `/change-password`                | `AdminRoute`       | `ChangePassword`           |
| `/support-teams`                  | public             | `SupportTeamAuthPage`      |
| `/support-team/dashboard`         | `SupportTeamRoute` | `SupportTeamDashboard`     |

`AppContent` in App.tsx has a **special early-return** for
`/verify-email` and `/email-verified` so the global auth bootstrap can't
redirect the user away before they see the verification page.

---

## 5. Auth flow end-to-end

```
┌──────────────────────┐
│  User submits signup │
│  (RegisterPage or    │
│   AuthModal)         │
└──────────┬───────────┘
           │
           │ signUp(email, password, profileData)  ← contexts/AuthContext.tsx
           │
           ▼
┌─────────────────────────────────────┐
│ Pre-check 1: profiles.email exists? │  via SELECT (RLS allows anon SELECT id by email)
│ Pre-check 2: mobile_exists() RPC    │  SECURITY DEFINER, bypasses RLS
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ supabase.auth.signUp({              │  Profile data passed via `options.data`
│   email, password,                  │  so the DB trigger can read it from
│   options.data: profileData,        │  raw_user_meta_data — frontend never
│   options.emailRedirectTo: ...      │  INSERTs into profiles directly.
│ })                                  │
└──────────┬──────────────────────────┘
           │
           │  Supabase auth.users row created → on_auth_user_created trigger fires
           ▼
┌─────────────────────────────────────┐
│ DB trigger handle_new_user()        │  - Generates referral_code (8 chars)
│   inserts row into public.profiles  │  - Normalises mobile (+digits)
│                                     │  - Reads referred_by from metadata
└──────────┬──────────────────────────┘
           │
           ▼
   ┌────────────────────┐
   │ Email sent (Resend)│
   └────────┬───────────┘
            │
            ▼
   ┌──────────────────────┐
   │ User clicks link →   │   redirects to /email-verified
   │ /email-verified      │
   └────────┬─────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│ AuthProvider.applyVerifiedSession() │
│   1. fetch profile (retries x6)     │
│   2. if missing, upsert as fallback │
│   3. process referral via RPC       │  process_my_referral(p_code)
│   4. claim support team if any      │  claim_support_team(p_team_id)
└──────────┬──────────────────────────┘
           │
           ▼
   profile.role drives where they land:
   - admin        → /admin/dashboard (via AdminRoute)
   - support_team → /support-team/dashboard
   - everyone else → /dashboard
```

**Why the DB trigger creates the profile** (rather than the frontend
inserting): the auth.signUp call and the profile creation are *one atomic
event* — there is no window where the user exists in `auth.users` but not in
`profiles`. The fallback `upsert` in `applyVerifiedSession` is defensive
insurance for the rare case the trigger fails.

**The `is_admin` localStorage flag is UX-only.** Setting it manually grants
nothing — every privileged RPC and every RLS policy independently calls the
SQL `is_admin()` function which checks `profiles.role` for the current
`auth.uid()`. Server is authoritative.

---

## 6. Why AuthContext is split into two files

Vite's Fast Refresh requires a module to export *only* React components for
HMR to preserve state across edits. `contexts/AuthContext.tsx` used to export
both `AuthProvider` (a component) and `useAuth` (a hook) + `AuthContextType`
(a type), which triggered a full page reload on every edit.

**Resolution:**
- `contexts/useAuth.ts` — exports `AuthContext`, `AuthContextType`, `useAuth()`
- `contexts/AuthContext.tsx` — exports only the `AuthProvider` component
- All consumers import the hook from `../contexts/useAuth`, never from
  `../contexts/AuthContext`.

If you add new auth-state helpers, decide carefully which file they belong in:
hooks/types/context go in `useAuth.ts`; component bodies stay in
`AuthContext.tsx`.

---

## 7. Database — full table inventory

Every table has RLS enabled. Below is the complete table set, with primary
relationships and ownership notes.

### Identity & profile

| Table       | Owner key            | Notes                                                                 |
|-------------|----------------------|-----------------------------------------------------------------------|
| `auth.users` | (Supabase managed)  | Email, password hash, email_confirmed_at, user_metadata (raw_user_meta_data). |
| `profiles`  | `id = auth.users.id` | Mirrors `auth.users.id`. Holds first/last/full name, mobile (E.164), whatsapp, country/state/city abroad, indian state/district/AC/mandal/village, gender, dob, profession, organization, designation, family_*, social handles, role, status, referral_code (own), referred_by (referrer's), public_user_code (display ID). One row per user. |

### Referral system

| Table       | Key                                | Notes                                                                                  |
|-------------|------------------------------------|----------------------------------------------------------------------------------------|
| `referrals` | `(referrer_id, referred_id, kind)` | `kind ∈ {'direct', 'passive'}`. Unique on `(referred_id, kind)` — a user has at most one direct referrer and at most one passive referrer. Realtime-enabled. |

### Service / assistance

| Table                | Owner               | Notes                                                                              |
|----------------------|---------------------|------------------------------------------------------------------------------------|
| `service_requests`   | `profile_id`        | Status state machine: `pending` → `in_progress` → `resolved` / `rejected`. Has `assigned_to`, `assigned_team_id`, `action_taken`, `admin_comments`, `team_reply`, `team_resolved_at`. |
| `service_categories` | (admin master data) | Category labels + sub-options shown in the user form.                              |

### Events & applications

| Table                | Owner / scope    | Notes                                                                                      |
|----------------------|------------------|--------------------------------------------------------------------------------------------|
| `events`             | admin-write      | `kind ∈ {'event', 'notification'}`. Events have `date`, `venue`; notifications are announce-only. `status ∈ {'Draft', 'Sent'}`. |
| `event_applications` | `user_id`        | One row per user RSVP. Captures `gender` and `current_location` at time of apply (so it doesn't change if the user updates their profile later). |

### Suggestions

| Table         | Owner             | Notes                                                                              |
|---------------|-------------------|------------------------------------------------------------------------------------|
| `suggestions` | `profile_id`      | Free-text feedback. Contains `name`, `country`, `mobile`, `email`, `suggestion`, `created_at`. Logged-in submissions also fill `profile_id` (migration `new_25`). |

### Leadership directory

| Table                   | Key                                  | Notes                                                                                              |
|-------------------------|--------------------------------------|----------------------------------------------------------------------------------------------------|
| `leaders`               | `id`                                 | Master row per person: `name`, `whatsapp_number`, `whatsapp_number_2`, `photo_url`, `is_active`. Phones in E.164. |
| `leader_assignments`    | `(leader_id, role, district, constituency)` | One row per (leader, role, scope). Roles: President, Global Coordinator, Regional Coordinator, District President, Assembly Coordinator. Partial unique indexes per role. |
| `org_hierarchy_v` (view)| —                                    | Joins `leaders` + `leader_assignments` with display labels. `SECURITY INVOKER` post-migration 37 so RLS on `leaders` still applies. |

### Content

| Table             | Notes                                                                                                |
|-------------------|------------------------------------------------------------------------------------------------------|
| `news`            | Title, info, image_url, created_at. Admin CRUD.                                                      |
| `testimonials`    | Admin-managed quotes for "Voices of Our Global Community" carousel.                                  |
| `youtube_videos`  | Admin-curated featured videos. `sort_order`, `is_active`. Title/thumbnail fetched via YouTube oEmbed automatically on save. |

### Operations

| Table          | Notes                                                                                  |
|----------------|----------------------------------------------------------------------------------------|
| `app_settings` | Key-value config (feature flags etc.). Admin-only writes; public reads where required. |
| `support_teams`| Volunteer teams. `claimed_by_profile_id` is the support-team user that "owns" the seat. |
| `nri_visits`   | NRI Visits with Jagan Anna log: visitor, place, date, time, purpose.                   |

### Storage buckets

| Bucket          | Purpose                                  |
|-----------------|------------------------------------------|
| `leader-photos` | Photos shown on the public Coordinators / leader cards. |
| `news-images`   | Hero image for each news article.        |
| `profile-photos`| User profile photos uploaded from Dashboard. |

---

## 8. Privileged RPCs (full inventory)

Every function below is `SECURITY DEFINER`. The "Authz" column shows the
guard inside the function body.

| RPC                                     | Authz                                                    | What it does                                                                 |
|-----------------------------------------|----------------------------------------------------------|------------------------------------------------------------------------------|
| `is_admin()`                            | (SQL helper)                                             | Returns `true` iff `auth.uid()`'s profile.role = `'admin'`. Used inside RLS. |
| `mobile_exists(p_mobile text)`          | none (anon callable, read-only)                          | Returns boolean: pre-signup mobile uniqueness check. Skips RLS so anon can use it. |
| `process_my_referral(p_code text)`      | `auth.uid()` present + caller not admin + not self-ref   | Idempotently inserts `(direct)` and `(passive)` edges for the caller.       |
| `get_my_referrals()`                    | `auth.uid()` present                                     | Returns caller's downstream direct + passive referrals AND upstream chain (referrer + grand-referrer). Used by Dashboard "My Referrals". |
| `claim_support_team(p_team_id uuid)`    | `auth.uid()` + profile.role = `support_team` + seat free | Marks the support_teams row as claimed. Idempotent (`reason='already_claimed'`). |
| `release_support_team()`                | `auth.uid()` + caller owns a seat                        | Releases the seat (admin force-release variant also exists).                |
| `admin_support_teams_overview()`        | `is_admin()`                                             | Returns teams + claimed-by-member + assigned/resolved totals.                |
| `get_event_applicants(p_event_id uuid)` | `is_admin()`                                             | Per-applicant rows: name, email, mobile, gender, country, city, state, district, AC, public_user_code, applied_at. |
| `apply_to_event(p_event_id uuid)`       | `auth.uid()`                                             | Inserts into `event_applications` capturing the user's current profile snapshot (gender + current location). Idempotent. |
| `withdraw_event_application(p_event_id uuid)` | `auth.uid()`                                       | Removes the caller's `event_applications` row.                              |

The exact function bodies live in the migrations — search
[supabase/migrations/](../supabase/migrations/) for `CREATE FUNCTION` and the
function name. Several functions go through `DROP FUNCTION IF EXISTS` + `CREATE`
when their return signature changes (PostgREST rejects `CREATE OR REPLACE` for
return-type changes).

---

## 9. Row Level Security pattern

Every table has `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` plus a set of
policies. The canonical patterns:

**Pattern A — public read, admin write** (master data, content tables):

```sql
CREATE POLICY "anon can read" ON public.<table>
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "admin can write" ON public.<table>
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
```

**Pattern B — user owns their row** (suggestions, service_requests,
event_applications):

```sql
CREATE POLICY "owner select" ON public.<table>
  FOR SELECT TO authenticated USING (profile_id = auth.uid());

CREATE POLICY "owner insert" ON public.<table>
  FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());

CREATE POLICY "owner update" ON public.<table>
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "admin sees all" ON public.<table>
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
```

**Pattern C — privileged cross-row reads go through a SECURITY DEFINER RPC.**
Don't add a "read other people's profiles" policy. Instead expose only the
columns needed via an RPC that re-checks authorisation.

`policies.sql` in `supabase/migrations/` is a reference dump of the policies;
the actual definitions live in the numbered migrations.

---

## 10. Migration history (new_01 → new_40)

Migrations are applied in **numeric prefix order** (lexicographic). The
prefix is load-bearing — never rename or renumber an applied migration; add
a new one instead.

| #   | Name                                | Purpose                                                                     |
|-----|-------------------------------------|-----------------------------------------------------------------------------|
| 01  | foundation                          | Initial tables: `profiles`, base RLS, `handle_new_user` trigger.            |
| 02  | content                             | Content tables: `news`, public-read policies.                               |
| 03  | extras                              | Misc auxiliary columns / indexes.                                           |
| 04  | app_settings                        | Key-value app config.                                                       |
| 05  | mobile_unique                       | UNIQUE index on normalised `profiles.mobile_number` + normalising trigger.  |
| 06  | support_teams                       | `support_teams` table, claim mechanics.                                     |
| 07  | credits_referrals                   | First-cut referral + credit system (later credits dropped).                 |
| 08  | rewards_and_redemptions             | Rewards add-on (later removed).                                             |
| 09  | robustness_fixes                    | Indexes, defensive checks.                                                  |
| 10  | family_member                       | `family_relation`, `family_name`, `family_mobile`, `family_village`, `family_designation` on profiles. |
| 11  | user_code_country                   | `public_user_code` + country normalisation.                                 |
| 12  | handle_new_user_fixes               | Hardening of the signup trigger.                                            |
| 13  | pgcrypto_search_path                | Sets `search_path` on functions using `gen_random_*`.                       |
| 14  | backfill_missing_referrals          | One-time backfill for older profiles missing referral edges.                |
| 15  | referrals_rpc                       | First `get_my_referrals()` version.                                         |
| 16  | seed_master_data                    | Seeds service_categories etc.                                               |
| 17  | filter_admin_referrals              | Admins must not appear in users' referral trees.                            |
| 18  | realtime_referrals                  | Enables realtime publication on `referrals`.                                |
| 19  | process_referral_rpc                | `process_my_referral` (direct + passive in one transaction).                |
| 20  | remove_credit_system                | Drops credits/rewards tables and triggers.                                  |
| 21  | service_categories                  | Service categories master data + RLS.                                       |
| 22  | leader_photos                       | `leaders.photo_url`, storage bucket policies.                               |
| 23  | support_team_auth                   | `support_team` role + claim logic via RPC.                                  |
| 24  | support_teams_anon_read             | Anon can list teams (so signup page can show them).                         |
| 25  | suggestions_user_link               | `suggestions.profile_id` foreign key.                                       |
| 26  | suggestions_backfill_v2             | Backfills `profile_id` for older suggestions where possible.                |
| 27  | dp_constituency_backfill            | Clears stale constituency on District-President rows.                       |
| 28  | org_hierarchy                       | President role + `org_hierarchy_v` view.                                    |
| 29  | leader_phones_e164                  | Normalises leader phones to `+91XXXXXXXXXX`.                                |
| 30  | clear_dp_constituency               | Force-clears any remaining DP rows that still have constituency.            |
| 31  | featured_videos                     | `sort_order`, `is_active` on `youtube_videos`.                              |
| 32  | testimonials                        | `testimonials` table + RLS.                                                 |
| 33  | passive_upstream                    | `DROP+CREATE get_my_referrals` to include upstream chain.                   |
| 34  | events_apply                        | `events.kind` column, `event_applications` table, `apply_to_event` + `get_event_applicants` + purge no-op. |
| 35  | robustness                          | AC/DP partial unique indexes, pre-flight dedupe DO block, purge is no-op.   |
| 36  | rc_unique                           | Regional Coordinator unique per district.                                   |
| 37  | org_hierarchy_security_invoker      | `org_hierarchy_v` switched to `SECURITY INVOKER` so RLS on `leaders` applies. |
| 38  | profile_name_check                  | `NOT VALID CHECK` constraint on first_name/last_name (must contain a letter). |
| 39  | president_global_unique             | Exactly one President + one Global Coordinator globally.                    |
| 40  | event_applicants_gender             | `DROP+CREATE get_event_applicants` to return gender column.                 |

---

## 11. Feature: Registration & profile creation

**Files:** [src/pages/RegisterPage.tsx](../src/pages/RegisterPage.tsx),
[src/components/AuthModal.tsx](../src/components/AuthModal.tsx),
[src/contexts/AuthContext.tsx](../src/contexts/AuthContext.tsx),
trigger `handle_new_user()` in migration `new_01` (updates in `new_12`).

### Two entry points
- **AuthModal** (compact signup inside the popup on the landing page).
- **RegisterPage** (standalone `/register` for users who came via a referral
  link or who prefer a full-page form).

Both call `useAuth().signUp(email, password, profileData)`.

### Submit cooldown
`RegisterPage` uses `localStorage` key `register_submit_until` to throttle
repeated submissions (30s default). This survives page refresh.

### Pre-checks (frontend, before `auth.signUp`)
1. `profiles.email` SELECT — friendly error if already registered.
2. `mobile_exists(p_mobile)` RPC — friendly error if mobile already taken.
3. `isValidName(first_name)` and `isValidName(last_name)`.
4. Country-aware mobile length: `getMaxDigits(countryCode)` falls back to the
   E.164 ceiling `max(7, 15 - country_code_digit_count)`.
5. India-only fields (Family Mobile) lock `+91` prefix and require exactly
   10 digits.
6. Every free-text field is run through `sanitizeText` / `sanitizeTrim`.

### The signup call
```ts
await supabase.auth.signUp({
  email: normalizedEmail,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/email-verified`,
    data: meta,   // first_name, last_name, mobile, addresses, referred_by, etc.
  },
});
```

### DB trigger `handle_new_user`
Inserts a `profiles` row using the metadata. Responsibilities:
- Normalises mobile (digits only, optional leading `+`).
- Generates `referral_code` (8-char unique).
- Generates `public_user_code` (display ID).
- Copies `referred_by` (the referrer's code) verbatim into `profiles.referred_by`.
- Honours `role = 'support_team'` from metadata when present.

### After verification
On `/email-verified`, `applyVerifiedSession` retries up to 6 times to fetch
the profile (handles trigger lag). If still missing, falls back to an
idempotent `upsert` from the frontend.

### Country-code deduplication
`distinctPhoneCodes = Array.from(new Set(countryCodes.map(c => c.code)))` — the
dropdown shows one entry per unique code (so multiple countries sharing `+1`
are not duplicated).

---

## 12. Feature: Referrals (direct + passive + upstream)

The crown jewel of the platform. Three concepts:

- **Direct referral** — A registers using B's code. Edge `(B, A, direct)`.
- **Passive referral** — A registers using B's code, and B was originally
  referred by C. Edge `(C, A, passive)` is also created so C gets credit for
  bringing B who brought A.
- **Upstream chain** — On the user's "My Referrals" page we also show *who
  referred them* and *who referred their referrer* (two hops up).

### Capturing the referrer code

Source priority (first non-empty wins):
1. `localStorage.referral_code` (set by `ReferralRedirect` when the user
   clicks `/ref/:code`).
2. `auth.user_metadata.referred_by` (passed via `options.data` so it survives
   the email-verification round-trip across browsers).
3. `profiles.referred_by` (persisted on first login — survives forever).

The third source is critical because mobile users frequently open the
verification link in a different browser than the one that set localStorage.

### Processing — `process_my_referral(p_code)` RPC

`SECURITY DEFINER` for two reasons:
1. The caller's RLS on `profiles` cannot SELECT the referrer's row to look up
   their id from a code; the RPC bypasses that.
2. The two INSERTs (direct edge, optional passive edge) need to be one
   transaction.

Guards inside the function (`reason` returned to UI on `ok=false`):

| Reason             | When                                                    |
|--------------------|---------------------------------------------------------|
| `not_authenticated`| `auth.uid()` is null                                    |
| `no_code`          | `p_code` is empty                                        |
| `caller_is_admin`  | Admin users are never inserted into anyone's tree       |
| `unknown_code`     | No `profiles.referral_code` matches                     |
| `self_referral`    | Caller used their own code                              |
| `referrer_is_admin`| Code resolves to an admin — silently skipped            |

Idempotent: if the caller already has a `direct` edge, the RPC no-ops.

### Reading — `get_my_referrals()` RPC

Returns:
- `directs` — list of users you directly brought in (with date, public_user_code).
- `passives` — list of users brought in by your direct referrals.
- `upstream` — your own referrer + their referrer (two hops up, if known).

After migration `new_33` this RPC was `DROP+CREATE` to add the upstream
columns. Older clients (pre-`new_33`) wouldn't have those columns.

### Realtime

`new_18_realtime_referrals.sql` enables the Postgres realtime publication on
the `referrals` table so the Admin Dashboard can update its Direct/Passive
counts live as new referrals come in.

### Admin filtering — `new_17`

Admins are excluded from referral trees at insertion time. This keeps the
"Direct Referrals" view clean for end users (admins shouldn't appear in any
user's downstream).

---

## 13. Feature: Events & Notifications

**Files:** [src/AdminDashboard/EventsNotifications.tsx](../src/AdminDashboard/EventsNotifications.tsx)
(admin CRUD), [src/components/Events.tsx](../src/components/Events.tsx)
(public landing carousel),
[src/components/Dashboard.tsx](../src/components/Dashboard.tsx) (user-side
Notifications view + Apply / Withdraw),
migration `new_34_events_apply.sql` + `new_40_event_applicants_gender.sql`.

### Two kinds of records (one table)

| `kind`         | Required fields | Behaviour                                                   |
|----------------|-----------------|-------------------------------------------------------------|
| `event`        | title, date     | Listed under "Active Events" until past date. Users can apply / withdraw. Admin sees applicant list + Excel export. |
| `notification` | title, info     | Announcement-only. No date required. No apply button.       |

The Admin form has a `kind` radio at the top; "date required" toggles based
on the radio.

### Applying — `apply_to_event(p_event_id)` RPC

Inserts a row in `event_applications` with a snapshot of the user's:
- `gender`
- `current_location` (NRI: `city, country`; domestic: `constituency, district, state`)

This snapshot is taken at apply-time so the admin's list doesn't change if
the user later edits their profile. Idempotent: re-calling for the same event
no-ops.

### Withdrawing — `withdraw_event_application(p_event_id)` RPC

Removes the caller's `event_applications` row.

### Admin viewing — `get_event_applicants(p_event_id)` RPC

Guarded by `is_admin()`. Returns applicant list with:
- `application_id`, `applied_at`
- `user_id`, `public_user_code`
- `full_name`, `email`, `mobile_number`
- `gender`
- `country_of_residence`, `city_abroad`, `indian_state`, `district`, `assembly_constituency`

The Admin applicant modal has a per-row "View more" toggle that expands to
show Gender, Current location, and Applied at. Excel export includes all of
those.

### No auto-deletion

Earlier versions purged applications after 7 days. The client requested
indefinite retention, so the purge function is now a no-op (`new_35`) and
`isApplicationsExpired()` always returns false.

### Active vs Previous tabs (user side)

The Dashboard separates events into Active (date in the future) and Previous
(date in the past) tabs.

---

## 14. Feature: Service Requests (Assistance)

**Files:** [src/components/Dashboard.tsx](../src/components/Dashboard.tsx)
(user submission + status view), [src/AdminDashboard/Assistance.tsx](../src/AdminDashboard/Assistance.tsx)
(admin triage), [src/AdminDashboard/ServiceCategories.tsx](../src/AdminDashboard/ServiceCategories.tsx)
(category master data), [src/pages/SupportTeamDashboard.tsx](../src/pages/SupportTeamDashboard.tsx)
(team member's queue), migration `new_21_service_categories.sql`.

### Status state machine

```
              ┌──────► resolved (admin direct close or team-reply)
              │
   pending ──►│
              │
              ├──► in_progress ──► resolved
              │       │
              │       └──► (rejected handled separately)
              │
              └──► rejected (admin)
```

### Submission

User picks a category, sub-option, and free-text description. `category` and
`sub-option` come from `service_categories`; `description` is sanitised.

### Triage

Admin sees four counters (Total / Pending / In progress / Resolved) and a
table. For each pending request, admin can:
- **Allocate to support team** — sets `assigned_team_id`, status →
  `in_progress`.
- **Resolve directly** — sets `action_taken`, `admin_comments`, status →
  `resolved`. Useful for trivial requests.
- **Reject** — sets `admin_comments`, status → `rejected`.

Once assigned to a team, the support-team user sees the request in
`SupportTeamDashboard`, can post a `team_reply`, and mark `team_resolved_at`
which flips status to `resolved`.

### User view — tabbed

The user dashboard has tabs: All / Pending / In progress / Resolved / Other.
"Other" buckets rejected + any unrecognised statuses for forward compatibility.

---

## 15. Feature: Suggestions

**Files:** [src/components/Dashboard.tsx](../src/components/Dashboard.tsx)
(user form + prior list), [src/AdminDashboard/Suggestions.tsx](../src/AdminDashboard/Suggestions.tsx)
(admin viewer), migration `new_25_suggestions_user_link.sql`,
`new_26_suggestions_backfill_v2.sql`.

User submits free-text feedback. Logged-in submissions store `profile_id` so
the admin viewer can show the user's mobile and email next to the suggestion
even if the user later edits their profile.

`buildWhatsappLink` in the admin view constructs a `wa.me/<digits>` link:
- If mobile already starts with `+`, trust the digits.
- If digits length ≥ 11, assume a country code is already there.
- Otherwise, look up the country dial code from `countriesData` (default
  `91` for legacy rows where country wasn't captured).

After submitting, the user sees a thank-you banner plus their previous
suggestions in a scrollable list.

---

## 16. Feature: Support Teams

**Files:** [src/AdminDashboard/SupportTeams.tsx](../src/AdminDashboard/SupportTeams.tsx)
(admin CRUD + overview), [src/pages/SupportTeamAuthPage.tsx](../src/pages/SupportTeamAuthPage.tsx)
(unified login/signup), [src/pages/SupportTeamDashboard.tsx](../src/pages/SupportTeamDashboard.tsx)
(member's queue), migrations `new_06_support_teams.sql`, `new_23`, `new_24`.

### Concept

A **support team** is a logical group (e.g. "Education Mentors", "Visa Help
Desk"). At most one user can claim a seat — the team and the member are
1:1. Admins create teams from the admin dashboard; volunteers register from
`/support-teams` and pick the team they want to join.

### Claim flow

1. User signs up via `SupportTeamAuthPage`, picking a team from a dropdown
   (read via the anon-read policy added in `new_24`).
2. Team id is stored in `localStorage.support_team_id` *and* `user_metadata`
   so it survives email verification.
3. On `applyVerifiedSession`, if `profile.role === 'support_team'` and a team
   id is present, `claim_support_team(p_team_id)` is called.
4. The RPC sets `support_teams.claimed_by_profile_id = auth.uid()` if the
   seat is free; otherwise returns `ok=false, reason='already_claimed'`.

### Admin overview

`admin_support_teams_overview()` RPC returns each team plus the claimer's
name/email/mobile plus running counts of `total_assigned` and
`total_resolved` (computed via JOIN on `service_requests`). Realtime
subscription on `support_teams` re-fetches the overview on changes.

### Release

A member can release their seat; an admin can force-release. Either way, the
seat returns to "free" and another volunteer can claim it.

---

## 17. Feature: Master Data — Leader directory

**Files:** [src/AdminDashboard/MasterData.tsx](../src/AdminDashboard/MasterData.tsx),
migrations `new_22_leader_photos.sql`, `new_28_org_hierarchy.sql`,
`new_29_leader_phones_e164.sql`, `new_35_robustness.sql`, `new_36_rc_unique.sql`,
`new_39_president_global_unique.sql`.

### Roles & scoping

| Role                  | District? | Constituency? | Uniqueness                          |
|-----------------------|-----------|---------------|-------------------------------------|
| President             | no        | no            | exactly one globally                |
| Global Coordinator    | no        | no            | exactly one globally                |
| Regional Coordinator  | yes       | no            | one per district                    |
| District President    | yes       | no            | one per district                    |
| Assembly Coordinator  | yes       | yes           | one per (district, constituency)    |

Uniqueness is enforced by **partial unique indexes** on `leader_assignments`,
keyed by `(role, district)` or `(role, district, constituency)` with
`WHERE is_active = true` so historical inactive rows don't block new ones.

### Phone normalisation

`normalizeIndianPhone(raw)` runs on save:
- empty → empty
- starts with `+` → trusted, kept as-is
- placeholder `0000000000` → kept (used for YS Jagan, who has no public number)
- 10 digits → `+91XXXXXXXXXX`
- 11–12 digits starting `91` → `+91XXXXXXXXXX`

The UI locks the `+91` prefix as a non-editable span and only accepts 10
digits in the input box (`MasterData.tsx` for both WhatsApp and Secondary
WhatsApp).

### Photos

`leader-photos` storage bucket. Admin uploads → URL saved to
`leaders.photo_url`. RLS policy allows anon read so public leader cards
display the image.

### Pre-save uniqueness check

Before INSERT, the admin form runs a targeted SELECT to confirm there's no
existing active leader for the same scope. This gives a friendly error before
the DB constraint would. Migration `new_35` also has a pre-flight dedupe
DO block that deactivates known-bad seed rows before the unique indexes go on.

---

## 18. Feature: Org Hierarchy view

**Files:** [src/AdminDashboard/OrgHierarchy.tsx](../src/AdminDashboard/OrgHierarchy.tsx),
view `org_hierarchy_v` defined in `new_28` + `new_37`.

Joins `leaders` + `leader_assignments` and surfaces a tree (President at root,
then Global Coordinator, then Regional Coordinators per region, then DPs and
ACs nested under their districts/constituencies).

Migration `new_37` switched the view to `SECURITY INVOKER` so the underlying
`leaders` RLS still applies when the view is queried (the default was
`SECURITY DEFINER` which would have bypassed RLS).

---

## 19. Feature: NRI Visits with Jagan Anna

**Files:** [src/AdminDashboard/Visited.tsx](../src/AdminDashboard/Visited.tsx).

Originally labelled "Visited"; renamed in the sidebar to "NRI Visits with
Jagan Anna" to match the client's wording.

Admin logs a visit (visitor name, email, place, date, time, purpose). Multiple
visits per person are grouped — clicking a name opens a modal with all their
visits. Two view modes: "All visitors" or "Today only".

The page is **admin-only** and not visible on the public site.

---

## 20. Feature: Featured Videos (YouTube)

**Files:** [src/AdminDashboard/FeaturedVideos.tsx](../src/AdminDashboard/FeaturedVideos.tsx),
[src/components/SocialMedia.tsx](../src/components/SocialMedia.tsx),
migration `new_31_featured_videos.sql`.

Admin pastes a YouTube URL → the client extracts the video id and calls
`https://noembed.com/embed?url=...` (no API key) to fetch title and
thumbnail. On save, the row goes into `youtube_videos` with `sort_order`,
`is_active`, `title`, `thumbnail_url`, `video_id`.

The public "JaganAnna on Air" section reads `is_active = true` rows ordered
by `sort_order`. Clicking a card opens the YouTube embed (frame-src CSP
allows `www.youtube.com`).

Thumbnails use `https://i.ytimg.com/vi/<id>/hqdefault.jpg` — `*.ytimg.com` is
allow-listed in `img-src` (CSP). The earlier `img.youtube.com` host did not
match the wildcard pattern; do not change it back.

`VITE_YOUTUBE_API_KEY` is **no longer needed** — oEmbed is sufficient. The
key was removed from `.env`.

---

## 21. Feature: Testimonials

**Files:** [src/AdminDashboard/TestimonialsAdmin.tsx](../src/AdminDashboard/TestimonialsAdmin.tsx),
[src/components/Testimonials.tsx](../src/components/Testimonials.tsx),
migration `new_32_testimonials.sql`.

Admin adds a name, location (free-text via `<input>` + `<datalist>` of
suggestions — client requested it not be a hard dropdown), photo, and quote.
Stored in `testimonials`. Public-read RLS, admin-write.

Earlier versions of the admin form used a `<select>`; that was replaced with
the free-text + datalist combo so admins can add locations not in the
suggestion list.

---

## 22. Feature: News

**Files:** [src/AdminDashboard/News.tsx](../src/AdminDashboard/News.tsx)
(admin CRUD), [src/components/News.tsx](../src/components/News.tsx)
(landing carousel), [src/components/NewsCarousel.tsx](../src/components/NewsCarousel.tsx),
[src/pages/NewsDetail.tsx](../src/pages/NewsDetail.tsx) (article page),
migration `new_02_content.sql`.

Each article has title, info (markdown-flavoured plain text), image_url, and
created_at. Images go to the `news-images` storage bucket. Articles are
public-read.

---

## 23. Feature: Content Control

**File:** [src/AdminDashboard/ContentControl.tsx](../src/AdminDashboard/ContentControl.tsx),
table `app_settings` (migration `new_04`).

Generic key-value store for feature flags and runtime configuration that
shouldn't require a redeploy. Admin-only writes; public reads where required.

---

## 24. Feature: User Dashboard

[src/components/Dashboard.tsx](../src/components/Dashboard.tsx).

Five views (driven by sidebar tabs):

1. **Profile** — all fields editable (first_name, last_name, mobile_number,
   gender, addresses both Indian and abroad, social handles, family member,
   profile photo). Completion bar driven by a single `profileChecklist` array
   (also feeds the "missing fields" hint). Previously some fields were locked;
   per client request all are editable now.
2. **Notifications** — formerly "Active Events". Active / Previous tabs.
   Apply / Withdraw buttons hit the RPCs in §13.
3. **My Service Requests** — All / Pending / In progress / Resolved / Other
   tabs. Per-request expansion shows admin comments, team reply, action taken.
4. **Suggestions** — list of past suggestions + new submission form. Sanitised
   on submit. Shows a thank-you banner immediately after submit.
5. **My Referrals** — direct + passive list with dates and upstream chain.
   Calls `get_my_referrals()`. Realtime subscription auto-updates when new
   referrals land.

Mobile validation uses `isValidIndianMobile` on save. Social handles use a
`looksUrlish` check before requiring valid http/https — so users can paste
either a full URL or just a handle.

### Profile photo upload

Uses `react-easy-crop` + a canvas helper in `lib/cropImage.ts` to produce a
square crop, then uploads to the `profile-photos` storage bucket and saves
the public URL on `profiles.profile_photo`.

---

## 25. Feature: Admin Dashboard

Single entry: [src/AdminDashboard/AdminDashboard.tsx](../src/AdminDashboard/AdminDashboard.tsx).

### Sidebar tabs

- **Dashboard / Overview** — analytics charts (recharts):
  - Users by continent (pie). Buckets: Asia / Africa / Europe / North America /
    South America / Australia / **Others** (renamed from "Unknown" so the
    bucket reads less alarming).
  - Service requests by status (bar).
  - Referrals trend.
- **All Users** — paginated table with single-input search (Gender column
  between Name and Email). Search builds a per-row "search blob" (all
  relevant fields joined to one lowercased string) so a single text input
  filters every column at once.
- **Direct Referrals**, **Passive Referrals** — tree views.
- **Assistance** — service request triage (§14).
- **Service Categories** — category master data.
- **Suggestions** — admin viewer (§15).
- **Events & Notifications** — CRUD + applicants modal + Excel (§13).
- **Master Data** — leader directory (§17).
- **Org Hierarchy** — visual tree (§18).
- **Featured Videos** — `youtube_videos` (§20).
- **Testimonials** — `testimonials` (§21).
- **News** — `news` CRUD (§22).
- **Support Teams** — overview + claim management (§16).
- **NRI Visits with Jagan Anna** — visit log (§19).
- **Content Control** — feature flags (§23).

### Excel export

Multi-sheet workbook (xlsx). Sheets: Users, Direct Referrals, Passive
Referrals, Service Requests, Suggestions, Events, Event Applications,
Leaders, Testimonials, Featured Videos. Gender column appears in Users,
Service Requests, Event Applications. An `exporting` state flag disables
the button to prevent double-clicks.

---

## 26. Feature: Password reset & email verification

**Files:** [src/components/AuthModal.tsx](../src/components/AuthModal.tsx)
(triggers reset), [src/components/ResetPassword.tsx](../src/components/ResetPassword.tsx)
(forgot-password subview), [src/pages/ResetPasswordConfirmPage.tsx](../src/pages/ResetPasswordConfirmPage.tsx)
(after clicking email link), [src/pages/VerifyEmailPage.tsx](../src/pages/VerifyEmailPage.tsx),
[src/pages/EmailVerifiedPage.tsx](../src/pages/EmailVerifiedPage.tsx).

### Email verification flow

1. After signup, user is redirected to `/verify-email` ("check your inbox").
2. Email link → Supabase Auth verifies → redirects to `/email-verified`.
3. `AppContent` has a guard at the top that renders only those two pages for
   their respective paths, regardless of auth state, so the global
   `applyVerifiedSession` redirect logic doesn't yank the user away before
   they see the "Verified!" message.

### Password recovery flow

1. User clicks "Forgot password" → `supabase.auth.resetPasswordForEmail`.
2. Email has a recovery token. Link points at the app.
3. Supabase fires `PASSWORD_RECOVERY` event with a temporary session.
4. `App.tsx` catches the event and navigates to `/reset-password-confirm`.
5. The page lets the user set a new password via
   `supabase.auth.updateUser({ password })`.
6. `ProtectedRoute` permits the temporary session on this path.

---

## 27. Feature: Idle auto-logout

**File:** [src/hooks/useIdleLogout.ts](../src/hooks/useIdleLogout.ts).

Listens for `mousemove` / `keydown` / `click` / `touchstart`. After
configurable inactivity, calls `supabase.auth.signOut()`. Used inside
authenticated routes (Dashboard, Admin) to limit session exposure on shared
devices.

---

## 28. Input sanitisation & validation

[src/lib/sanitize.ts](../src/lib/sanitize.ts):

- `sanitizeText(raw)` — strips only NULL bytes, other unprintable C0 controls
  (preserves TAB / LF / CR), zero-width chars, bidi/RTL controls, BOM. Keeps
  every printable Unicode character including punctuation. **The regex is
  built at runtime from `String.fromCharCode(...)` so this source file
  contains zero control characters** — editors and linters were silently
  rewriting them.
- `sanitizeTrim(raw)` — same plus `.trim()`.
- `isValidName(raw)` — ≥2 chars and contains at least one Unicode letter
  (`/\p{L}/u`). Rejects whitespace-only, punctuation-only, digits-only. This
  rule is also enforced at the DB layer via a `NOT VALID CHECK` constraint
  (migration `new_38`).
- `isValidIndianMobile(raw)` — 10 digits, *or* 12 digits starting with `91`.
- `isValidUrl(raw)` — empty allowed (optional fields), otherwise http/https.

SQL injection is structurally prevented by Supabase JS using PostgREST's
parameterised queries. `sanitize.ts` exists for **data hygiene** (rendering,
admin exports, homoglyph defence), not injection defence.

Applied on every form before submit:
- RegisterPage (every profile field)
- Dashboard profile edit
- Dashboard suggestion submission
- Dashboard service request submission
- AuthModal signup
- All Admin Dashboard forms

---

## 29. Phone number conventions

- **DB storage**: E.164 with leading `+` and country code (e.g. `+919876543210`).
- **Registration UI**: country-code dropdown + national-number input.
  `getMaxDigits(code)` returns the per-country length, falling back to the
  E.164 ceiling `(15 - country_code_digit_count, min 7)`.
- **India-only fields** (Family Mobile, Leader WhatsApp + Secondary on Admin
  MasterData): locked `+91` prefix UI, `maxLength={10}`, save-time validation
  that the digit count after stripping `91` is exactly 10.
- **Master data save-time check**:
  ```ts
  const digits = phone.replace(/\D/g, "").replace(/^91/, "");
  if (digits.length !== 10) reject();
  ```
- **Pre-signup uniqueness**: always via the `mobile_exists` RPC, never a raw
  SELECT (RLS prevents anonymous SELECT across other profile rows).
- **Country code dropdown** is deduplicated by code, sorted numerically — one
  entry per unique code (so `+1` doesn't show 10 times for the various
  countries that share it).

---

## 30. Content Security Policy

CSP is declared in **two places**:
- [index.html](../index.html) — production via `<meta http-equiv>`.
- [vite.config.ts](../vite.config.ts) — dev-server header (`cspDev`).

Whitelisted hosts:

| Directive   | Hosts                                                                   |
|-------------|--------------------------------------------------------------------------|
| `default-src` | `'self'`                                                               |
| `connect-src` | self, supabase project (https + wss), `www.googleapis.com`, `youtube.googleapis.com`, `www.youtube.com`, `noembed.com` |
| `script-src`  | self, `'unsafe-inline'`, `'unsafe-eval'`, `platform.twitter.com`, `connect.facebook.net`, `www.instagram.com` |
| `style-src`   | self, `'unsafe-inline'`, `fonts.googleapis.com`                         |
| `font-src`    | self, `data:`, `fonts.gstatic.com`                                      |
| `img-src`     | self, `data:`, `blob:`, supabase project, `*.ytimg.com`, `pbs.twimg.com`, `ton.twimg.com`, `www.instagram.com`, `scontent.cdninstagram.com` |
| `frame-src`   | `www.youtube.com`, `platform.twitter.com`, `syndication.twitter.com`, `www.facebook.com`, `www.instagram.com` |
| `media-src`   | self, `data:`, `blob:`                                                  |

If you add a new external image/script/iframe host, update **both** files.

---

## 31. Environment variables

Frontend reads from `import.meta.env.VITE_*` — these are baked into the
production bundle, so **only put public values here**.

| Variable                  | Required | Purpose                                      |
|---------------------------|----------|----------------------------------------------|
| `VITE_SUPABASE_URL`       | yes      | Supabase project URL                          |
| `VITE_SUPABASE_ANON_KEY`  | yes      | Anon key (safe to expose; RLS + auth enforce all access) |
| `VITE_APP_URL`            | yes      | Deployed origin, used for email redirect URLs |

**Server secrets** (Resend API key, service-role key, Supabase JWT secret)
must **never** appear in `.env` or any `VITE_*` variable. They belong in the
Supabase Dashboard → Auth/Functions settings.

`.env`, `.env.local`, and `.env.*.local` are in `.gitignore`.

---

## 32. Production hardening

- **Console stripping**: [vite.config.ts](../vite.config.ts) sets
  `esbuild.drop: ["console", "debugger"]`, so every `console.log` / `warn` /
  `error` and `debugger` statement is removed from the production bundle.
  Diagnostics are still readable in `npm run dev`.
- **CSP** locks origins (see §30).
- **RLS** on every table + `SECURITY DEFINER` RPCs with explicit authz checks.
- **Mobile + email + name uniqueness** enforced at the DB layer.
- **CHECK constraints** on first_name/last_name reject junk-only values.
- **Sanitisation** strips control + bidi chars on every free-text save.
- **Idle auto-logout** in authenticated routes.
- **Anon key** is the only credential ever shipped to the browser; it is
  rate-limited and bounded by RLS.

---

## 33. Local development

```bash
npm install            # install dependencies
npm run dev            # http://localhost:5173
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run build          # production build → dist/
npm run preview        # serve the built dist/ locally
```

Required `.env` for local dev:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_APP_URL=http://localhost:5173
```

---

## 34. Deployment

### Vercel
- Connect the GitHub repo.
- Build command: `npm run build`. Output: `dist/`.
- Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL` in Vercel
  Environment Variables (Production + Preview).
- SPA rewrite: every path to `index.html` (Vercel default for Vite usually
  works; add a `vercel.json` rewrite if deep links 404 on refresh).

### Supabase
- Apply migrations in numeric order. Either:
  - Push via Supabase CLI: `supabase db push`.
  - Or paste each `new_NN_*.sql` into Dashboard → SQL Editor in order.
- Auth → URL Configuration: add your Vercel URL to **Site URL** and **Redirect URLs**.
- Auth → SMTP: paste the Resend API key into the password field.
- Storage: ensure buckets `leader-photos`, `news-images`, `profile-photos`
  exist with appropriate RLS policies for anon-read where applicable.

---

## 35. Realtime subscriptions

Realtime is enabled on these tables/operations:

| Subscriber                                | Channel                              | Used in                                       |
|-------------------------------------------|--------------------------------------|-----------------------------------------------|
| `referrals` (INSERT)                      | postgres_changes                     | Admin Dashboard counters, Dashboard "My Referrals" |
| `support_teams` (UPDATE)                  | postgres_changes                     | `SupportTeams.tsx` admin overview              |
| `service_requests` (INSERT/UPDATE)        | postgres_changes                     | Admin `Assistance.tsx`, member queue           |
| `event_applications` (INSERT/DELETE)      | postgres_changes                     | Admin Applicants modal counts                  |

When adding a new realtime listener, always unsubscribe in the `useEffect`
cleanup so React StrictMode and route changes don't leak channels.

---

## 36. Excel export — multi-sheet format

`AdminDashboard.tsx` constructs one workbook with the following sheets in
order:

1. **Users** — every column from `profiles`, including Gender between Name
   and Email.
2. **Direct Referrals** — referrer name, referred name, date.
3. **Passive Referrals** — same shape as Direct.
4. **Service Requests** — request id, applicant name, gender, category,
   sub-option, status, assigned team, action_taken, comments, created_at.
5. **Suggestions** — name, country, mobile, email, suggestion text, date.
6. **Events** — title, kind, date, venue, status, applicant count.
7. **Event Applications** — event title, applicant name, gender, current
   location, applied_at, mobile, email.
8. **Leaders** — name, role, district, constituency, WhatsApp, Secondary
   WhatsApp.
9. **Testimonials** — name, location, quote.
10. **Featured Videos** — title, video_id, sort_order, is_active.

Implementation pattern:

```ts
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(usersRows), "Users");
// ... etc
XLSX.writeFile(wb, `ysrcp-nri-export-${date}.xlsx`);
```

An `exporting` state flag disables the button while the workbook is being
serialised — large user counts can take a few seconds.

---

## 37. Common pitfalls

1. **Editing `sanitize.ts` regex with literal control chars** — IDE linters
   will silently rewrite ` ` escape sequences back to literal NULL bytes.
   The current implementation builds the regex at runtime from char codes; if
   you edit it, **keep this pattern**.

2. **Adding a new RPC return column** — `CREATE OR REPLACE FUNCTION` errors
   with *"cannot change return type of existing function"*. Use
   `DROP FUNCTION IF EXISTS ...; CREATE FUNCTION ...;` in the migration. See
   `new_33_passive_upstream.sql` and `new_40_event_applicants_gender.sql`.

3. **Mixing components + hooks in one file** kills Fast Refresh. Split (see
   §6 for the `AuthContext` precedent).

4. **`is_admin` localStorage trust** — never short-circuit a privileged check
   based on this flag. It's UX optimisation. The DB's `is_admin()` SQL
   function is the real authority.

5. **Mobile-number duplicates** — `mobile_exists` is the only reliable
   pre-check because RLS prevents anonymous SELECTs across other users'
   profile rows. Always use the RPC, not a raw `SELECT`.

6. **Referral processing is async** — it runs after
   `applyVerifiedSession`. If you need to know *immediately* on signup
   whether referral succeeded, wait for `refreshProfile()` to resolve.

7. **CSP for new external assets** — img.youtube.com is **not** allowlisted;
   `*.ytimg.com` is. Use `https://i.ytimg.com/vi/<id>/hqdefault.jpg` for
   YouTube thumbnails.

8. **Realtime channels leak across route changes** unless you unsubscribe in
   the `useEffect` cleanup. Always return a teardown that calls
   `supabase.removeChannel(channel)` or `subscription.unsubscribe()`.

9. **Pre-flight dedupe before adding unique indexes** — `new_35` shows the
   pattern: run a `DO $$ ... $$` block to deactivate known dup rows before
   the `CREATE UNIQUE INDEX` runs, or the migration will fail on production
   data.

10. **The "Others" bucket on the continent pie** was renamed from "Unknown".
    Don't change it back — the client wants a softer label.

---

## 38. Where to look first

| Need to ...                              | Open                                  |
|------------------------------------------|---------------------------------------|
| Add a new route                          | `src/App.tsx`                         |
| Change signup flow                       | `src/contexts/AuthContext.tsx` + `src/pages/RegisterPage.tsx` |
| Add a new admin tab                      | `src/AdminDashboard/AdminDashboard.tsx` + new file under `src/AdminDashboard/` |
| Add a new user-dashboard section         | `src/components/Dashboard.tsx`        |
| Add a new DB table or RPC                | new migration `supabase/migrations/new_NN_*.sql` |
| Change CSP                               | `index.html` AND `vite.config.ts`     |
| Add input validation                     | `src/lib/sanitize.ts`                 |
| Add a country to the phone dropdown      | `src/lib/countryCodes.ts`             |
| Change profile typings                   | `src/lib/supabase.ts` (`type Profile`) |
| Tweak referral upstream display          | `get_my_referrals()` RPC + `Dashboard.tsx` (My Referrals view) |
| Adjust event apply payload               | `apply_to_event()` RPC + `Dashboard.tsx` (Notifications view) |
| Add a column to applicants modal         | `get_event_applicants()` RPC + `EventsNotifications.tsx` (Admin) |
| Add a column to Excel export             | `AdminDashboard.tsx` (build sheets) + the corresponding RPC if needed |
| Change leader role rules                 | `MasterData.tsx` + migration with new partial unique index |
| Update CSP for new external host         | `index.html` + `vite.config.ts`       |

---

Last reviewed: 2026-05-15.
