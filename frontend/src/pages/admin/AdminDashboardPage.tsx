import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  Clock,
  Home,
  MessageSquareText,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
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

function isOwnerLeadSource(source?: string) {
  const value = String(source || "").toLowerCase();

  return (
    value.includes("owner") ||
    value.includes("sell") ||
    value.includes("seller") ||
    value.includes("listing_submission") ||
    value.includes("list_property")
  );
}

function isBrokerLeadSource(source?: string) {
  const value = String(source || "").toLowerCase();

  return (
    value.includes("broker") ||
    value.includes("partner") ||
    value.includes("agent") ||
    value.includes("crm_intake") ||
    value.includes("public_broker_crm")
  );
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

function parseApiList(json: any) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.data?.data)) return json.data.data;
  return [];
}

function propertyStatus(item: any) {
  return String(item?.status || item?.publication_status || item?.publicationStatus || "Draft");
}

function isLiveProperty(item: any) {
  const status = propertyStatus(item).toLowerCase();
  return (
    status === "live" ||
    status === "published" ||
    item?.is_published === true ||
    item?.isPublished === true ||
    Boolean(item?.published_at || item?.publishedAt)
  );
}

function isOwnerDraftProperty(item: any) {
  const ownerLinked = Boolean(
    item?.source_lead_id ||
      item?.sourceLeadId ||
      item?.owner_lead_id ||
      item?.ownerLeadId ||
      item?.lead_id ||
      item?.leadId,
  );

  return ownerLinked && !isLiveProperty(item);
}

function societyStatus(item: any) {
  return String(item?.status || "Draft");
}

function actionCardClass(featured = false) {
  return featured
    ? "group rounded-[22px] border border-blue-100 bg-blue-600 p-4 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:rounded-[28px] sm:p-5"
    : "group rounded-[22px] border border-slate-200 bg-white p-4 text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-lg sm:rounded-[28px] sm:p-5";
}

function statCardClass(tone: "blue" | "emerald" | "rose" | "slate" = "blue") {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-100"
      : tone === "rose"
        ? "border-rose-100"
        : "border-slate-200";

  return `rounded-[24px] border ${toneClass} bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg md:rounded-[28px] md:p-5`;
}

function dashboardValue(value: number | string, isLoading: boolean) {
  return isLoading ? "Loading..." : value;
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState(emptyStats);
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [societies, setSocieties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [leadLoading, setLeadLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [leadError, setLeadError] = useState("");
  const [inventoryError, setInventoryError] = useState("");

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

  const loadInventory = async () => {
    try {
      setInventoryLoading(true);
      setInventoryError("");

      const [propertyResponse, societyResponse] = await Promise.all([
        adminFetch("/admin/properties"),
        adminFetch("/admin/societies?page=1&per_page=200"),
      ]);

      const propertyJson = await propertyResponse.json().catch(() => ({}));
      const societyJson = await societyResponse.json().catch(() => ({}));

      if (!propertyResponse.ok) {
        throw new Error(propertyJson?.message || "Properties request failed");
      }

      if (!societyResponse.ok) {
        throw new Error(societyJson?.message || "Societies request failed");
      }

      setProperties(parseApiList(propertyJson));
      setSocieties(parseApiList(societyJson));
    } catch (err) {
      console.error(err);
      setInventoryError("Unable to load live inventory action summary.");
    } finally {
      setInventoryLoading(false);
    }
  };

  const refreshAll = () => {
    void loadStats();
    void loadLeads();
    void loadInventory();
  };

  useEffect(() => {
    refreshAll();
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
      owner: leads.filter((lead) => isOwnerLeadSource(lead.source)).length,
      broker: leads.filter((lead) => isBrokerLeadSource(lead.source)).length,
    };
  }, [leads]);

  const inventorySummary = useMemo(() => {
    const liveProperties = properties.filter(isLiveProperty).length;
    const draftProperties = properties.filter((item) => !isLiveProperty(item)).length;
    const ownerDrafts = properties.filter(isOwnerDraftProperty).length;
    const draftSocieties = societies.filter((item) => societyStatus(item) === "Draft").length;
    const verifiedSocieties = societies.filter((item) =>
      ["Verified", "Premium"].includes(societyStatus(item)),
    ).length;

    return {
      totalProperties: properties.length || stats.properties,
      liveProperties: liveProperties || stats.live_properties,
      draftProperties: properties.length ? draftProperties : Math.max(stats.properties - stats.live_properties, 0),
      ownerDrafts,
      totalSocieties: societies.length || stats.societies,
      draftSocieties,
      verifiedSocieties,
    };
  }, [properties, societies, stats]);

  const recentLeads = useMemo(() => leads.slice(0, 5), [leads]);

  const actionQueue = useMemo(() => {
    const urgentLeads = leads
      .filter((lead) => followUpState(lead) === "overdue" || followUpState(lead) === "today" || lead.priority === "Hot")
      .slice(0, 4)
      .map((lead) => ({
        key: `lead-${lead.id}`,
        title: lead.name || "Unnamed lead",
        meta: lead.requirement || lead.property || lead.society || "Lead follow-up",
        href: `/admin/leads/${lead.id}`,
        label: followUpState(lead) === "overdue" ? "Overdue" : lead.priority === "Hot" ? "Hot" : "Today",
      }));

    const ownerDrafts = properties
      .filter(isOwnerDraftProperty)
      .slice(0, 3)
      .map((item) => ({
        key: `property-${item.id}`,
        title: item?.title || "Owner draft property",
        meta: item?.society || item?.society_name || "Owner draft pending publish",
        href: `/admin/properties/${item.id}/edit`,
        label: "Owner Draft",
      }));

    const draftSocieties = societies
      .filter((item) => societyStatus(item) === "Draft")
      .slice(0, 3)
      .map((item) => ({
        key: `society-${item.id}`,
        title: item?.name || "Draft society",
        meta: item?.locality || item?.sector || "Needs verification",
        href: `/admin/societies/${item.id}/edit`,
        label: "Draft Society",
      }));

    return [...urgentLeads, ...ownerDrafts, ...draftSocieties].slice(0, 8);
  }, [leads, properties, societies]);

  return (
    <AdminLayout title="Dashboard" subtitle="SocietyFlats command center">
      <div className="space-y-4 md:space-y-6">
        {(error || leadError || inventoryError) ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-700">
            {error || leadError || inventoryError}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 rounded-[24px] border border-blue-100 bg-blue-50 p-4 md:flex-row md:items-center md:justify-between md:rounded-[32px] md:p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
              Command center
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
              Today’s control room
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Leads, drafts, owner inventory and society verification in one place.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="rounded-full border-blue-200 bg-white"
            onClick={refreshAll}
            disabled={loading || leadLoading || inventoryLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${(loading || leadLoading || inventoryLoading) ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            {
              label: "Today",
              value: dashboardValue(leadSummary.today, leadLoading),
              helper: "New enquiries",
              href: "/admin/leads?view=today",
              icon: MessageSquareText,
              tone: "blue" as const,
            },
            {
              label: "Follow-ups",
              value: dashboardValue(leadSummary.followUpsToday, leadLoading),
              helper: "Due today",
              href: "/admin/leads?view=followups",
              icon: Clock,
              tone: "emerald" as const,
            },
            {
              label: "Overdue",
              value: dashboardValue(leadSummary.overdue, leadLoading),
              helper: "Needs action",
              href: "/admin/leads?view=overdue",
              icon: Target,
              tone: "rose" as const,
            },
            {
              label: "Hot Leads",
              value: dashboardValue(leadSummary.hot, leadLoading),
              helper: "Priority follow-up",
              href: "/admin/leads?view=hot",
              icon: Target,
              tone: "rose" as const,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <Link key={item.label} to={item.href} className={statCardClass(item.tone)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{item.label}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-950 md:mt-3 md:text-3xl">
                      {item.value}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-blue-600 md:mt-2 md:text-sm">
                      {item.helper}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-700 md:p-3">
                    <Icon className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                </div>
              </Link>
            );
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[32px] md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-950 md:text-2xl">
                  Inventory action summary
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Drafts and profiles that need admin action.
                </p>
              </div>
              <ShieldCheck className="h-5 w-5 text-blue-600" />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                ["Live properties", inventorySummary.liveProperties, "Public inventory", "/admin/properties"],
                ["Draft properties", inventorySummary.draftProperties, "Pending publish", "/admin/properties"],
                ["Owner drafts", inventorySummary.ownerDrafts, "From Owner CRM", "/admin/owner-crm"],
                ["Draft societies", inventorySummary.draftSocieties, "Need verification", "/admin/societies"],
                ["Verified societies", inventorySummary.verifiedSocieties, "Public-safe profiles", "/admin/societies"],
                ["Active leads", leadSummary.open, "Pipeline", "/admin/leads?view=active"],
              ].map(([label, value, meta, href]) => (
                <Link
                  key={String(label)}
                  to={String(href)}
                  className="rounded-[20px] bg-slate-50 p-4 transition hover:bg-blue-50 md:rounded-[24px] md:p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-950 md:text-3xl">
                    {dashboardValue(value as number | string, inventoryLoading && !String(label).includes("leads"))}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 md:text-sm">{meta}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[32px] md:p-6">
            <h2 className="text-xl font-bold tracking-tight text-slate-950 md:text-2xl">
              Quick actions
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Jump directly into common admin tasks.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link to="/admin/societies/new" className={actionCardClass(true)}>
                <Plus className="h-5 w-5" />
                <p className="mt-3 font-bold">Add Society</p>
                <p className="mt-1 text-sm opacity-80">Create profile</p>
              </Link>

              <Link to="/admin/properties/new" className={actionCardClass(false)}>
                <Plus className="h-5 w-5 text-blue-600" />
                <p className="mt-3 font-bold">Add Property</p>
                <p className="mt-1 text-sm text-slate-500">List inventory</p>
              </Link>

              <Link to="/admin/leads" className={actionCardClass(false)}>
                <MessageSquareText className="h-5 w-5 text-blue-600" />
                <p className="mt-3 font-bold">View Leads</p>
                <p className="mt-1 text-sm text-slate-500">Follow-up CRM</p>
              </Link>

              <Link to="/admin/properties" className={actionCardClass(false)}>
                <Building2 className="h-5 w-5 text-blue-600" />
                <p className="mt-3 font-bold">Properties</p>
                <p className="mt-1 text-sm text-slate-500">Publish drafts</p>
              </Link>

              <Link to="/admin/owner-crm" className={actionCardClass(false)}>
                <Home className="h-5 w-5 text-blue-600" />
                <p className="mt-3 font-bold">Owner CRM</p>
                <p className="mt-1 text-sm text-slate-500">Owner leads</p>
              </Link>

              <Link to="/admin/broker-crm" className={actionCardClass(false)}>
                <Users className="h-5 w-5 text-blue-600" />
                <p className="mt-3 font-bold">Broker CRM</p>
                <p className="mt-1 text-sm text-slate-500">Partner leads</p>
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[32px] md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950 md:text-2xl">
                Action queue
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Hot leads, owner drafts and society drafts needing attention.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-full border-slate-200">
              <Link to="/admin/leads">Open CRM</Link>
            </Button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {actionQueue.length ? (
              actionQueue.map((item) => (
                <Link
                  key={item.key}
                  to={item.href}
                  className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 transition hover:bg-blue-50"
                >
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700">
                    {item.label}
                  </span>
                  <p className="mt-3 truncate text-sm font-bold text-slate-950">
                    {item.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                    {item.meta}
                  </p>
                  <p className="mt-3 inline-flex items-center text-xs font-bold text-blue-700">
                    Open <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </p>
                </Link>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-200 p-5 text-sm text-slate-500 md:col-span-2 xl:col-span-4">
                No urgent action items right now.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[32px] md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950 md:text-2xl">
                Recent lead activity
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Latest enquiries from Lead CRM.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-full border-slate-200">
              <Link to="/admin/leads">Open CRM</Link>
            </Button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
                className="group rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-lg md:rounded-[28px]"
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
