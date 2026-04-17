import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

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

  // Admin → render the dashboard
  return children;
}
