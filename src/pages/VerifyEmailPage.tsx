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
  // When the verification email is clicked in another tab,
  // Supabase writes the new session to localStorage and emits a
  // SIGNED_IN event. Listen for it and auto-redirect this tab too.
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

    // Also poll storage on focus in case storage event was missed (some browsers)
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
   * Tries getSession → getUser (forces a refresh from Supabase) → profile check.
   */
  const manualCheckVerification = async () => {
    resetMessages();
    setStatus("checking");

    // 1) Try current session
    let { data: { session } } = await supabase.auth.getSession();

    // 2) If no session, ask Supabase directly (in case localStorage is stale or this tab was never signed in)
    if (!session?.user) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        // Re-fetch session after getUser potentially refreshed
        const retry = await supabase.auth.getSession();
        session = retry.data.session;
      }
    }

    if (!mountedRef.current) return;

    if (!session?.user) {
      setError(
        "We couldn't find an active session. If you've already clicked the verify link in another tab, please log in from the home page."
      );
      setStatus("error");
      return;
    }

    if (!session.user.email_confirmed_at) {
      setError("Your email isn't verified yet. Please click the link in your inbox.");
      setStatus("error");
      return;
    }

    // Email is verified — check profile exists
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
      setError(
        "Verification is still being processed. Please wait a few seconds and try again."
      );
      setStatus("error");
      return;
    }

    setMessage("Verification complete. Redirecting...");
    setStatus("success");
    navigate("/dashboard");
  };

  if (loading) return null;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-6 sm:p-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-card border border-gray-100 p-6 sm:p-8">
        <div className="mb-6 text-center">
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
        </div>

        <div className="mt-6 text-xs text-gray-500 text-center leading-relaxed">
          If you don't see the email, please check your spam folder.
          <br />
          Make sure you used the correct email address.
          <br />
          You will not be able to log in until verification is complete.
        </div>
      </div>
    </div>
  );
}
