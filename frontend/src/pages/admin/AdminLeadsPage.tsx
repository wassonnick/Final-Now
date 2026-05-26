import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Download, Eye, Mail, MessageCircle, Phone, Search, Trash2, UserCheck } from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AdminLead,
  LeadPriority,
  LeadStatus,
  deleteAdminLead,
  exportLeadsCsv,
  listAdminLeads,
  updateLeadStatus,
} from '@/lib/adminLeadStore';

const statuses: Array<'All' | LeadStatus> = ['All', 'New', 'Contacted', 'Site Visit', 'Negotiation', 'Booked', 'Lost'];
const priorities: Array<'All' | LeadPriority> = ['All', 'Hot', 'Warm', 'Cold'];

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

function priorityClass(priority: LeadPriority) {
  switch (priority) {
    case 'Hot': return 'bg-rose-50 text-rose-700';
    case 'Warm': return 'bg-amber-50 text-amber-700';
    case 'Cold': return 'bg-slate-100 text-slate-600';
    default: return 'bg-slate-100 text-slate-600';
  }
}

export function AdminLeadsPage() {
  const [leads, setLeads] = useState<AdminLead[]>(() => listAdminLeads());
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'All' | LeadStatus>('All');
  const [priority, setPriority] = useState<'All' | LeadPriority>('All');

  const filteredLeads = useMemo(() => {
    const search = query.trim().toLowerCase();
    return leads.filter((lead) => {
      const matchesSearch = !search || [lead.name, lead.phone, lead.email, lead.society, lead.property, lead.budget, lead.assignedTo]
        .join(' ')
        .toLowerCase()
        .includes(search);
      const matchesStatus = status === 'All' || lead.status === status;
      const matchesPriority = priority === 'All' || lead.priority === priority;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [leads, priority, query, status]);

  const todayLeads = leads.filter((lead) => new Date(lead.createdAt).toDateString() === new Date().toDateString()).length;
  const activeLeads = leads.filter((lead) => !['Booked', 'Lost'].includes(lead.status)).length;
  const bookedLeads = leads.filter((lead) => lead.status === 'Booked').length;
  const hotLeads = leads.filter((lead) => lead.priority === 'Hot').length;

  const handleStatusChange = (lead: AdminLead, nextStatus: LeadStatus) => {
    const updated = updateLeadStatus(lead.id, nextStatus);
    if (updated) setLeads(listAdminLeads());
  };

  const handleDelete = (lead: AdminLead) => {
    if (!window.confirm(`Delete lead for ${lead.name}?`)) return;
    deleteAdminLead(lead.id);
    setLeads(listAdminLeads());
  };

  return (
    <AdminLayout title="Leads CRM" subtitle="Track enquiries, follow-ups, site visits and conversion pipeline">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Today</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{todayLeads}</p>
            <p className="mt-1 text-sm text-blue-600">New enquiries</p>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Active Leads</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{activeLeads}</p>
            <p className="mt-1 text-sm text-blue-600">In pipeline</p>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Hot Leads</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{hotLeads}</p>
            <p className="mt-1 text-sm text-rose-600">Priority follow-ups</p>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Booked</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{bookedLeads}</p>
            <p className="mt-1 text-sm text-emerald-600">Closed wins</p>
          </div>
        </div>

        <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">Lead Inbox</h2>
              <p className="mt-1 text-sm text-slate-500">Search, filter, call, WhatsApp, assign and move leads through the pipeline.</p>
            </div>
            <Button onClick={() => exportLeadsCsv(filteredLeads)} variant="outline" className="rounded-full border-slate-200">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, phone, society, budget or assigned broker..."
                className="h-12 rounded-2xl border-slate-200 pl-11"
              />
            </div>
            <select value={status} onChange={(event) => setStatus(event.target.value as 'All' | LeadStatus)} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50">
              {statuses.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={priority} onChange={(event) => setPriority(event.target.value as 'All' | LeadPriority)} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50">
              {priorities.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>

          <div className="mt-5 overflow-hidden rounded-[28px] border border-slate-200">
            <div className="hidden grid-cols-[1.3fr_1.1fr_0.9fr_0.8fr_0.8fr_190px] gap-4 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 lg:grid">
              <span>Lead</span>
              <span>Interest</span>
              <span>Status</span>
              <span>Priority</span>
              <span>Follow-up</span>
              <span>Actions</span>
            </div>

            {filteredLeads.map((lead) => (
              <div key={lead.id} className="grid gap-4 border-t border-slate-200 bg-white px-5 py-5 lg:grid-cols-[1.3fr_1.1fr_0.9fr_0.8fr_0.8fr_190px] lg:items-center">
                <div>
                  <p className="font-semibold text-slate-950">{lead.name}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-500">
                    <a href={`tel:${lead.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 hover:text-blue-700"><Phone className="h-3.5 w-3.5" /> {lead.phone}</a>
                    <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1 hover:text-blue-700"><Mail className="h-3.5 w-3.5" /> Email</a>
                  </div>
                </div>

                <div>
                  <p className="font-medium text-slate-800">{lead.society}</p>
                  <p className="mt-1 text-sm text-slate-500">{lead.property}</p>
                  <p className="mt-1 text-sm font-medium text-blue-700">{lead.budget}</p>
                </div>

                <select value={lead.status} onChange={(event) => handleStatusChange(lead, event.target.value as LeadStatus)} className={`h-10 rounded-full border-0 px-3 text-sm font-medium outline-none ${statusClass(lead.status)}`}>
                  {statuses.filter((item) => item !== 'All').map((item) => <option key={item}>{item}</option>)}
                </select>

                <span className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${priorityClass(lead.priority)}`}>{lead.priority}</span>

                <div className="text-sm text-slate-600">
                  <div className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-slate-400" /> {lead.followUpAt}</div>
                  <div className="mt-1 flex items-center gap-1 text-slate-400"><UserCheck className="h-3.5 w-3.5" /> {lead.assignedTo}</div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild size="sm" variant="outline" className="rounded-full border-slate-200">
                    <Link to={`/admin/leads/${lead.id}`}><Eye className="mr-1.5 h-4 w-4" /> Open</Link>
                  </Button>
                  <Button asChild size="icon" variant="ghost" className="rounded-full text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700">
                    <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /></a>
                  </Button>
                  <Button onClick={() => handleDelete(lead)} size="icon" variant="ghost" className="rounded-full text-rose-500 hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {!filteredLeads.length ? (
              <div className="bg-white px-5 py-12 text-center text-sm text-slate-500">No leads found for the selected filters.</div>
            ) : null}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
