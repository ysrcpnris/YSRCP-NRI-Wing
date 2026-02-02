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

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const processVerification = async () => {
      if (processedRef.current) return;
      processedRef.current = true;

      setState("verifying");
      setMessage("");
      setError("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!mountedRef.current) return;

      if (sessionError) {
        setError("Unable to validate verification session.");
        setState("error");
        return;
      }

      if (!session?.user) {
        setError("Verification session not found. Please log in again.");
        setState("error");
        return;
      }

      if (!session.user.email_confirmed_at) {
        setError("Email verification not completed yet.");
        setState("error");
        return;
      }

      setMessage("Your email has been successfully verified.");
      setState("verified");

      try {
        await supabase.auth.signOut();
      } catch (_) {
      }

      if (!mountedRef.current) return;

      setState("redirecting");
    };

    processVerification();
  }, []);

  if (loading) {
    return null;
  }

//   if (isVerified && user) {
//     return <Navigate to="/dashboard" replace />;
//   }
const goToLogin = async () => {
  try {
    await signOut();
  } catch (_) {
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
              For security reasons, please log in again to continue.
            </p>
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
              Your email is verified. Please log in again to continue.
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
