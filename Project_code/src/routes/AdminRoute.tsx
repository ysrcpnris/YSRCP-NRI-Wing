import { Navigate } from "react-router-dom";

export default function AdminRoute({ children }: { children: JSX.Element }) {
  const isAdmin = localStorage.getItem("is_admin") === "true";

  if (!isAdmin) {
    return (
      <Navigate
        to="/"
        replace
        state={{ openLogin: true }} // 👈 pass signal
      />
    );
  }

  return children;
}
