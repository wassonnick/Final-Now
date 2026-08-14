import { cleanAccountPhone, type CustomerAccountRole } from "./customerAccount";
import { API_BASE_URL } from "@/config/api";

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
  email_verified_at?: string | null;
  meta?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
  has_account_token?: boolean;
};

export type AccountDelivery = {
  attempted?: boolean;
  delivered?: boolean;
  provider?: string;
  channel?: "sms" | "whatsapp" | "email" | string;
};

export type AccountResponse = {
  message?: string;
  existing?: boolean;
  account?: BackendAccount;
  delivery?: AccountDelivery;
  dev_otp?: string | null;
  account_access_token?: string | null;
};

async function postJson<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      "The secure login service is temporarily unreachable. Please wait a moment and request a new OTP.",
    );
  }

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

export async function requestAccountOtp(payload: AccountSyncPayload & { channel?: "sms" | "whatsapp" | "email" }) {
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

/**
 * The signed-in account.
 *
 * Replaces fetchAccountByPhone, which asked the server for whoever owned a given number and
 * got back their name and email without proving anything. Signup no longer needs it: the
 * sync response says whether the number is taken, which is all a signup form should learn.
 */
export async function fetchMyAccount(accountAccessToken?: string | null) {
  if (!accountAccessToken) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/accounts/me`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${accountAccessToken}` },
    });

    if (!response.ok) return null;

    return await response.json();
  } catch (error) {
    console.warn("Account fetch skipped:", error);
    return null;
  }
}


export type AccountDashboardLead = {
  id: number;
  source?: string | null;
  society_name?: string | null;
  society_slug?: string | null;
  locality?: string | null;
  property_title?: string | null;
  requirement?: string | null;
  budget?: string | null;
  status?: string | null;
  lead_intent?: string | null;
  entity_type?: string | null;
  entity_slug?: string | null;
  property_slug?: string | null;
  linked_properties_count?: number;
  linked_properties?: AccountDashboardProperty[];
  created_at?: string | null;
  updated_at?: string | null;
};

export type AccountDashboardProperty = {
  id: number;
  title?: string | null;
  slug?: string | null;
  society_name?: string | null;
  listing_type?: string | null;
  status?: string | null;
  owner_verification_status?: string | null;
  source_lead_id?: number | string | null;
  price?: string | null;
  bedrooms?: string | null;
  bathrooms?: string | null;
  area_sqft?: string | null;
  furnished_status?: string | null;
  verified?: boolean;
  public_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AccountDashboardResponse = {
  account?: BackendAccount;
  scope?: {
    role?: CustomerAccountRole;
    phone_normalized?: string;
    privacy?: string;
  };
  summary?: {
    owner_listing_leads?: number;
    broker_submissions?: number;
    linked_properties?: number;
  };
  owner_listing_leads?: AccountDashboardLead[];
  broker_submissions?: AccountDashboardLead[];
  linked_properties?: AccountDashboardProperty[];
  site_visits?: Array<{
    id: number;
    status: string;
    selected_slot?: string | null;
    proposed_slots?: string[] | null;
    confirmation_token?: string;
    society_name?: string | null;
    society_slug?: string | null;
  }>;
};

export async function fetchAccountDashboard(accountAccessToken?: string | null) {
  const token = String(accountAccessToken || "").trim();
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/accounts/dashboard`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return null;

    return (await response.json()) as AccountDashboardResponse;
  } catch (error) {
    console.warn("Account dashboard fetch skipped:", error);
    return null;
  }
}

export type ReferralItem = {
  id: number;
  name: string;
  phone_last4: string;
  intent: "rent" | "buy" | "sell";
  status: string;
  reward_status: string;
  created_at?: string | null;
};

export type ReferralResponse = {
  referral_code?: string;
  policy?: string;
  summary?: { submitted?: number; qualified?: number; converted?: number };
  data?: ReferralItem[];
  message?: string;
};

export async function fetchReferrals(accountAccessToken?: string | null) {
  const token = String(accountAccessToken || "").trim();
  if (!token) throw new Error("Login with OTP to access referrals.");
  const response = await fetch(`${API_BASE_URL}/accounts/referrals`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(json?.message || "Could not load referrals."));
  return json as ReferralResponse;
}

export async function submitReferral(accountAccessToken: string | null | undefined, payload: { name: string; phone: string; intent: "rent" | "buy" | "sell"; notes?: string }) {
  const token = String(accountAccessToken || "").trim();
  if (!token) throw new Error("Login with OTP to submit a referral.");
  const response = await fetch(`${API_BASE_URL}/accounts/referrals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(json?.message || "Could not submit referral."));
  return json as ReferralResponse;
}

/**
 * Ends this device's session on the server, then locally.
 *
 * Signing out only ever cleared localStorage, so the token itself stayed valid — a phone
 * that was lost, sold or borrowed remained signed in with nothing to revoke. The local
 * clear still happens even when the request fails, because a person who pressed sign out
 * must not be left looking signed in.
 */
export async function signOutAccount(accountAccessToken?: string | null, everywhere = false) {
  if (!accountAccessToken) return;

  try {
    await fetch(`${API_BASE_URL}/accounts/${everywhere ? "logout-all" : "logout"}`, {
      method: "POST",
      headers: { Accept: "application/json", Authorization: `Bearer ${accountAccessToken}` },
      keepalive: true,
    });
  } catch (error) {
    console.warn("Sign out could not reach the server:", error);
  }
}

export async function fetchAccountSessions(accountAccessToken?: string | null) {
  if (!accountAccessToken) return [];

  try {
    const response = await fetch(`${API_BASE_URL}/accounts/sessions`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${accountAccessToken}` },
    });
    if (!response.ok) return [];
    return ((await response.json())?.sessions ?? []) as Array<{
      id: number; device: string | null; last_used_at: string | null; expires_at: string | null; is_current: boolean;
    }>;
  } catch {
    return [];
  }
}

export async function revokeAccountSession(accountAccessToken: string | null | undefined, sessionId: number) {
  if (!accountAccessToken) return;

  await fetch(`${API_BASE_URL}/accounts/sessions/${sessionId}`, {
    method: "DELETE",
    headers: { Accept: "application/json", Authorization: `Bearer ${accountAccessToken}` },
  });
}
