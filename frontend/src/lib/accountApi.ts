import { cleanAccountPhone, type CustomerAccountRole } from "./customerAccount";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://final-now.onrender.com/api";

export type AccountSyncPayload = {
  role: CustomerAccountRole;
  phone: string;
  name?: string;
  email?: string;
  source?: string;
  meta?: Record<string, unknown>;
};

export type BackendAccount = {
  id: number;
  role: CustomerAccountRole;
  phone: string;
  phone_normalized: string;
  name?: string | null;
  email?: string | null;
  status?: string | null;
  last_login_at?: string | null;
  phone_verified_at?: string | null;
  meta?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AccountDelivery = {
  attempted?: boolean;
  delivered?: boolean;
  provider?: string;
  channel?: "sms" | "whatsapp" | string;
};

export type AccountResponse = {
  message?: string;
  account?: BackendAccount;
  delivery?: AccountDelivery;
  dev_otp?: string | null;
};

async function postJson<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(String(json?.message || "Account request failed."));
  }

  return json as T;
}

export async function syncAccountToBackend(payload: AccountSyncPayload) {
  const phone = cleanAccountPhone(payload.phone);
  if (!phone) return null;

  try {
    return await postJson<AccountResponse>("/accounts/upsert", {
      ...payload,
      phone,
    });
  } catch (error) {
    console.warn("Account backend sync skipped:", error);
    return null;
  }
}

export async function requestAccountOtp(payload: AccountSyncPayload & { channel?: "sms" | "whatsapp" }) {
  const phone = cleanAccountPhone(payload.phone);

  return postJson<AccountResponse>("/accounts/request-otp", {
    ...payload,
    phone,
    channel: payload.channel || "sms",
  });
}

export async function verifyAccountOtp({
  role,
  phone,
  otp,
}: {
  role: CustomerAccountRole;
  phone: string;
  otp: string;
}) {
  return postJson<AccountResponse>("/accounts/verify-otp", {
    role,
    phone: cleanAccountPhone(phone),
    otp,
  });
}

export async function fetchAccountByPhone(phone: string) {
  const cleanPhone = cleanAccountPhone(phone);
  if (!cleanPhone) return null;

  try {
    const response = await fetch(`${API_BASE}/accounts/me?phone=${encodeURIComponent(cleanPhone)}`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) return null;

    return await response.json();
  } catch (error) {
    console.warn("Account fetch skipped:", error);
    return null;
  }
}
