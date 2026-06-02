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
        type: "recovery",
      });

      if (verifyErr) {
        throw new Error(verifyErr.message || "Invalid OTP code. Please try again.");
      }

      if (isMounted.current) {
        setError("");
        // Show success and redirect to password update
        toast.success("OTP verified! You can now reset your password.");
        // Redirect to new password page after 1 second
        setTimeout(() => {
          window.location.href = "/reset-password-confirm";
        }, 1000);
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
    setLoading(true);
    setButtonDisabled(true);

    // Disable button for 30 seconds to prevent spam
    const disableTimer = setTimeout(() => {
      if (isMounted.current) {
        setButtonDisabled(false);
      }
    }, 30000);

    try {
      if (!email) {
        setError("Please enter your email address.");
        setLoading(false);
        setButtonDisabled(false);
        clearTimeout(disableTimer);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError("Please enter a valid email address.");
        setLoading(false);
        setButtonDisabled(false);
        clearTimeout(disableTimer);
        return;
      }

      // Use the current origin so it works in both dev (localhost) and production
      const redirectUrl = `${window.location.origin}/reset-password-confirm`;

      if (resetMethod === "email") {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
          email,
          { redirectTo: redirectUrl }
        );

        if (resetErr) {
          console.warn("Reset password error:", resetErr.message);
        }

        if (isMounted.current) {
          setIsSubmitted(true);
          setLoading(false);
          toast.success("Password reset link sent! Check your email.");
        }
      } else {
        // Send magic link (used as OTP-style passwordless login)
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectUrl,
            shouldCreateUser: false,
          },
        });

        if (otpError) {
          console.warn("OTP send error:", otpError.message);
        }

        if (isMounted.current) {
          setIsSubmitted(true);
          setLoading(false);
          toast.success("Magic link sent! Check your email to sign in.");
        }
      }
    } catch (err: unknown) {
      console.warn("Reset flow exception:", err);
      // Security best practice: don't reveal if email exists — always show success
      if (isMounted.current) {
        setIsSubmitted(true);
        toast.success("If the email exists, a reset link has been sent.");
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
      clearTimeout(disableTimer);
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
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h3>
          <p className="text-gray-700 mb-1">
            We've sent a 6-digit verification code to:
          </p>
          <p className="text-sm text-gray-900 font-semibold">{email}</p>
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
