import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Home,
  Loader2,
  Phone,
  Search,
  ShieldAlert,
  UserRound,
  Users,
} from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  listAdminAccounts,
  updateAdminAccount,
  type AdminAccount,
  type AdminAccountRole,
  type AdminAccountStatus,
} from "@/lib/adminAccountStore";
import { cn } from "@/lib/utils";

function cleanPhone(value?: string | null) {
  return String(value || "").replace(/[^0-9]/g, "").slice(-10);
}

function formatDate(value?: string | null) {
  if (!value) return "Not yet";

  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Not yet";
  }
}

function humanize(value?: string | null) {
  if (!value) return "Website account";

  const labels: Record<string, string> = {
    login_page: "Login page",
    login_page_otp_fallback: "OTP fallback login",
    broker_crm_signup: "Broker CRM signup",
    sell_page_owner_listing: "Owner listing form",
    owner_listing_submission: "Owner listing form",
    public_broker_crm: "Broker partner form",
  };

  return labels[value] || value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sourceLabel(account: AdminAccount) {
  const meta = account.meta || {};
  const rawSource =
    meta.source ||
    meta.signupSource ||
    meta.ownerListingSignup ||
    meta.brokerSignupSource ||
    meta.workingAreas ||
    "Website account";

  return humanize(String(rawSource));
}

function roleBadgeClass(role: string) {
  return role === "broker"
    ? "border-orange-100 bg-orange-50 text-orange-700"
    : "border-blue-100 bg-blue-50 text-blue-700";
}

function statusBadgeClass(status: string) {
  if (status === "blocked") return "border-red-100 bg-red-50 text-red-700";
  if (status === "otp_pending") return "border-amber-100 bg-amber-50 text-amber-700";
  return "border-emerald-100 bg-emerald-50 text-emerald-700";
}

function latestByDate<T extends { created_at?: string | null; updated_at?: string | null }>(items?: T[]) {
  if (!items?.length) return null;

  return [...items].sort((first, second) => {
    const firstDate = new Date(first.updated_at || first.created_at || 0).getTime();
    const secondDate = new Date(second.updated_at || second.created_at || 0).getTime();

    return secondDate - firstDate;
  })[0];
}

function AccountCard({
  account,
  expanded,
  onToggleExpand,
  onUpdate,
  updatingId,
}: {
  account: AdminAccount;
  expanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (id: number, payload: Partial<Pick<AdminAccount, "role" | "status">>) => void;
  updatingId: number | null;
}) {
  const isUpdating = updatingId === account.id;
  const RoleIcon = account.role === "broker" ? BriefcaseBusiness : UserRound;
  const leadCount = account.related_counts?.leads || account.related_leads?.length || 0;
  const listingCount = account.related_counts?.properties || account.related_properties?.length || 0;
  const latestLead = latestByDate(account.related_leads);
  const latestListing = latestByDate(account.related_properties);
  const phone = account.phone || account.phone_normalized;

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-100 hover:shadow-md sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn("rounded-full border px-3 py-1 text-xs font-bold", roleBadgeClass(account.role))}>
              <RoleIcon className="mr-1 h-3.5 w-3.5" />
              {account.role === "broker" ? "Broker" : "Owner / Customer"}
            </Badge>

            <Badge className={cn("rounded-full border px-3 py-1 text-xs font-bold", statusBadgeClass(account.status))}>
              {humanize(account.status)}
            </Badge>

            {account.phone_verified_at ? (
              <Badge className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                Phone verified
              </Badge>
            ) : (
              <Badge className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                Phone not verified
              </Badge>
            )}
          </div>

          <h3 className="mt-3 break-words text-lg font-black text-slate-950">
            {account.name || "Unnamed account"}
          </h3>

          <div className="mt-2 grid gap-1 text-sm leading-6 text-slate-500">
            <p className="flex flex-wrap items-center gap-2">
              <Phone className="h-4 w-4 text-slate-400" />
              {phone || "No phone"}
            </p>
            <p>Email: {account.email || "Not provided"}</p>
            <p>Source: {sourceLabel(account)}</p>
            <p>Last login: {formatDate(account.last_login_at)}</p>
            <p>Verified phone: {formatDate(account.phone_verified_at)}</p>
            <p>Created: {formatDate(account.created_at)}</p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
              <p className="text-2xl font-black text-blue-700">{leadCount}</p>
              <p className="text-xs font-bold text-blue-700">Linked leads</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-2xl font-black text-emerald-700">{listingCount}</p>
              <p className="text-xs font-bold text-emerald-700">Linked listings / drafts</p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
            <p className="font-black">Admin-only routing note</p>
            <p className="mt-1">
              These records are visible to admin because they match this account phone/source lead. Owner/broker dashboard visibility is not exposed here yet.
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap gap-2 xl:max-w-[390px] xl:justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={onToggleExpand}
            className="rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            {expanded ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
            {expanded ? "Hide records" : "View records"}
          </Button>

          {latestLead ? (
            <Button asChild size="sm" variant="outline" className="rounded-full border-blue-100 text-blue-700 hover:bg-blue-50">
              <Link to={`/admin/leads/${latestLead.id}`}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Latest lead
              </Link>
            </Button>
          ) : null}

          {latestListing ? (
            <Button asChild size="sm" variant="outline" className="rounded-full border-emerald-100 text-emerald-700 hover:bg-emerald-50">
              <Link to={`/admin/properties/${latestListing.id}/edit`}>
                <Home className="mr-2 h-4 w-4" />
                Latest listing
              </Link>
            </Button>
          ) : null}

          <Button
            size="sm"
            disabled={isUpdating || account.status === "active"}
            onClick={() => onUpdate(account.id, { status: "active" })}
            className="rounded-full bg-emerald-600 hover:bg-emerald-700"
          >
            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Mark active
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={isUpdating || account.status === "blocked"}
            onClick={() => onUpdate(account.id, { status: "blocked" })}
            className="rounded-full border-red-100 bg-white text-red-700 hover:bg-red-50"
          >
            <ShieldAlert className="mr-2 h-4 w-4" />
            Block
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={isUpdating || account.role === "customer"}
            onClick={() => onUpdate(account.id, { role: "customer" })}
            className="rounded-full border-blue-100 bg-white text-blue-700 hover:bg-blue-50"
          >
            Customer
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={isUpdating || account.role === "broker"}
            onClick={() => onUpdate(account.id, { role: "broker" })}
            className="rounded-full border-orange-100 bg-white text-orange-700 hover:bg-orange-50"
          >
            Broker
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-black text-slate-950">Related leads</p>
                <p className="text-xs text-slate-500">All enquiries matched by {cleanPhone(phone) || "phone"}.</p>
              </div>
              <Badge className="rounded-full bg-white text-slate-600">{leadCount}</Badge>
            </div>

            {account.related_leads?.length ? (
              <div className="space-y-3">
                {account.related_leads.map((lead) => (
                  <Link
                    key={lead.id}
                    to={`/admin/leads/${lead.id}`}
                    className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:bg-blue-50/40"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full bg-blue-50 text-blue-700">
                        {lead.status || "Lead"}
                      </Badge>
                      {lead.priority ? (
                        <Badge className="rounded-full bg-rose-50 text-rose-700">
                          {lead.priority}
                        </Badge>
                      ) : null}
                      {lead.requirement ? (
                        <Badge className="rounded-full bg-slate-50 text-slate-600">
                          {lead.requirement}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm font-black text-slate-950">
                      {lead.name || "Unknown lead"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {humanize(lead.source || "Website")} · {lead.society_name || "No society"} · {lead.property_title || "General enquiry"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDate(lead.created_at)}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                No lead is linked to this account phone yet.
              </p>
            )}
          </div>

          <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-black text-slate-950">Related listings / drafts</p>
                <p className="text-xs text-slate-500">Drafts or properties matched by owner/broker phone or source lead.</p>
              </div>
              <Badge className="rounded-full bg-white text-slate-600">{listingCount}</Badge>
            </div>

            {account.related_properties?.length ? (
              <div className="space-y-3">
                {account.related_properties.map((property) => (
                  <Link
                    key={property.id}
                    to={`/admin/properties/${property.id}/edit`}
                    className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:bg-blue-50/40"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full bg-emerald-50 text-emerald-700">
                        {property.status || "Draft"}
                      </Badge>
                      {property.listing_type ? (
                        <Badge className="rounded-full bg-slate-50 text-slate-600">
                          {property.listing_type}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 flex items-center gap-2 text-sm font-black text-slate-950">
                      <Home className="h-4 w-4 text-slate-400" />
                      {property.title || "Untitled property"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {property.society_name || "No society"} · Owner: {property.owner_name || account.name || "Not provided"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Source lead: {property.source_lead_id || "Not linked"} · {formatDate(property.created_at)}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                No listing or draft is linked to this account phone yet.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AdminUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkedAccount = searchParams.get("account") || "";

  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [search, setSearch] = useState(() => cleanPhone(deepLinkedAccount) || deepLinkedAccount);
  const [role, setRole] = useState<"" | AdminAccountRole>("");
  const [status, setStatus] = useState<"" | AdminAccountStatus>("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadAccounts = async (nextSearch = search) => {
    setLoading(true);
    setError("");

    try {
      const result = await listAdminAccounts({ q: nextSearch, role, status, withRelated: true });
      setAccounts(result.accounts);

      if (deepLinkedAccount && result.accounts.length === 1) {
        setExpandedId(result.accounts[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const queryAccount = searchParams.get("account") || "";
    const normalized = cleanPhone(queryAccount) || queryAccount;

    if (normalized && normalized !== search) {
      setSearch(normalized);
      setExpandedId(null);
      void loadAccounts(normalized);
      return;
    }

    void loadAccounts(normalized || search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, status, searchParams]);

  const metrics = useMemo(() => {
    return {
      total: accounts.length,
      customers: accounts.filter((account) => account.role === "customer").length,
      brokers: accounts.filter((account) => account.role === "broker").length,
      linked: accounts.reduce(
        (sum, account) =>
          sum +
          (account.related_counts?.leads || 0) +
          (account.related_counts?.properties || 0),
        0,
      ),
    };
  }, [accounts]);

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams);
    const value = search.trim();

    if (value) {
      params.set("account", value);
    } else {
      params.delete("account");
    }

    setSearchParams(params);
    void loadAccounts(value);
  };

  const clearSearch = () => {
    setSearch("");
    setExpandedId(null);

    const params = new URLSearchParams(searchParams);
    params.delete("account");
    setSearchParams(params);

    void loadAccounts("");
  };

  const handleUpdate = async (
    id: number,
    payload: Partial<Pick<AdminAccount, "role" | "status">>,
  ) => {
    setUpdatingId(id);
    setError("");
    setNotice("");

    try {
      const updated = await updateAdminAccount(id, payload);
      setAccounts((items) =>
        items.map((item) =>
          item.id === id
            ? {
                ...item,
                ...updated,
                related_counts: item.related_counts,
                related_leads: item.related_leads,
                related_properties: item.related_properties,
              }
            : item,
        ),
      );
      setNotice("Account updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update account.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AdminLayout title="Users" subtitle="Admin account linkage for owners, brokers, leads and submitted listings">
      <div className="space-y-6">
        <section className="grid gap-3 md:grid-cols-4">
          {[
            ["Total accounts", metrics.total, Users, "bg-slate-50 text-slate-700"],
            ["Owners / Customers", metrics.customers, UserRound, "bg-blue-50 text-blue-700"],
            ["Brokers", metrics.brokers, BriefcaseBusiness, "bg-orange-50 text-orange-700"],
            ["Linked records", metrics.linked, CheckCircle2, "bg-emerald-50 text-emerald-700"],
          ].map(([label, value, Icon, tone]) => {
            const IconComponent = Icon as typeof Users;

            return (
              <div key={String(label)} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", String(tone))}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <p className="text-3xl font-black text-slate-950">{String(value)}</p>
                </div>
                <p className="mt-4 text-sm font-bold text-slate-950">{String(label)}</p>
              </div>
            );
          })}
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          {deepLinkedAccount ? (
            <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
              <p className="font-black">Deep-linked account search</p>
              <p className="mt-1">
                Showing accounts matched from lead phone: <span className="font-bold">{cleanPhone(deepLinkedAccount) || deepLinkedAccount}</span>
              </p>
            </div>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto_auto]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSearch();
                }}
                className="h-12 rounded-2xl pl-11"
                placeholder="Search name, phone, email, source, role or status"
              />
            </div>

            <select
              value={role}
              onChange={(event) => setRole(event.target.value as "" | AdminAccountRole)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
            >
              <option value="">All roles</option>
              <option value="customer">Owners / Customers</option>
              <option value="broker">Brokers</option>
            </select>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as "" | AdminAccountStatus)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
            >
              <option value="">All status</option>
              <option value="active">Active</option>
              <option value="otp_pending">OTP pending</option>
              <option value="blocked">Blocked</option>
            </select>

            <Button onClick={handleSearch} className="h-12 rounded-2xl bg-blue-700 px-6 hover:bg-blue-800">
              Search
            </Button>

            <Button onClick={clearSearch} variant="outline" className="h-12 rounded-2xl border-slate-200 px-6">
              Clear
            </Button>
          </div>

          {notice ? (
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}
        </section>

        <section className="space-y-3">
          {loading ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">
              <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-blue-700" />
              Loading accounts...
            </div>
          ) : accounts.length ? (
            accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                expanded={expandedId === account.id}
                onToggleExpand={() => setExpandedId(expandedId === account.id ? null : account.id)}
                onUpdate={handleUpdate}
                updatingId={updatingId}
              />
            ))
          ) : (
            <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-50 text-slate-500">
                <Users className="h-7 w-7" />
              </div>
              <p className="mt-4 text-lg font-black text-slate-950">No accounts found</p>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Try another phone, clear the filters, or wait until the owner/customer/broker logs in, submits a listing, or completes broker signup.
              </p>
              <Button onClick={clearSearch} variant="outline" className="mt-5 rounded-full border-slate-200">
                Clear search and show all accounts
              </Button>
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <ArrowRight className="h-5 w-5" />
            </div>
            <div>
              <p className="font-black text-slate-950">C112A admin-only routing checkpoint</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Open a lead, use Linked account → Open in Users, then review all related leads/listings by phone/source lead. Owner/broker dashboard exposure remains intentionally locked until account-scoped APIs are added.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
