import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";

export default function AdminRoute({ children }: { children: JSX.Element }) {
  const { user, profile, loading } = useAuth();

  // Wait for auth to finish loading before deciding
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not signed in → open login popup on home
  if (!user) {
    sessionStorage.setItem("post_login_redirect", "/admin/dashboard");
    return <Navigate to="/" replace state={{ openLogin: true }} />;
  }

  // Signed in but not admin → send to normal dashboard
  if (profile?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  // Two-factor gate: admins must also complete email-OTP within the
  // last 8 hours. Same logic as ProtectedRoute — see that file for
  // why we use a sliding window instead of every-load re-verification.
  const OTP_VALID_FOR_MS = 8 * 60 * 60 * 1000;
  let otpVerifiedAt = 0;
  try {
    otpVerifiedAt = parseInt(localStorage.getItem("otp_verified_at") || "0", 10);
  } catch { /* ignore */ }
  const otpFresh = otpVerifiedAt > 0 && Date.now() - otpVerifiedAt < OTP_VALID_FOR_MS;
  if (!otpFresh) {
    sessionStorage.setItem("post_login_redirect", "/admin/dashboard");
    return <Navigate to="/verify-otp" replace state={{ email: user.email }} />;
  }

  // Admin → render the dashboard
  return children;
}
