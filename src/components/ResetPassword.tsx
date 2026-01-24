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
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

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

      if (resetMethod === "email") {
        const { error: resetError } =
          await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password-confirm`,
          });

        if (resetError) {
          // Don't reveal if email exists (security best practice)
          if (isMounted.current) {
            setIsSubmitted(true);
            toast.success("Password reset link sent successfully.");
          }
          clearTimeout(disableTimer);
          return;
        }

        if (isMounted.current) {
          setIsSubmitted(true);
          toast.success("Password reset link sent successfully.");
        }
      } else {
        // Send OTP via magic link
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: email,
          options: {
            emailRedirectTo: `${window.location.origin}/reset-password-confirm`,
          },
        });

        if (otpError) {
          // Don't reveal if email exists (security best practice)
          if (isMounted.current) {
            setIsSubmitted(true);
            toast.success("OTP/magic link sent successfully.");
          }
          clearTimeout(disableTimer);
          return;
        }

        if (isMounted.current) {
          setIsSubmitted(true);
          toast.success("OTP/magic link sent successfully. Check your email!");
        }
      }
    } catch (err: unknown) {
      // For security, don't reveal specific errors
      void (err instanceof Error ? err.message : "An error occurred. Please try again.");
      if (isMounted.current) {
        // For security, don't reveal specific errors
        setIsSubmitted(true);
        toast.success("Password reset link sent successfully.");
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
      clearTimeout(disableTimer);
    }
  };

  if (isSubmitted) {
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
          className="w-full bg-gradient-to-r from-[#0B4DA2] to-[#1E6BD6] text-white py-3 rounded-lg font-semibold hover:shadow-lg transition flex items-center justify-center gap-2"
        >
          <ArrowLeft size={20} />
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleResetPassword} className="space-y-4">
      {/* Title */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Reset Your Password
        </h3>
        <p className="text-gray-600 text-sm">
          Forgot your password? No worries. Enter your registered email address
          below and we'll send you a link to reset your password securely.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Email Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Address <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          required
          disabled={loading || buttonDisabled}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your registered email"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4DA2] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition"
        />
      </div>

      {/* Reset Method Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          How would you like to reset?
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setResetMethod("email")}
            disabled={loading || buttonDisabled}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition ${
              resetMethod === "email"
                ? "bg-[#0B4DA2] text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Reset Link
          </button>
          <button
            type="button"
            onClick={() => setResetMethod("otp")}
            disabled={loading || buttonDisabled}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition ${
              resetMethod === "otp"
                ? "bg-[#0B4DA2] text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            OTP
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || buttonDisabled}
        className="w-full bg-gradient-to-r from-[#0B4DA2] to-[#1E6BD6] text-white py-2.5 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader size={18} className="animate-spin" />
            Sending {resetMethod === "email" ? "Reset Link" : "OTP"}...
          </>
        ) : buttonDisabled ? (
          <>
            <span className="text-yellow-200">⏱️ Please wait before trying again</span>
          </>
        ) : (
          `Send ${resetMethod === "email" ? "Reset Link" : "OTP"}`
        )}
      </button>

      {/* Back to Login */}
      <button
        type="button"
        onClick={onBack}
        disabled={loading}
        className="w-full text-[#0B4DA2] hover:text-[#0B4DA2] font-medium transition py-2 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <ArrowLeft size={18} />
        Back to Login
      </button>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-700 space-y-2">
        <p>
          <strong>ℹ️ How it works:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-600">
          <li>
            {resetMethod === "email"
              ? "We'll send you a secure link to reset your password"
              : "We'll send you a one-time password (OTP) to reset your password"}
          </li>
          <li>The link/OTP will expire after 24 hours for security</li>
          <li>Click the link in your email to proceed</li>
        </ul>
      </div>
    </form>
  );
}
