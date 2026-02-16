import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

type StatusType =
  | "idle"
  | "sending"
  | "sent"
  | "error"
  | "cooldown"
  | "checking"
  | "success";

export default function VerifyEmailPage() {
  const { loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [status, setStatus] = useState<StatusType>("idle");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [cooldown, setCooldown] = useState<number>(0);
  const [email, setEmail] = useState<string>("");

  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef<boolean>(true);
  const pollAbortRef = useRef<boolean>(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pollAbortRef.current = true;
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const emailFromState = (location.state as any)?.email;
    if (emailFromState) {
      setEmail(emailFromState);
    }
  }, [location.state]);

  useEffect(() => {
    if (cooldown <= 0) {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
      if (status === "cooldown") {
        setStatus("idle");
      }
      return;
    }

    if (!cooldownTimerRef.current) {
      cooldownTimerRef.current = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            if (cooldownTimerRef.current) {
              clearInterval(cooldownTimerRef.current);
              cooldownTimerRef.current = null;
            }
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
  }, [cooldown, status]);

  const canResend = useMemo(() => {
    if (!email) return false;
    if (status === "sending") return false;
    if (status === "cooldown") return false;
    if (cooldown > 0) return false;
    return true;
  }, [email, status, cooldown]);

  const startCooldown = (seconds: number) => {
    setCooldown(seconds);
    setStatus("cooldown");
  };

  const resetMessages = () => {
    setMessage("");
    setError("");
  };

  const resendVerificationEmail = async () => {
    if (!canResend) return;
    if (!email) return;

    resetMessages();
    setStatus("sending");

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/email-verified`,
      },
    });

    if (!mountedRef.current) return;

    if (error) {
      setError("Failed to resend verification email. Please try again later.");
      setStatus("error");
      startCooldown(30);
      return;
    }

    setMessage("Verification email has been sent. Please check your inbox.");
    setStatus("sent");
    startCooldown(60);
  };

  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  /**
   * Manual check (user-click)
   */
  const manualCheckVerification = async () => {
    resetMessages();
    setStatus("checking");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!mountedRef.current) return;

    if (!session?.user) {
      setError("Session not found. Please try logging in or clicking the verify link again.");
      setStatus("error");
      return;
    }

    // If server hasn't marked email confirmed yet, tell the user to wait
    if (!session.user.email_confirmed_at) {
      setError("Email not verified yet. Please check your inbox and click the link.");
      setStatus("error");
      return;
    }

    // Check profiles table
    const { data: profileRow, error: profileErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profileErr) {
      setError("Error checking profile. Please try again.");
      setStatus("error");
      return;
    }

    if (!profileRow) {
      setError("Verification still being processed. Please wait a few seconds and try 'I have verified my email' again.");
      setStatus("error");
      return;
    }

    // success -> navigate to protected area
    setMessage("Verification complete. Redirecting...");
    setStatus("success");
    // Replace with whichever page your app expects (dashboard/home)
    navigate("/dashboard");
  };

  /**
   * Core: If this page is loaded as the email redirect target (or token present),
   * exchange token -> session, then poll until profile exists (or timeout).
   */
  useEffect(() => {
    // run only when on /email-verified path
    if (window.location.pathname !== "/email-verified") return;

    let cancelled = false;
    pollAbortRef.current = false;

    const runExchangeAndPoll = async () => {
      resetMessages();
      setStatus("checking");
      setMessage("Finishing verification. This may take a few seconds...");

      // Try to exchange tokens from URL (safe even if nothing present)
      try {
        const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
        if (error) {
          // Not fatal: sometimes there is no token in URL; we continue to poll current session.
          console.warn("getSessionFromUrl:", error);
        } else if (data?.session) {
          // if session exists after exchange, optionally set email field for UX
          try {
            setEmail((prev) => prev || (data.session?.user?.email ?? ""));
          } catch {}
        }
      } catch (err) {
        console.warn("getSessionFromUrl unexpected error:", err);
      }

      // Poll for session + profile
      const start = Date.now();
      const TIMEOUT_MS = 30_000; // 30s max wait
      const INTERVAL_MS = 1000;

      while (!cancelled && !pollAbortRef.current && Date.now() - start < TIMEOUT_MS) {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session?.user) {
            // no session yet — maybe waiting for exchange or user signed out
            await sleep(INTERVAL_MS);
            continue;
          }

          // wait until Supabase marks email as confirmed
          if (!session.user.email_confirmed_at) {
            await sleep(INTERVAL_MS);
            continue;
          }

          // check for profile row
          const { data: profileRow, error: profileErr } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", session.user.id)
            .maybeSingle();

          if (profileErr) {
            console.warn("profile check error:", profileErr);
            await sleep(INTERVAL_MS);
            continue;
          }

          if (profileRow && profileRow.id) {
            // success
            if (!mountedRef.current) return;
            setMessage("Verification complete. Redirecting...");
            setStatus("success");
            // navigate to app area (change route if you prefer)
            navigate("/dashboard");
            return;
          }

          // not yet created; wait and retry
          await sleep(INTERVAL_MS);
        } catch (err) {
          console.warn("polling error:", err);
          await sleep(INTERVAL_MS);
        }
      }

      // timed out
      if (!cancelled && mountedRef.current) {
        setError(
          "Verification timed out. The email is confirmed but profile creation is taking longer than expected. You can try 'I have verified my email' or re-open the link from your inbox."
        );
        setStatus("error");
        setMessage("");
      }
    };

    runExchangeAndPoll();

    return () => {
      cancelled = true;
      pollAbortRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    // keep silent loader while global auth loading
    return null;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f7f7f7",
        padding: "32px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          backgroundColor: "#ffffff",
          borderRadius: "10px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          padding: "32px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginBottom: "24px", textAlign: "center" }}>
          <h1 style={{ margin: 0, marginBottom: "12px", fontSize: "24px", fontWeight: 600, color: "#111" }}>
            Verify your email
          </h1>

          <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.6", color: "#555" }}>
            To continue using WINGS, you must verify your email address.
            <br />
            We have sent a verification link to:
          </p>

          <p style={{ marginTop: "8px", fontSize: "15px", fontWeight: 500, color: "#000", wordBreak: "break-all" }}>
            {email || "—"}
          </p>
        </div>

        {status === "checking" && (
          <div style={{ marginBottom: 16, textAlign: "center" }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "inline-block", width: 36, height: 36, borderRadius: 18, border: "4px solid #111", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
            </div>
            <div style={{ color: "#333" }}>{message || "Finishing verification..."}</div>
            <style>{`@keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }`}</style>
          </div>
        )}

        {message && status !== "checking" && (
          <div style={{ marginBottom: "16px", padding: "12px", borderRadius: "6px", backgroundColor: "#e6f7e6", color: "#1a7f1a", fontSize: "14px", textAlign: "center" }}>
            {message}
          </div>
        )}

        {error && (
          <div style={{ marginBottom: "16px", padding: "12px", borderRadius: "6px", backgroundColor: "#fdeaea", color: "#a40000", fontSize: "14px", textAlign: "center" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button
            onClick={resendVerificationEmail}
            disabled={!canResend}
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "14px",
              fontWeight: 500,
              borderRadius: "6px",
              border: "1px solid #ccc",
              backgroundColor: canResend ? "#111" : "#ddd",
              color: canResend ? "#fff" : "#888",
              cursor: canResend ? "pointer" : "not-allowed",
              transition: "all 0.2s ease",
            }}
          >
            {status === "sending"
              ? "Sending verification email..."
              : status === "cooldown" && cooldown > 0
              ? `Resend available in ${cooldown}s`
              : "Resend verification email"}
          </button>

          <button
            onClick={manualCheckVerification}
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "14px",
              fontWeight: 500,
              borderRadius: "6px",
              border: "1px solid #111",
              backgroundColor: "#fff",
              color: "#111",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            I have verified my email
          </button>
        </div>

        <div style={{ marginTop: "24px", fontSize: "12px", color: "#777", textAlign: "center", lineHeight: "1.6" }}>
          If you don’t see the email, please check your spam folder.
          <br />
          Make sure you used the correct email address.
          <br />
          You will not be able to log in until verification is complete.
        </div>
      </div>
    </div>
  );
}
