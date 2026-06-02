import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, Loader } from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";

interface ResetPasswordProps {
  onBack: () => void;
}

export default function ResetPassword({ onBack }: ResetPasswordProps) {
  const [email, setEmail] = useState("");
  const [resetMethod, setResetMethod] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSendStatus, setOtpSendStatus] = useState<"sending" | "sent" | "rate_limited" | "error">("sending");
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Verify OTP code entered by user
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setError("Please enter the 6-digit code from your email.");
      return;
    }

    setVerifyingOtp(true);
    setError("");

    try {
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: "email",
      });

      if (verifyErr) {
        throw new Error(verifyErr.message || "Invalid OTP code. Please try again.");
      }

      if (isMounted.current) {
        setError("");
        // Mark 2FA as satisfied so ProtectedRoute doesn't demand a second OTP
        // after the password is changed and the user lands on /dashboard.
        try { localStorage.setItem("otp_verified_at", String(Date.now())); } catch { /* ignore */ }
        toast.success("OTP verified! Redirecting to set your new password…");
        setTimeout(() => {
          window.location.replace("/reset-password-confirm");
        }, 800);
      }
    } catch (err: any) {
      if (isMounted.current) {
        setError(err?.message || "Failed to verify OTP. Please try again.");
      }
    } finally {
      if (isMounted.current) {
        setVerifyingOtp(false);
      }
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    const redirectUrl = `${window.location.origin}/reset-password-confirm`;

    if (resetMethod === "email") {
      // Show spinner only for the email-link method (needs loading feedback)
      setLoading(true);
      try {
        await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
      } catch { /* ignore */ }
      setLoading(false);
      setIsSubmitted(true);
      toast.success("Check your email — a reset link has been sent if this address is registered.");

    } else {
      // OTP method: transition to the entry screen IMMEDIATELY so the user
      // can type the code as soon as it arrives — no loading state needed.
      setOtpSendStatus("sending");
      setIsSubmitted(true);

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });

      if (otpError) {
        const status = (otpError as any).status ?? 0;
        const msg    = (otpError.message ?? "").toLowerCase();
        const isRateLimit = status === 429 || status === 422 ||
          msg.includes("rate") || msg.includes("too many") ||
          msg.includes("limit") || msg.includes("security");

        if (isRateLimit) {
          setOtpSendStatus("rate_limited");
        } else {
          setOtpSendStatus("error");
        }
      } else {
        setOtpSendStatus("sent");
      }
    }
  };

  // Show OTP verification form instead of success message when OTP method is used
  if (isSubmitted && resetMethod === "otp") {
    return (
      <form onSubmit={handleVerifyOtp} className="space-y-5">
        {/* Success Message */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-200 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {otpSendStatus === "sent" ? "Check Your Email" :
             otpSendStatus === "sending" ? "Sending OTP…" :
             otpSendStatus === "rate_limited" ? "Too Many Requests" : "Enter Your Code"}
          </h3>
          {otpSendStatus === "sent" && (
            <p className="text-gray-700 mb-1">We sent a 6-digit code to <span className="font-semibold">{email}</span></p>
          )}
          {otpSendStatus === "sending" && (
            <p className="text-gray-500 text-sm">Sending your code — this takes a moment…</p>
          )}
          {otpSendStatus === "rate_limited" && (
            <div className="mt-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 text-left">
              <p className="font-semibold mb-1">Email sending is rate-limited.</p>
              <p>If you received a code earlier, enter it below — it's still valid for 5 minutes.</p>
              <p className="mt-1">Otherwise wait a few minutes and try again, or use <strong>Reset Link</strong> instead (that method always works).</p>
            </div>
          )}
          {otpSendStatus === "error" && (
            <p className="text-sm text-red-600 mt-1">Could not send the code. Enter it if you already received it, or go back and try again.</p>
          )}
        </div>

        {/* OTP Input Field */}
        <div>
          <label className="input-label">
            Enter 6-Digit Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={6}
            inputMode="numeric"
            placeholder="000000"
            value={otpCode}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 6);
              setOtpCode(val);
              if (error) setError("");
            }}
            className="input-field text-center text-2xl tracking-widest font-mono"
          />
          <p className="text-xs text-gray-500 mt-1 text-center">
            Check your email for the code
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            <strong>Didn't receive the code?</strong>
          </p>
          <ul className="text-xs text-gray-600 list-disc list-inside space-y-1 mt-2">
            <li>Check your spam or junk folder</li>
            <li>Make sure you entered the correct email address</li>
          </ul>
        </div>

        {/* Verify Button */}
        <button
          type="submit"
          disabled={verifyingOtp || otpCode.length !== 6}
          className="btn-gradient w-full py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {verifyingOtp ? (
            <>
              <Loader size={18} className="animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify Code"
          )}
        </button>

        {/* Back Button */}
        <button
          type="button"
          onClick={() => {
            setIsSubmitted(false);
            setOtpCode("");
            setError("");
          }}
          className="w-full text-sm text-primary-600 hover:text-primary-700 font-medium transition py-2 flex items-center justify-center gap-1.5"
        >
          <ArrowLeft size={16} />
          Back to Reset
        </button>
      </form>
    );
  }

  if (isSubmitted && resetMethod === "email") {
    return (
      <div className="space-y-6">
        {/* Success Message */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-200 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {resetMethod === "email"
              ? "Reset Link Sent!"
              : "OTP/Magic Link Sent!"}
          </h3>
          <p className="text-gray-700 mb-1">
            {resetMethod === "email"
              ? "Check your email for a password reset link."
              : "Check your email for the OTP or magic link to reset your password."}
          </p>
          <p className="text-sm text-gray-600 font-medium">
            Sent to: <span className="text-gray-900 font-semibold">{email}</span>
          </p>
        </div>

        {/* Secondary Text */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <p className="text-gray-700">
            <strong>Didn't receive the email?</strong>
          </p>
          <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
            <li>Check your spam or junk folder</li>
            <li>Wait a few minutes and try again</li>
            <li>Make sure you entered the correct email address</li>
          </ul>
        </div>

        {/* Security Note */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-amber-900">🔒 Security Note:</span>{" "}
            For your security, the reset link will expire after a limited time. If you
            didn't request a password reset, please ignore this email and your account
            will remain secure.
          </p>
        </div>

        {/* Back Button */}
        <button
          onClick={onBack}
          className="w-full bg-gradient-to-r from-primary-700 to-primary-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition flex items-center justify-center gap-2"
        >
          <ArrowLeft size={20} />
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleResetPassword} className="space-y-5">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-1">Reset Your Password</h3>
        <p className="text-sm text-gray-500">
          Enter your registered email and we'll send you a reset link.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="input-label">
          Email Address <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          required
          disabled={loading || buttonDisabled}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="input-field"
        />
      </div>

      <div>
        <label className="input-label">Reset method</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setResetMethod("email")}
            disabled={loading || buttonDisabled}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition ${
              resetMethod === "email"
                ? "bg-primary-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Reset Link
          </button>
          <button
            type="button"
            onClick={() => setResetMethod("otp")}
            disabled={loading || buttonDisabled}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition ${
              resetMethod === "otp"
                ? "bg-primary-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            OTP
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || buttonDisabled}
        className="btn-gradient w-full py-3 rounded-xl flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader size={18} className="animate-spin" />
            Sending...
          </>
        ) : buttonDisabled ? (
          <span className="text-white/70">Please wait before trying again</span>
        ) : (
          `Send ${resetMethod === "email" ? "Reset Link" : "OTP"}`
        )}
      </button>

      <button
        type="button"
        onClick={onBack}
        disabled={loading}
        className="w-full text-sm text-primary-600 hover:text-primary-700 font-medium transition py-1 flex items-center justify-center gap-1.5 disabled:opacity-50"
      >
        <ArrowLeft size={16} />
        Back to Login
      </button>
    </form>
  );
}
