import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  CalendarDays,
  Download,
  Eye,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AdminLead,
  LeadPriority,
  LeadStatus,
  deleteAdminLeadRemote,
  exportLeadsCsv,
  fetchAdminLeads,
  listAdminLeads,
  updateLeadStatusRemote,
} from "@/lib/adminLeadStore";

const statuses: Array<"All" | LeadStatus> = [
  "All",
  "New",
  "Contacted",
  "Site Visit",
  "Negotiation",
  "Booked",
  "Lost",
];

const pipelineViews = [
  { label: "All", view: "all" },
  { label: "Today", view: "today" },
  { label: "Active", view: "active" },
  { label: "Follow-ups", view: "followups" },
  { label: "Overdue", view: "overdue" },
  { label: "Hot", view: "hot" },
  { label: "Booked", view: "booked" },
];

const priorities: Array<"All" | LeadPriority> = ["All", "Hot", "Warm", "Cold"];

function statusClass(status: LeadStatus) {
  switch (status) {
    case "New":
      return "bg-blue-50 text-blue-700";
    case "Contacted":
      return "bg-sky-50 text-sky-700";
    case "Site Visit":
      return "bg-violet-50 text-violet-700";
    case "Negotiation":
      return "bg-amber-50 text-amber-700";
    case "Booked":
      return "bg-emerald-50 text-emerald-700";
    case "Lost":
      return "bg-rose-50 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function priorityClass(priority: LeadPriority) {
  switch (priority) {
    case "Hot":
      return "bg-rose-50 text-rose-700";
    case "Warm":
      return "bg-amber-50 text-amber-700";
    case "Cold":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function sourceLabel(source?: string) {
  const value = String(source || "").toLowerCase();

  if (value.includes("property_page_callback") || value.includes("property_callback")) {
    return "Property callback";
  }

  if (value.includes("property_page_enquiry") || value.includes("property_enquiry")) {
    return "Property enquiry";
  }

  if (value.includes("search_no_results")) return "Search no-result";
  if (value.includes("search_property_card")) return "Search property";
  if (value.includes("search_society_card")) return "Search society";
  if (value.includes("society_page_property")) return "Society property";
  if (value.includes("society_page")) return "Society page";
  if (value.includes("owner")) return "Owner listing";
  if (value.includes("floating")) return "Floating chat";
  if (value.includes("homepage")) return "Homepage";
  if (value.includes("search")) return "Search";
  if (value.includes("society")) return "Society callback";

  return source || "Website";
}

function sourceClass(source?: string) {
  const value = String(source || "").toLowerCase();

  if (value.includes("property")) return "bg-violet-50 text-violet-700 border-violet-100";
  if (value.includes("society")) return "bg-blue-50 text-blue-700 border-blue-100";
  if (value.includes("owner")) return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (value.includes("floating") || value.includes("chat")) return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-slate-50 text-slate-600 border-slate-100";
}

function cleanPhone(phone?: string) {
  return String(phone || "").replace(/[^0-9]/g, "");
}

function canUsePhone(phone?: string) {
  return cleanPhone(phone).length >= 10;
}

function whatsappUrl(lead: AdminLead) {
  const digits = cleanPhone(lead.phone).slice(-10);
  const interest = lead.property || lead.society || "your property requirement";
  const requirement = lead.requirement || "Not specified";
  const message = encodeURIComponent(
    [
      `Hi ${lead.name || ""}, this is SocietyFlats.`,
      `We received your enquiry for ${interest}.`,
      `Requirement: ${requirement}.`,
      "We can help with availability, pricing and visit timing.",
      "Please let us know a good time to connect.",
    ].join("\n")
  );

  return `https://wa.me/91${digits}?text=${message}`;
}

function isToday(value: string) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toDateString() === new Date().toDateString();
}

function displayRequirement(lead: AdminLead) {
  return lead.requirement || lead.budget || "Not specified";
}

function displayFollowUp(lead: AdminLead) {
  if (!lead.followUpAt) return "Not set";

  const date = new Date(lead.followUpAt);
  if (Number.isNaN(date.getTime())) return lead.followUpAt;

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function followUpLabel(lead: AdminLead) {
  const state = followUpState(lead);

  if (state === "overdue") return "Overdue";
  if (state === "today") return "Today";
  if (state === "upcoming") return "Upcoming";

  return "Not set";
}

function dashboardLeadViewMatches(lead: AdminLead, view: string) {
  if (!view || view === "all") return true;

  if (view === "today") {
    if (!lead.createdAt) return false;
    const date = new Date(lead.createdAt);
    return !Number.isNaN(date.getTime()) && date.toDateString() === new Date().toDateString();
  }

  if (view === "active") {
    return !["Booked", "Lost"].includes(lead.status);
  }

  if (view === "followups") {
    return followUpState(lead) === "today";
  }

  if (view === "overdue") {
    return followUpState(lead) === "overdue";
  }

  if (view === "hot") {
    return lead.priority === "Hot";
  }

  if (view === "booked") {
    return lead.status === "Booked";
  }

  return true;
}

function dashboardLeadViewLabel(view: string) {
  if (view === "today") return "Today’s leads";
  if (view === "active") return "Active leads";
  if (view === "followups") return "Follow-ups due today";
  if (view === "overdue") return "Overdue follow-ups";
  if (view === "hot") return "Hot leads";
  if (view === "booked") return "Booked leads";
  return "";
}

function pipelineViewCount(leads: AdminLead[], view: string) {
  if (view === "all") return leads.length;
  return leads.filter((lead) => dashboardLeadViewMatches(lead, view)).length;
}

function pipelineEmptyMessage(view: string) {
  if (view === "today") return "No new leads today.";
  if (view === "active") return "No active leads in the pipeline.";
  if (view === "followups") return "No follow-ups due today.";
  if (view === "overdue") return "No overdue follow-ups. You’re clear for now.";
  if (view === "hot") return "No hot leads right now.";
  if (view === "booked") return "No booked leads yet.";
  return "No leads found for the selected filters.";
}

function followUpClass(lead: AdminLead) {
  const state = followUpState(lead);

  if (state === "overdue") return "bg-rose-50 text-rose-700 border-rose-100";
  if (state === "today") return "bg-blue-50 text-blue-700 border-blue-100";
  if (state === "upcoming") return "bg-emerald-50 text-emerald-700 border-emerald-100";

  return "bg-slate-50 text-slate-500 border-slate-100";
}

export function AdminLeadsPage() {
  const location = useLocation();
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"All" | LeadStatus>("All");
  const [priority, setPriority] = useState<"All" | LeadPriority>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingLeadId, setSavingLeadId] = useState<number | null>(null);

  const dashboardView = useMemo(() => {
    return new URLSearchParams(location.search).get("view") || "all";
  }, [location.search]);

  const dashboardViewLabel = dashboardLeadViewLabel(dashboardView);

  const loadLeads = async () => {
    setLoading(true);
    setError("");

    try {
      const apiLeads = await fetchAdminLeads();
      setLeads(apiLeads);
    } catch (err) {
      console.error(err);
      setLeads(listAdminLeads());
      setError("Could not load live backend leads. Showing local fallback, if any.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLeads();
  }, []);

  const filteredLeads = useMemo(() => {
    const search = query.trim().toLowerCase();

    return leads
      .filter((lead) => dashboardLeadViewMatches(lead, dashboardView))
      .filter((lead) => {
        const matchesSearch =
          !search ||
          [
            lead.name,
            lead.phone,
            lead.email,
            lead.society,
            lead.property,
            lead.budget,
            lead.assignedTo,
            lead.source,
            lead.requirement,
            sourceLabel(lead.source),
          ]
            .join(" ")
            .toLowerCase()
            .includes(search);

        const matchesStatus = status === "All" || lead.status === status;
        const matchesPriority = priority === "All" || lead.priority === priority;

        return matchesSearch && matchesStatus && matchesPriority;
      });
  }, [dashboardView, leads, priority, query, status]);

  const todayLeads = leads.filter((lead) => isToday(lead.createdAt)).length;
  const activeLeads = leads.filter((lead) => !["Booked", "Lost"].includes(lead.status)).length;
  const bookedLeads = leads.filter((lead) => lead.status === "Booked").length;
  const hotLeads = leads.filter((lead) => lead.priority === "Hot").length;
  const followUpsToday = leads.filter((lead) => followUpState(lead) === "today").length;
  const overdueFollowUps = leads.filter((lead) => followUpState(lead) === "overdue").length;

  const handleStatusChange = async (lead: AdminLead, nextStatus: LeadStatus) => {
    const previousLeads = leads;

    setSavingLeadId(lead.id);
    setLeads((current) =>
      current.map((item) => (item.id === lead.id ? { ...item, status: nextStatus } : item)),
    );

    try {
      const updated = await updateLeadStatusRemote(lead.id, nextStatus);
      if (updated) {
        setLeads((current) => current.map((item) => (item.id === lead.id ? updated : item)));
      }
    } catch (err) {
      console.error(err);
      setLeads(previousLeads);
      setError("Could not update lead status. Please try again.");
    } finally {
      setSavingLeadId(null);
    }
  };

  const handleDelete = async (lead: AdminLead) => {
    if (!window.confirm(`Delete lead for ${lead.name}?`)) return;

    const previousLeads = leads;
    setLeads((current) => current.filter((item) => item.id !== lead.id));

    try {
      await deleteAdminLeadRemote(lead.id);
    } catch (err) {
      console.error(err);
      setLeads(previousLeads);
      setError("Could not delete lead. Please try again.");
    }
  };

  return (
    <AdminLayout title="Leads CRM">
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-700">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          {[
            ["Today", todayLeads, "New enquiries"],
            ["Active Leads", activeLeads, "In pipeline"],
            ["Follow-ups", followUpsToday, "Due today"],
            ["Overdue", overdueFollowUps, "Needs action"],
            ["Hot Leads", hotLeads, "Priority follow-ups"],
            ["Booked", bookedLeads, "Closed wins"],
          ].map(([label, value, helper]) => (
            <div key={String(label)} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-3xl font-bold text-slate-950">{value}</p>
              <p className="mt-2 text-sm font-medium text-blue-600">{label}</p>
              <p className="mt-1 text-xs text-slate-400">{helper}</p>
            </div>
          ))}
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950">Lead Inbox</h2>
              <p className="mt-1 text-sm text-slate-500">
                Live backend leads from SocietyFlats public enquiries and callback forms.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={loadLeads}
                variant="outline"
                className="rounded-full border-slate-200"
                disabled={loading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                onClick={() => exportLeadsCsv(filteredLeads)}
                variant="outline"
                className="rounded-full border-slate-200"
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          {dashboardViewLabel ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              <span>
                Showing: <strong>{dashboardViewLabel}</strong>
              </span>
              <Link to="/admin/leads" className="font-semibold hover:underline">
                Clear filter
              </Link>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            {pipelineViews.map((item) => {
              const active = dashboardView === item.view || (!dashboardView && item.view === "all");

              return (
                <Link
                  key={item.view}
                  to={item.view === "all" ? "/admin/leads" : `/admin/leads?view=${item.view}`}
                  className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                    active
                      ? "border-blue-200 bg-blue-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {pipelineViewCount(leads, item.view)}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_190px_190px]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, phone, society, source, budget or requirement..."
                className="h-12 rounded-2xl border-slate-200 pl-11"
              />
            </div>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as "All" | LeadStatus)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
            >
              {statuses.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as "All" | LeadPriority)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
            >
              {priorities.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
            <div className="hidden grid-cols-[1.3fr_1.6fr_150px_110px_150px_210px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 xl:grid">
              <span>Lead</span>
              <span>Interest</span>
              <span>Status</span>
              <span>Priority</span>
              <span>Follow-up</span>
              <span>Actions</span>
            </div>

            {loading ? (
              <div className="p-10 text-center text-slate-500">Loading live backend leads...</div>
            ) : null}

            {!loading && filteredLeads.map((lead) => {
              const hasPhone = canUsePhone(lead.phone);

              return (
                <div
                  key={lead.id}
                  className="border-b border-slate-200 bg-white px-4 py-5 last:border-0 xl:grid xl:grid-cols-[1.3fr_1.6fr_150px_110px_150px_210px] xl:items-center xl:gap-4 xl:px-5"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 xl:block">
                      <div>
                        <p className="text-base font-bold text-slate-950">{lead.name}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                          {lead.phone ? (
                            <a href={`tel:${cleanPhone(lead.phone)}`} className="inline-flex items-center gap-1 hover:text-blue-700">
                              <Phone className="h-3.5 w-3.5" />
                              {lead.phone}
                            </a>
                          ) : (
                            <span>No phone</span>
                          )}
                          {lead.email ? <span>Email</span> : null}
                        </div>
                      </div>

                      <span className={`rounded-full border px-3 py-1 text-xs font-bold xl:mt-3 inline-flex ${sourceClass(lead.source)}`}>
                        {sourceLabel(lead.source)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-50 p-3 xl:mt-0 xl:bg-transparent xl:p-0">
                    <p className="font-semibold text-slate-950">{lead.society || "Not specified"}</p>
                    <p className="mt-1 text-sm text-slate-500">{lead.property || "General enquiry"}</p>
                    <p className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 xl:bg-transparent xl:px-0 xl:py-0 xl:text-sm">
                      {displayRequirement(lead)}
                    </p>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-3 xl:mt-0 xl:border-0 xl:p-0">
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400 xl:hidden">Status</p>
                    <select
                      value={lead.status}
                      disabled={savingLeadId === lead.id}
                      onChange={(event) => handleStatusChange(lead, event.target.value as LeadStatus)}
                      className={`h-10 rounded-full border-0 px-3 text-sm font-semibold outline-none disabled:opacity-60 ${statusClass(lead.status)}`}
                    >
                      {statuses
                        .filter((item) => item !== "All")
                        .map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                    </select>
                  </div>

                  <div className="mt-4 xl:mt-0">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${priorityClass(lead.priority)}`}>
                      {lead.priority}
                    </span>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-3 text-sm text-slate-500 xl:mt-0 xl:border-0 xl:p-0">
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400 xl:hidden">Follow-up</p>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${followUpClass(lead)}`}>
                      {followUpLabel(lead)}
                    </span>
                    <p className="mt-2 flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {displayFollowUp(lead)}
                    </p>
                    <p className="mt-1">{lead.assignedTo || "Unassigned"}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 xl:mt-0">
                    <Button asChild variant="outline" size="sm" className="rounded-full border-slate-200">
                      <Link to={`/admin/leads/${lead.id}`}>
                        <Eye className="mr-1.5 h-4 w-4" />
                        Open
                      </Link>
                    </Button>

                    {hasPhone ? (
                      <Button asChild variant="outline" size="icon" className="rounded-full border-slate-200">
                        <a href={`tel:${cleanPhone(lead.phone)}`} aria-label="Call lead">
                          <Phone className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}

                    {hasPhone ? (
                      <Button asChild variant="outline" size="icon" className="rounded-full border-emerald-200 text-emerald-700">
                        <a href={whatsappUrl(lead)} target="_blank" rel="noreferrer" aria-label="WhatsApp lead">
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}

                    <Button
                      onClick={() => handleDelete(lead)}
                      size="icon"
                      variant="ghost"
                      className="h-10 rounded-full text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Delete lead"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {!loading && !filteredLeads.length ? (
              <div className="p-10 text-center text-slate-500">
                {pipelineEmptyMessage(dashboardView)}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
