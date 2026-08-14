import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { clearCustomerAccountSession, getCustomerAccountSession } from "@/lib/customerAccount";
import { signOutAccount } from "@/lib/accountApi";

/**
 * Signing out, in one place.
 *
 * Three dashboards each carried their own copy and the RWA dashboard had none at all — so
 * an RWA member had no way to sign out of a shared machine. A single copy also means the
 * order stays right: revoke on the server first, because clearing local storage alone left
 * the token working.
 */
export function useAccountSignOut() {
  const navigate = useNavigate();

  return useCallback(
    async (options: { everywhere?: boolean; redirectTo?: string } = {}) => {
      const session = getCustomerAccountSession();

      await signOutAccount(session?.accountAccessToken, options.everywhere);

      // Cleared even when the request failed: someone who pressed sign out must not be
      // left looking signed in.
      clearCustomerAccountSession();

      navigate(options.redirectTo ?? `/login?role=${session?.role ?? "customer"}`, { replace: true });
    },
    [navigate],
  );
}
