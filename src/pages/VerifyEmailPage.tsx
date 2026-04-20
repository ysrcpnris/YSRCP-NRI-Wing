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
  | "success"
  | "noSession"        // No session on this device (user verified elsewhere)
  | "alreadyVerified"; // Email is already verified

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
  const redirectedRef = useRef<boolean>(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const emailFromState = (location.state as any)?.email;
    if (emailFromState) setEmail(emailFromState);
  }, [location.state]);

  // Cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
      if (status === "cooldown") setStatus("idle");
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

  // ==========================================================
  // CROSS-TAB VERIFICATION DETECTION
  // ==========================================================
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current || redirectedRef.current) return;

        if (
          (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") &&
          session?.user?.email_confirmed_at
        ) {
          redirectedRef.current = true;
          setMessage("Email verified! Redirecting to your dashboard...");
          setStatus("success");
          setTimeout(() => {
            if (mountedRef.current) navigate("/dashboard");
          }, 800);
        }
      }
    );

    const onFocus = async () => {
      if (redirectedRef.current) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email_confirmed_at && !redirectedRef.current) {
        redirectedRef.current = true;
        setMessage("Email verified! Redirecting...");
        setStatus("success");
        setTimeout(() => {
          if (mountedRef.current) navigate("/dashboard");
        }, 500);
      }
    };
    window.addEventListener("focus", onFocus);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
    };
  }, [navigate]);

  const canResend = useMemo(() => {
    if (!email) return false;
    if (status === "sending") return false;
    if (status === "cooldown") return false;
    if (status === "alreadyVerified") return false;
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

  const goToLogin = () => {
    navigate("/", { replace: true, state: { openLogin: true } });
  };

  const resendVerificationEmail = async () => {
    if (!canResend || !email) return;

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
      // Detect "already verified" from Supabase error message
      const msg = (error.message || "").toLowerCase();
      if (
        msg.includes("already confirmed") ||
        msg.includes("already verified") ||
        msg.includes("user already") ||
        msg.includes("email already")
      ) {
        setStatus("alreadyVerified");
        setMessage("Your email is already verified. Please log in to continue.");
        return;
      }

      setError("Failed to resend verification email. Please try again later.");
      setStatus("error");
      startCooldown(30);
      return;
    }

    setMessage("Verification email has been sent. Please check your inbox.");
    setStatus("sent");
    startCooldown(60);
  };

  /**
   * Manual check button — more robust.
   */
  const manualCheckVerification = async () => {
    resetMessages();
    setStatus("checking");

    // 1) Try current session
    let { data: { session } } = await supabase.auth.getSession();

    // 2) If no session, try getUser which may refresh
    if (!session?.user) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const retry = await supabase.auth.getSession();
        session = retry.data.session;
      }
    }

    if (!mountedRef.current) return;

    // No session at all → friendly "verified on another device" card
    if (!session?.user) {
      setStatus("noSession");
      return;
    }

    // Has session but email not verified
    if (!session.user.email_confirmed_at) {
      setError("Your email isn't verified yet. Please click the link in your inbox.");
      setStatus("error");
      return;
    }

    // Email verified — check profile exists
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
      setError("Verification is still being processed. Please wait a few seconds and try again.");
      setStatus("error");
      return;
    }

    setMessage("Verification complete. Redirecting...");
    setStatus("success");
    navigate("/dashboard");
  };

  if (loading) return null;

  // ============================================
  // Special screens (friendly cards, not red errors)
  // ============================================

  if (status === "noSession") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-6 sm:p-10">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-card border border-gray-100 p-6 sm:p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Looks like you verified on another device
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-6">
            Your session isn't on this device. Please log in with your email and password to continue.
          </p>
          <button
            onClick={goToLogin}
            className="btn-gradient w-full py-3 rounded-xl"
          >
            Go to Login
          </button>
          <button
            onClick={() => {
              setStatus("idle");
              resetMessages();
            }}
            className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (status === "alreadyVerified") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-6 sm:p-10">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-card border border-gray-100 p-6 sm:p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Your email is already verified
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-6">
            {message || "No need to resend — just log in to continue."}
          </p>
          <button
            onClick={goToLogin}
            className="btn-gradient w-full py-3 rounded-xl"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // Main verify-your-email screen
  // ============================================
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-6 sm:p-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-card border border-gray-100 p-6 sm:p-8">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify your email</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            To continue using WINGS, you must verify your email address.
            <br />
            We have sent a verification link to:
          </p>
          <p className="mt-2 text-sm font-semibold text-gray-900 break-all">
            {email || "—"}
          </p>
        </div>

        {/* 15-min expiry warning */}
        <div className="mb-5 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            <strong className="font-semibold">This link expires in 15 minutes.</strong> Please verify soon — if the link expires, use "Resend verification email" below.
          </span>
        </div>

        {status === "checking" && (
          <div className="mb-4 text-center">
            <div className="inline-block w-9 h-9 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
            <div className="mt-3 text-sm text-gray-700">
              {message || "Finishing verification..."}
            </div>
          </div>
        )}

        {message && status !== "checking" && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm text-center">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={resendVerificationEmail}
            disabled={!canResend}
            className={`w-full py-3 rounded-lg text-sm font-semibold transition ${
              canResend
                ? "bg-gray-900 text-white hover:bg-gray-800"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            {status === "sending"
              ? "Sending verification email..."
              : status === "cooldown" && cooldown > 0
              ? `Resend available in ${cooldown}s`
              : "Resend verification email"}
          </button>

          <button
            onClick={manualCheckVerification}
            className="w-full py-3 rounded-lg text-sm font-semibold border border-gray-300 text-gray-900 bg-white hover:bg-gray-50 transition"
          >
            I have verified my email
          </button>

          <button
            onClick={goToLogin}
            className="w-full py-2 text-sm text-primary-600 hover:text-primary-700 font-medium transition"
          >
            Already verified? Go to Login
          </button>
        </div>

        <div className="mt-5 text-xs text-gray-500 text-center leading-relaxed">
          If you don't see the email, please check your spam folder.
          <br />
          Make sure you used the correct email address.
        </div>
      </div>
    </div>
  );
}
