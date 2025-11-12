<!-- .github/copilot-instructions.md -->
## Purpose
Short, practical guidance for an AI coding agent to be productive in this React + Vite + TypeScript frontend.

## Quick start (what I will run)
- Install & dev: `npm install` then `npm run dev` (alias `start`) — uses Vite.
- Build: `npm run build` then `npm run preview` to locally inspect production build.
- Lint: `npm run lint` (ESLint configured at repo root).
- Typecheck: `npm run typecheck` (runs `tsc -p tsconfig.app.json`).

Note: this project expects Vite env vars (PowerShell):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
If missing, the app throws (see `src/lib/supabase.ts`).

## High-level architecture (why things are structured this way)
- Single-page React app built with Vite + TypeScript. UI styling is Tailwind CSS.
- Auth & DB: Supabase (client in `src/lib/supabase.ts`). Auth flow & profile-loading are centralized in `src/contexts/AuthContext.tsx`.
- Routing: `react-router-dom` (v7) with a small client-side guard `src/routes/AdminRoute.tsx` that checks `localStorage.is_admin`.
- Admin UI: `src/AdminDashboard/*` and protected dashboard components under `src/components/dashboard/`.
- Public assets (images/banners) live in `public/` and are referenced via absolute paths (e.g. `/Banner.jpg`, see `src/components/Hero.tsx`).

## Patterns & conventions to follow
- Use typed domain shapes defined in `src/lib/supabase.ts` (e.g. `Profile`, `Event`, `JobPosting`). Prefer these types when changing code that touches DB rows.
- Use the exported `supabase` client from `src/lib/supabase.ts` (many files import from `../lib/supabase`). There is also a `src/lib/supabaseClient.ts`; prefer the file actually imported by the code you edit (AuthContext imports from `../lib/supabase`).
- Auth is handled in `AuthProvider`: session is obtained via `supabase.auth.getSession()`, and changes are tracked with `supabase.auth.onAuthStateChange`. Signup inserts a row into the `profiles` table (see `signUp` in `AuthContext`).
- Admin gating is client-side: `localStorage.getItem('is_admin') === 'true'`. Don't assume server-side enforcement unless you edit server/migrations.
- Images in components often use `loading="lazy"` and Tailwind utility classes for responsive behavior. Follow existing responsive patterns (e.g. `Hero.tsx` uses layered absolute positioning and overlay styles).

## Integration points and external dependencies
- Supabase: env vars above + DB migrations in `supabase/migrations/` (SQL files are the source of truth for schema changes).
- Third-party libs in use: `@supabase/supabase-js`, `react-router-dom`, `react-toastify`, `recharts`, `lucide-react`.

## Where to make common changes
- Modify auth-related logic: `src/contexts/AuthContext.tsx` (session handling, profile fetch, signUp/signIn/signOut).
- DB types & client: `src/lib/supabase.ts` (update types when DB schema changes).
- Admin UI: `src/AdminDashboard/*` and route guard `src/routes/AdminRoute.tsx`.
- Pages: `src/pages/*`; shared UI: `src/components/*`.

## Concrete examples to reference
- To extend profile fields, add columns in `supabase/migrations/*` and update `Profile` in `src/lib/supabase.ts`.
- Signup flow: `AuthContext.signUp` inserts into `profiles` with `id = data.user.id` — mirror this behavior when creating programmatic user imports.
- Client-side admin check: to let an admin enter the dashboard set `localStorage.setItem('is_admin','true')` (used by `src/routes/AdminRoute.tsx`).

## Quality gates + checks
- Run `npm run typecheck` and `npm run lint` before opening PRs. The repo does not include unit tests currently.

## Small gotchas discovered
- Duplicate supabase helpers: both `src/lib/supabase.ts` and `src/lib/supabaseClient.ts` exist — check which one your target files import and keep edits consistent.
- Missing env vars cause runtime throw in dev; make a `.env` with VITE_* keys for local work.
- AdminRoute is only a client-side guard — database or server-side checks must be added on the backend if security is required.

If anything above is unclear or you'd like me to expand a section (examples for a code change, PR checklist, or adding a short test harness), say which area and I'll iterate.
