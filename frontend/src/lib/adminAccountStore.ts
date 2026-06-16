import { adminFetch } from "@/lib/adminApi";

export type AdminAccountRole = "customer" | "broker";
export type AdminAccountStatus = "active" | "otp_pending" | "blocked";

export type AdminRelatedLead = {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  status: string | null;
  priority: string | null;
  requirement: string | null;
  budget: string | null;
  society_name: string | null;
  property_title: string | null;
  created_at: string | null;
  linked_properties_count?: number;
};

export type AdminRelatedProperty = {
  id: number;
  title: string | null;
  slug: string | null;
  status: string | null;
  listing_type: string | null;
  society_name: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  source_lead_id: number | string | null;
  created_at: string | null;
  updated_at: string | null;
};

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
  related_counts?: {
    leads?: number;
    properties?: number;
  };
  related_leads?: AdminRelatedLead[];
  related_properties?: AdminRelatedProperty[];
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
  withRelated = true,
}: {
  q?: string;
  role?: string;
  status?: string;
  withRelated?: boolean;
} = {}) {
  const params = new URLSearchParams();

  if (q.trim()) params.set("q", q.trim());
  if (role) params.set("role", role);
  if (status) params.set("status", status);
  params.set("per_page", "100");
  params.set("with_related", withRelated ? "1" : "0");

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

export async function fetchAdminAccount(id: number) {
  const response = await adminFetch(`/admin/accounts/${id}`);
  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json?.message || "Could not load account.");
  }

  return json?.account as AdminAccount;
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
