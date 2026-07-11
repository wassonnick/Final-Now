// C84 admin dashboard UX polish: compact command center cards and scan layout, logic unchanged.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  CalendarDays,
  Clock,
  Home,
  MessageSquareText,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  Target,
  Users,
} from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/adminApi";
import {
  AdminLead,
  addLeadNoteRemote,
  fetchAdminLeads,
  listAdminLeads,
  saveAdminLead,
} from "@/lib/adminLeadStore";

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

const agents = ["Nitin", "Amit", "Rohit", "Priya", "Unassigned"];

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

function leadCommandLabel(lead: AdminLead) {
  if (followUpState(lead) === "overdue") return "Overdue";
  if (followUpState(lead) === "today") return "Due today";
  if (!lead.followUpAt) return "No follow-up";
  if (lead.priority === "Hot") return "Hot";
  if (isOwnerLeadSource(lead.source)) return "Owner";
  if (isBrokerLeadSource(lead.source)) return "Broker";

  return lead.status;
}

function leadCommandClass(lead: AdminLead) {
  if (followUpState(lead) === "overdue") return "border-rose-100 bg-rose-50 text-rose-700";
  if (followUpState(lead) === "today") return "border-amber-100 bg-amber-50 text-amber-700";
  if (!lead.followUpAt) return "border-slate-200 bg-slate-50 text-slate-600";
  if (lead.priority === "Hot") return "border-orange-100 bg-orange-50 text-orange-700";
  if (isOwnerLeadSource(lead.source)) return "border-emerald-100 bg-emerald-50 text-emerald-700";
  if (isBrokerLeadSource(lead.source)) return "border-violet-100 bg-violet-50 text-violet-700";

  return "border-blue-100 bg-blue-50 text-blue-700";
}

function leadCommandMeta(lead: AdminLead) {
  if (followUpState(lead) === "overdue") return `Overdue since ${formatLeadDate(lead.followUpAt)}`;
  if (followUpState(lead) === "today") return `Due ${formatLeadDate(lead.followUpAt)}`;
  if (!lead.followUpAt) return "Needs follow-up time";
  if (lead.priority === "Hot") return "Priority lead";
  return lead.requirement || lead.property || lead.society || "Lead follow-up";
}

function sortCommandLeads(first: AdminLead, second: AdminLead) {
  const weight = (lead: AdminLead) => {
    if (followUpState(lead) === "overdue") return 0;
    if (followUpState(lead) === "today") return 1;
    if (lead.priority === "Hot") return 2;
    if (!lead.followUpAt) return 3;
    if (isOwnerLeadSource(lead.source)) return 4;
    if (isBrokerLeadSource(lead.source)) return 5;
    return 6;
  };

  const weightDelta = weight(first) - weight(second);
  if (weightDelta !== 0) return weightDelta;

  return new Date(second.createdAt || 0).getTime() - new Date(first.createdAt || 0).getTime();
}

function leadAgeDays(lead: AdminLead) {
  const date = new Date(lead.createdAt || "");
  if (Number.isNaN(date.getTime())) return 0;

  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  return Math.max(0, Math.floor((today - start) / 86400000));
}

function isFreshLead(lead: AdminLead) {
  return isOpenLead(lead) && leadAgeDays(lead) === 0;
}

function isAgingLead(lead: AdminLead) {
  const age = leadAgeDays(lead);
  return isOpenLead(lead) && age >= 1 && age <= 2;
}

function isStaleLead(lead: AdminLead) {
  return isOpenLead(lead) && leadAgeDays(lead) >= 3;
}

function isHotSlaLead(lead: AdminLead) {
  return isOpenLead(lead) && lead.priority === "Hot" && lead.status === "New";
}

function isUntouchedLead(lead: AdminLead) {
  return isOpenLead(lead) && lead.status === "New" && followUpState(lead) === "not_set";
}

function isCallSheetLead(lead: AdminLead) {
  return (
    isOpenLead(lead) &&
    (
      followUpState(lead) === "overdue" ||
      isHotSlaLead(lead) ||
      followUpState(lead) === "today" ||
      isUntouchedLead(lead) ||
      isStaleLead(lead)
    )
  );
}

function callSheetSortWeight(lead: AdminLead) {
  if (followUpState(lead) === "overdue") return 0;
  if (isHotSlaLead(lead)) return 1;
  if (followUpState(lead) === "today") return 2;
  if (isUntouchedLead(lead)) return 3;
  if (isStaleLead(lead)) return 4;
  if (lead.priority === "Hot") return 5;
  if (followUpState(lead) === "not_set") return 6;

  return 9;
}

function callSheetReason(lead: AdminLead) {
  if (followUpState(lead) === "overdue") return "Overdue";
  if (isHotSlaLead(lead)) return "Hot SLA";
  if (followUpState(lead) === "today") return "Due today";
  if (isUntouchedLead(lead)) return "Untouched";
  if (isStaleLead(lead)) return "Stale";

  return "Follow-up";
}

function callSheetReasonClass(lead: AdminLead) {
  if (followUpState(lead) === "overdue") return "border-rose-100 bg-rose-50 text-rose-700";
  if (isHotSlaLead(lead)) return "border-orange-100 bg-orange-50 text-orange-700";
  if (followUpState(lead) === "today") return "border-blue-100 bg-blue-50 text-blue-700";
  if (isUntouchedLead(lead)) return "border-slate-200 bg-slate-50 text-slate-700";
  if (isStaleLead(lead)) return "border-amber-100 bg-amber-50 text-amber-700";

  return "border-slate-200 bg-white text-slate-600";
}

function callSheetWhatsAppUrl(lead: AdminLead) {
  const digits = String(lead.phone || "").replace(/[^0-9]/g, "").slice(-10);
  const message = encodeURIComponent(
    [
      `Hi ${lead.name || ""}, this is SocietyFlats.`,
      `Following up on your enquiry for ${lead.property || lead.society || "your requirement"}.`,
      "Please let us know a good time to connect today.",
    ].join("\n")
  );

  return `https://wa.me/91${digits}?text=${message}`;
}


function dashboardLeadSourceLabel(lead: AdminLead) {
  const source = String(lead.source || "").toLowerCase();

  if (
    source.includes("map_search") ||
    source.includes("map-search") ||
    source.includes("map search")
  ) {
    return "Map/Search conversion";
  }

  return lead.cta_label || lead.search_query || lead.ai_query || lead.requirement || lead.source || "Website";
}

function sourceBucket(lead: AdminLead) {
  const source = String(lead.source || "").toLowerCase();
  const page = String(lead.source_page || "").toLowerCase();
  const aiQuery = String(lead.ai_query || "").trim();
  const searchQuery = String(lead.search_query || "").trim();

  if (aiQuery || source.includes("ai")) return "ai";
  if (
    searchQuery ||
    page.includes("/search") ||
    source.includes("map_search") ||
    source.includes("map-search") ||
    source.includes("map search") ||
    source.includes("search")
  ) return "search";
  if (isOwnerLeadSource(source) || page.includes("/sell")) return "owner";
  if (isBrokerLeadSource(source)) return "broker";
  if (page.includes("/property") || source.includes("property")) return "property";
  if (page.includes("/society") || source.includes("society")) return "society";

  return "website";
}

function sourceCardClass(bucket: string) {
  if (bucket === "ai") return "border-indigo-100 bg-indigo-50 text-indigo-900";
  if (bucket === "search") return "border-sky-100 bg-sky-50 text-sky-900";
  if (bucket === "property") return "border-violet-100 bg-violet-50 text-violet-900";
  if (bucket === "society") return "border-blue-100 bg-blue-50 text-blue-900";
  if (bucket === "owner") return "border-emerald-100 bg-emerald-50 text-emerald-900";
  if (bucket === "broker") return "border-orange-100 bg-orange-50 text-orange-900";

  return "border-slate-100 bg-slate-50 text-slate-900";
}

function cleanLeadPhone(phone?: string) {
  return String(phone || "").replace(/[^0-9]/g, "").slice(-10);
}

function samePhoneLeadCount(lead: AdminLead, allLeads: AdminLead[]) {
  const key = cleanLeadPhone(lead.phone);
  if (!key || key.length < 10) return 0;

  return allLeads.filter((item) => cleanLeadPhone(item.phone) === key).length;
}

function hasMeaningfulRequirement(lead: AdminLead) {
  const value = String(lead.requirement || "").trim().toLowerCase();

  return Boolean(value) && !["not specified", "general enquiry", "general inquiry", "requirement pending"].includes(value);
}

function isMissingPhoneLead(lead: AdminLead) {
  return cleanLeadPhone(lead.phone).length < 10;
}

function isMissingRequirementLead(lead: AdminLead) {
  return !hasMeaningfulRequirement(lead);
}

function isDuplicateLead(lead: AdminLead, allLeads: AdminLead[]) {
  return samePhoneLeadCount(lead, allLeads) > 1;
}

function isHighIntentLead(lead: AdminLead) {
  const source = String(lead.source || "").toLowerCase();
  const cta = String(lead.cta_label || "").toLowerCase();
  const intent = String(lead.lead_intent || "").toLowerCase();
  const requirement = String(lead.requirement || "").toLowerCase();
  const combined = [source, cta, intent, requirement].join(" ");

  return (
    lead.priority === "Hot" ||
    combined.includes("callback") ||
    combined.includes("visit") ||
    combined.includes("owner") ||
    combined.includes("broker") ||
    sourceBucket(lead) === "property"
  );
}

function qualityCardClass(tone: "amber" | "rose" | "emerald" | "blue") {
  if (tone === "amber") return "border-amber-100 bg-amber-50 text-amber-900";
  if (tone === "rose") return "border-rose-100 bg-rose-50 text-rose-900";
  if (tone === "emerald") return "border-emerald-100 bg-emerald-50 text-emerald-900";

  return "border-blue-100 bg-blue-50 text-blue-900";
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
    ? "group rounded-[18px] border border-blue-100 bg-blue-600 p-3.5 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:rounded-[22px] sm:p-4"
    : "group rounded-[18px] border border-slate-200 bg-white p-3.5 text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md sm:rounded-[22px] sm:p-4";
}

function slaCardClass(tone: "emerald" | "amber" | "rose" | "orange" | "slate") {
  if (tone === "emerald") return "border-emerald-100 bg-emerald-50 text-emerald-900";
  if (tone === "amber") return "border-amber-100 bg-amber-50 text-amber-900";
  if (tone === "rose") return "border-rose-100 bg-rose-50 text-rose-900";
  if (tone === "orange") return "border-orange-100 bg-orange-50 text-orange-900";
  return "border-slate-200 bg-slate-50 text-slate-900";
}

function statCardClass(tone: "blue" | "emerald" | "rose" | "slate" = "blue") {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-100"
      : tone === "rose"
        ? "border-rose-100"
        : "border-slate-200";

  return `rounded-[20px] border ${toneClass} bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:rounded-[22px] md:p-4`;
}

function dashboardValue(value: number | string, isLoading: boolean) {
  return isLoading ? "Loading..." : value;
}

function formatLeadDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function tomorrowFollowUpValue() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 30, 0, 0);

  return formatLeadDateTime(date);
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState(emptyStats);
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [societies, setSocieties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [leadLoading, setLeadLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [savingLeadId, setSavingLeadId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [leadError, setLeadError] = useState("");
  const [inventoryError, setInventoryError] = useState("");
  const [inbox, setInbox] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionBusyId, setSuggestionBusyId] = useState<number | null>(null);
  const [scheduler, setScheduler] = useState<{ healthy: boolean; last_heartbeat_at?: string | null; minutes_since?: number | null } | null>(null);

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
      setScheduler(json?.scheduler || null);
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

  const loadInbox = async () => {
    try {
      const response = await adminFetch("/admin/ops/action-inbox");
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.message || "Action inbox request failed");
      setInbox(json?.data || null);
    } catch (err) {
      console.error(err);
      setInbox(null);
    }
    try {
      const response = await adminFetch("/admin/ops/suggestions?status=pending");
      const json = await response.json().catch(() => ({}));
      setSuggestions(response.ok && Array.isArray(json?.data) ? json.data : []);
    } catch {
      setSuggestions([]);
    }
  };

  const resolveSuggestion = async (id: number, action: "apply" | "dismiss") => {
    setSuggestionBusyId(id);
    try {
      await adminFetch(`/admin/ops/suggestions/${id}/${action}`, { method: "POST" });
      await loadInbox();
    } finally {
      setSuggestionBusyId(null);
    }
  };

  const refreshAll = () => {
    void loadStats();
    void loadLeads();
    void loadInventory();
    void loadInbox();
  };

  const handleDashboardTomorrow = async (lead: AdminLead) => {
    const previousLeads = leads;
    const followUpAt = tomorrowFollowUpValue();
    const optimisticLead = { ...lead, followUpAt };

    setSavingLeadId(lead.id);
    setLeadError("");
    setLeads((current) =>
      current.map((item) => (item.id === lead.id ? optimisticLead : item)),
    );

    try {
      const updated = await saveAdminLead(optimisticLead);
      const noted = await addLeadNoteRemote(
        updated,
        `Follow-up reminder set from dashboard command center: ${followUpAt}`,
      );

      setLeads((current) => current.map((item) => (item.id === lead.id ? noted : item)));
    } catch (err) {
      console.error(err);
      setLeads(previousLeads);
      setLeadError("Unable to set dashboard follow-up reminder. Please open the lead and try again.");
    } finally {
      setSavingLeadId(null);
    }
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
      hotActive: leads.filter((lead) => isHotLead(lead) && isOpenLead(lead)).length,
      booked: leads.filter((lead) => lead.status === "Booked").length,
      followUps: leads.filter((lead) => Boolean(lead.followUpAt)).length,
      followUpsToday: leads.filter((lead) => followUpState(lead) === "today").length,
      overdue: leads.filter((lead) => followUpState(lead) === "overdue").length,
      noFollowUp: leads.filter((lead) => followUpState(lead) === "not_set").length,
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

  const commandLeads = useMemo(() => {
    return leads
      .filter((lead) => isOpenLead(lead))
      .sort(sortCommandLeads)
      .slice(0, 5);
  }, [leads]);

  const callSheetLeads = useMemo(() => {
    return leads
      .filter(isCallSheetLead)
      .sort((first, second) => {
        const weightDelta = callSheetSortWeight(first) - callSheetSortWeight(second);
        if (weightDelta !== 0) return weightDelta;

        return new Date(second.createdAt || 0).getTime() - new Date(first.createdAt || 0).getTime();
      })
      .slice(0, 6);
  }, [leads]);

  const sourceSummary = useMemo(() => {
    const buckets = [
      { bucket: "ai", label: "AI", helper: "Advisor intent", href: "/admin/leads?view=ai" },
      { bucket: "search", label: "Search", helper: "Search journeys", href: "/admin/leads?view=search" },
      { bucket: "property", label: "Property", helper: "Property pages", href: "/admin/leads?view=property" },
      { bucket: "society", label: "Society", helper: "Society pages", href: "/admin/leads?view=society" },
      { bucket: "owner", label: "Owner", helper: "Inventory source", href: "/admin/leads?view=owner" },
      { bucket: "broker", label: "Broker", helper: "Partner source", href: "/admin/leads?view=broker" },
    ];

    return buckets.map((item) => ({
      ...item,
      count: leads.filter((lead) => sourceBucket(lead) === item.bucket).length,
      latest: leads.find((lead) => sourceBucket(lead) === item.bucket),
    }));
  }, [leads]);

  const qualitySummary = useMemo(() => {
    return [
      {
        label: "Duplicates",
        value: leads.filter((lead) => isDuplicateLead(lead, leads)).length,
        helper: "Same phone leads",
        href: "/admin/leads?view=duplicates",
        tone: "amber" as const,
      },
      {
        label: "Missing phone",
        value: leads.filter(isMissingPhoneLead).length,
        helper: "Cannot call",
        href: "/admin/leads?view=missing_phone",
        tone: "rose" as const,
      },
      {
        label: "Missing requirement",
        value: leads.filter(isMissingRequirementLead).length,
        helper: "Needs qualification",
        href: "/admin/leads?view=missing_requirement",
        tone: "rose" as const,
      },
      {
        label: "High intent",
        value: leads.filter(isHighIntentLead).length,
        helper: "Prioritize",
        href: "/admin/leads?view=high_intent",
        tone: "emerald" as const,
      },
    ];
  }, [leads]);

  const teamSummary = useMemo(() => {
    return agents.map((agent) => {
      const assigned = leads.filter((lead) => String(lead.assignedTo || "Unassigned") === agent);
      const open = assigned.filter(isOpenLead);
      const dueToday = assigned.filter((lead) => followUpState(lead) === "today");
      const overdue = assigned.filter((lead) => followUpState(lead) === "overdue");

      return {
        agent,
        total: assigned.length,
        open: open.length,
        dueToday: dueToday.length,
        overdue: overdue.length,
        href: `/admin/leads?assignee=${encodeURIComponent(agent)}`,
      };
    });
  }, [leads]);

  const slaSummary = useMemo(() => {
    return [
      {
        label: "Fresh",
        value: leads.filter(isFreshLead).length,
        helper: "New today",
        href: "/admin/leads?view=fresh",
        tone: "emerald" as const,
      },
      {
        label: "Aging",
        value: leads.filter(isAgingLead).length,
        helper: "1–2 days old",
        href: "/admin/leads?view=aging",
        tone: "amber" as const,
      },
      {
        label: "Stale",
        value: leads.filter(isStaleLead).length,
        helper: "3+ days open",
        href: "/admin/leads?view=stale",
        tone: "rose" as const,
      },
      {
        label: "Hot SLA",
        value: leads.filter(isHotSlaLead).length,
        helper: "Hot but new",
        href: "/admin/leads?view=hot_sla",
        tone: "orange" as const,
      },
      {
        label: "Untouched",
        value: leads.filter(isUntouchedLead).length,
        helper: "No follow-up",
        href: "/admin/leads?view=untouched",
        tone: "slate" as const,
      },
    ];
  }, [leads]);

  const actionQueue = useMemo(() => {
    const urgentLeads = leads
      .filter((lead) => followUpState(lead) === "overdue" || followUpState(lead) === "today" || followUpState(lead) === "not_set" || lead.priority === "Hot")
      .slice(0, 4)
      .map((lead) => ({
        key: `lead-${lead.id}`,
        title: lead.name || "Unnamed lead",
        meta: lead.requirement || lead.property || lead.society || "Lead follow-up",
        href: `/admin/leads/${lead.id}`,
        label: followUpState(lead) === "overdue" ? "Overdue" : followUpState(lead) === "not_set" ? "No Follow-up" : lead.priority === "Hot" ? "Hot" : "Today",
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
        {scheduler && !scheduler.healthy ? (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 px-5 py-3.5 text-sm font-bold text-rose-800">
            ⚠ Scheduler appears down — {scheduler.last_heartbeat_at ? `last heartbeat ${scheduler.minutes_since} min ago` : "no heartbeat recorded yet"}. All scheduled automation (SEO cycle, social autopilot, market refresh, queue jobs) is stalled until the backend scheduler loop runs again — check the societyflats-api service on Render.
          </div>
        ) : null}
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

        {inbox?.live ? (
          <section className="rounded-[24px] border border-slate-200 bg-white p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Action inbox</p>
                <p className="mt-1 text-sm text-slate-600">Automated daily checks — data quality, sitemap, lead SLA and visit reminders.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                {inbox?.last_digest?.digest_date ? `Last digest ${inbox.last_digest.digest_date}` : "First digest runs 07:30"}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Link to="/admin/leads" className={`rounded-2xl border p-3 ${inbox.live.leads.breaches.count > 0 ? "border-rose-200 bg-rose-50" : "border-emerald-100 bg-emerald-50"}`}>
                <p className={`text-2xl font-black ${inbox.live.leads.breaches.count > 0 ? "text-rose-700" : "text-emerald-700"}`}>{inbox.live.leads.breaches.count}</p>
                <p className="mt-1 text-xs font-bold text-slate-700">Lead SLA breaches</p>
                <p className="text-[11px] text-slate-500">{inbox.live.leads.escalations_over_72h.count} over 72h</p>
              </Link>
              <Link to="/admin/societies" className={`rounded-2xl border p-3 ${inbox.live.societies.missing_cover.count > 0 ? "border-amber-200 bg-amber-50" : "border-emerald-100 bg-emerald-50"}`}>
                <p className={`text-2xl font-black ${inbox.live.societies.missing_cover.count > 0 ? "text-amber-700" : "text-emerald-700"}`}>{inbox.live.societies.missing_cover.count}</p>
                <p className="mt-1 text-xs font-bold text-slate-700">Missing cover photo</p>
                <p className="text-[11px] text-slate-500">published societies</p>
              </Link>
              <Link to="/admin/societies" className={`rounded-2xl border p-3 ${inbox.live.societies.missing_published_seo.count > 0 ? "border-amber-200 bg-amber-50" : "border-emerald-100 bg-emerald-50"}`}>
                <p className={`text-2xl font-black ${inbox.live.societies.missing_published_seo.count > 0 ? "text-amber-700" : "text-emerald-700"}`}>{inbox.live.societies.missing_published_seo.count}</p>
                <p className="mt-1 text-xs font-bold text-slate-700">No published SEO</p>
                <p className="text-[11px] text-slate-500">content rollout backlog</p>
              </Link>
              <Link to="/admin/societies" className={`rounded-2xl border p-3 ${inbox.live.societies.low_confidence.count > 0 ? "border-rose-200 bg-rose-50" : "border-emerald-100 bg-emerald-50"}`}>
                <p className={`text-2xl font-black ${inbox.live.societies.low_confidence.count > 0 ? "text-rose-700" : "text-emerald-700"}`}>{inbox.live.societies.low_confidence.count}</p>
                <p className="mt-1 text-xs font-bold text-slate-700">Low confidence</p>
                <p className="text-[11px] text-slate-500">below 60% verified</p>
              </Link>
              <Link to="/admin/site-visits" className={`rounded-2xl border p-3 ${inbox.live.site_visits.reminders_due > 0 ? "border-amber-200 bg-amber-50" : "border-emerald-100 bg-emerald-50"}`}>
                <p className={`text-2xl font-black ${inbox.live.site_visits.reminders_due > 0 ? "text-amber-700" : "text-emerald-700"}`}>{inbox.live.site_visits.reminders_due}</p>
                <p className="mt-1 text-xs font-bold text-slate-700">Visit reminders due</p>
                <p className="text-[11px] text-slate-500">{inbox.live.site_visits.upcoming_48h} visits in 48h</p>
              </Link>
            </div>
            {inbox.live.leads.breaches.count > 0 ? (
              <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50/60 p-3 text-xs text-rose-800">
                {inbox.live.leads.breaches.items.slice(0, 3).map((item: any) => (
                  <p key={item.id} className="py-0.5">
                    <span className="font-bold">{item.name}</span>
                    {item.society_name ? ` · ${item.society_name}` : ""} · waiting {item.waiting_hours}h ({item.source})
                  </p>
                ))}
              </div>
            ) : null}
            {suggestions.length > 0 ? (
              <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Automation suggestions awaiting your decision</p>
                <div className="mt-2 space-y-2">
                  {suggestions.slice(0, 5).map((item: any) => (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800">
                          {item.society_name}
                          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                            {item.kind === "market_refresh" ? "Market data" : "Cover photo"}
                          </span>
                        </p>
                        <p className="mt-0.5 text-slate-500">
                          {item.kind === "market_refresh"
                            ? Object.entries(item.payload?.updates || {}).slice(0, 2).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join(" · ")
                            : item.payload?.reason || "Needs a fresh approved photo."}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        {item.kind === "market_refresh" ? (
                          <button type="button" disabled={suggestionBusyId === item.id} onClick={() => void resolveSuggestion(item.id, "apply")} className="rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-black text-white disabled:opacity-50">Apply</button>
                        ) : (
                          <Link to={`/admin/societies/${item.society_id}/edit`} className="rounded-full bg-blue-600 px-3 py-1.5 text-[11px] font-black text-white">Fix image</Link>
                        )}
                        <button type="button" disabled={suggestionBusyId === item.id} onClick={() => void resolveSuggestion(item.id, "dismiss")} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-600 disabled:opacity-50">Dismiss</button>
                      </div>
                    </div>
                  ))}
                  {suggestions.length > 5 ? <p className="text-[11px] text-slate-500">+{suggestions.length - 5} more pending</p> : null}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-6">
          {[
            {
              label: "Overdue",
              value: dashboardValue(leadSummary.overdue, leadLoading),
              helper: "Call first",
              href: "/admin/leads?view=overdue",
              icon: Target,
              tone: "rose" as const,
            },
            {
              label: "Due Today",
              value: dashboardValue(leadSummary.followUpsToday, leadLoading),
              helper: "Follow-ups",
              href: "/admin/leads?view=followups",
              icon: Clock,
              tone: "emerald" as const,
            },
            {
              label: "No Follow-up",
              value: dashboardValue(leadSummary.noFollowUp, leadLoading),
              helper: "Set reminder",
              href: "/admin/leads?view=no_followup",
              icon: CalendarDays,
              tone: "slate" as const,
            },
            {
              label: "Hot Active",
              value: dashboardValue(leadSummary.hotActive, leadLoading),
              helper: "Priority open",
              href: "/admin/leads?view=hot",
              icon: TrendingUp,
              tone: "rose" as const,
            },
            {
              label: "Owner Leads",
              value: dashboardValue(leadSummary.owner, leadLoading),
              helper: "Inventory source",
              href: "/admin/leads?view=owner",
              icon: Home,
              tone: "emerald" as const,
            },
            {
              label: "Broker Leads",
              value: dashboardValue(leadSummary.broker, leadLoading),
              helper: "Partner source",
              href: "/admin/leads?view=broker",
              icon: Users,
              tone: "blue" as const,
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

        <section className="rounded-[24px] border border-blue-100 bg-white p-4 shadow-sm md:rounded-[32px] md:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-500">
                C56 lead command center
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950 md:text-2xl">
                Start here for today’s admin work
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                Overdue, due today, hot and no-follow-up leads are surfaced first. Use “Set tomorrow + note” to create a CRM trail.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Button asChild variant="outline" className="rounded-full border-slate-200 text-xs font-bold md:text-sm">
                <Link to="/admin/leads">Lead Inbox</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-blue-200 text-xs font-bold text-blue-700 md:text-sm">
                <Link to="/admin/leads?view=call_sheet">Call Sheet</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-rose-200 text-xs font-bold text-rose-700 md:text-sm">
                <Link to="/admin/leads?view=overdue">Overdue</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-amber-200 text-xs font-bold text-amber-700 md:text-sm">
                <Link to="/admin/leads?view=no_followup">No Follow-up</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-emerald-200 text-xs font-bold text-emerald-700 md:text-sm">
                <Link to="/admin/leads?view=owner">Owner Leads</Link>
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-5">
            {commandLeads.length ? (
              commandLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-md"
                >
                  <Link to={`/admin/leads/${lead.id}`} className="block">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`rounded-full border px-3 py-1 text-[11px] font-black ${leadCommandClass(lead)}`}>
                        {leadCommandLabel(lead)}
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-300" />
                    </div>
                    <p className="mt-3 truncate text-sm font-black text-slate-950">
                      {lead.name || "Unnamed lead"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                      {lead.property || lead.society || lead.requirement || "Lead follow-up"}
                    </p>
                    <p className="mt-3 text-xs font-bold text-blue-700">
                      {leadCommandMeta(lead)}
                    </p>
                    {lead.phone ? (
                      <p className="mt-2 inline-flex items-center text-[11px] text-slate-400">
                        <Phone className="mr-1 h-3.5 w-3.5" />
                        {lead.phone}
                      </p>
                    ) : null}
                  </Link>

                  <button
                    type="button"
                    disabled={savingLeadId === lead.id}
                    onClick={() => void handleDashboardTomorrow(lead)}
                    className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-amber-100 bg-white px-3 py-2 text-xs font-black text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
                  >
                    {savingLeadId === lead.id ? "Saving..." : "Set tomorrow + note"}
                  </button>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-200 p-5 text-sm text-slate-500 xl:col-span-5">
                No open command leads right now.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[32px] md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                C58 attribution command
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950 md:text-2xl">
                Lead source intelligence
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                Jump into leads by public journey: AI, search, property, society, owner or broker.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-full border-slate-200 text-xs font-bold md:text-sm">
              <Link to="/admin/leads">All leads</Link>
            </Button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {sourceSummary.map((item) => (
              <Link
                key={item.bucket}
                to={item.href}
                className={`rounded-[22px] border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${sourceCardClass(item.bucket)}`}
              >
                <p className="text-xs font-black uppercase tracking-[0.14em] opacity-70">{item.label}</p>
                <p className="mt-2 text-2xl font-black">{dashboardValue(item.count, leadLoading)}</p>
                <p className="mt-1 text-xs font-semibold opacity-75">{item.helper}</p>
                {item.latest ? (
                  <p className="mt-2 line-clamp-2 text-[11px] leading-5 opacity-70">
                    Latest: {item.latest.name || "Unnamed"} · {dashboardLeadSourceLabel(item.latest)}
                  </p>
                ) : (
                  <p className="mt-2 text-[11px] opacity-60">No leads yet.</p>
                )}
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] border border-blue-100 bg-blue-50 p-4 shadow-sm md:rounded-[32px] md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                C63 daily call sheet
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950 md:text-2xl">
                Today’s priority follow-up queue
              </h2>
              <p className="mt-1 text-xs leading-5 text-blue-900/70 md:text-sm">
                Work in order: overdue, hot SLA, due today, untouched, then stale. Use call, WhatsApp, open lead or set tomorrow.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-full border-blue-200 bg-white text-xs font-bold text-blue-700 md:text-sm">
              <Link to="/admin/leads?view=call_sheet">Open full call sheet</Link>
            </Button>
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-3">
            {callSheetLeads.length ? (
              callSheetLeads.map((lead) => {
                const phoneDigits = String(lead.phone || "").replace(/[^0-9]/g, "").slice(-10);
                const canCallLead = phoneDigits.length >= 10;

                return (
                  <div key={lead.id} className="rounded-[18px] border border-blue-100 bg-white p-3.5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <span className={`rounded-full border px-3 py-1 text-[11px] font-black ${callSheetReasonClass(lead)}`}>
                        {callSheetReason(lead)}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        {formatLeadDate(lead.followUpAt || lead.createdAt)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-black text-slate-950">{lead.name || "Unnamed lead"}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                      {lead.property || lead.society || lead.requirement || "Lead follow-up"}
                    </p>
                    <p className="mt-2 text-xs font-bold text-blue-700">
                      Owner: {lead.assignedTo || "Unassigned"}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Button asChild variant="outline" size="sm" className="rounded-full border-slate-200 text-xs font-bold md:text-sm">
                        <Link to={`/admin/leads/${lead.id}`}>Open</Link>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={savingLeadId === lead.id}
                        onClick={() => void handleDashboardTomorrow(lead)}
                        className="rounded-full border-amber-200 text-xs font-bold text-amber-700 md:text-sm"
                      >
                        Tomorrow
                      </Button>
                      {canCallLead ? (
                        <Button asChild variant="outline" size="sm" className="rounded-full border-blue-200 text-xs font-bold text-blue-700 md:text-sm">
                          <a href={`tel:${phoneDigits}`}>Call</a>
                        </Button>
                      ) : null}
                      {canCallLead ? (
                        <Button asChild variant="outline" size="sm" className="rounded-full border-emerald-200 text-xs font-bold text-emerald-700 md:text-sm">
                          <a href={callSheetWhatsAppUrl(lead)} target="_blank" rel="noreferrer">WhatsApp</a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[22px] border border-dashed border-blue-200 bg-white p-6 text-sm font-semibold text-blue-700 xl:col-span-3">
                No leads in today’s call sheet.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[32px] md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                C62 SLA / aging control
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950 md:text-2xl">
                Lead aging and response risk
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                Track fresh enquiries, aging leads, stale records and hot leads that still need first contact.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-full border-slate-200 text-xs font-bold md:text-sm">
              <Link to="/admin/leads?view=stale">Review stale leads</Link>
            </Button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {slaSummary.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className={`rounded-[22px] border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${slaCardClass(item.tone)}`}
              >
                <p className="text-xs font-black uppercase tracking-[0.14em] opacity-70">{item.label}</p>
                <p className="mt-2 text-2xl font-black">{dashboardValue(item.value, leadLoading)}</p>
                <p className="mt-1 text-xs font-semibold opacity-75">{item.helper}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[32px] md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                C61 team follow-up control
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950 md:text-2xl">
                Lead owner workload
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                See who owns the current lead pipeline and jump directly into each team member’s queue.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-full border-slate-200 text-xs font-bold md:text-sm">
              <Link to="/admin/leads?assignee=Unassigned">Review unassigned</Link>
            </Button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {teamSummary.map((item) => (
              <Link
                key={item.agent}
                to={item.href}
                className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:shadow-md"
              >
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{item.agent}</p>
                <p className="mt-3 text-3xl font-black text-slate-950">{dashboardValue(item.open, leadLoading)}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">Open leads</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold">
                  <span className="rounded-full bg-white px-2 py-1 text-amber-700">Due {dashboardValue(item.dueToday, leadLoading)}</span>
                  <span className="rounded-full bg-white px-2 py-1 text-rose-700">Late {dashboardValue(item.overdue, leadLoading)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[32px] md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                C59 lead quality command
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950 md:text-2xl">
                Quality and duplicate detection
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                Spot duplicate phones, missing fields and high-intent leads before follow-up.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-full border-slate-200 text-xs font-bold md:text-sm">
              <Link to="/admin/leads?view=duplicates">Review duplicates</Link>
            </Button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {qualitySummary.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className={`rounded-[22px] border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${qualityCardClass(item.tone)}`}
              >
                <p className="text-xs font-black uppercase tracking-[0.14em] opacity-70">{item.label}</p>
                <p className="mt-2 text-2xl font-black">{dashboardValue(item.value, leadLoading)}</p>
                <p className="mt-1 text-xs font-semibold opacity-75">{item.helper}</p>
              </Link>
            ))}
          </div>
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

              <Link to="/admin/leads?view=overdue" className={actionCardClass(false)}>
                <MessageSquareText className="h-5 w-5 text-blue-600" />
                <p className="mt-3 font-bold">Overdue Leads</p>
                <p className="mt-1 text-sm text-slate-500">Call first</p>
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
            <Button asChild variant="outline" className="rounded-full border-slate-200 text-xs font-bold md:text-sm">
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
            <Button asChild variant="outline" className="rounded-full border-slate-200 text-xs font-bold md:text-sm">
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

        <section className="grid gap-3 md:grid-cols-3">
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
