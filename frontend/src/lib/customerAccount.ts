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

export const CUSTOMER_ACCOUNT_EVENT = "societyflats:customer-account-updated";

export function notifyCustomerAccountChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CUSTOMER_ACCOUNT_EVENT));
}

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
  notifyCustomerAccountChanged();
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

export function createCustomerAccountSession({
  name,
  phone,
  role = "customer",
}: {
  name?: string;
  phone: string;
  role?: CustomerAccountRole;
}) {
  if (typeof window === "undefined") return null;

  const cleanPhone = cleanAccountPhone(phone);
  if (!cleanPhone) return null;

  const session: CustomerAccountSession = {
    role,
    phone: cleanPhone,
    name: String(name || "").trim() || "Customer",
    loginAt: new Date().toISOString(),
  };

  window.localStorage.setItem(ACCOUNT_SESSION_KEY, JSON.stringify(session));
  notifyCustomerAccountChanged();
  return session;
}

export function clearCustomerAccountSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCOUNT_SESSION_KEY);
  notifyCustomerAccountChanged();
}

export type CustomerSavedItemType = "property" | "society";

export type CustomerSavedItem = {
  id: string;
  phone: string;
  type: CustomerSavedItemType;
  title: string;
  slug?: string;
  href: string;
  meta?: string;
  image?: string;
  action: "view" | "shortlist";
  createdAt: string;
  updatedAt: string;
};

const CUSTOMER_SAVED_ITEMS_KEY = "sf_customer_saved_items_v1";

function readAllCustomerSavedItems(): CustomerSavedItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CUSTOMER_SAVED_ITEMS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAllCustomerSavedItems(items: CustomerSavedItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CUSTOMER_SAVED_ITEMS_KEY, JSON.stringify(items.slice(0, 160)));
  notifyCustomerAccountChanged();
}

function savedItemKey(item: Pick<CustomerSavedItem, "type" | "href" | "action">) {
  return `${item.action}:${item.type}:${item.href}`;
}

export function rememberCustomerSavedItem(
  input: Omit<CustomerSavedItem, "id" | "phone" | "createdAt" | "updatedAt"> & {
    phone?: string;
  },
) {
  const session = getCustomerAccountSession();
  const phone = cleanAccountPhone(input.phone || session?.phone);
  if (!phone) return null;

  const now = new Date().toISOString();
  const allItems = readAllCustomerSavedItems();
  const key = savedItemKey(input);

  const existing = allItems.find((item) => item.phone === phone && savedItemKey(item) === key);

  const nextItem: CustomerSavedItem = {
    id: existing?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    phone,
    type: input.type,
    title: input.title,
    slug: input.slug,
    href: input.href,
    meta: input.meta,
    image: input.image,
    action: input.action,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  const nextItems = [
    nextItem,
    ...allItems.filter((item) => !(item.phone === phone && savedItemKey(item) === key)),
  ];

  writeAllCustomerSavedItems(nextItems);
  return nextItem;
}

export function getCustomerSavedItemsForPhone(phone: unknown, action?: CustomerSavedItem["action"]) {
  const cleanPhone = cleanAccountPhone(phone);
  if (!cleanPhone) return [];

  return readAllCustomerSavedItems()
    .filter((item) => cleanAccountPhone(item.phone) === cleanPhone)
    .filter((item) => (action ? item.action === action : true))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function isCustomerItemShortlisted(type: CustomerSavedItemType, href: string, phone?: string) {
  const session = getCustomerAccountSession();
  const cleanPhone = cleanAccountPhone(phone || session?.phone);
  if (!cleanPhone) return false;

  return readAllCustomerSavedItems().some(
    (item) =>
      cleanAccountPhone(item.phone) === cleanPhone &&
      item.action === "shortlist" &&
      item.type === type &&
      item.href === href,
  );
}

export function toggleCustomerShortlist(
  input: Omit<CustomerSavedItem, "id" | "phone" | "createdAt" | "updatedAt" | "action"> & {
    phone?: string;
  },
) {
  const session = getCustomerAccountSession();
  const phone = cleanAccountPhone(input.phone || session?.phone);
  if (!phone) return { saved: false, item: null };

  const allItems = readAllCustomerSavedItems();
  const href = input.href;
  const exists = allItems.some(
    (item) =>
      cleanAccountPhone(item.phone) === phone &&
      item.action === "shortlist" &&
      item.type === input.type &&
      item.href === href,
  );

  if (exists) {
    writeAllCustomerSavedItems(
      allItems.filter(
        (item) =>
          !(
            cleanAccountPhone(item.phone) === phone &&
            item.action === "shortlist" &&
            item.type === input.type &&
            item.href === href
          ),
      ),
    );
    return { saved: false, item: null };
  }

  const item = rememberCustomerSavedItem({
    ...input,
    phone,
    action: "shortlist",
  });

  return { saved: true, item };
}

export type BrokerActivityKind = "partner" | "listing" | "requirement";

export type BrokerActivityItem = {
  id: string;
  phone: string;
  name?: string;
  source?: string;
  role?: string;
  society?: string;
  title: string;
  message?: string;
  status: string;
  kind: BrokerActivityKind;
  createdAt: string;
  backendLeadId?: string | number | null;
};

const BROKER_ACTIVITY_KEY = "sf_broker_activity_v1";

function readAllBrokerActivity(): BrokerActivityItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(BROKER_ACTIVITY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAllBrokerActivity(items: BrokerActivityItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BROKER_ACTIVITY_KEY, JSON.stringify(items.slice(0, 120)));
  notifyCustomerAccountChanged();
}

function brokerKindFromPayload(payload: Record<string, unknown>): BrokerActivityKind {
  const role = String(payload.role || payload.partner_role || payload.message || "").toLowerCase();
  const source = String(payload.source || "").toLowerCase();

  if (source.includes("broker") || role.includes("broker")) return "partner";
  if (role.includes("owner") || role.includes("listing") || role.includes("inventory")) return "listing";

  return "requirement";
}

function brokerTitleFromPayload(payload: Record<string, unknown>) {
  const role = String(payload.role || payload.partner_role || "").trim();
  const society = String(payload.society_name || payload.society || "").trim();
  const message = String(payload.message || "").trim();

  if (role && society) return `${role} · ${society}`;
  if (society) return `Broker submission for ${society}`;
  if (role) return `${role} broker submission`;
  if (message) return message.split("\n").find(Boolean)?.slice(0, 80) || "Broker partner submission";

  return "Broker partner submission";
}

export function rememberBrokerActivitySubmission(
  payload: Record<string, unknown>,
  response?: Record<string, unknown>,
) {
  const payloadPhone = cleanAccountPhone(payload.phone);
  const session = getCustomerAccountSession();
  const sessionPhone = cleanAccountPhone(session?.phone);

  const phone = payloadPhone || sessionPhone;
  if (!phone) return;

  const backendLead =
    (response?.lead as Record<string, unknown> | undefined) ||
    (response?.data as Record<string, unknown> | undefined) ||
    response ||
    {};

  const item: BrokerActivityItem = {
    id: String(
      backendLead?.id ||
        response?.id ||
        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ),
    backendLeadId: (backendLead?.id as string | number | undefined) || (response?.id as string | number | undefined) || null,
    phone,
    name: String(payload.name || session?.name || "").trim(),
    source: String(payload.source || "").trim(),
    role: String(payload.role || payload.partner_role || "").trim(),
    society: String(payload.society_name || payload.society || "").trim(),
    title: brokerTitleFromPayload(payload),
    message: String(payload.message || "").trim(),
    status: "Submitted",
    kind: brokerKindFromPayload(payload),
    createdAt: new Date().toISOString(),
  };

  const existing = readAllBrokerActivity();
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

  writeAllBrokerActivity([item, ...withoutDuplicate]);
}

export function getBrokerActivityForPhone(phone: unknown) {
  const cleanPhone = cleanAccountPhone(phone);
  if (!cleanPhone) return [];

  return readAllBrokerActivity()
    .filter((item) => cleanAccountPhone(item.phone) === cleanPhone)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
