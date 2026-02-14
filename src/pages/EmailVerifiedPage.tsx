import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

type PageState =
  | "initializing"
  | "verifying"
  | "verified"
  | "error"
  | "redirecting";

export default function EmailVerifiedPage() {
  const { loading, signOut } = useAuth();

  const [state, setState] = useState<PageState>("initializing");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const navigate = useNavigate();

  const mountedRef = useRef<boolean>(true);
  const processedRef = useRef<boolean>(false);
  const redirectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const processVerification = async () => {
      if (processedRef.current) return;
      processedRef.current = true;

      setState("verifying");
      setMessage("");
      setError("");

      // Try to ensure session is parsed by supabase first
      // Instead of checking raw Supabase session,
// rely on AuthContext which already restored the user.

const { data } = await supabase.auth.getUser();

if (!data?.user) {
  setError("Verification session not found. Please log in again.");
  setState("error");
  return;
}

if (!data.user.email_confirmed_at) {
  setError("Email verification not completed yet.");
  setState("error");
  return;
}

      // Clean up URL hash (remove tokens) so UI & route-guards see a clean URL
      try {
        if (window.location.hash) {
          const clean = window.location.pathname + window.location.search;
          window.history.replaceState(null, "", clean);
        }
      } catch (_) {
        // ignore any history replacement issues
      }

      setMessage("Your email has been successfully verified.");
      setState("verified");

      if (!mountedRef.current) return;

      // Keep the page visible briefly so user sees the success message.
      // After that, navigate to the dashboard (or change to a route you prefer).
      redirectTimerRef.current = window.setTimeout(() => {
        if (!mountedRef.current) return;
        setState("redirecting");
        navigate("/dashboard", { replace: true });
      }, 2200);
    };

    processVerification();
  }, [navigate]);

  if (loading) {
    return null;
  }

  // Provide a manual way to sign-out & open the login modal (keeps your original UX)
  const goToLogin = async () => {
    try {
      await signOut();
    } catch (_) {
      // ignore
    } finally {
      navigate("/", { replace: true, state: { openLogin: true } });
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
            <p style={{ fontSize: "14px", color: "#555" }}>
              Preparing verification status…
            </p>
          </div>
        )}

        {state === "verifying" && (
          <div>
            <h2 style={{ marginBottom: "12px" }}>Verifying Email</h2>
            <p style={{ fontSize: "14px", color: "#555" }}>
              Please wait while we confirm your email verification.
            </p>
          </div>
        )}

        {state === "verified" && (
          <div>
            <h2
              style={{
                marginBottom: "12px",
                color: "#1a7f37",
              }}
            >
              Email Verified
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "#444",
                marginBottom: "16px",
              }}
            >
              {message}
            </p>
            <p
              style={{
                fontSize: "13px",
                color: "#666",
              }}
            >
              You are now logged in. Redirecting to your dashboard…
            </p>
            <div style={{ marginTop: 18 }}>
              <button
                onClick={() => {
                  // immediate continue without waiting for timeout
                  if (redirectTimerRef.current) {
                    window.clearTimeout(redirectTimerRef.current);
                  }
                  navigate("/dashboard", { replace: true });
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
                Continue to Dashboard
              </button>
            </div>
          </div>
        )}

        {state === "redirecting" && (
          <div>
            <h2
              style={{
                marginBottom: "12px",
                color: "#1a7f37",
              }}
            >
              Verification Complete
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "#444",
                marginBottom: "20px",
              }}
            >
              Your email is verified. Redirecting you now.
            </p>
          </div>
        )}

        {state === "error" && (
          <div>
            <h2
              style={{
                marginBottom: "12px",
                color: "#a40000",
              }}
            >
              Verification Error
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "#a40000",
                marginBottom: "16px",
              }}
            >
              {error}
            </p>
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
