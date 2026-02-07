import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  // ✅ MUST block navigation while loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace state={{ openLogin: true }} />;
  }

  if (!user.email_confirmed_at) {
    return <Navigate to="/verify-email" replace />;
  }

  return <Outlet />;
}
