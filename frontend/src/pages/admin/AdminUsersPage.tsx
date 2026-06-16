import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CheckCircle2,
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

function sourceLabel(account: AdminAccount) {
  const meta = account.meta || {};
  return String(meta.source || meta.ownerListingSignup || meta.workingAreas || "Website account");
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

function AccountCard({
  account,
  onUpdate,
  updatingId,
}: {
  account: AdminAccount;
  onUpdate: (id: number, payload: Partial<Pick<AdminAccount, "role" | "status">>) => void;
  updatingId: number | null;
}) {
  const isUpdating = updatingId === account.id;
  const RoleIcon = account.role === "broker" ? BriefcaseBusiness : UserRound;

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-100 hover:shadow-md">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn("rounded-full border px-3 py-1 text-xs font-bold", roleBadgeClass(account.role))}>
              <RoleIcon className="mr-1 h-3.5 w-3.5" />
              {account.role === "broker" ? "Broker" : "Customer"}
            </Badge>
            <Badge className={cn("rounded-full border px-3 py-1 text-xs font-bold", statusBadgeClass(account.status))}>
              {account.status}
            </Badge>
          </div>

          <h3 className="mt-3 break-words text-lg font-black text-slate-950">
            {account.name || "Unnamed account"}
          </h3>

          <div className="mt-2 grid gap-1 text-sm leading-6 text-slate-500">
            <p className="flex flex-wrap items-center gap-2">
              <Phone className="h-4 w-4 text-slate-400" />
              {account.phone || account.phone_normalized}
            </p>
            <p>Email: {account.email || "Not provided"}</p>
            <p>Source: {sourceLabel(account)}</p>
            <p>Last login: {formatDate(account.last_login_at)}</p>
            <p>Created: {formatDate(account.created_at)}</p>
          </div>
        </div>

        <div className="flex min-w-[240px] flex-wrap gap-2 xl:justify-end">
          <Button
            size="sm"
            disabled={isUpdating || account.status === "active"}
            onClick={() => onUpdate(account.id, { status: "active" })}
            className="rounded-full bg-emerald-600 hover:bg-emerald-700"
          >
            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Active
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
    </div>
  );
}

export function AdminUsersPage() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"" | AdminAccountRole>("");
  const [status, setStatus] = useState<"" | AdminAccountStatus>("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadAccounts = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await listAdminAccounts({ q: search, role, status });
      setAccounts(result.accounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, status]);

  const metrics = useMemo(() => {
    return {
      total: accounts.length,
      customers: accounts.filter((account) => account.role === "customer").length,
      brokers: accounts.filter((account) => account.role === "broker").length,
      blocked: accounts.filter((account) => account.status === "blocked").length,
    };
  }, [accounts]);

  const handleSearch = () => {
    loadAccounts();
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
      setAccounts((items) => items.map((item) => (item.id === id ? updated : item)));
      setNotice("Account updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update account.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AdminLayout title="Users" subtitle="Manage real customer and broker accounts from C47">
      <div className="space-y-6">
        <section className="grid gap-3 md:grid-cols-4">
          {[
            ["Total accounts", metrics.total, Users, "bg-slate-50 text-slate-700"],
            ["Customers", metrics.customers, UserRound, "bg-blue-50 text-blue-700"],
            ["Brokers", metrics.brokers, BriefcaseBusiness, "bg-orange-50 text-orange-700"],
            ["Blocked", metrics.blocked, ShieldAlert, "bg-red-50 text-red-700"],
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
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSearch();
                }}
                className="h-12 rounded-2xl pl-11"
                placeholder="Search name, phone, email, role or status"
              />
            </div>

            <select
              value={role}
              onChange={(event) => setRole(event.target.value as "" | AdminAccountRole)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
            >
              <option value="">All roles</option>
              <option value="customer">Customers</option>
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
                onUpdate={handleUpdate}
                updatingId={updatingId}
              />
            ))
          ) : (
            <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
              <p className="text-lg font-semibold text-slate-950">No accounts found</p>
              <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
                Customer and broker accounts will appear here after login, owner listing or broker signup.
              </p>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
