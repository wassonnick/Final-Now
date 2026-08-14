import { Navigate, useLocation } from "react-router-dom";

type AccountRole = "customer" | "broker" | "rwa";

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

/**
 * `role` narrows a route to one kind of account. Omitting it means "any signed-in account",
 * which is what pages about the account itself need — everybody has devices to manage, and
 * making such a page pick a role would bounce the other two away from it.
 */
export function ProtectedAccountRoute({
  children,
  role,
}: {
  children: JSX.Element;
  role?: AccountRole;
}) {
  const location = useLocation();
  const storedRole = getStoredAccountRole();

  if (!storedRole) {
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname)}${role ? `&role=${role}` : ""}`}
        replace
      />
    );
  }

  if (role && storedRole !== role) {
    return (
      <Navigate
        to={storedRole === "broker" ? "/broker/dashboard" : storedRole === "rwa" ? "/rwa/dashboard" : "/customer/dashboard"}
        replace
      />
    );
  }

  return children;
}
