import { adminFetch } from "@/lib/adminApi";

export type AdminAccountRole = "customer" | "broker";
export type AdminAccountStatus = "active" | "otp_pending" | "blocked";

export type AdminAccount = {
  id: number;
  role: AdminAccountRole;
  phone: string;
  phone_normalized: string;
  name: string | null;
  email: string | null;
  status: AdminAccountStatus;
  last_login_at: string | null;
  phone_verified_at: string | null;
  meta: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

type AdminAccountsResponse = {
  data?: AdminAccount[];
  meta?: {
    total?: number;
    current_page?: number;
    last_page?: number;
    per_page?: number;
  };
};

export async function listAdminAccounts({
  q = "",
  role = "",
  status = "",
}: {
  q?: string;
  role?: string;
  status?: string;
} = {}) {
  const params = new URLSearchParams();

  if (q.trim()) params.set("q", q.trim());
  if (role) params.set("role", role);
  if (status) params.set("status", status);
  params.set("per_page", "100");

  const response = await adminFetch(`/admin/accounts?${params.toString()}`);
  const json = (await response.json().catch(() => ({}))) as AdminAccountsResponse & { message?: string };

  if (!response.ok) {
    throw new Error(json?.message || "Could not load accounts.");
  }

  return {
    accounts: Array.isArray(json.data) ? json.data : [],
    meta: json.meta || {},
  };
}

export async function updateAdminAccount(
  id: number,
  payload: Partial<Pick<AdminAccount, "role" | "status" | "name" | "email">> & {
    meta?: Record<string, unknown>;
  },
) {
  const response = await adminFetch(`/admin/accounts/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json?.message || "Could not update account.");
  }

  return json?.account as AdminAccount;
}
