export type CustomerAccountRole = "customer" | "broker";

export type CustomerAccountSession = {
  role?: CustomerAccountRole;
  phone?: string;
  name?: string;
  loginAt?: string;
};

export type CustomerActivityLead = {
  id: string;
  phone: string;
  name?: string;
  source?: string;
  title: string;
  society?: string;
  propertyTitle?: string;
  requirement?: string;
  budget?: string;
  status: string;
  createdAt: string;
  kind: "listing" | "enquiry";
  backendLeadId?: string | number | null;
};

const ACCOUNT_SESSION_KEY = "sf_account_session";
const CUSTOMER_LEADS_KEY = "sf_customer_leads_v1";

export function cleanAccountPhone(value: unknown) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

export function getCustomerAccountSession(): CustomerAccountSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(ACCOUNT_SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CustomerAccountSession;
    return {
      ...parsed,
      phone: cleanAccountPhone(parsed.phone),
    };
  } catch {
    return null;
  }
}

function readAllCustomerLeads(): CustomerActivityLead[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CUSTOMER_LEADS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAllCustomerLeads(items: CustomerActivityLead[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CUSTOMER_LEADS_KEY, JSON.stringify(items.slice(0, 80)));
}

function isOwnerListingSource(source: unknown) {
  const value = String(source || "").toLowerCase();
  return value.includes("owner_listing") || value.includes("owner listing");
}

function leadTitleFromPayload(payload: Record<string, unknown>) {
  const propertyTitle = String(payload.property_title || "").trim();
  const societyName = String(payload.society_name || "").trim();
  const requirement = String(payload.requirement || "").trim();

  if (propertyTitle) return propertyTitle;
  if (societyName && requirement) return `${requirement} · ${societyName}`;
  if (societyName) return `Enquiry for ${societyName}`;
  if (requirement) return requirement;

  return "SocietyFlats enquiry";
}

export function rememberCustomerLeadSubmission(
  payload: Record<string, unknown>,
  response?: Record<string, unknown>,
) {
  const payloadPhone = cleanAccountPhone(payload.phone);
  const session = getCustomerAccountSession();
  const sessionPhone = cleanAccountPhone(session?.phone);

  const phone = payloadPhone || sessionPhone;
  if (!phone) return;

  const source = String(payload.source || "");
  const kind: CustomerActivityLead["kind"] = isOwnerListingSource(source) ? "listing" : "enquiry";
  const backendLead =
    (response?.lead as Record<string, unknown> | undefined) ||
    (response?.data as Record<string, unknown> | undefined) ||
    response ||
    {};

  const item: CustomerActivityLead = {
    id: String(
      backendLead?.id ||
        response?.id ||
        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ),
    backendLeadId: (backendLead?.id as string | number | undefined) || (response?.id as string | number | undefined) || null,
    phone,
    name: String(payload.name || session?.name || "").trim(),
    source,
    title: leadTitleFromPayload(payload),
    society: String(payload.society_name || "").trim(),
    propertyTitle: String(payload.property_title || "").trim(),
    requirement: String(payload.requirement || "").trim(),
    budget: String(payload.budget || "").trim(),
    status: "Submitted",
    createdAt: new Date().toISOString(),
    kind,
  };

  const existing = readAllCustomerLeads();
  const withoutDuplicate = existing.filter((lead) => {
    if (item.backendLeadId && lead.backendLeadId) {
      return String(lead.backendLeadId) !== String(item.backendLeadId);
    }

    return !(
      lead.phone === item.phone &&
      lead.title === item.title &&
      lead.kind === item.kind &&
      Math.abs(new Date(lead.createdAt).getTime() - new Date(item.createdAt).getTime()) < 5000
    );
  });

  writeAllCustomerLeads([item, ...withoutDuplicate]);
}

export function getCustomerLeadsForPhone(phone: unknown) {
  const cleanPhone = cleanAccountPhone(phone);
  if (!cleanPhone) return [];

  return readAllCustomerLeads().filter((lead) => cleanAccountPhone(lead.phone) === cleanPhone);
}

export function clearCustomerAccountSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCOUNT_SESSION_KEY);
}
