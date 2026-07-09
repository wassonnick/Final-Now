// C79 broker signup UX polish: tighter broker form, clearer partner flow and compact trust content.
// C71 broker page copy: verified broker partner, RERA/license, inventory and commission trust language.
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
import { createCustomerAccountSession, rememberBrokerActivitySubmission } from '@/lib/customerAccount';
import { fetchAccountByPhone, syncAccountToBackend } from '@/lib/accountApi';
import { SocietyAssistant } from '@/components/ai/SocietyAssistant';
import { setPublicSeo } from '@/lib/seo';
import { API_BASE_URL } from '@/config/api';

type FeatureExperienceKey = 'maps' | 'broker-crm' | 'chat' | 'recommendations';

type PublicSociety = Awaited<ReturnType<typeof fetchPublicSocieties>>[number];
type PublicProperty = Awaited<ReturnType<typeof fetchPublicProperties>>[number];

const featureIntro = {
  maps: {
    title: 'Explore Gurgaon on the map',
    eyebrow: 'Search by location context',
    text: 'See societies by sector, road and the anchors around them — then open any profile with its verified public data.',
    icon: MapPinned,
  },
  'broker-crm': {
    title: 'Join SocietyFlats as a Broker Partner',
    eyebrow: 'Broker partner program',
    text: 'Submit your working areas, RERA/license details and inventory strength. SocietyFlats helps verified broker partners access serious Gurgaon buyers, tenants and owner listing opportunities.',
    icon: BriefcaseBusiness,
  },
  chat: {
    title: 'Ask anything about Gurgaon societies',
    eyebrow: 'Grounded, honest answers',
    text: 'It answers only from published SocietyFlats profiles — and it\'ll happily say "I don\'t have that yet" rather than invent something to fill the gap.',
    icon: MessageSquareText,
  },
  recommendations: {
    title: 'Your shortlist',
    eyebrow: 'Matched to your fit',
    text: 'Tell us your budget, area and what matters most — we\'ll rank a shortlist from live society data, no sponsored placements.',
    icon: Target,
  },
};

const localityPresets = ['Golf Course Road', 'Dwarka Expressway', 'Sohna Road', 'Sector 70', 'Sector 102', 'DLF'];
const priorityOptions = ['Clubhouse', 'Swimming Pool', 'Gym', '24x7 Security', 'Power Backup', 'Landscaped Greens'];

function submitLead(payload: { name: string; phone: string; email?: string; message: string; society_name?: string; source: string; role?: string }) {
  return fetch(`${API_BASE_URL}/leads`, {
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
            <p className="mt-3 max-w-3xl text-base leading-7 text-navy-500">{intro.text}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {feature === 'broker-crm' ? (
              <>
                <Button asChild className="rounded-full bg-orange-600 hover:bg-orange-700">
                  <a href="#broker-signup">Submit broker application <ArrowRight className="ml-2 h-4 w-4" /></a>
                </Button>
                <Button asChild variant="outline" className="rounded-full border-orange-200 bg-white text-orange-700">
                  <Link to="/broker/dashboard">Broker dashboard</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="outline" className="rounded-full border-navy-200 text-navy-700">
                  <Link to="/search">Advanced search</Link>
                </Button>
                <Button asChild className="rounded-full bg-navy-600 hover:bg-navy-700">
                  <Link to="/ai-advisor">AI advisor <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </>
            )}
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
        <div className="min-h-[420px] rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.14),transparent_30%),linear-gradient(135deg,#234A40,#10251F)] p-6">
          <div className="flex h-full flex-col justify-between gap-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-300">Location preview</p>
              <h2 className="mt-3 text-3xl font-bold text-white">{selected?.name || 'Search a society'}</h2>
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
        const dataScore = Number(society.score || 0) * 5;
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
            <Input value={locality} onChange={(event) => setLocality(event.target.value)} placeholder="Golf Course Road, Sector 70..." className="mt-2 h-11 rounded-full" />
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
  const brokerNavigate = useNavigate();
  const isBrokerCrm = feature === 'broker-crm';
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    role: isBrokerCrm ? 'Broker partner' : 'Buyer/Tenant',
    society: '',
    message: '',
    companyName: '',
    officeAddress: '',
    workingAreas: '',
    experience: '',
    reraNumber: '',
  });
  const [brokerStep, setBrokerStep] = useState(1);
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [notice, setNotice] = useState('');
  const brokerStepReady =
    brokerStep === 1 ? /^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, '').slice(-10)) :
    brokerStep === 2 ? Boolean(form.name.trim()) :
    brokerStep === 3 ? Boolean(form.workingAreas.trim()) :
    true;

  const submit = async () => {
    if (state === 'loading' || state === 'success') return;

    const cleanPhone = form.phone.replace(/[^0-9]/g, '').slice(-10);

    if (!form.name.trim() || !cleanPhone) {
      setState('error');
      setNotice('Please add your name and valid phone number first.');
      return;
    }

    if (isBrokerCrm && !form.workingAreas.trim()) {
      setState('error');
      setNotice('Please add your working areas or societies.');
      return;
    }

    if (isBrokerCrm && !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setState('error');
      setNotice('Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.');
      return;
    }

    setState('loading');
    setNotice('');

    try {
      const role = isBrokerCrm ? 'Broker partner' : form.role.trim();
      const society = form.society.trim();
      const userMessage = form.message.trim();

      const brokerMessage = [
        'Broker partner signup from SocietyFlats public Broker CRM page',
        `Name: ${form.name.trim() || 'Not provided'}`,
        `Phone: ${cleanPhone || form.phone || 'Not provided'}`,
        `Email: ${form.email.trim() || 'Not provided'}`,
        `Company / Brand: ${form.companyName.trim() || 'Not provided'}`,
        `Office Address: ${form.officeAddress.trim() || 'Not provided'}`,
        `Working Areas / Societies: ${form.workingAreas.trim() || society || 'Not provided'}`,
        `Experience: ${form.experience.trim() || 'Not provided'}`,
        `RERA / License No.: ${form.reraNumber.trim() || 'Not provided'}`,
        `Inventory / Client Details: ${userMessage || 'Not provided'}`,
        'Suggested next action: Verify broker profile, working areas, inventory quality and commission terms.',
      ].join('\n');

      if (isBrokerCrm) {
        const existingAccount = await fetchAccountByPhone(cleanPhone || form.phone);
        if (existingAccount?.account?.id) {
          setState('error');
          setNotice('This phone number is already registered. Please login or continue with OTP instead of creating a duplicate broker account.');
          return;
        }
      }

      const payload = {
        name: form.name.trim(),
        phone: cleanPhone || form.phone,
        email: form.email.trim() || undefined,
        society_name: form.workingAreas.trim() || society || undefined,
        source: isBrokerCrm ? 'public_broker_crm' : 'public_chat_callback',
        role,
        message: isBrokerCrm
          ? brokerMessage
          : `${role}: ${userMessage || 'Callback requested from SocietyFlats feature page.'}`,
      };

      const response = await submitLead(payload);

      if (isBrokerCrm) {
        createCustomerAccountSession({
          role: 'broker',
          phone: cleanPhone || form.phone,
          name: form.name.trim() || 'Broker Partner',
        });

        rememberBrokerActivitySubmission(payload, response as Record<string, unknown>);

        void syncAccountToBackend({
          role: 'broker',
          phone: cleanPhone || form.phone,
          name: form.name.trim() || 'Broker Partner',
          email: form.email.trim() || undefined,
          source: 'broker_crm_signup',
          meta: {
            companyName: form.companyName.trim(),
            officeAddress: form.officeAddress.trim(),
            workingAreas: form.workingAreas.trim(),
            experience: form.experience.trim(),
            reraNumber: form.reraNumber.trim(),
          },
        });
      }

      if (isBrokerCrm) {
        brokerNavigate('/broker/dashboard?signup=success', { replace: true });
        return;
      }

      setState('success');
      setNotice('Request received. A SocietyFlats advisor will review your requirement and get back to you shortly.');
    } catch (error) {
      setState('error');
      setNotice(error instanceof Error ? error.message : 'Unable to submit. Please try again.');
    }
  };

  if (isBrokerCrm) {
    return (
      <div id="broker-signup" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
        <section className="rounded-[2rem] border border-orange-100 bg-white p-6 shadow-soft">
          <div className="mb-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Broker signup</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-navy-950">
              Grow your broker business with SocietyFlats.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-navy-500">
              Complete one clear step at a time. Verified partners can receive matched buyer, tenant and owner opportunities through SocietyFlats.
            </p>
            <div className="mt-5 flex items-center justify-between text-xs font-bold text-[#6E756E]">
              <span>Step {brokerStep} of 5</span>
              <span>{Math.round((brokerStep / 5) * 100)}% complete</span>
            </div>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <span key={index} className={cn("h-1.5 rounded-full", index + 1 <= brokerStep ? "bg-[#C2724E]" : "bg-[#F4E3D8]")} />
              ))}
            </div>
          </div>

          <div className="min-h-[245px]">
            {brokerStep === 1 ? (
              <label className="block">
                <span className="text-sm font-semibold text-navy-700">Verify your mobile number</span>
                <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value.replace(/\D/g, '').slice(0, 10) })} inputMode="numeric" className="mt-3 h-12 rounded-xl" placeholder="10-digit mobile number" />
                <p className="mt-2 text-xs leading-5 text-[#6E756E]">No spam. This number is used for broker verification, account access and matched enquiries.</p>
              </label>
            ) : null}
            {brokerStep === 2 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label><span className="text-sm font-semibold text-navy-700">Full name</span><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 h-11 rounded-xl" placeholder="Broker name" /></label>
                <label><span className="text-sm font-semibold text-navy-700">Company / brand</span><Input value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} className="mt-2 h-11 rounded-xl" placeholder="Your firm name" /></label>
                <label><span className="text-sm font-semibold text-navy-700">Email</span><Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-2 h-11 rounded-xl" placeholder="Optional" /></label>
                <label><span className="text-sm font-semibold text-navy-700">Experience</span><Input value={form.experience} onChange={(event) => setForm({ ...form, experience: event.target.value })} className="mt-2 h-11 rounded-xl" placeholder="Example: 8 years" /></label>
              </div>
            ) : null}
            {brokerStep === 3 ? (
              <div className="space-y-4">
                <label className="block"><span className="text-sm font-semibold text-navy-700">Operating sectors / societies</span><Input value={form.workingAreas} onChange={(event) => setForm({ ...form, workingAreas: event.target.value })} className="mt-2 h-12 rounded-xl" placeholder="Golf Course Road, Sector 65, DLF societies..." /></label>
                <label className="block"><span className="text-sm font-semibold text-navy-700">Office address</span><Input value={form.officeAddress} onChange={(event) => setForm({ ...form, officeAddress: event.target.value })} className="mt-2 h-11 rounded-xl" placeholder="Office address / locality" /></label>
              </div>
            ) : null}
            {brokerStep === 4 ? (
              <div>
                <p className="text-sm font-semibold text-navy-700">Inventory and verification</p>
                <textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} className="mt-3 min-h-[120px] w-full rounded-[1.25rem] border border-navy-100 bg-white p-3.5 text-navy-800 outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" placeholder="Rent, resale or both? Mention active inventory, client requirements and top societies." />
                <label className="mt-4 block"><span className="text-sm font-semibold text-navy-700">RERA / license number</span><Input value={form.reraNumber} onChange={(event) => setForm({ ...form, reraNumber: event.target.value })} className="mt-2 h-11 rounded-xl" placeholder="Optional at submission; verified before activation" /></label>
              </div>
            ) : null}
            {brokerStep === 5 ? (
              <div>
                <p className="text-sm font-semibold text-navy-700">Review application</p>
                <div className="mt-3 grid gap-2 rounded-[16px] bg-[#FBF3EE] p-4 text-sm">
                  {[["Name", form.name], ["Phone", form.phone], ["Company", form.companyName || "Independent broker"], ["Working areas", form.workingAreas], ["Experience", form.experience || "Not provided"], ["RERA / license", form.reraNumber || "To be verified"]].map(([label, value]) => <div key={label} className="flex justify-between gap-4 border-b border-[#F4E3D8] pb-2 last:border-0 last:pb-0"><span className="text-[#6E756E]">{label}</span><strong className="max-w-[65%] text-right text-[#25302B]">{value}</strong></div>)}
                </div>
                <p className="mt-3 text-xs leading-5 text-[#6E756E]">Submission creates a verification request. It does not automatically make the broker profile public or active.</p>
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {brokerStep > 1 ? <Button type="button" variant="outline" onClick={() => setBrokerStep((step) => Math.max(1, step - 1))} className="h-10 rounded-xl px-5">Back</Button> : null}
            {brokerStep < 5 ? (
              <Button type="button" disabled={!brokerStepReady} onClick={() => setBrokerStep((step) => Math.min(5, step + 1))} className="h-10 rounded-xl bg-orange-600 px-5 text-sm font-bold hover:bg-orange-700">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
            ) : (
              <Button disabled={state === 'loading' || state === 'success'} onClick={submit} className="h-10 rounded-xl bg-orange-600 px-5 text-sm font-bold hover:bg-orange-700">
                {state === 'loading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BriefcaseBusiness className="mr-2 h-4 w-4" />}
                {state === 'success' ? 'Request sent' : state === 'loading' ? 'Sending...' : 'Submit for verification'}
              </Button>
            )}

            {state === 'success' ? (
              <Button asChild variant="outline" className="rounded-full border-orange-100 bg-white text-orange-700">
                <Link to="/broker/dashboard">Open Broker Dashboard</Link>
              </Button>
            ) : null}

            {notice ? (
              <span className={cn('text-sm font-semibold', state === 'success' ? 'text-emerald-700' : 'text-red-600')}>{notice}</span>
            ) : null}
          </div>
        </section>

        <aside className="rounded-[2rem] border border-orange-100 bg-orange-50 p-6">
          <BriefcaseBusiness className="h-9 w-9 text-orange-700" />
          <h2 className="mt-4 text-xl font-black text-navy-950">Why join as a SocietyFlats broker partner?</h2>

          <div className="mt-5 space-y-4">
            {[
              'Access society-first Gurgaon buyer and renter leads instead of random portal noise.',
              'Submit your active areas and inventory once, then track partner follow-up from the Broker Dashboard.',
              'Admin verifies broker profile, inventory quality, working societies and lead stages before deeper customer routing.',
              'Get access to owner listing, buyer and tenant opportunities as SocietyFlats grows.',
              'Commission pipeline will be tracked transparently after verified deal stages.',
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl bg-white p-3.5 text-sm font-semibold leading-6 text-navy-700">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                {item}
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-navy-600">
            <p className="font-black text-navy-950">After signup</p>
            <p className="mt-2">
              SocietyFlats admin will call to verify your profile, working societies, inventory strength and commission understanding before marking you active.
            </p>
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
      <section className="rounded-[2rem] border border-navy-100 bg-white p-6 shadow-soft">
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="text-sm font-semibold text-navy-700">Name</span>
            <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 h-11 rounded-full" placeholder="Your name" />
          </label>
          <label>
            <span className="text-sm font-semibold text-navy-700">Phone</span>
            <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="mt-2 h-11 rounded-full" placeholder="+91..." />
          </label>
          <label>
            <span className="text-sm font-semibold text-navy-700">Email</span>
            <Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-2 h-11 rounded-full" placeholder="Optional" />
          </label>
          <label>
            <span className="text-sm font-semibold text-navy-700">I am a</span>
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="mt-2 h-12 w-full rounded-full border border-navy-100 bg-white px-4 text-navy-800">
              <option>Buyer/Tenant</option>
              <option>Owner</option>
              <option>Society/RWA contact</option>
            </select>
          </label>
          <label className="md:col-span-2">
            <span className="text-sm font-semibold text-navy-700">Society or locality</span>
            <Input value={form.society} onChange={(event) => setForm({ ...form, society: event.target.value })} className="mt-2 h-11 rounded-full" placeholder="Tulip Crimson, DLF, Sector 70..." />
          </label>
          <label className="md:col-span-2">
            <span className="text-sm font-semibold text-navy-700">Requirement</span>
            <textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} className="mt-2 min-h-[140px] w-full rounded-[1.5rem] border border-navy-100 bg-white p-4 text-navy-800 outline-none focus:border-navy-300 focus:ring-4 focus:ring-navy-100" placeholder="Tell us what you need..." />
          </label>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button disabled={state === 'loading' || state === 'success'} onClick={submit} className="h-10 rounded-full bg-navy-600 px-5 text-sm font-bold hover:bg-navy-700">
            {state === 'loading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {state === 'success' ? 'Request sent' : state === 'loading' ? 'Sending...' : 'Send request'}
          </Button>
          {notice ? (
            <span className={cn('text-sm font-semibold', state === 'success' ? 'text-emerald-700' : 'text-red-600')}>{notice}</span>
          ) : null}
        </div>
      </section>

      <aside className="rounded-[2rem] border border-navy-100 bg-ivory-100 p-6">
        <Phone className="h-8 w-8 text-navy-600" />
        <h2 className="mt-5 text-2xl font-bold text-navy-900">What happens next?</h2>
        <div className="mt-5 space-y-4">
          {[
            'Your request is saved as a lead.',
            'Admin reviews source and society context.',
            'The team follows up by phone or WhatsApp.',
            'Qualified leads can be assigned internally.',
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
    if (feature === 'chat') {
      setPublicSeo('Gurgaon Society AI Chat | SocietyFlats', 'Ask a conversational assistant grounded in published SocietyFlats societies and live Gurgaon homes.', { canonical: '/chat' });
    } else if (feature === 'broker-crm') {
      setPublicSeo('Gurgaon Broker Partner Program | SocietyFlats', 'Apply to become a verified SocietyFlats broker partner for society-specific Gurgaon enquiries and reviewed inventory.', { canonical: '/broker-crm' });
    } else if (feature === 'recommendations') {
      setPublicSeo('Gurgaon Society Recommendations | SocietyFlats', 'Build a shortlist from published Gurgaon society profiles and live verified inventory without fabricated matches.', { canonical: '/recommendations' });
    }
    fetchPublicSocieties().then(setSocieties).catch((error) => console.error('Societies fetch failed:', error));
    fetchPublicProperties().then(setProperties).catch((error) => console.error('Properties fetch failed:', error));
  }, [feature]);

  // The chat assistant is a focused, first-fold experience — skip the big feature hero and
  // stat cards (the assistant carries its own identity header) so it lands above the fold.
  if (feature === 'chat') {
    return (
      <div className="min-h-screen bg-ivory-100">
        <main className="mx-auto max-w-[900px] px-4 pb-14 pt-6 md:px-6">
          <h1 className="font-display text-[26px] font-medium leading-tight text-navy-950 md:text-[32px]">
            Ask anything about Gurgaon societies
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-navy-500">
            Grounded, honest answers from published SocietyFlats profiles — it'll say "I don't have that yet"
            rather than invent something to fill the gap.
          </p>
          <div className="mt-4">
            <SocietyAssistant />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory-100">
      <FeatureHero feature={feature} />

      <section className="container mx-auto px-4 py-8">
        {feature === 'broker-crm' ? (
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-orange-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">Broker signup</p>
              <p className="mt-2 text-lg font-bold text-navy-900">Join as verified broker partner</p>
            </div>
            <div className="rounded-[1.5rem] border border-orange-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">Coverage</p>
              <p className="mt-2 text-lg font-bold text-navy-900">Gurgaon societies first</p>
            </div>
            <div className="rounded-[1.5rem] border border-orange-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">Admin verified</p>
              <p className="mt-2 text-lg font-bold text-navy-900">Leads + commission tracking</p>
            </div>
          </div>
        ) : (
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
              <p className="mt-2 text-lg font-bold text-navy-900">{feature === 'maps' ? 'Location search' : feature === 'recommendations' ? 'Ranked matches' : 'Grounded AI chat'}</p>
            </div>
          </div>
        )}

        {feature === 'maps' ? <MapsTool societies={societies} /> : null}
        {feature === 'recommendations' ? <RecommendationsTool societies={societies} /> : null}
        {feature === 'broker-crm' ? <LeadFlowTool feature={feature} /> : null}
      </section>
    </div>
  );
}
