import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Mail, MessageCircle, Phone, Save, Send, UserCheck } from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AdminLead,
  LeadPriority,
  LeadStatus,
  addLeadNote,
  getAdminLead,
  updateAdminLead,
} from '@/lib/adminLeadStore';

const statuses: LeadStatus[] = ['New', 'Contacted', 'Site Visit', 'Negotiation', 'Booked', 'Lost'];
const priorities: LeadPriority[] = ['Hot', 'Warm', 'Cold'];
const agents = ['Nitin', 'Amit', 'Rohit', 'Priya', 'Unassigned'];

function statusClass(status: LeadStatus) {
  switch (status) {
    case 'New': return 'bg-blue-50 text-blue-700';
    case 'Contacted': return 'bg-sky-50 text-sky-700';
    case 'Site Visit': return 'bg-violet-50 text-violet-700';
    case 'Negotiation': return 'bg-amber-50 text-amber-700';
    case 'Booked': return 'bg-emerald-50 text-emerald-700';
    case 'Lost': return 'bg-rose-50 text-rose-700';
    default: return 'bg-slate-100 text-slate-700';
  }
}

export function AdminLeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState<AdminLead | undefined>(() => getAdminLead(id));
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setLead(getAdminLead(id));
  }, [id]);

  if (!lead) {
    return (
      <AdminLayout title="Lead not found" subtitle="This lead may have been deleted or moved">
        <div className="rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-slate-500">We could not find this lead in local admin storage.</p>
          <Button asChild className="mt-5 rounded-full bg-blue-600 hover:bg-blue-700">
            <Link to="/admin/leads">Back to Leads</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const updateField = <K extends keyof AdminLead>(key: K, value: AdminLead[K]) => {
    setLead((current) => current ? { ...current, [key]: value } : current);
    if (message) setMessage('');
  };

  const saveLead = () => {
    updateAdminLead(lead);
    setMessage('Lead updated successfully.');
  };

  const saveNote = () => {
    const text = note.trim();
    if (!text) return;
    const updated = addLeadNote(lead.id, text);
    if (updated) {
      setLead(updated);
      setNote('');
      setMessage('Note added to lead timeline.');
    }
  };

  return (
    <AdminLayout title={lead.name} subtitle={`${lead.society} • ${lead.budget}`}>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Button asChild variant="ghost" className="w-fit rounded-full text-slate-600 hover:text-slate-950">
          <Link to="/admin/leads"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Leads</Link>
        </Button>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" className="rounded-full border-slate-200">
            <a href={`tel:${lead.phone.replace(/\s/g, '')}`}><Phone className="mr-2 h-4 w-4" /> Call</a>
          </Button>
          <Button asChild variant="outline" className="rounded-full border-slate-200 text-emerald-700">
            <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer"><MessageCircle className="mr-2 h-4 w-4" /> WhatsApp</a>
          </Button>
          <Button onClick={saveLead} className="rounded-full bg-blue-600 px-5 hover:bg-blue-700"><Save className="mr-2 h-4 w-4" /> Save Lead</Button>
        </div>
      </div>

      {message ? <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">Lead Details</h2>
                <p className="mt-1 text-sm text-slate-500">Update contact, requirement and lead qualification details.</p>
              </div>
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${statusClass(lead.status)}`}>{lead.status}</span>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label>
                <span className="text-sm font-medium text-slate-700">Name</span>
                <Input value={lead.name} onChange={(event) => updateField('name', event.target.value)} className="mt-2 h-12 rounded-2xl border-slate-200" />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Phone</span>
                <Input value={lead.phone} onChange={(event) => updateField('phone', event.target.value)} className="mt-2 h-12 rounded-2xl border-slate-200" />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Email</span>
                <Input value={lead.email} onChange={(event) => updateField('email', event.target.value)} className="mt-2 h-12 rounded-2xl border-slate-200" />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Budget</span>
                <Input value={lead.budget} onChange={(event) => updateField('budget', event.target.value)} className="mt-2 h-12 rounded-2xl border-slate-200" />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Society</span>
                <Input value={lead.society} onChange={(event) => updateField('society', event.target.value)} className="mt-2 h-12 rounded-2xl border-slate-200" />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Property / Interest</span>
                <Input value={lead.property} onChange={(event) => updateField('property', event.target.value)} className="mt-2 h-12 rounded-2xl border-slate-200" />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Status</span>
                <select value={lead.status} onChange={(event) => updateField('status', event.target.value as LeadStatus)} className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50">
                  {statuses.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Priority</span>
                <select value={lead.priority} onChange={(event) => updateField('priority', event.target.value as LeadPriority)} className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50">
                  {priorities.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Assigned To</span>
                <select value={lead.assignedTo} onChange={(event) => updateField('assignedTo', event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50">
                  {agents.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Next Follow-up</span>
                <Input value={lead.followUpAt} onChange={(event) => updateField('followUpAt', event.target.value)} className="mt-2 h-12 rounded-2xl border-slate-200" placeholder="Tomorrow 11:00 AM" />
              </label>
              <label className="md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Requirement</span>
                <textarea
                  value={lead.requirement}
                  onChange={(event) => updateField('requirement', event.target.value)}
                  className="mt-2 min-h-28 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                />
              </label>
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">Notes & Timeline</h2>
            <div className="mt-4 flex flex-col gap-3 md:flex-row">
              <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add call note, follow-up detail or buyer preference..." className="h-12 rounded-2xl border-slate-200" />
              <Button onClick={saveNote} className="h-12 rounded-full bg-blue-600 px-5 hover:bg-blue-700"><Send className="mr-2 h-4 w-4" /> Add Note</Button>
            </div>
            <div className="mt-5 space-y-3">
              {lead.notes.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm text-slate-800">{item.text}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.createdAt}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">Contact Actions</h2>
            <div className="mt-5 space-y-3">
              <a href={`tel:${lead.phone.replace(/\s/g, '')}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Phone className="h-5 w-5 text-blue-600" /> Call {lead.phone}
              </a>
              <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <MessageCircle className="h-5 w-5 text-emerald-600" /> Open WhatsApp
              </a>
              <a href={`mailto:${lead.email}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Mail className="h-5 w-5 text-slate-600" /> Email Lead
              </a>
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">Lead Snapshot</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-400" /> Created {new Date(lead.createdAt).toLocaleDateString('en-IN')}</p>
              <p className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-slate-400" /> Assigned to {lead.assignedTo}</p>
              <p><span className="font-medium text-slate-950">Source:</span> {lead.source}</p>
              <p><span className="font-medium text-slate-950">Budget:</span> {lead.budget}</p>
            </div>
          </section>
        </aside>
      </div>
    </AdminLayout>
  );
}
