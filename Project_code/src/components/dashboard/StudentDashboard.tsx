import Dashboard from "../Dashboard";

export default function StudentDashboard() {
  return (
    <Dashboard
      role="Student"
      onClose={() => {}}
      onLogout={() => {
        localStorage.clear();
        window.location.href = "/";
      }}
    />
  );
}
