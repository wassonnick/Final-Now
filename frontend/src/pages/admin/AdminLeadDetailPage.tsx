import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Flame,
  Mail,
  MessageCircle,
  Phone,
  Save,
  Send,
  UserCheck,
} from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AdminLead,
  LeadPriority,
  LeadStatus,
  addLeadNoteRemote,
  fetchAdminLead,
  getAdminLead,
  saveAdminLead,
} from "@/lib/adminLeadStore";

const statuses: LeadStatus[] = [
  "New",
  "Contacted",
  "Site Visit",
  "Negotiation",
  "Booked",
  "Lost",
];

const priorities: LeadPriority[] = ["Hot", "Warm", "Cold"];
const agents = ["Nitin", "Amit", "Rohit", "Priya", "Unassigned"];

function leadTimelineItems(lead?: AdminLead | null) {
  const rawNotes = (lead as { notes?: unknown } | null | undefined)?.notes;

  if (!rawNotes) return [];

  if (Array.isArray(rawNotes)) {
    return rawNotes
      .map((item, index) => {
        if (typeof item === "string") {
          return {
            id: `note-${index}`,
            text: item,
            meta: "Timeline note",
          };
        }

        if (item && typeof item === "object") {
          const note = item as { text?: unknown; body?: unknown; note?: unknown; createdAt?: unknown; created_at?: unknown };
          return {
            id: `note-${index}`,
            text: String(note.text || note.body || note.note || ""),
            meta: String(note.createdAt || note.created_at || "Timeline note"),
          };
        }

        return null;
      })
      .filter((item): item is { id: string; text: string; meta: string } => Boolean(item?.text));
  }

  if (typeof rawNotes === "string") {
    const value = rawNotes.trim();

    if (!value) return [];

    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item, index) => {
            if (typeof item === "string") {
              return {
                id: `note-${index}`,
                text: item,
                meta: "Timeline note",
              };
            }

            if (item && typeof item === "object") {
              const note = item as { text?: unknown; body?: unknown; note?: unknown; createdAt?: unknown; created_at?: unknown };
              return {
                id: `note-${index}`,
                text: String(note.text || note.body || note.note || ""),
                meta: String(note.createdAt || note.created_at || "Timeline note"),
              };
            }

            return null;
          })
          .filter((item): item is { id: string; text: string; meta: string } => Boolean(item?.text));
      }
    } catch {
      // plain text notes fallback
    }

    return value
      .split("\n")
      .map((item, index) => ({
        id: `note-${index}`,
        text: item.trim(),
        meta: "Timeline note",
      }))
      .filter((item) => Boolean(item.text));
  }

  return [];
}


function isSubmittedDetailNote(text: string) {
  const value = text.toLowerCase();

  return (
    value.includes("broker partner enquiry from public broker crm page") ||
    value.includes("owner listing submission from sell page") ||
    value.includes("owner wants to rent") ||
    value.includes("owner wants to sell") ||
    value.includes("callback requested from societyflats feature page")
  );
}

function submittedDetailItems(lead?: AdminLead | null) {
  return leadTimelineItems(lead).filter((item) => isSubmittedDetailNote(item.text));
}

function adminTimelineItems(lead?: AdminLead | null) {
  return leadTimelineItems(lead).filter((item) => !isSubmittedDetailNote(item.text));
}

function formatSubmittedDetails(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function statusClass(status: LeadStatus) {
  switch (status) {
    case "New":
      return "bg-blue-50 text-blue-700 border-blue-100";
    case "Contacted":
      return "bg-sky-50 text-sky-700 border-sky-100";
    case "Site Visit":
      return "bg-violet-50 text-violet-700 border-violet-100";
    case "Negotiation":
      return "bg-amber-50 text-amber-700 border-amber-100";
    case "Booked":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "Lost":
      return "bg-rose-50 text-rose-700 border-rose-100";
    default:
      return "bg-slate-100 text-slate-700 border-slate-100";
  }
}

function priorityClass(priority: LeadPriority) {
  switch (priority) {
    case "Hot":
      return "bg-rose-50 text-rose-700 border-rose-100";
    case "Warm":
      return "bg-amber-50 text-amber-700 border-amber-100";
    case "Cold":
      return "bg-slate-50 text-slate-600 border-slate-100";
    default:
      return "bg-slate-50 text-slate-600 border-slate-100";
  }
}

function sourceLabel(source?: string) {
  const value = String(source || "").toLowerCase();

  if (
    value.includes("owner") ||
    value.includes("sell") ||
    value.includes("seller") ||
    value.includes("listing_submission") ||
    value.includes("list_property")
  ) {
    return "Owner listing";
  }

  if (
    value.includes("broker") ||
    value.includes("partner") ||
    value.includes("agent") ||
    value.includes("crm_intake")
  ) {
    return "Broker partner";
  }

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
  if (value.includes("floating")) return "Floating chat";
  if (value.includes("homepage")) return "Homepage";
  if (value.includes("callback")) return "General callback";
  if (value.includes("search")) return "Search enquiry";
  if (value.includes("society")) return "Society enquiry";
  if (value.includes("property")) return "Property enquiry";

  return source || "Website";
}


function isBrokerSource(source?: string) {
  const value = String(source || "").toLowerCase();

  return (
    value.includes("broker") ||
    value.includes("partner") ||
    value.includes("agent") ||
    value.includes("crm_intake") ||
    value.includes("public_broker_crm")
  );
}

function isOwnerSource(source?: string) {
  const value = String(source || "").toLowerCase();

  return (
    value.includes("owner") ||
    value.includes("sell") ||
    value.includes("seller") ||
    value.includes("listing_submission") ||
    value.includes("list_property")
  );
}



function displayLeadStatus(lead: AdminLead) {
  if (isBrokerSource(lead.source)) {
    if (lead.status === "Booked") return "Active Partner";
    if (lead.status === "Lost") return "Not Suitable";
  }

  if (isOwnerSource(lead.source)) {
    if (lead.status === "Booked") return "Owner Active";
    if (lead.status === "Lost") return "Inactive Owner";
  }

  return lead.status;
}

function displayStatusOption(lead: AdminLead, status: string) {
  if (isBrokerSource(lead.source)) {
    if (status === "Booked") return "Active Partner";
    if (status === "Lost") return "Not Suitable";
  }

  if (isOwnerSource(lead.source)) {
    if (status === "Booked") return "Owner Active";
    if (status === "Lost") return "Inactive Owner";
  }

  return status;
}


function ownerLeadIntent(lead: AdminLead) {
  const value = String(lead.requirement || lead.source || "").toLowerCase();

  if (value.includes("sale") || value.includes("sell")) return "Owner sale listing";
  if (value.includes("rent")) return "Owner rental listing";

  return "Owner listing enquiry";
}

function displayOwnerRequirement(lead: AdminLead) {
  if (!isOwnerSource(lead.source)) return lead.requirement || "Not specified";
  return ownerLeadIntent(lead);
}


function ownerDraftPropertyUrl(lead: AdminLead) {
  const params = new URLSearchParams();

  if (lead.name) params.set("ownerName", lead.name);
  if (lead.phone) params.set("ownerPhone", lead.phone);
  if (lead.society) params.set("society", lead.society);
  if (lead.property) params.set("property", lead.property);
  if (lead.budget) params.set("expectedPrice", lead.budget);
  params.set("requirement", displayLeadRequirement(lead));
  params.set("sourceLeadId", String(lead.id));

  return `/admin/properties/new?${params.toString()}`;
}

function linkedDraftPropertyForLead(lead: AdminLead) {
  return lead.linkedProperties?.find((property) =>
    ["Draft", "Verification"].includes(String(property.status || ""))
  );
}

function linkedLivePropertyForLead(lead: AdminLead) {
  return lead.linkedProperties?.find((property) =>
    String(property.status || "") === "Live"
  );
}

function ownerLeadNextStep(lead: AdminLead) {
  if (!isOwnerSource(lead.source)) return "";

  if (lead.status === "Booked") return "Inventory active";
  if (lead.status === "Lost") return "Owner inactive";
  if (lead.status === "Negotiation") return "Confirm final price/rent and listing terms";
  if (lead.status === "Contacted") return "Verify ownership, society and property details";
  if (lead.status === "Site Visit") return "Collect photos and inspect property readiness";

  return "Call owner and verify listing details";
}

function displayLeadRequirement(lead: AdminLead) {
  if (isBrokerSource(lead.source)) return "Broker partner onboarding";
  if (isOwnerSource(lead.source)) return displayOwnerRequirement(lead);
  return lead.requirement || "Not specified";
}

function preferredCallbackTime(lead: AdminLead) {
  const rawParts = [
    (lead as { message?: unknown }).message,
    (lead as { notes?: unknown }).notes,
    (lead as { rawNotes?: unknown }).rawNotes,
    (lead as { timeline?: unknown }).timeline,
    (lead as { submittedDetails?: unknown }).submittedDetails,
    (lead as { originalMessage?: unknown }).originalMessage,
    (lead as { adminNotes?: unknown }).adminNotes,
    lead.requirement,
  ];

  let raw = rawParts
    .map((item) => {
      if (!item) return "";
      if (typeof item === "string") return item;
      try {
        return JSON.stringify(item);
      } catch {
        return "";
      }
    })
    .filter(Boolean)
    .join("\n");

  try {
    raw += "\n" + JSON.stringify(lead);
  } catch {
    // Keep the explicit fields above if full serialization fails.
  }

  const cleanRaw = raw
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\"/g, '"');

  const patterns = [
    /Preferred callback time:\s*([^\n.,"}]+)/i,
    /preferred_callback_time["':\s]+([^\n.,"}]+)/i,
    /preferredTime["':\s]+([^\n.,"}]+)/i,
    /Preferred time:\s*([^\n.,"}]+)/i,
  ];

  for (const pattern of patterns) {
    const match = cleanRaw.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }

  return "";
}



function leadWorkflowNextAction(lead: AdminLead) {
  const status = lead.status;
  const source = String(lead.source || "").toLowerCase();

  if (status === "Booked") {
    if (isOwnerSource(source)) return "Owner inventory is active. Keep pricing, photos and availability updated.";
    if (isBrokerSource(source)) return "Broker partner is active. Ask for fresh inventory and working areas.";
    return "Lead is closed. Keep record updated.";
  }

  if (status === "Lost") return "Lead is inactive. Reopen only if the customer responds again.";

  if (isOwnerSource(source)) {
    if (status === "New") return "Verify ownership, society, tower, expected price/rent and availability.";
    if (status === "Contacted") return "Ask for photos, floor, furnishing and permission to create the draft listing.";
    if (status === "Negotiation") return "Confirm final price/rent and create or publish the draft property.";
    return "Move owner lead toward verified inventory.";
  }

  if (isBrokerSource(source)) {
    if (status === "New") return "Verify broker profile, active societies and working locations.";
    if (status === "Contacted") return "Ask inventory format, commission terms and society focus.";
    if (status === "Negotiation") return "Finalize partner terms and mark as active partner.";
    return "Move broker lead toward active partner status.";
  }

  if (source.includes("property")) {
    if (status === "New") return "Call the lead, qualify budget and confirm rent/buy intent.";
    if (status === "Contacted") return "Share matching homes and push for visit timing.";
    if (status === "Site Visit") return "Confirm visit slot, property availability and decision timeline.";
    return "Move property lead toward visit or negotiation.";
  }

  if (source.includes("society") || source.includes("search") || source.includes("ai")) {
    if (status === "New") return "Call and understand budget, preferred sectors, commute and family needs.";
    if (status === "Contacted") return "Send a short society shortlist with available homes.";
    if (status === "Site Visit") return "Schedule society or property visit.";
    return "Move enquiry toward shortlist and visit.";
  }

  return "Contact the lead and add the next follow-up note.";
}

function leadTypeTitle(source?: string) {
  const value = String(source || "").toLowerCase();

  if (
    value.includes("broker") ||
    value.includes("partner") ||
    value.includes("agent") ||
    value.includes("crm_intake") ||
    value.includes("public_broker_crm")
  ) {
    return "Broker partner lead";
  }

  if (
    value.includes("owner") ||
    value.includes("sell") ||
    value.includes("seller") ||
    value.includes("listing_submission") ||
    value.includes("list_property")
  ) {
    return "Owner listing lead";
  }

  if (value.includes("property")) return "Property enquiry";
  if (value.includes("society")) return "Society enquiry";
  if (value.includes("search")) return "Search enquiry";
  if (value.includes("floating") || value.includes("chat") || value.includes("callback")) return "Callback lead";

  return "Website lead";
}

function leadTypeDescription(source?: string) {
  const value = String(source || "").toLowerCase();

  if (
    value.includes("broker") ||
    value.includes("partner") ||
    value.includes("agent") ||
    value.includes("crm_intake") ||
    value.includes("public_broker_crm")
  ) {
    return "Partner or broker enquiry. Verify area coverage, lead-sharing terms and commission expectations.";
  }

  if (
    value.includes("owner") ||
    value.includes("sell") ||
    value.includes("seller") ||
    value.includes("listing_submission") ||
    value.includes("list_property")
  ) {
    return "Owner inventory enquiry. Verify ownership, property details, photos, availability and expected pricing.";
  }

  if (value.includes("property")) {
    return "User showed interest in a property. Confirm availability, price, visit timing and decision timeline.";
  }

  if (value.includes("society")) {
    return "User showed interest in a society. Understand rent/buy need and match available inventory.";
  }

  if (value.includes("search")) {
    return "Search-generated lead. Clarify exact requirement and suggest matching societies or properties.";
  }

  return "General website lead. Call back and qualify the requirement before assigning next action.";
}

function leadTypeClass(source?: string) {
  const value = String(source || "").toLowerCase();

  if (
    value.includes("broker") ||
    value.includes("partner") ||
    value.includes("agent") ||
    value.includes("crm_intake") ||
    value.includes("public_broker_crm")
  ) {
    return "border-orange-100 bg-orange-50 text-orange-900";
  }

  if (
    value.includes("owner") ||
    value.includes("sell") ||
    value.includes("seller") ||
    value.includes("listing_submission") ||
    value.includes("list_property")
  ) {
    return "border-emerald-100 bg-emerald-50 text-emerald-900";
  }

  if (value.includes("property")) return "border-violet-100 bg-violet-50 text-violet-900";
  if (value.includes("society")) return "border-blue-100 bg-blue-50 text-blue-900";
  if (value.includes("search")) return "border-sky-100 bg-sky-50 text-sky-900";

  return "border-slate-100 bg-slate-50 text-slate-900";
}

function cleanPhone(phone?: string) {
  return String(phone || "").replace(/[^0-9]/g, "");
}

function formatDate(value?: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeFollowUpInput(value?: string) {
  if (!value) return "";
  const raw = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(raw)) {
    return raw;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;

  const pad = (item: number) => String(item).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function whatsappUrl(lead: AdminLead) {
  const phone = cleanPhone(lead.phone);
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

  return `https://wa.me/91${phone.slice(-10)}?text=${message}`;
}

function formatFollowUpDate(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getQuickFollowUpValue(type: "today_evening" | "tomorrow_morning" | "two_days" | "next_week") {
  const date = new Date();

  if (type === "today_evening") {
    date.setHours(18, 0, 0, 0);
  }

  if (type === "tomorrow_morning") {
    date.setDate(date.getDate() + 1);
    date.setHours(10, 30, 0, 0);
  }

  if (type === "two_days") {
    date.setDate(date.getDate() + 2);
    date.setHours(11, 0, 0, 0);
  }

  if (type === "next_week") {
    date.setDate(date.getDate() + 7);
    date.setHours(11, 0, 0, 0);
  }

  return formatFollowUpDate(date);
}

const quickNoteTemplates = [
  "Called, no answer",
  "WhatsApp sent",
  "Visit scheduled",
  "Budget mismatch",
  "Not interested",
];

const quickFollowUps = [
  ["Today evening", "today_evening"],
  ["Tomorrow morning", "tomorrow_morning"],
  ["2 days later", "two_days"],
  ["Next week", "next_week"],
] as const;

export function AdminLeadDetailPage() {
  const { id } = useParams();

  const [lead, setLead] = useState<AdminLead | undefined>();
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const phoneDigits = useMemo(() => cleanPhone(lead?.phone), [lead?.phone]);
  const linkedDraftProperty = lead ? linkedDraftPropertyForLead(lead) : undefined;
  const linkedLiveProperty = lead ? linkedLivePropertyForLead(lead) : undefined;
  const linkedOwnerProperty = linkedDraftProperty || linkedLiveProperty;
  const canCall = phoneDigits.length >= 10;

  const loadLead = async () => {
    setLoading(true);
    setError("");

    try {
      const apiLead = await fetchAdminLead(id);
      setLead(apiLead);
    } catch (err) {
      console.error(err);
      setLead(getAdminLead(id));
      setError("Could not load this lead from backend. Showing local fallback if available.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLead();
  }, [id]);

  const updateField = <K extends keyof AdminLead>(key: K, value: AdminLead[K]) => {
    setLead((current) => (current ? { ...current, [key]: value } : current));
    if (message) setMessage("");
    if (error) setError("");
  };

  const handleSaveLead = async () => {
    if (!lead) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const updated = await saveAdminLead(lead);
      setLead(updated);
      setMessage("Lead updated successfully.");
    } catch (err) {
      console.error(err);
      setError("Could not save lead. Please check the fields and try again.");
    } finally {
      setSaving(false);
    }
  };

  const quickStatus = async (nextStatus: LeadStatus) => {
    if (!lead) return;
    const updatedLead = { ...lead, status: nextStatus };
    setLead(updatedLead);
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const saved = await saveAdminLead(updatedLead);
      setLead(saved);
      setMessage(`Status updated to ${nextStatus}.`);
    } catch (err) {
      console.error(err);
      setError("Could not update status. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const saveNote = async () => {
    if (!lead) return;

    const text = note.trim();
    if (!text) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const updated = await addLeadNoteRemote(lead, text);
      setLead(updated);
      setNote("");
      setMessage("Note added to lead timeline.");
    } catch (err) {
      console.error(err);
      setError("Could not add note. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const applyQuickFollowUp = (type: "today_evening" | "tomorrow_morning" | "two_days" | "next_week") => {
    if (!lead) return;
    updateField("followUpAt", getQuickFollowUpValue(type));
  };

  const applyQuickNote = (text: string) => {
    setNote(text);
  };

  const recordContactAction = async (text: string) => {
    if (!lead) return;

    try {
      const updated = await addLeadNoteRemote(lead, text);
      setLead(updated);
      setMessage(`${text} noted in timeline.`);
    } catch (err) {
      console.error("Could not record contact action:", err);
    }
  };

  const applyQuickConversion = async (
    updates: Partial<AdminLead>,
    noteText: string,
  ) => {
    if (!lead) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const updatedLead = { ...lead, ...updates };
      const savedLead = await saveAdminLead(updatedLead);
      const notedLead = await addLeadNoteRemote(savedLead, noteText);

      setLead(notedLead);
      setMessage(`${noteText} saved.`);
    } catch (err) {
      console.error("Could not apply quick conversion:", err);
      setError("Could not update this lead. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Lead Details">
        <div className="flex min-h-[420px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-slate-500">Loading lead details...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!lead) {
    return (
      <AdminLayout title="Lead Details">
        <div className="rounded-[32px] border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-950">Lead not found</h1>
          <p className="mt-2 text-slate-500">
            We could not find this lead in backend records.
          </p>
          {error ? (
            <div className="mx-auto mt-5 max-w-xl rounded-2xl bg-amber-50 p-4 text-sm text-amber-700">
              {error}
            </div>
          ) : null}
          <Button asChild className="mt-6 rounded-full bg-blue-600 hover:bg-blue-700">
            <Link to="/admin/leads">Back to Leads</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Lead Details">
      <div className="space-y-4 pb-24 lg:space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Button asChild variant="ghost" className="mb-3 rounded-full text-slate-600">
              <Link to="/admin/leads">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Leads
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 lg:text-3xl">
              {lead.name || "Unnamed lead"}
            </h1>
            <p className="mt-1 text-slate-500">
              {lead.society || "No society"} • {lead.property || "General enquiry"}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 lg:flex lg:flex-wrap lg:gap-3">
            {canCall ? (
              <Button asChild variant="outline" className="h-10 rounded-full border-slate-200 px-3 text-xs lg:text-sm">
                <a href={`tel:${phoneDigits}`} onClick={() => void recordContactAction("Call action opened from lead detail")}>
                  <Phone className="mr-2 h-4 w-4" />
                  Call
                </a>
              </Button>
            ) : null}

            {canCall ? (
              <Button asChild variant="outline" className="h-10 rounded-full border-emerald-200 px-3 text-xs text-emerald-700 lg:text-sm">
                <a href={whatsappUrl(lead)} target="_blank" rel="noreferrer" onClick={() => void recordContactAction("WhatsApp opened from lead detail")}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp
                </a>
              </Button>
            ) : null}

            <Button
              onClick={handleSaveLead}
              disabled={saving}
              className="h-10 rounded-full bg-blue-600 px-3 text-xs hover:bg-blue-700 lg:text-sm"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Lead"}
            </Button>
          </div>
        </div>

        {message ? (
          <div className="rounded-2xl bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-700">
            {message}
          </div>
        ) : null}

        {/* C18 mobile admin lead sticky actions */}
        {canCall ? (
          <div className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-[0_-10px_24px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden">
            <a
              href={`tel:${phoneDigits}`}
              onClick={() => void recordContactAction("Mobile sticky call opened from lead detail")}
              className="inline-flex h-10 items-center justify-center rounded-full bg-blue-600 px-3 text-xs font-bold text-white"
            >
              <Phone className="mr-1.5 h-4 w-4" /> Call
            </a>
            <a
              href={whatsappUrl(lead)}
              target="_blank"
              rel="noreferrer"
              onClick={() => void recordContactAction("Mobile sticky WhatsApp opened from lead detail")}
              className="inline-flex h-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700"
            >
              <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp
            </a>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl bg-amber-50 px-5 py-3 text-sm font-medium text-amber-700">
            {error}
          </div>
        ) : null}

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <div className={`rounded-[20px] border p-4 md:p-5 ${statusClass(lead.status)}`}>
            <p className="text-xs font-bold uppercase tracking-[0.14em] opacity-70">Status</p>
            <p className="mt-2 text-xl font-bold">{displayLeadStatus(lead)}</p>
          </div>
          <div className={`rounded-[20px] border p-4 md:p-5 ${priorityClass(lead.priority)}`}>
            <p className="text-xs font-bold uppercase tracking-[0.14em] opacity-70">Priority</p>
            <p className="mt-2 flex items-center gap-2 text-xl font-bold">
              <Flame className="h-5 w-5" />
              {lead.priority}
            </p>
          </div>
          <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Requirement</p>
            <p className="mt-2 text-lg font-bold text-slate-950">
              {displayLeadRequirement(lead)}
            </p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Follow-up</p>
            <p className="mt-2 flex items-center gap-2 text-lg font-bold text-slate-950">
              <Clock className="h-5 w-5 text-blue-600" />
              {formatDate(lead.followUpAt)}
            </p>
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[32px] md:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                Pipeline status
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Move the lead through your follow-up workflow.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {statuses.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => quickStatus(item)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    lead.status === item
                      ? statusClass(item)
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[1fr_360px] xl:gap-6">
          <div className="space-y-6">
            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                    Lead details
                  </h2>
                  <p className="text-sm text-slate-500">
                    Update contact, requirement and lead qualification details.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Name
                  <Input
                    value={lead.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    className="mt-2 h-12 rounded-2xl border-slate-200"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Phone
                  <Input
                    value={lead.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    className="mt-2 h-12 rounded-2xl border-slate-200"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Email
                  <Input
                    value={lead.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    className="mt-2 h-12 rounded-2xl border-slate-200"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Budget
                  <Input
                    value={lead.budget}
                    onChange={(event) => updateField("budget", event.target.value)}
                    className="mt-2 h-12 rounded-2xl border-slate-200"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Society
                  <Input
                    value={lead.society}
                    onChange={(event) => updateField("society", event.target.value)}
                    className="mt-2 h-12 rounded-2xl border-slate-200"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Property / Interest
                  <Input
                    value={lead.property}
                    onChange={(event) => updateField("property", event.target.value)}
                    className="mt-2 h-12 rounded-2xl border-slate-200"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Status
                  <select
                    value={lead.status}
                    onChange={(event) => updateField("status", event.target.value as LeadStatus)}
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                  >
                    {statuses.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Priority
                  <select
                    value={lead.priority}
                    onChange={(event) => updateField("priority", event.target.value as LeadPriority)}
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                  >
                    {priorities.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Assigned To
                  <select
                    value={lead.assignedTo}
                    onChange={(event) => updateField("assignedTo", event.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                  >
                    {agents.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Next Follow-up
                  <Input
                    value={normalizeFollowUpInput(lead.followUpAt)}
                    onChange={(event) => updateField("followUpAt", event.target.value)}
                    className="mt-2 h-12 rounded-2xl border-slate-200"
                    placeholder="2026-06-08 11:00"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {quickFollowUps.map(([label, value]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => applyQuickFollowUp(value)}
                        className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </label>

                <label className="md:col-span-2 text-sm font-medium text-slate-700">
                  Requirement
                  <textarea
                    value={lead.requirement}
                    onChange={(event) => updateField("requirement", event.target.value)}
                    className="mt-2 min-h-24 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                    placeholder="Rent requirement, Buy requirement, Visit, Callback..."
                  />
                </label>
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                    Quick conversion actions
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Use actions based on the lead type and next business step.
                  </p>
                </div>
                <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                  Current: {displayLeadStatus(lead)} / {lead.priority}
                </span>
              </div>

              {isBrokerSource(lead.source) ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() =>
                      void applyQuickConversion(
                        { status: "Contacted", priority: "Warm" },
                        "Broker partner verified from lead detail",
                      )
                    }
                    className="h-auto justify-start rounded-2xl border-orange-100 bg-orange-50 px-4 py-4 text-left text-orange-700 hover:bg-orange-100"
                  >
                    Verify Partner
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() =>
                      void applyQuickConversion(
                        { status: "Negotiation", priority: "Hot" },
                        "Commission discussion started with broker partner",
                      )
                    }
                    className="h-auto justify-start rounded-2xl border-amber-100 bg-amber-50 px-4 py-4 text-left text-amber-700 hover:bg-amber-100"
                  >
                    Discuss Commission
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() =>
                      void applyQuickConversion(
                        { status: "Booked", priority: "Hot" },
                        "Broker partner marked active",
                      )
                    }
                    className="h-auto justify-start rounded-2xl border-emerald-100 bg-emerald-50 px-4 py-4 text-left text-emerald-700 hover:bg-emerald-100"
                  >
                    Mark Broker Active
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() =>
                      void applyQuickConversion(
                        { status: "Lost", priority: "Cold" },
                        "Broker partner lead rejected or not suitable",
                      )
                    }
                    className="h-auto justify-start rounded-2xl border-slate-200 bg-slate-50 px-4 py-4 text-left text-slate-700 hover:bg-slate-100"
                  >
                    Not Suitable
                  </Button>
                </div>
              ) : isOwnerSource(lead.source) ? (
                <>
                  {linkedOwnerProperty ? (
                    <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                        Linked owner property
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">
                        {linkedOwnerProperty.title || "Draft property"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="rounded-full bg-white px-3 py-1 text-emerald-700">
                          Status: {linkedOwnerProperty.status || "Draft"}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-slate-600">
                          ID: #{linkedOwnerProperty.id}
                        </span>
                      </div>
                      <p className="mt-3 text-xs leading-5 text-emerald-800">
                        This owner lead already has a linked property. Open the existing property instead of creating a duplicate.
                      </p>
                    </div>
                  ) : null}

                  {isOwnerSource(lead.source) ? (
                  <div className="mt-5 grid gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs font-semibold leading-5 text-emerald-800 sm:grid-cols-3">
                    <span>1. Verify owner</span>
                    <span>2. Ask photos</span>
                    <span>3. Create draft</span>
                  </div>
                ) : null}

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() =>
                      void applyQuickConversion(
                        { status: "Contacted", priority: "Warm" },
                        "Ownership and basic property details verified",
                      )
                    }
                    className="h-auto justify-start rounded-2xl border-emerald-100 bg-emerald-50 px-4 py-4 text-left text-emerald-700 hover:bg-emerald-100"
                  >
                    Verify Ownership
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() =>
                      void applyQuickConversion(
                        { status: "Contacted", priority: "Warm" },
                        "Photos requested from property owner",
                      )
                    }
                    className="h-auto justify-start rounded-2xl border-blue-100 bg-blue-50 px-4 py-4 text-left text-blue-700 hover:bg-blue-100"
                  >
                    Ask Photos
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() =>
                      void applyQuickConversion(
                        { status: "Negotiation", priority: "Hot" },
                        "Expected price or rent confirmed with owner",
                      )
                    }
                    className="h-auto justify-start rounded-2xl border-amber-100 bg-amber-50 px-4 py-4 text-left text-amber-700 hover:bg-amber-100"
                  >
                    Confirm Price
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() =>
                      void applyQuickConversion(
                        { status: "Lost", priority: "Cold" },
                        "Owner listing lead marked inactive",
                      )
                    }
                    className="h-auto justify-start rounded-2xl border-slate-200 bg-slate-50 px-4 py-4 text-left text-slate-700 hover:bg-slate-100"
                  >
                    Mark Inactive
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    className="h-auto justify-start rounded-2xl border-blue-100 bg-blue-50 px-4 py-4 text-left text-blue-700 hover:bg-blue-100 md:col-span-2"
                  >
                    <Link
                      to={
                        linkedDraftProperty
                          ? `/admin/properties/${linkedDraftProperty.id}/edit`
                          : linkedLiveProperty
                            ? `/property/${linkedLiveProperty.slug || linkedLiveProperty.id}`
                            : ownerDraftPropertyUrl(lead)
                      }
                    >
                      {linkedDraftProperty
                        ? "View Draft Property"
                        : linkedLiveProperty
                          ? "View Published Property"
                          : "Create Draft Property"}
                    </Link>
                  </Button>
                </div>
                </>
              ) : (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() =>
                      void applyQuickConversion(
                        { priority: "Hot" },
                        "Lead marked Hot from detail page",
                      )
                    }
                    className="h-auto justify-start rounded-2xl border-rose-100 bg-rose-50 px-4 py-4 text-left text-rose-700 hover:bg-rose-100"
                  >
                    <Flame className="mr-2 h-4 w-4" />
                    Mark Hot
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() =>
                      void applyQuickConversion(
                        {
                          status: "Site Visit",
                          priority: lead.priority === "Cold" ? "Warm" : lead.priority,
                        },
                        "Site visit scheduled from detail page",
                      )
                    }
                    className="h-auto justify-start rounded-2xl border-blue-100 bg-blue-50 px-4 py-4 text-left text-blue-700 hover:bg-blue-100"
                  >
                    Site Visit
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() =>
                      void applyQuickConversion(
                        { status: "Booked", priority: "Hot" },
                        "Lead marked Booked from detail page",
                      )
                    }
                    className="h-auto justify-start rounded-2xl border-emerald-100 bg-emerald-50 px-4 py-4 text-left text-emerald-700 hover:bg-emerald-100"
                  >
                    Mark Booked
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() =>
                      void applyQuickConversion(
                        { status: "Lost", priority: "Cold" },
                        "Lead marked Lost from detail page",
                      )
                    }
                    className="h-auto justify-start rounded-2xl border-slate-200 bg-slate-50 px-4 py-4 text-left text-slate-700 hover:bg-slate-100"
                  >
                    Mark Lost
                  </Button>
                </div>
              )}
            </section>

            {submittedDetailItems(lead).length ? (
              <section className="rounded-[32px] border border-amber-100 bg-amber-50 p-6 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
                      Submitted details
                    </p>
                    <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                      Original enquiry context
                    </h2>
                    <p className="mt-1 text-sm text-amber-800/80">
                      Captured from the public form before admin follow-up started.
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-amber-700">
                    Form submission
                  </span>
                </div>

                <div className="mt-5 space-y-2">
                  {formatSubmittedDetails(submittedDetailItems(lead)[0].text).map((line, index) => (
                    <div
                      key={`${line}-${index}`}
                      className="rounded-2xl border border-amber-100 bg-white px-4 py-3 text-sm leading-6 text-slate-700"
                    >
                      {line.includes(":") ? (
                        <>
                          <span className="font-bold text-slate-950">{line.split(":")[0]}:</span>
                          <span>{line.slice(line.indexOf(":") + 1)}</span>
                        </>
                      ) : (
                        <span className="font-semibold text-slate-800">{line}</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                Notes & Timeline
              </h2>

              <div className="mt-4 rounded-3xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-500">
                      Latest activity
                    </p>
                    {adminTimelineItems(lead).length ? (
                      <>
                        <p className="mt-2 text-sm font-semibold text-slate-950">
                          {adminTimelineItems(lead)[0].text}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {adminTimelineItems(lead)[0].meta}
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">
                        No timeline notes yet. Add the first call note or follow-up update below.
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700">
                    {adminTimelineItems(lead).length} notes
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {quickNoteTemplates.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => applyQuickNote(item)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-3 md:flex-row">
                <Input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Add call note, follow-up detail or buyer preference..."
                  className="h-12 rounded-2xl border-slate-200"
                />
                <Button
                  onClick={saveNote}
                  disabled={saving}
                  className="h-12 rounded-full bg-blue-600 px-5 hover:bg-blue-700"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Add Note
                </Button>
              </div>

              <div className="mt-5 space-y-3">
                {adminTimelineItems(lead).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <p className="text-sm text-slate-800">{item.text}</p>
                    {item.meta ? (
                      <p className="mt-1 text-xs text-slate-400">{item.meta}</p>
                    ) : null}
                  </div>
                ))}

                {!adminTimelineItems(lead).length ? (
                  <p className="text-sm text-slate-500">No admin timeline notes yet.</p>
                ) : null}
              </div>
            </section>
          </div>

          <aside className="space-y-4 xl:space-y-6">
            <section className="rounded-[24px] border border-blue-100 bg-white p-4 shadow-sm md:rounded-[32px] md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-500">
                    Next action
                  </p>
                  <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                    Contact & convert
                  </h2>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(lead.status)}`}>
                  {displayLeadStatus(lead)}
                </span>
              </div>

              <div className="mt-4 rounded-3xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
                  Recommended next step
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
                  {leadWorkflowNextAction(lead)}
                </p>
              </div>

              <div className="mt-5 rounded-3xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Follow-up
                </p>
                <p className="mt-2 text-sm font-bold text-slate-950">
                  {lead.followUpAt ? normalizeFollowUpInput(lead.followUpAt) : "Not set"}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {quickFollowUps.slice(0, 2).map((item) => (
                    <button
                      key={item[1]}
                      type="button"
                      onClick={() => applyQuickFollowUp(item[1])}
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-blue-200 hover:text-blue-700"
                    >
                      {item[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {canCall ? (
                  <a
                    href={`tel:${phoneDigits}`}
                    onClick={() => void recordContactAction("Call action opened from lead detail")}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <span className="inline-flex items-center gap-3">
                      <Phone className="h-5 w-5 text-blue-600" />
                      Call Lead
                    </span>
                    <span className="text-xs text-slate-400">{lead.phone}</span>
                  </a>
                ) : null}

                {canCall ? (
                  <a
                    href={whatsappUrl(lead)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => void recordContactAction("WhatsApp opened from lead detail")}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                  >
                    <span className="inline-flex items-center gap-3">
                      <MessageCircle className="h-5 w-5 text-emerald-600" />
                      WhatsApp Lead
                    </span>
                    <span className="text-xs text-emerald-600">Open</span>
                  </a>
                ) : null}

                {lead.email ? (
                  <a
                    href={`mailto:${lead.email}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <span className="inline-flex items-center gap-3">
                      <Mail className="h-5 w-5 text-slate-600" />
                      Email Lead
                    </span>
                    <span className="text-xs text-slate-400">Mail</span>
                  </a>
                ) : null}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() =>
                    void applyQuickConversion(
                      { status: "Contacted", priority: lead.priority === "Cold" ? "Warm" : lead.priority },
                      "Lead contacted from next action panel",
                    )
                  }
                  className="rounded-full border-blue-100 text-blue-700 hover:bg-blue-50"
                >
                  Contacted
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() =>
                    void applyQuickConversion(
                      { status: "Negotiation", priority: "Hot" },
                      "Lead moved to Negotiation from next action panel",
                    )
                  }
                  className="rounded-full border-amber-100 text-amber-700 hover:bg-amber-50"
                >
                  Negotiation
                </Button>
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                Lead snapshot
              </h2>

              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  Created {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("en-IN") : "Not available"}
                </p>
                <p className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-slate-400" />
                  Assigned to {lead.assignedTo || "Unassigned"}
                </p>
                <div className={`rounded-2xl border p-4 ${leadTypeClass(lead.source)}`}>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] opacity-70">Lead type</p>
                  <h3 className="mt-2 text-base font-extrabold">{leadTypeTitle(lead.source)}</h3>
                  <p className="mt-2 text-xs leading-5 opacity-80">{leadTypeDescription(lead.source)}</p>
                  {isOwnerSource(lead.source) ? (
                    <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold leading-5">
                      Next step: {ownerLeadNextStep(lead)}
                    </p>
                  ) : null}
                </div>

                <p>
                  <span className="font-medium text-slate-950">Source:</span> {sourceLabel(lead.source)}
                </p>
                <p className="text-xs text-slate-400">
                  Raw source: {lead.source || "Not specified"}
                </p>
                <p>
                  <span className="font-medium text-slate-950">Requirement:</span> {displayLeadRequirement(lead)}
                </p>
                <p>
                  <span className="font-medium text-slate-950">Preferred time:</span> {preferredCallbackTime(lead) || "Not specified"}
                </p>
                <p>
                  <span className="font-medium text-slate-950">Budget:</span> {lead.budget || "Not specified"}
                </p>
                <p>
                  <span className="font-medium text-slate-950">Society:</span> {lead.society || "Not specified"}
                </p>
                <p>
                  <span className="font-medium text-slate-950">Property:</span> {lead.property || "Not specified"}
                </p>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Lead attribution</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Source, CTA, campaign and intent captured from the public journey.
                    </p>
                  </div>
                  {[(lead as any).utm_source, (lead as any).utm_medium, (lead as any).utm_campaign].filter(Boolean).length ? (
                    <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">
                      UTM
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-2 text-sm text-slate-700">
                  {[
                    ["Source page", (lead as any).source_page],
                    ["CTA", (lead as any).cta_label],
                    ["Intent", (lead as any).lead_intent || lead.requirement],
                    ["Search query", (lead as any).search_query],
                    ["AI query", (lead as any).ai_query],
                    ["Entity", [(lead as any).entity_type, (lead as any).entity_slug].filter(Boolean).join(" · ")],
                    ["UTM", [(lead as any).utm_source, (lead as any).utm_medium, (lead as any).utm_campaign].filter(Boolean).join(" / ")],
                    ["Referrer", (lead as any).referrer],
                  ].map(([label, value]) => (
                    <p key={label}>
                      <span className="font-semibold text-slate-950">{label}:</span> {value || "Not captured"}
                    </p>
                  ))}

                  {(lead as any).page_url ? (
                    <a href={(lead as any).page_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex w-fit rounded-full bg-white px-3 py-1.5 text-xs font-black text-blue-700 hover:bg-blue-50">
                      Open source page
                    </a>
                  ) : null}
                </div>

                <div className="mt-3 rounded-xl bg-white/80 p-3 text-xs font-semibold leading-5 text-slate-600">
                  Attribution summary: {[(lead as any).source_page || lead.source, (lead as any).cta_label, (lead as any).lead_intent, (lead as any).utm_campaign].filter(Boolean).join(" · ") || "Not captured"}
                </div>
              </div>

            </section>
          </aside>
        </div>
      </div>
    </AdminLayout>
  );
}
