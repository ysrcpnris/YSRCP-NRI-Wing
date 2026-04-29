import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// Guards `/support-team/dashboard` — only profiles with role='support_team'
// can enter. Non-signed-in users get bounced to the support-team auth page;
// signed-in users with the wrong role are sent to their normal home.
export default function SupportTeamRoute({ children }: { children: JSX.Element }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/support-teams" replace />;
  }

  if (profile?.role === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (profile?.role !== "support_team") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
