import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  Home,
  MessageSquareText,
  Plus,
  RefreshCw,
  Search,
  Target,
  Users,
} from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/adminApi";
import { AdminLead, fetchAdminLeads, listAdminLeads } from "@/lib/adminLeadStore";

type AdminStats = {
  societies: number;
  featured_societies: number;
  properties: number;
  live_properties: number;
};

const emptyStats: AdminStats = {
  societies: 0,
  featured_societies: 0,
  properties: 0,
  live_properties: 0,
};

function isToday(value?: string) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toDateString() === new Date().toDateString();
}

function isOpenLead(lead: AdminLead) {
  return !["Booked", "Lost"].includes(lead.status);
}

function isHotLead(lead: AdminLead) {
  return lead.priority === "Hot";
}

function followUpState(lead: AdminLead) {
  if (!lead.followUpAt) return "not_set";

  const date = new Date(lead.followUpAt);
  if (Number.isNaN(date.getTime())) return "not_set";

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  if (date.getTime() < now.getTime() && !sameDay) return "overdue";
  if (sameDay) return "today";

  return "upcoming";
}

function formatLeadDate(value?: string) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actionCardClass(featured = false) {
  return featured
    ? "group rounded-[28px] border border-blue-100 bg-blue-600 p-5 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    : "group rounded-[28px] border border-slate-200 bg-white p-5 text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-lg";
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState(emptyStats);
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [leadLoading, setLeadLoading] = useState(true);
  const [error, setError] = useState("");
  const [leadError, setLeadError] = useState("");

  const loadStats = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await adminFetch("/admin/stats");
      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json?.message || "Stats request failed");
      }

      setStats({ ...emptyStats, ...json });
    } catch (err) {
      console.error(err);
      setError("Unable to load live dashboard stats.");
    } finally {
      setLoading(false);
    }
  };

  const loadLeads = async () => {
    try {
      setLeadLoading(true);
      setLeadError("");

      const apiLeads = await fetchAdminLeads();
      setLeads(apiLeads);
    } catch (err) {
      console.error(err);
      setLeads(listAdminLeads());
      setLeadError("Unable to load live lead summary.");
    } finally {
      setLeadLoading(false);
    }
  };

  useEffect(() => {
    void loadStats();
    void loadLeads();
  }, []);

  const leadSummary = useMemo(() => {
    return {
      total: leads.length,
      today: leads.filter((lead) => isToday(lead.createdAt)).length,
      open: leads.filter(isOpenLead).length,
      hot: leads.filter(isHotLead).length,
      booked: leads.filter((lead) => lead.status === "Booked").length,
      followUps: leads.filter((lead) => Boolean(lead.followUpAt)).length,
      followUpsToday: leads.filter((lead) => followUpState(lead) === "today").length,
      overdue: leads.filter((lead) => followUpState(lead) === "overdue").length,
    };
  }, [leads]);

  const recentLeads = useMemo(() => leads.slice(0, 5), [leads]);

  const draftProperties = Math.max(stats.properties - stats.live_properties, 0);

  return (
    <AdminLayout
      title="Dashboard"
      subtitle="SocietyFlats command center"
    >
      <div className="space-y-6">
        {(error || leadError) ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-700">
            {error || leadError}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Link to="/admin/leads?view=today" className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Today</p>
                <p className="mt-3 text-4xl font-bold text-slate-950">
                  {leadLoading ? "-" : leadSummary.today}
                </p>
                <p className="mt-2 text-sm text-blue-600">New enquiries</p>
              </div>
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                <MessageSquareText className="h-6 w-6" />
              </div>
            </div>
          </Link>

          <Link to="/admin/leads?view=active" className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Active Leads</p>
                <p className="mt-3 text-4xl font-bold text-slate-950">
                  {leadLoading ? "-" : leadSummary.open}
                </p>
                <p className="mt-2 text-sm text-blue-600">In pipeline</p>
              </div>
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </Link>

          <Link to="/admin/leads?view=followups" className="rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Follow-ups</p>
                <p className="mt-3 text-4xl font-bold text-slate-950">
                  {leadLoading ? "-" : leadSummary.followUpsToday}
                </p>
                <p className="mt-2 text-sm text-emerald-600">Due today</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                <RefreshCw className="h-6 w-6" />
              </div>
            </div>
          </Link>

          <Link to="/admin/leads?view=overdue" className="rounded-[28px] border border-rose-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Overdue</p>
                <p className="mt-3 text-4xl font-bold text-slate-950">
                  {leadLoading ? "-" : leadSummary.overdue}
                </p>
                <p className="mt-2 text-sm text-rose-600">Needs action</p>
              </div>
              <div className="rounded-2xl bg-rose-50 p-3 text-rose-600">
                <Target className="h-6 w-6" />
              </div>
            </div>
          </Link>

          <Link to="/admin/leads?view=hot" className="rounded-[28px] border border-rose-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Hot Leads</p>
                <p className="mt-3 text-4xl font-bold text-slate-950">
                  {leadLoading ? "-" : leadSummary.hot}
                </p>
                <p className="mt-2 text-sm text-rose-600">Priority follow-ups</p>
              </div>
              <div className="rounded-2xl bg-rose-50 p-3 text-rose-600">
                <Target className="h-6 w-6" />
              </div>
            </div>
          </Link>

          <Link to="/admin/leads?view=booked" className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Booked</p>
                <p className="mt-3 text-4xl font-bold text-slate-950">
                  {leadLoading ? "-" : leadSummary.booked}
                </p>
                <p className="mt-2 text-sm text-blue-600">Closed wins</p>
              </div>
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                <BarChart3 className="h-6 w-6" />
              </div>
            </div>
          </Link>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                  Live inventory snapshot
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Real counts from the deployed backend.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="rounded-full border-slate-200"
                onClick={() => {
                  void loadStats();
                  void loadLeads();
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                ["Live properties", stats.live_properties, "Visible publicly", "/admin/properties"],
                ["Draft / hidden", draftProperties, "Admin only", "/admin/properties"],
                ["Societies", stats.societies, "Backend profiles", "/admin/societies"],
                ["Today leads", leadSummary.today, "Fresh enquiries", "/admin/leads"],
              ].map(([label, value, meta, href]) => (
                <Link
                  key={String(label)}
                  to={String(href)}
                  className="rounded-[24px] bg-slate-50 p-5 transition hover:bg-blue-50"
                >
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-3 text-3xl font-bold text-slate-950">
                    {loading && label !== "Today leads" ? "-" : value}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">{meta}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">
              Quick actions
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Jump directly into the most common admin tasks.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link to="/admin/societies/new" className={actionCardClass(true)}>
                <Plus className="h-5 w-5" />
                <p className="mt-3 font-bold">Add Society</p>
                <p className="mt-1 text-sm opacity-80">Create new society</p>
              </Link>

              <Link to="/admin/properties/new" className={actionCardClass(false)}>
                <Plus className="h-5 w-5 text-blue-600" />
                <p className="mt-3 font-bold">Add Property</p>
                <p className="mt-1 text-sm text-slate-500">List inventory</p>
              </Link>

              <Link to="/admin/leads" className={actionCardClass(false)}>
                <MessageSquareText className="h-5 w-5 text-blue-600" />
                <p className="mt-3 font-bold">View Leads</p>
                <p className="mt-1 text-sm text-slate-500">Follow-up pipeline</p>
              </Link>

              <Link to="/admin/owner-crm" className={actionCardClass(false)}>
                <Home className="h-5 w-5 text-blue-600" />
                <p className="mt-3 font-bold">Owner CRM</p>
                <p className="mt-1 text-sm text-slate-500">Owner inventory leads</p>
              </Link>

              <Link to="/admin/broker-crm" className={actionCardClass(false)}>
                <Users className="h-5 w-5 text-blue-600" />
                <p className="mt-3 font-bold">Broker CRM</p>
                <p className="mt-1 text-sm text-slate-500">Partner enquiries</p>
              </Link>

              <Link to="/search" className={actionCardClass(false)}>
                <Search className="h-5 w-5 text-blue-600" />
                <p className="mt-3 font-bold">View Site</p>
                <p className="mt-1 text-sm text-slate-500">Check public search</p>
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                Recent lead activity
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Latest enquiries and follow-up priority from Lead CRM.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-full border-slate-200">
              <Link to="/admin/leads">Open CRM</Link>
            </Button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {recentLeads.length ? (
              recentLeads.map((lead) => (
                <Link
                  key={lead.id}
                  to={`/admin/leads/${lead.id}`}
                  className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 transition hover:bg-blue-50"
                >
                  <p className="truncate text-sm font-bold text-slate-950">
                    {lead.name || "Unnamed lead"}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {lead.property || lead.society || "General enquiry"}
                  </p>
                  <p className="mt-3 text-xs font-semibold text-blue-700">
                    {lead.requirement || "Requirement pending"}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {formatLeadDate(lead.createdAt)}
                  </p>
                </Link>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-200 p-5 text-sm text-slate-500 md:col-span-2 xl:col-span-5">
                No leads found yet.
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "AI Features",
              text: "Manage advisor, recommendations and AI matching.",
              href: "/admin/ai",
              icon: Bot,
            },
            {
              title: "Recommendations",
              text: "Review recommendation and matching modules.",
              href: "/admin/recommendations",
              icon: Target,
            },
            {
              title: "Users",
              text: "Review accounts and user modules.",
              href: "/admin/users",
              icon: Users,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className="group rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Icon className="h-5 w-5 text-blue-600" />
                    <h3 className="mt-4 text-lg font-bold text-slate-950">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                      {item.text}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600" />
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </AdminLayout>
  );
}
