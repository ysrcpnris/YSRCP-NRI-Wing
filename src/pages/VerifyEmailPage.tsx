import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "react-router-dom";


type StatusType =
  | "idle"
  | "sending"
  | "sent"
  | "error"
  | "cooldown"
  | "checking";

export default function VerifyEmailPage() {
  const { loading } = useAuth();
  const location = useLocation();

useEffect(() => {
  const emailFromState = location.state?.email;
  if (emailFromState) {
    setEmail(emailFromState);
  }
}, [location.state]);


  const [status, setStatus] = useState<StatusType>("idle");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [cooldown, setCooldown] = useState<number>(0);
  const [email, setEmail] = useState<string>("");

  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef<boolean>(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

//   useEffect(() => {
//     if (user?.email) {
//       setEmail(user.email);
//     }
//   }, [user]);

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

  const manualCheckVerification = async () => {
    resetMessages();
    setStatus("checking");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!mountedRef.current) return;

    if (!session?.user) {
      setError("Session expired. Please log in again.");
      setStatus("error");
      return;
    }

    if (!session.user.email_confirmed_at) {
      setError("Email is not verified yet. Please check your inbox.");
      setStatus("error");
      return;
    }

    window.location.href = "/dashboard";
  };

//   if (loading) {
//     return null;
//   }

 //return <Navigate to="/" replace state={{ openLogin: true }} />;


 if (loading) {
  return null;
}

// if (loading) {
//   return null;
// }

// if (isVerified) {
//   return <Navigate to="/dashboard" replace />;
// }


// if (user.email_confirmed_at) {
//   return <Navigate to="/dashboard" replace />;
// }


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
        <div
          style={{
            marginBottom: "24px",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              margin: 0,
              marginBottom: "12px",
              fontSize: "24px",
              fontWeight: 600,
              color: "#111",
            }}
          >
            Verify your email
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: "14px",
              lineHeight: "1.6",
              color: "#555",
            }}
          >
            To continue using WINGS, you must verify your email address.
            <br />
            We have sent a verification link to:
          </p>

          <p
            style={{
              marginTop: "8px",
              fontSize: "15px",
              fontWeight: 500,
              color: "#000",
              wordBreak: "break-all",
            }}
          >
            {email}
          </p>
        </div>

        {message && (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px",
              borderRadius: "6px",
              backgroundColor: "#e6f7e6",
              color: "#1a7f1a",
              fontSize: "14px",
              textAlign: "center",
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px",
              borderRadius: "6px",
              backgroundColor: "#fdeaea",
              color: "#a40000",
              fontSize: "14px",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
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

        <div
          style={{
            marginTop: "24px",
            fontSize: "12px",
            color: "#777",
            textAlign: "center",
            lineHeight: "1.6",
          }}
        >
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
