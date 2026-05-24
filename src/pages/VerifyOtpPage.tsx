import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mail, ShieldCheck, Loader2, Clock } from "lucide-react";
import { supabase } from "../lib/supabase";

// =====================================================================
// Step-2 of the login flow: enter the 6-digit OTP that was emailed
// after the password was verified.
//
//   • Email comes from router state, or from the current session as
//     a fallback. If neither is present we bounce back to home.
//   • Live countdown matches the project's configured OTP expiry
//     (5 minutes — `Email OTP Expiration = 300` in the Supabase
//     dashboard). The timer reads `localStorage.otp_sent_at` so it
//     stays accurate across page reloads.
//   • Error messages are decided locally:
//       - if our timer says the code expired → "This code has expired"
//       - if Supabase says invalid AND our timer is still positive →
//         "Invalid code. Please check the email and try again."
//     This avoids the bug where Supabase returned "expired" generically
//     even when the user's code was just wrong.
//   • "Resend code" calls signInWithOtp again with a 30-second
//     cooldown, resets the timer + otp_sent_at.
// =====================================================================

// Must match the value set in Supabase Dashboard →
// Authentication → Providers → Email → Email OTP Expiration.
const OTP_EXPIRY_MS = 5 * 60 * 1000;

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState<string>(
    (location.state as { email?: string } | null)?.email || ""
  );
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  // Time left on the OTP in milliseconds. Recomputed every second.
  const [timeLeftMs, setTimeLeftMs] = useState<number>(() => {
    try {
      const sentAt = parseInt(localStorage.getItem("otp_sent_at") || "0", 10);
      if (!sentAt) return OTP_EXPIRY_MS;
      const remaining = OTP_EXPIRY_MS - (Date.now() - sentAt);
      return Math.max(0, remaining);
    } catch {
      return OTP_EXPIRY_MS;
    }
  });
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Fall back to the session email if the user reloaded the page and
  // we lost the router state. If neither is available we bounce to
  // the login modal.
  useEffect(() => {
    if (email) return;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.email) {
        setEmail(data.user.email);
      } else {
        navigate("/", { replace: true, state: { openLogin: true } });
      }
    })();
  }, [email, navigate]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 1-second tick for the OTP countdown. Reads otp_sent_at every tick
  // so a tab reload doesn't reset the timer to the full 5 minutes.
  useEffect(() => {
    const tick = () => {
      try {
        const sentAt = parseInt(
          localStorage.getItem("otp_sent_at") || "0",
          10
        );
        if (!sentAt) {
          setTimeLeftMs(0);
          return;
        }
        const remaining = OTP_EXPIRY_MS - (Date.now() - sentAt);
        setTimeLeftMs(Math.max(0, remaining));
      } catch {
        setTimeLeftMs(0);
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Resend-button cooldown ticker.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setTimeout(() => setResendCooldown((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendCooldown]);

  const formatTimer = (ms: number): string => {
    const totalSec = Math.ceil(ms / 1000);
    const mm = Math.floor(totalSec / 60);
    const ss = totalSec % 60;
    return `${mm}:${String(ss).padStart(2, "0")}`;
  };

  const expired = timeLeftMs <= 0;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^\d{4,10}$/.test(code)) {
      setError("Enter the code from your email (numbers only).");
      return;
    }

    // Save the API round-trip if the local timer already expired —
    // we can be confident the server-side token is gone too.
    if (expired) {
      setError("This code has expired. Tap Resend to get a new one.");
      return;
    }

    setVerifying(true);
    const { error: vErr } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    setVerifying(false);

    if (vErr) {
      // Supabase's wording is generic ("Token has expired or is
      // invalid"). Decide locally using the live countdown:
      //   - timer is still positive → the code can't be expired, so
      //     the user just typed it wrong
      //   - timer hit zero → genuinely expired (rare here, the
      //     pre-check above usually catches this)
      if (expired) {
        setError("This code has expired. Tap Resend to get a new one.");
      } else {
        setError("Invalid code. Please check the email and try again.");
      }
      setCode("");
      return;
    }

    // Persist the verification timestamp; ProtectedRoute reads this
    // to decide whether the user can reach /dashboard.
    try {
      localStorage.setItem("otp_verified_at", String(Date.now()));
      localStorage.removeItem("otp_sent_at");
    } catch { /* ignore */ }

    // Decide where to land. Priority:
    //   1. Explicit `post_login_redirect` saved earlier (AdminRoute
    //      stores this when an admin hit /admin while signed out).
    //   2. /admin/dashboard if the profile role says admin.
    //   3. /dashboard for everyone else.
    let target = "/dashboard";
    try {
      const stored = sessionStorage.getItem("post_login_redirect");
      if (stored) {
        target = stored;
        sessionStorage.removeItem("post_login_redirect");
      } else {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.id) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", userData.user.id)
            .maybeSingle();
          if (prof?.role === "admin") {
            target = "/admin/dashboard";
          }
        }
      }
    } catch { /* ignore */ }
    navigate(target, { replace: true });
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    const { error: rErr } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setResending(false);
    if (rErr) {
      setError("Could not resend the code. Please try again in a minute.");
      return;
    }
    // Re-anchor the countdown for the new code.
    try {
      localStorage.setItem("otp_sent_at", String(Date.now()));
    } catch { /* ignore */ }
    setTimeLeftMs(OTP_EXPIRY_MS);
    setResendCooldown(30);
    setCode("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/40 to-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-card border border-gray-100 p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary-50 text-primary-600 mb-3">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Two-step verification</h1>
          <p className="text-sm text-gray-500 mt-1">
            We sent a 6-digit code to
          </p>
          <p className="text-sm font-semibold text-primary-700 inline-flex items-center gap-1 mt-1 break-all">
            <Mail size={14} /> {email || "your email"}
          </p>
        </div>

        {/* Live expiry countdown — turns red in the last 60 seconds
            and shows "expired" once the timer hits zero. */}
        <div
          className={`mb-4 px-3 py-2 rounded-lg border text-center text-sm font-semibold flex items-center justify-center gap-2 ${
            expired
              ? "bg-red-50 border-red-200 text-red-700"
              : timeLeftMs < 60_000
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          <Clock size={14} />
          {expired
            ? "Code expired — tap Resend below"
            : `Code expires in ${formatTimer(timeLeftMs)}`}
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="input-label">Enter the code from your email</label>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={10}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              placeholder="••••••"
              disabled={expired}
              className={`input-field text-center text-2xl font-bold ${
                code.length > 6 ? "tracking-[0.3em]" : "tracking-[0.5em]"
              }`}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={verifying || code.length < 4 || expired}
            className="w-full btn-gradient py-3 text-base rounded-xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {verifying ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Verifying…
              </>
            ) : expired ? (
              "Code expired"
            ) : (
              "Verify and continue"
            )}
          </button>
        </form>

        <div className="text-center mt-5">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || resending}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {resending
              ? "Sending…"
              : resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : "Didn't get it? Resend code"}
          </button>
        </div>

        <p className="text-[11px] text-gray-400 text-center mt-6">
          The code expires in 5 minutes. If you didn't try to log in, please
          ignore the email and consider changing your password.
        </p>
      </div>
    </div>
  );
}
