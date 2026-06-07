from pathlib import Path

path = Path("frontend/src/pages/admin/AdminLeadDetailPage.tsx")

path.write_text(r'''import { useEffect, useMemo, useState } from "react";
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

function whatsappUrl(lead: AdminLead) {
  const phone = cleanPhone(lead.phone);
  const message = encodeURIComponent(
    `Hi ${lead.name || ""}, this is SocietyFlats regarding ${lead.property || lead.society || "your property requirement"}. Requirement: ${lead.requirement || "Not specified"}.`
  );

  return `https://wa.me/91${phone.slice(-10)}?text=${message}`;
}

export function AdminLeadDetailPage() {
  const { id } = useParams();

  const [lead, setLead] = useState<AdminLead | undefined>();
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const phoneDigits = useMemo(() => cleanPhone(lead?.phone), [lead?.phone]);
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

  if (loading) {
    return (
      <AdminLayout>
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
      <AdminLayout>
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
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Button asChild variant="ghost" className="mb-3 rounded-full text-slate-600">
              <Link to="/admin/leads">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Leads
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              {lead.name || "Unnamed lead"}
            </h1>
            <p className="mt-1 text-slate-500">
              {lead.society || "No society"} • {lead.property || "General enquiry"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {canCall ? (
              <Button asChild variant="outline" className="rounded-full border-slate-200">
                <a href={`tel:${phoneDigits}`}>
                  <Phone className="mr-2 h-4 w-4" />
                  Call
                </a>
              </Button>
            ) : null}

            {canCall ? (
              <Button asChild variant="outline" className="rounded-full border-emerald-200 text-emerald-700">
                <a href={whatsappUrl(lead)} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp
                </a>
              </Button>
            ) : null}

            <Button
              onClick={handleSaveLead}
              disabled={saving}
              className="rounded-full bg-blue-600 hover:bg-blue-700"
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

        {error ? (
          <div className="rounded-2xl bg-amber-50 px-5 py-3 text-sm font-medium text-amber-700">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <div className={`rounded-[24px] border p-5 ${statusClass(lead.status)}`}>
            <p className="text-xs font-bold uppercase tracking-[0.14em] opacity-70">Status</p>
            <p className="mt-2 text-xl font-bold">{lead.status}</p>
          </div>
          <div className={`rounded-[24px] border p-5 ${priorityClass(lead.priority)}`}>
            <p className="text-xs font-bold uppercase tracking-[0.14em] opacity-70">Priority</p>
            <p className="mt-2 flex items-center gap-2 text-xl font-bold">
              <Flame className="h-5 w-5" />
              {lead.priority}
            </p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Requirement</p>
            <p className="mt-2 text-lg font-bold text-slate-950">
              {lead.requirement || "Not specified"}
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

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
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

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
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
                      <option key={item}>{item}</option>
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
                      <option key={item}>{item}</option>
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
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Next Follow-up
                  <Input
                    value={lead.followUpAt}
                    onChange={(event) => updateField("followUpAt", event.target.value)}
                    className="mt-2 h-12 rounded-2xl border-slate-200"
                    placeholder="2026-06-08 11:00"
                  />
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
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                Notes & Timeline
              </h2>

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
                {lead.notes.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <p className="text-sm text-slate-800">{item.text}</p>
                    {item.createdAt ? (
                      <p className="mt-1 text-xs text-slate-400">{item.createdAt}</p>
                    ) : null}
                  </div>
                ))}

                {!lead.notes.length ? (
                  <p className="text-sm text-slate-500">No notes yet.</p>
                ) : null}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                Contact actions
              </h2>

              <div className="mt-5 space-y-3">
                {canCall ? (
                  <a
                    href={`tel:${phoneDigits}`}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Phone className="h-5 w-5 text-blue-600" />
                    Call {lead.phone}
                  </a>
                ) : null}

                {canCall ? (
                  <a
                    href={whatsappUrl(lead)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                  >
                    <MessageCircle className="h-5 w-5 text-emerald-600" />
                    Open WhatsApp
                  </a>
                ) : null}

                {lead.email ? (
                  <a
                    href={`mailto:${lead.email}`}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Mail className="h-5 w-5 text-slate-600" />
                    Email Lead
                  </a>
                ) : null}
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
                <p>
                  <span className="font-medium text-slate-950">Source:</span> {lead.source}
                </p>
                <p>
                  <span className="font-medium text-slate-950">Requirement:</span> {lead.requirement || "Not specified"}
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
            </section>
          </aside>
        </div>
      </div>
    </AdminLayout>
  );
}
''', encoding="utf-8")

print("C5A AdminLeadDetailPage applied.")
