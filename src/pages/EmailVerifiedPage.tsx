import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

type PageState =
  | "initializing"
  | "verifying"
  | "verified"
  | "error"
  | "redirecting";

export default function EmailVerifiedPage() {
  const { loading, signOut, user, profile, isVerified } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Resolve where the just-verified user should land.
  //   support_team → /support-team/dashboard (their dedicated portal)
  //   admin        → /admin/dashboard
  //   else         → /dashboard
  // Source of truth order: profile.role (loaded by AuthContext) → falls
  // back to user.user_metadata.role (set on signup, available before
  // the profile query completes).
  const resolvePostVerifyTarget = (): string => {
    const profileRole = profile?.role;
    const metaRole =
      (user?.user_metadata as Record<string, unknown> | undefined)?.role;
    const role = profileRole || metaRole;
    if (role === "support_team") return "/support-team/dashboard";
    if (role === "admin") return "/admin/dashboard";
    return "/dashboard";
  };

  // Where the "Go to Login" fallback button should send them — same role
  // logic but to the auth page, not the dashboard.
  const resolveLoginTarget = (): { path: string; state?: { openLogin: boolean } } => {
    const profileRole = profile?.role;
    const metaRole =
      (user?.user_metadata as Record<string, unknown> | undefined)?.role;
    const role = profileRole || metaRole;
    if (role === "support_team") return { path: "/support-teams" };
    return { path: "/", state: { openLogin: true } };
  };

  const [state, setState] = useState<PageState>("initializing");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const mountedRef = useRef<boolean>(true);
  const processedRef = useRef<boolean>(false);
  const redirectTimerRef = useRef<number | null>(null);
  const pollAbortRef = useRef<boolean>(false);

  // Lock this page so route-guards that check pathname won't immediately sign the user out
  useEffect(() => {
    if (location.pathname === "/email-verified") {
      try {
        sessionStorage.setItem("email_verified_page", "true");
      } catch {}
    }
    return () => {
      try {
        sessionStorage.removeItem("email_verified_page");
      } catch {}
    };
  }, [location.pathname]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pollAbortRef.current = true;
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  useEffect(() => {
    // Only run on the /email-verified path
    if (window.location.pathname !== "/email-verified") return;

    if (processedRef.current) return;
    processedRef.current = true;

    let cancelled = false;
    pollAbortRef.current = false;

    const run = async () => {
      // === NEW SIMPLE FLOW ===
      // Supabase may or may not auto-sign-in the user after email confirmation depending on your settings.
      // It's safest UX to treat this page as a confirmation landing: show success and send user to login.
      // That avoids waiting forever for a session that won't be created.
      try {
        setState("verifying");
        setMessage("Finalizing verification...");

        // Small UX pause so the user sees the verifying state briefly
        await sleep(800);

        // Optional: try a single quick getSession to show email in the message if available
        try {
          const { data } = await supabase.auth.getSession();
          const session = data?.session ?? null;
          if (session?.user?.email) {
            setMessage(`Finishing verification for ${session.user.email}...`);
            // small extra pause so the message is visible
            await sleep(700);
          }
        } catch (err) {
          // ignore transient getSession errors — we will proceed to show verified message either way
          // console.warn("single getSession attempt failed:", err);
        }

        // Show final verified message and redirect to login/home to open login modal
        if (!mountedRef.current) return;
        setState("verified");
        setMessage("Your email has been verified successfully. Please log in.");

        // Short delay so user reads the message, then redirect them to the
        // right login page based on the role they signed up with.
        redirectTimerRef.current = window.setTimeout(() => {
          if (!mountedRef.current) return;
          setState("redirecting");
          const t = resolveLoginTarget();
          navigate(t.path, { replace: true, state: t.state });
        }, 1600);

        return;
      } catch (err) {
        // Any unexpected error — show friendly message and offer fallback
        console.warn("email verification landing error:", err);
        if (!mountedRef.current) return;
        setError("Something went wrong while finalizing verification. Please go to Login and try signing in.");
        setState("error");
      }
      // === END SIMPLE FLOW ===
    };

    run();

    return () => {
      cancelled = true;
      pollAbortRef.current = true;
      // cleanup timer
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // While the auth context is still initializing (mobile networks can take a
  // few seconds), show a verifying state instead of a blank screen.
  // The previous `return null` here was the cause of the "blank page after
  // verification" bug clients reported on mobile.

  // If the magic link signed the user in successfully, fast-path them straight
  // to the right dashboard once auth has finished initializing — no need to
  // send them through the login modal again.
  useEffect(() => {
    if (loading) return;
    if (user && isVerified) {
      const t = window.setTimeout(() => {
        if (mountedRef.current) {
          navigate(resolvePostVerifyTarget(), { replace: true });
        }
      }, 600);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, isVerified, profile, navigate]);

  // Provide a manual way to sign-out & open the login modal (keeps your original UX)
  const goToLogin = async () => {
    try {
      await signOut();
    } catch (_) {
      // ignore
    } finally {
      const t = resolveLoginTarget();
      navigate(t.path, { replace: true, state: t.state });
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f4f6f8",
        padding: "32px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          padding: "36px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
          boxSizing: "border-box",
          textAlign: "center",
        }}
      >
        {state === "initializing" && (
          <div>
            <h2 style={{ marginBottom: "12px" }}>Initializing</h2>
            <p style={{ fontSize: "14px", color: "#555" }}>Preparing verification status…</p>
          </div>
        )}

        {state === "verifying" && (
          <div>
            <h2 style={{ marginBottom: "12px" }}>Verifying Email</h2>
            <p style={{ fontSize: "14px", color: "#555" }}>Please wait while we confirm your email verification.</p>
            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  display: "inline-block",
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  border: "4px solid #111",
                  borderTopColor: "transparent",
                  animation: "spin 1s linear infinite",
                }}
              />
              <style>{`@keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }`}</style>
              <div style={{ marginTop: 12, color: "#333" }}>{message || "Finalizing verification..."}</div>
            </div>
          </div>
        )}

        {state === "verified" && (
          <div>
            <h2 style={{ marginBottom: "12px", color: "#1a7f37" }}>Email Verified</h2>
            <p style={{ fontSize: "14px", color: "#444", marginBottom: "16px" }}>{message || "Verification successful."}</p>
            <p style={{ fontSize: "13px", color: "#666" }}>You can now log in. Opening login…</p>
            <div style={{ marginTop: 18 }}>
              <button
                onClick={() => {
                  if (redirectTimerRef.current) {
                    window.clearTimeout(redirectTimerRef.current);
                  }
                  const t = resolveLoginTarget();
                  navigate(t.path, { replace: true, state: t.state });
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: "6px",
                  border: "1px solid #ddd",
                  backgroundColor: "#fff",
                  color: "#111",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Go to Login
              </button>
            </div>
          </div>
        )}

        {state === "redirecting" && (
          <div>
            <h2 style={{ marginBottom: "12px", color: "#1a7f37" }}>Verification Complete</h2>
            <p style={{ fontSize: "14px", color: "#444", marginBottom: "20px" }}>Your email is verified. Redirecting you now.</p>
          </div>
        )}

        {state === "error" && (
          <div>
            <h2 style={{ marginBottom: "12px", color: "#a40000" }}>Verification Error</h2>
            <p style={{ fontSize: "14px", color: "#a40000", marginBottom: "16px" }}>{error}</p>
            <button
              onClick={goToLogin}
              style={{
                padding: "12px 20px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "#111",
                color: "#fff",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
