// C84 admin dashboard UX polish: compact command center cards and scan layout, logic unchanged.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  Gauge,
  Home,
  Import,
  MapPin,
  MessageSquareText,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
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
  const [queue, setQueue] = useState<{ pending: number; failed: number } | null>(null);

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
      setQueue(json?.queue || null);
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

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const todayLabel = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const busy = loading || leadLoading || inventoryLoading;

  const kpis = [
    { label: "Verified societies", value: inventorySummary.verifiedSocieties, sub: `${inventorySummary.totalSocieties} total`, href: "/admin/societies", icon: Building2, tone: "text-blue-700 bg-blue-50" },
    { label: "Live properties", value: inventorySummary.liveProperties, sub: `${inventorySummary.totalProperties} total`, href: "/admin/properties", icon: Home, tone: "text-indigo-700 bg-indigo-50" },
    { label: "Active leads", value: leadSummary.open, sub: "in pipeline", href: "/admin/leads?view=active", icon: MessageSquareText, tone: "text-slate-700 bg-slate-100" },
    { label: "New today", value: leadSummary.today, sub: "fresh enquiries", href: "/admin/leads?view=today", icon: Clock, tone: "text-emerald-700 bg-emerald-50" },
    { label: "Hot & open", value: leadSummary.hotActive, sub: "call first", href: "/admin/leads?view=hot", icon: TrendingUp, tone: "text-rose-700 bg-rose-50" },
    { label: "Booked", value: leadSummary.booked, sub: "closed wins", href: "/admin/leads?view=booked", icon: CheckCircle2, tone: "text-emerald-700 bg-emerald-50" },
  ];

  const attention = inbox?.live
    ? [
        { value: inbox.live.leads.breaches.count, label: "Lead SLA breaches", sub: `${inbox.live.leads.escalations_over_72h.count} over 72h`, href: "/admin/leads?view=overdue", bad: inbox.live.leads.breaches.count > 0 },
        { value: leadSummary.overdue, label: "Overdue follow-ups", sub: "past due", href: "/admin/leads?view=overdue", bad: leadSummary.overdue > 0 },
        { value: inbox.live.societies.missing_cover.count, label: "Missing cover photo", sub: "published societies", href: "/admin/societies", bad: inbox.live.societies.missing_cover.count > 0 },
        { value: inbox.live.societies.missing_published_seo.count, label: "No published SEO", sub: "content backlog", href: "/admin/seo-autopilot", bad: inbox.live.societies.missing_published_seo.count > 0 },
        { value: inbox.live.societies.low_confidence.count, label: "Low confidence", sub: "below 60% verified", href: "/admin/societies", bad: inbox.live.societies.low_confidence.count > 0 },
        { value: inbox.live.site_visits.reminders_due, label: "Visit reminders due", sub: `${inbox.live.site_visits.upcoming_48h} in 48h`, href: "/admin/site-visits", bad: inbox.live.site_visits.reminders_due > 0 },
      ]
    : [];

  const quickLinks = [
    { label: "Societies", href: "/admin/societies", icon: Building2 },
    { label: "Society Importer", href: "/admin/verified-society-importer", icon: Import },
    { label: "Properties", href: "/admin/properties", icon: Home },
    { label: "Owner Listings", href: "/admin/owner-listings", icon: ClipboardList },
    { label: "Leads", href: "/admin/leads", icon: MessageSquareText },
    { label: "Site Visits", href: "/admin/site-visits", icon: CalendarDays },
    { label: "SEO Autopilot", href: "/admin/seo-autopilot", icon: Gauge },
    { label: "AI Social", href: "/admin/social", icon: Sparkles },
    { label: "User AI Chats", href: "/admin/ai-chats", icon: Bot },
    { label: "Reviews", href: "/admin/reviews", icon: Star },
    { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { label: "Settings", href: "/admin/settings", icon: ShieldCheck },
  ];

  const leadMeta = (lead: AdminLead) =>
    [lead.requirement, lead.property, lead.society].filter(Boolean).join(" · ") || "General enquiry";
  const waLink = (lead: AdminLead) => {
    const digits = String(lead.phone || "").replace(/\D/g, "");
    return digits ? `https://wa.me/${digits.length === 10 ? "91" + digits : digits}` : "";
  };

  return (
    <AdminLayout title="Dashboard" subtitle="SocietyFlats command center">
      <div className="space-y-5">
        {scheduler && !scheduler.healthy ? (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 px-5 py-3.5 text-sm font-bold text-rose-800">
            ⚠ Scheduler appears down — {scheduler.last_heartbeat_at ? `last heartbeat ${scheduler.minutes_since} min ago` : "no heartbeat recorded yet"}. All scheduled automation is stalled until the backend scheduler loop runs again — check the societyflats-api service on Render.
          </div>
        ) : null}
        {queue && queue.failed > 0 ? (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 px-5 py-3.5 text-sm font-bold text-rose-800">
            ⚠ {queue.failed} background job{queue.failed === 1 ? "" : "s"} failed. Inspect with <code className="rounded bg-rose-100 px-1">php artisan queue:failed</code>; use "Complete all drafts now" in the importer to retry.
          </div>
        ) : null}
        {queue && queue.pending > 20 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm font-bold text-amber-800">
            {queue.pending} background jobs are queued and draining slowly — the queue worker may be behind.
          </div>
        ) : null}
        {(error || leadError || inventoryError) ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-700">
            {error || leadError || inventoryError}
          </div>
        ) : null}

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">{greeting}, Nitin</h1>
            <p className="mt-1 text-sm text-slate-500">{todayLabel} · your leads, inventory and automation at a glance</p>
          </div>
          <Button type="button" variant="outline" className="rounded-full border-slate-200 bg-white" onClick={refreshAll} disabled={busy}>
            <RefreshCw className={`mr-2 h-4 w-4 ${busy ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* KPI row */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Link key={kpi.label} to={kpi.href} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
                <span className={`inline-flex rounded-xl p-2 ${kpi.tone}`}><Icon className="h-4 w-4" /></span>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{dashboardValue(kpi.value, busy)}</p>
                <p className="mt-1 text-sm font-bold text-slate-700">{kpi.label}</p>
                <p className="text-xs text-slate-400">{kpi.sub}</p>
              </Link>
            );
          })}
        </section>

        {/* Needs attention */}
        {inbox?.live ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-black text-slate-950">Needs your attention</h2>
                <p className="text-sm text-slate-500">Automated daily checks across leads, societies and visits.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
                {inbox?.last_digest?.digest_date ? `Last digest ${inbox.last_digest.digest_date}` : "First digest runs 07:30"}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {attention.map((item) => (
                <Link key={item.label} to={item.href} className={`rounded-2xl border p-3 transition hover:shadow-sm ${item.bad ? "border-rose-200 bg-rose-50" : "border-emerald-100 bg-emerald-50"}`}>
                  <p className={`text-2xl font-black ${item.bad ? "text-rose-700" : "text-emerald-700"}`}>{item.value}</p>
                  <p className="mt-1 text-xs font-bold text-slate-700">{item.label}</p>
                  <p className="text-[11px] text-slate-500">{item.sub}</p>
                </Link>
              ))}
            </div>
            {suggestions.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Automation suggestions awaiting your decision</p>
                <div className="mt-2 space-y-2">
                  {suggestions.slice(0, 4).map((suggestion) => (
                    <div key={suggestion.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm">
                      <span className="font-semibold text-slate-800">
                        {suggestion.society_name ? `${suggestion.society_name} · ` : ""}{suggestion.kind === "market_refresh" ? "Market data refresh" : suggestion.kind}
                      </span>
                      <span className="flex gap-2">
                        <Button size="sm" className="h-8 rounded-full bg-blue-600 text-xs hover:bg-blue-700" disabled={suggestionBusyId === suggestion.id} onClick={() => void resolveSuggestion(suggestion.id, "apply")}>Apply</Button>
                        <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" disabled={suggestionBusyId === suggestion.id} onClick={() => void resolveSuggestion(suggestion.id, "dismiss")}>Dismiss</Button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {/* Two columns: today's leads + to finish */}
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-950">Today's priority leads</h2>
              <Link to="/admin/leads?view=call_sheet" className="text-sm font-bold text-blue-600 hover:underline">Call sheet →</Link>
            </div>
            <div className="mt-3 space-y-2">
              {leadLoading ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Loading leads…</p>
              ) : callSheetLeads.length ? (
                callSheetLeads.slice(0, 5).map((lead) => (
                  <div key={lead.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-900">{lead.name || "Unnamed lead"}</p>
                      <p className="truncate text-xs text-slate-500">{leadMeta(lead)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button asChild size="sm" variant="outline" className="h-8 rounded-full border-slate-200 text-xs"><Link to={`/admin/leads/${lead.id}`}>Open</Link></Button>
                      {lead.phone ? <a href={`tel:${lead.phone}`} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:text-blue-700" title="Call"><Phone className="h-4 w-4" /></a> : null}
                      {waLink(lead) ? <a href={waLink(lead)} target="_blank" rel="noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 text-emerald-600 hover:bg-emerald-50" title="WhatsApp"><MessageSquareText className="h-4 w-4" /></a> : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700">No priority leads waiting. Nicely done.</p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-950">To finish</h2>
              <span className="text-xs font-bold text-slate-400">Drafts & follow-ups</span>
            </div>
            <div className="mt-3 space-y-2">
              {actionQueue.length ? (
                actionQueue.map((task) => (
                  <Link key={task.key} to={task.href} className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 transition hover:border-blue-200 hover:bg-white">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-900">{task.title}</p>
                      <p className="truncate text-xs text-slate-500">{task.meta}</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-slate-200/70 px-2.5 py-1 text-[11px] font-black text-slate-600">{task.label}</span>
                      <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
                    </span>
                  </Link>
                ))
              ) : (
                <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700">Nothing pending — drafts and follow-ups are all clear.</p>
              )}
            </div>
          </section>
        </div>

        {/* Quick access */}
        <section>
          <h2 className="mb-3 text-lg font-black text-slate-950">Quick access</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} to={link.href} className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
                  <span className="inline-flex rounded-xl bg-slate-100 p-2 text-slate-600 transition group-hover:bg-blue-50 group-hover:text-blue-700"><Icon className="h-4 w-4" /></span>
                  <span className="text-sm font-bold text-slate-800">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
