import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader, ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function ResetPasswordConfirmPage() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const isMounted = useRef(true);

useEffect(() => {
  let cancelled = false;
  let verifiedOnce = false;

  const tryVerify = async () => {
    // Retry up to 6 times (3 seconds total) to handle URL-token exchange delay
    for (let attempt = 1; attempt <= 6; attempt++) {
      if (cancelled) return;
      await new Promise((res) => setTimeout(res, 500));

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        if (!cancelled && !verifiedOnce) {
          verifiedOnce = true;
          toast.success("Reset link verified. You can now set a new password.");
        }
        return;
      }
    }
    // No session after retries
    if (!cancelled && !verifiedOnce) {
      setError(
        "This password reset link is invalid or expired. Please request a new one."
      );
    }
  };

  // Also listen for SIGNED_IN / PASSWORD_RECOVERY events in case getSession() races
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (session && !verifiedOnce && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) {
      verifiedOnce = true;
      setError("");
      toast.success("Reset link verified. You can now set a new password.");
    }
  });

  tryVerify();

  return () => {
    cancelled = true;
    subscription.unsubscribe();
  };
}, []);


  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number";
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>?]/.test(password)) {
      return "Password must contain at least one special character";
    }
    return null;
  };

const handleResetPassword = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");
  setLoading(true);

  try {
    // 1️⃣ Basic validation
    if (!newPassword || !confirmPassword) {
      throw new Error("Please enter and confirm your new password");
    }

    if (newPassword !== confirmPassword) {
      throw new Error("Passwords do not match");
    }

    // 2️⃣ Password strength validation
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      throw new Error(passwordError);
    }

    // 3️⃣ Verify active session before updating
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Session expired. Please request a new reset link.");
    }

    // 4️⃣ Update password (recovery session)
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;

    if (!isMounted.current) return;

    toast.success("Password reset successfully! Redirecting to dashboard...");

    setTimeout(() => {
      window.location.replace("/dashboard");
    }, 1500);


  } catch (err: unknown) {
    if (!isMounted.current) return;

    const msg =
      err instanceof Error ? err.message : "Failed to reset password";
    setError(msg);

  } finally {
    if (isMounted.current) {
      setLoading(false);
    }
  }
};


  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
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
            <h2 className="text-2xl font-bold text-gray-900">
              Password Reset Successful!
            </h2>
            <p className="text-gray-600 mt-2">
              Your password has been reset successfully. Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/40 to-gray-50 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <button
              onClick={() => navigate("/")}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1"
            >
              <ArrowLeft size={16} />
              Back to Home
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 sm:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Set New Password
              </h1>
              <p className="text-sm text-gray-500">
                Enter your new password below to complete the reset.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-5 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="input-label">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={loading}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="input-field pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Uppercase, lowercase, number, and special character required
                </p>
              </div>

              <div>
                <label className="input-label">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    disabled={loading}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="input-field pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {newPassword && confirmPassword && (
                <p className={`text-xs font-medium ${
                  newPassword === confirmPassword
                    ? "text-green-600"
                    : "text-red-600"
                }`}>
                  {newPassword === confirmPassword ? "Passwords match" : "Passwords do not match"}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                className="btn-gradient w-full py-3 rounded-xl flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
