import { Navigate, useLocation } from "react-router-dom";

type AccountRole = "customer" | "broker";

function getStoredAccountRole() {
  try {
    const raw = window.localStorage.getItem("sf_account_session");
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return String(parsed?.role || "");
  } catch {
    return "";
  }
}

export function ProtectedAccountRoute({
  children,
  role,
}: {
  children: JSX.Element;
  role: AccountRole;
}) {
  const location = useLocation();
  const storedRole = getStoredAccountRole();

  if (!storedRole) {
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname)}&role=${role}`}
        replace
      />
    );
  }

  if (storedRole !== role) {
    return (
      <Navigate
        to={storedRole === "broker" ? "/broker/dashboard" : "/customer/dashboard"}
        replace
      />
    );
  }

  return children;
}
