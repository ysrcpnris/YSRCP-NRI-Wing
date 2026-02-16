import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute() {
  const { user, profile, loading, isVerified } = useAuth();
  const location = useLocation();

  // simple reusable spinner UI (same look as other places)
  const Spinner = () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // While global auth is loading — block navigation
  if (loading) {
    return <Spinner />;
  }

  // If not signed in -> open login
  if (!user) {
    return <Navigate to="/" replace state={{ openLogin: true }} />;
  }

  // Detect whether we are on the verification flow page or the page has locked the flow.
  const pathname = location?.pathname ?? "";
  const onVerifyPages =
    pathname === "/email-verified" ||
    pathname === "/verify-email" ||
    (typeof window !== "undefined" &&
      sessionStorage.getItem("email_verified_page") === "true");

  // If email not confirmed yet:
  // - If we're currently on the verification pages / flow, wait (don't redirect).
  // - Otherwise redirect to verify-email page.
  if (!user.email_confirmed_at) {
    if (onVerifyPages) {
      return <Spinner />;
    }
    return <Navigate to="/verify-email" replace />;
  }

  
  if (!profile) {
    const verificationInProgress = isVerified || onVerifyPages;
    if (verificationInProgress) {
      return <Spinner />;
    }
    // fallback: user confirmed but no profile and not in a verification flow.
    return <Navigate to="/verify-email" replace />;
  }

  // All good — render protected child routes
  return <Outlet />;
}
