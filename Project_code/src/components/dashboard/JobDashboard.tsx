import Dashboard from "../Dashboard";

export default function JobDashboard() {
  return (
    <Dashboard
      role="Job"
      onClose={() => {}}
      onLogout={() => {
        localStorage.clear();
        window.location.href = "/";
      }}
    />
  );
}
