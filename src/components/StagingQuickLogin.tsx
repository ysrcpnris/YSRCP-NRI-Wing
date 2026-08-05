/**
 * Staging-only quick sign-in for the documented fixture accounts.
 *
 * WHY THIS EXISTS
 *   The real sign-in flow (AuthContext.signIn) deliberately signs the
 *   password-only session back out and emails a fresh OTP every single
 *   time — that's the point, it's the credential-stuffing mitigation.
 *   But @example.test addresses have no real inbox, so on staging that
 *   flow is a dead end every time: the tester ends up hand-crafting a
 *   REST sign-in call and injecting the session into localStorage
 *   themselves. This does the same thing from a button instead.
 *
 * WHY THIS CANNOT REACH PRODUCTION
 *   Gated on VITE_STAGING_MODE, which is set ONLY in Vercel's staging
 *   project (docs/deploy-to-production.md) — never in the production
 *   env. The fixture password below is already public in that same
 *   doc; these are throwaway @example.test accounts, not member data.
 *   Belt-and-braces: also refuses to render if the page's own origin
 *   is the production hostname, so a misconfigured env var alone can't
 *   put this in front of a real member.
 *
 * This deliberately bypasses signInWithPassword's normal OTP hand-off
 * — it signs in directly and stamps otp_verified_at itself, which is
 * exactly what a completed OTP flow would have left behind. It is not
 * a new hole: ProtectedRoute's OTP check was already documented as a
 * client-side freshness flag, not a security boundary on its own.
 */

import { useState } from "react";
import { supabase } from "../lib/supabase";

const STAGING_PASSWORD = "StagingTest!2026";

const FIXTURES = [
  { email: "t.us.a@example.test", label: "Member (US)" },
  { email: "t.de.a@example.test", label: "Coordinator (DE) + chapter lead (US)" },
  { email: "t.de.b@example.test", label: "Member (DE)" },
  { email: "t.cl.a@example.test", label: "Chapter lead" },
  { email: "t.tl.a@example.test", label: "Team lead" },
  { email: "t.ae.a@example.test", label: "Admin" },
  { email: "t.sec.a@example.test", label: "Secretariat" },
  { email: "t.nc.a@example.test", label: "Member, chapterless country (NO)" },
];

const PRODUCTION_HOSTS = ["www.ysrcpnriwing.org", "ysrcpnriwing.org"];

export default function StagingQuickLogin() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (import.meta.env.VITE_STAGING_MODE !== "true") return null;
  if (typeof window !== "undefined" && PRODUCTION_HOSTS.includes(window.location.hostname)) return null;

  const signInAs = async (email: string) => {
    setBusy(email);
    setError(null);
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email,
      password: STAGING_PASSWORD,
    });
    if (err || !data?.session) {
      setError(err?.message ?? "Sign-in failed.");
      setBusy(null);
      return;
    }
    try {
      localStorage.setItem("otp_verified_at", String(Date.now()));
    } catch { /* ignore */ }
    // Hard navigation, not react-router: forces AuthContext to pick up
    // the fresh session from scratch, same as a real OTP-completed
    // login would after a full page load from VerifyOtpPage.
    window.location.href = "/dashboard";
  };

  return (
    <div className="mb-5 border border-dashed border-amber-300 bg-amber-50 rounded-lg p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700 mb-2">
        Staging quick sign-in — fixtures only
      </p>
      {error && <p className="text-xs text-red-700 mb-2">{error}</p>}
      <div className="grid grid-cols-1 gap-1.5">
        {FIXTURES.map((f) => (
          <button
            key={f.email}
            type="button"
            disabled={busy !== null}
            onClick={() => void signInAs(f.email)}
            className="flex items-center justify-between text-left text-xs px-2.5 py-1.5 rounded-md bg-white border border-amber-200 hover:border-amber-400 disabled:opacity-50 transition-colors"
          >
            <span className="font-mono">{f.email}</span>
            <span className="text-amber-700">{busy === f.email ? "Signing in…" : f.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
