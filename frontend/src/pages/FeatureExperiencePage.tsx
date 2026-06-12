import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  IndianRupee,
  LineChart,
  Loader2,
  MapPinned,
  MessageSquareText,
  Phone,
  Search,
  Send,
  Target,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchPublicProperties, fetchPublicSocieties, formatPublicLocation, searchableText, societyImage } from '@/lib/publicData';
import { cn } from '@/lib/utils';

type FeatureExperienceKey = 'maps' | 'broker-crm' | 'chat' | 'recommendations';

type PublicSociety = Awaited<ReturnType<typeof fetchPublicSocieties>>[number];
type PublicProperty = Awaited<ReturnType<typeof fetchPublicProperties>>[number];

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://final-now.onrender.com/api';

const featureIntro = {
  maps: {
    title: 'Maps Intelligence',
    eyebrow: 'Search by location context',
    text: 'Filter societies by sector, road and nearby anchors. Open each profile with its verified public data.',
    icon: MapPinned,
  },
  'broker-crm': {
    title: 'Broker CRM',
    eyebrow: 'Lead pipeline',
    text: 'Capture owner, tenant and buyer requirements directly into the SocietyFlats lead flow.',
    icon: BriefcaseBusiness,
  },
  chat: {
    title: 'Chat & Callback',
    eyebrow: 'Quick help',
    text: 'Ask a question, request a callback, or send a WhatsApp-ready lead to the admin pipeline.',
    icon: MessageSquareText,
  },
  recommendations: {
    title: 'Recommendations',
    eyebrow: 'Match by fit',
    text: 'Use budget, locality and lifestyle priorities to get a ranked shortlist from live society data.',
    icon: Target,
  },
};

const localityPresets = ['Golf Course Road', 'Dwarka Expressway', 'Sohna Road', 'Sector 70', 'Sector 102', 'DLF'];
const priorityOptions = ['Clubhouse', 'Swimming Pool', 'Gym', '24x7 Security', 'Power Backup', 'Landscaped Greens'];

function submitLead(payload: { name: string; phone: string; email?: string; message: string; society_name?: string; source: string }) {
  return fetch(`${API_BASE}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(async (response) => {
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json?.message || 'Unable to submit request');
    return json;
  });
}

function FeatureHero({ feature }: { feature: FeatureExperienceKey }) {
  const intro = featureIntro[feature];
  const Icon = intro.icon;

  return (
    <section className="border-b border-navy-100 bg-white">
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-600 text-white">
              <Icon className="h-6 w-6" />
            </div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-navy-600">{intro.eyebrow}</p>
            <h1 className="text-4xl font-extrabold tracking-tight text-navy-900 md:text-6xl">{intro.title}</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-navy-500">{intro.text}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="rounded-full border-navy-200 text-navy-700">
              <Link to="/search">Advanced search</Link>
            </Button>
            <Button asChild className="rounded-full bg-navy-600 hover:bg-navy-700">
              <Link to="/ai-advisor">AI advisor <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SocietyMiniCard({ society, note }: { society: PublicSociety; note?: string }) {
  return (
    <Link to={`/society/${society.slug}`} className="group grid gap-4 rounded-[1.5rem] border border-navy-100 bg-white p-4 shadow-sm transition hover:shadow-apple sm:grid-cols-[120px_1fr]">
      <div className="h-28 overflow-hidden rounded-[1rem] bg-navy-50">
        <img src={societyImage(society)} alt={society.name} className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
      </div>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-navy-900">{society.name}</h3>
            <p className="mt-1 text-sm text-navy-500">{formatPublicLocation(society)}</p>
          </div>
          <span className="rounded-full bg-navy-100 px-2.5 py-1 text-xs font-semibold text-navy-700">
            {society.score || 'New'}
          </span>
        </div>
        {note ? <p className="mt-3 text-sm text-navy-500">{note}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {society.amenities.slice(0, 3).map((amenity) => (
            <span key={amenity} className="rounded-full bg-ivory-200 px-2.5 py-1 text-xs text-navy-600">{amenity}</span>
          ))}
        </div>
      </div>
    </Link>
  );
}

function MapsTool({ societies }: { societies: PublicSociety[] }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return societies.filter((society) => !q || searchableText(society.name, society.sector, society.locality, society.address, society.nearbyMetro, society.nearbyOfficeHubs).includes(q)).slice(0, 8);
  }, [query, societies]);

  const selected = filtered[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[2rem] border border-navy-100 bg-white p-5 shadow-soft">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-navy-400" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sector, road, society or office hub" className="h-13 rounded-full border-navy-100 pl-11" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {localityPresets.map((item) => (
            <button key={item} onClick={() => setQuery(item)} className="rounded-full bg-ivory-200 px-3 py-2 text-sm font-semibold text-navy-600 hover:bg-navy-100">
              {item}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          {filtered.map((society) => (
            <SocietyMiniCard key={society.id} society={society} note={society.nearbyMetro || society.nearbyOfficeHubs || 'Open profile for location intelligence'} />
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-navy-100 bg-navy-900 p-5 text-white shadow-soft">
        <div className="min-h-[420px] rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.16),transparent_30%),linear-gradient(135deg,#15223a,#0f172a)] p-6">
          <div className="flex h-full flex-col justify-between gap-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-300">Location preview</p>
              <h2 className="mt-3 text-3xl font-bold">{selected?.name || 'Search a society'}</h2>
              <p className="mt-2 text-navy-200">{selected ? formatPublicLocation(selected) : 'Use the filters to inspect societies by locality.'}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-navy-300">Metro</p>
                <p className="mt-2 text-sm">{selected?.nearbyMetro || 'Needs verification'}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-navy-300">Office hubs</p>
                <p className="mt-2 text-sm">{selected?.nearbyOfficeHubs || 'Needs verification'}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-navy-300">Coordinates</p>
                <p className="mt-2 text-sm">{selected?.latitude && selected?.longitude ? `${selected.latitude}, ${selected.longitude}` : 'Admin review pending'}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-navy-300">Source</p>
                <p className="mt-2 text-sm">{selected?.googleMapsUrl ? 'Google Maps link saved' : 'Use profile location fields'}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {selected ? (
                <>
                  <Button asChild className="rounded-full bg-white text-navy-900 hover:bg-navy-100">
                    <Link to={`/society/${selected.slug}`}>Open profile</Link>
                  </Button>
                  {selected.googleMapsUrl ? (
                    <Button asChild variant="outline" className="rounded-full border-white/30 text-white hover:bg-white/10">
                      <a href={selected.googleMapsUrl} target="_blank" rel="noreferrer">Open map</a>
                    </Button>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function RecommendationsTool({ societies }: { societies: PublicSociety[] }) {
  const [budget, setBudget] = useState('100000');
  const [locality, setLocality] = useState('');
  const [priorities, setPriorities] = useState<string[]>(['24x7 Security']);
  const navigate = useNavigate();

  const matches = useMemo(() => {
    return societies
      .map((society) => {
        const text = searchableText(society.name, society.locality, society.sector, society.amenities.join(' '));
        const localityScore = locality && text.includes(locality.toLowerCase()) ? 20 : locality ? 0 : 10;
        const amenityScore = priorities.reduce((score, item) => score + (society.amenities.some((amenity) => amenity.toLowerCase() === item.toLowerCase()) ? 8 : 0), 0);
        const dataScore = Number(society.score || 7) * 5;
        const match = Math.min(98, Math.round(40 + localityScore + amenityScore + dataScore / 4));
        return { society, match };
      })
      .sort((a, b) => b.match - a.match)
      .slice(0, 5);
  }, [locality, priorities, societies]);

  const togglePriority = (priority: string) => {
    setPriorities((items) => items.includes(priority) ? items.filter((item) => item !== priority) : [...items, priority]);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <section className="rounded-[2rem] border border-navy-100 bg-white p-6 shadow-soft">
        <h2 className="text-2xl font-bold text-navy-900">Build your shortlist</h2>
        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="text-sm font-semibold text-navy-700">Monthly budget</span>
            <div className="relative mt-2">
              <IndianRupee className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
              <Input value={budget} onChange={(event) => setBudget(event.target.value)} className="h-12 rounded-full pl-10" />
            </div>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-navy-700">Preferred locality</span>
            <Input value={locality} onChange={(event) => setLocality(event.target.value)} placeholder="Golf Course Road, Sector 70..." className="mt-2 h-12 rounded-full" />
          </label>
          <div>
            <p className="text-sm font-semibold text-navy-700">Priorities</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {priorityOptions.map((priority) => (
                <button key={priority} onClick={() => togglePriority(priority)} className={cn('rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition', priorities.includes(priority) ? 'border-navy-600 bg-navy-600 text-white' : 'border-navy-100 bg-ivory-100 text-navy-600 hover:bg-navy-50')}>
                  {priority}
                </button>
              ))}
            </div>
          </div>
          <Button className="w-full rounded-full bg-navy-600 hover:bg-navy-700" onClick={() => navigate(`/search?tab=societies&q=${encodeURIComponent(locality || priorities[0] || '')}`)}>
            Open matching search <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        {matches.map(({ society, match }) => (
          <div key={society.id} className="relative">
            <span className="absolute right-5 top-5 z-10 rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">{match}% fit</span>
            <SocietyMiniCard society={society} note={`Fits ${priorities.slice(0, 2).join(' + ') || 'your preferences'} around ${locality || 'Gurgaon'}. Budget noted: ₹${budget || 'not set'}.`} />
          </div>
        ))}
      </section>
    </div>
  );
}

function LeadFlowTool({ feature }: { feature: 'broker-crm' | 'chat' }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', role: feature === 'broker-crm' ? 'Owner' : 'Buyer/Tenant', society: '', message: '' });
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [notice, setNotice] = useState('');

  const submit = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      setState('error');
      setNotice('Please add your name and phone number first.');
      return;
    }

    setState('loading');
    setNotice('');

    try {
      const isBrokerCrm = feature === 'broker-crm';
      const cleanPhone = form.phone.replace(/[^0-9]/g, '').slice(-10);
      const role = form.role.trim();
      const society = form.society.trim();
      const userMessage = form.message.trim();

      const brokerMessage = [
        'Broker partner enquiry from public Broker CRM page',
        `Role: ${role || 'Not provided'}`,
        `Name: ${form.name.trim() || 'Not provided'}`,
        `Phone: ${cleanPhone || form.phone || 'Not provided'}`,
        `Email: ${form.email.trim() || 'Not provided'}`,
        `Area / Society: ${society || 'Not provided'}`,
        `Message: ${userMessage || 'Not provided'}`,
        'Suggested next action: Call partner, verify area coverage, discuss lead sharing and commission structure.',
      ].join('\n');

      await submitLead({
        name: form.name.trim(),
        phone: cleanPhone || form.phone,
        email: form.email.trim() || undefined,
        society_name: society || undefined,
        property_title: isBrokerCrm
          ? [role || 'Broker partner', society].filter(Boolean).join(' · ')
          : role || undefined,
        source: isBrokerCrm ? 'public_broker_crm' : 'public_chat_callback',
        requirement: isBrokerCrm ? 'Broker partner onboarding' : role || 'Website callback',
        message: isBrokerCrm
          ? brokerMessage
          : `${role}: ${userMessage || 'Callback requested from SocietyFlats feature page.'}`,
      });
      setState('success');
      setNotice(isBrokerCrm ? 'Broker partner lead added to Broker CRM. Admin can follow up from the broker queue.' : 'Callback request sent. Admin can see it in Leads.');
    } catch (error) {
      setState('error');
      setNotice(error instanceof Error ? error.message : 'Unable to submit. Please try again.');
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <section className="rounded-[2rem] border border-navy-100 bg-white p-6 shadow-soft">
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="text-sm font-semibold text-navy-700">Name</span>
            <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 h-12 rounded-full" placeholder="Your name" />
          </label>
          <label>
            <span className="text-sm font-semibold text-navy-700">Phone</span>
            <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="mt-2 h-12 rounded-full" placeholder="+91..." />
          </label>
          <label>
            <span className="text-sm font-semibold text-navy-700">Email</span>
            <Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-2 h-12 rounded-full" placeholder="Optional" />
          </label>
          <label>
            <span className="text-sm font-semibold text-navy-700">I am a</span>
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="mt-2 h-12 w-full rounded-full border border-navy-100 bg-white px-4 text-navy-800">
              <option>Owner</option>
              <option>Buyer/Tenant</option>
              <option>Broker partner</option>
              <option>Society/RWA contact</option>
            </select>
          </label>
          <label className="md:col-span-2">
            <span className="text-sm font-semibold text-navy-700">Society or locality</span>
            <Input value={form.society} onChange={(event) => setForm({ ...form, society: event.target.value })} className="mt-2 h-12 rounded-full" placeholder="Tulip Crimson, DLF, Sector 70..." />
          </label>
          <label className="md:col-span-2">
            <span className="text-sm font-semibold text-navy-700">Requirement</span>
            <textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} className="mt-2 min-h-[140px] w-full rounded-[1.5rem] border border-navy-100 bg-white p-4 text-navy-800 outline-none focus:border-navy-300 focus:ring-4 focus:ring-navy-100" placeholder="Tell us what you need..." />
          </label>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button disabled={state === 'loading'} onClick={submit} className="rounded-full bg-navy-600 px-6 hover:bg-navy-700">
            {state === 'loading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : feature === 'chat' ? <Send className="mr-2 h-4 w-4" /> : <BriefcaseBusiness className="mr-2 h-4 w-4" />}
            {feature === 'chat' ? 'Send request' : 'Add to CRM'}
          </Button>
          {notice ? (
            <span className={cn('text-sm font-semibold', state === 'success' ? 'text-emerald-700' : 'text-red-600')}>{notice}</span>
          ) : null}
        </div>
      </section>

      <aside className="rounded-[2rem] border border-navy-100 bg-ivory-100 p-6">
        <Phone className="h-8 w-8 text-navy-600" />
        <h2 className="mt-5 text-2xl font-bold text-navy-900">{feature === 'chat' ? 'What happens next?' : 'CRM flow'}</h2>
        <div className="mt-5 space-y-4">
          {[
            'Your request is saved as a lead.',
            'Admin reviews source and society context.',
            'The team follows up by phone or WhatsApp.',
            'Qualified leads can be assigned to a broker.',
          ].map((item) => (
            <div key={item} className="flex gap-3 text-sm text-navy-600">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              {item}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

export function FeatureExperiencePage({ feature }: { feature: FeatureExperienceKey }) {
  const [societies, setSocieties] = useState<PublicSociety[]>([]);
  const [properties, setProperties] = useState<PublicProperty[]>([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchPublicSocieties().then(setSocieties).catch((error) => console.error('Societies fetch failed:', error));
    fetchPublicProperties().then(setProperties).catch((error) => console.error('Properties fetch failed:', error));
  }, []);

  return (
    <div className="min-h-screen bg-ivory-100">
      <FeatureHero feature={feature} />

      <section className="container mx-auto px-4 py-8">
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.5rem] border border-navy-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-navy-400">Live societies</p>
            <p className="mt-3 text-3xl font-bold text-navy-900">{societies.length}</p>
          </div>
          <div className="rounded-[1.5rem] border border-navy-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-navy-400">Live homes</p>
            <p className="mt-3 text-3xl font-bold text-navy-900">{properties.length}</p>
          </div>
          <div className="rounded-[1.5rem] border border-navy-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-navy-400">Workflow</p>
            <p className="mt-3 text-lg font-bold text-navy-900">{feature === 'maps' ? 'Location search' : feature === 'recommendations' ? 'Ranked matches' : 'Lead capture'}</p>
          </div>
        </div>

        {feature === 'maps' ? <MapsTool societies={societies} /> : null}
        {feature === 'recommendations' ? <RecommendationsTool societies={societies} /> : null}
        {feature === 'broker-crm' || feature === 'chat' ? <LeadFlowTool feature={feature} /> : null}
      </section>
    </div>
  );
}
