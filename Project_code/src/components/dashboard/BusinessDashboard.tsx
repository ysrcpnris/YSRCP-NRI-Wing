import Dashboard from "../Dashboard";

export default function BusinessDashboard() {
  return (
    <Dashboard
      role="Business"
      onClose={() => {}}
      onLogout={() => {
        localStorage.clear();
        window.location.href = "/";
      }}
    />
  );
}
