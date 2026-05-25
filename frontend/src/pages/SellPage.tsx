import { useEffect, useState } from 'react';
import { ArrowRight, BadgeIndianRupee, Building2, Camera, CheckCircle2, Home, Sparkles, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const steps = [
  { icon: Building2, title: 'Choose Society', text: 'Start with society name, tower and sector.' },
  { icon: Home, title: 'Add Property Details', text: 'Rent, resale, BHK, size and availability.' },
  { icon: Camera, title: 'Upload Photos', text: 'Photos become listing highlights.' },
  { icon: Sparkles, title: 'AI Creates Listing', text: 'Title, description, tags and lead-ready page.' },
];

export function SellPage() {
  const [purpose, setPurpose] = useState<'rent' | 'sell'>('rent');
  useEffect(() => window.scrollTo(0, 0), []);

  return (
    <div className="min-h-screen bg-ivory-100">
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1920&q=80')] bg-cover bg-center opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900/95 to-navy-950" />
        <div className="relative container mx-auto px-4 py-20 md:py-28">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <Badge className="mb-5 bg-gold-500/15 text-gold-300 border-gold-400/30">Owner inventory engine</Badge>
              <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight leading-tight">List your property from the society page.</h1>
              <p className="text-lg text-navy-100 mt-5 max-w-2xl">Rent out or sell your flat with society-first context, AI-generated listing content and lead capture built around real buyer and tenant intent.</p>
              <div className="grid sm:grid-cols-3 gap-4 mt-8">
                {['Verified society context', 'AI listing copy', 'Buyer/renter leads'].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-navy-100"><CheckCircle2 className="w-4 h-4 text-gold-400" />{item}</div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] bg-white p-5 md:p-7 text-navy-900 shadow-2xl">
              <div className="flex items-center gap-2 mb-5">
                <BadgeIndianRupee className="w-5 h-5 text-gold-600" />
                <h2 className="text-2xl font-display font-bold">Start listing</h2>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-5 rounded-2xl bg-navy-50 p-1">
                <button onClick={() => setPurpose('rent')} className={cn('rounded-xl px-4 py-3 text-sm font-semibold transition-all', purpose === 'rent' ? 'bg-white shadow-sm text-navy-900' : 'text-navy-500')}>For Rent</button>
                <button onClick={() => setPurpose('sell')} className={cn('rounded-xl px-4 py-3 text-sm font-semibold transition-all', purpose === 'sell' ? 'bg-white shadow-sm text-navy-900' : 'text-navy-500')}>For Sale</button>
              </div>
              <div className="space-y-4">
                <Input className="h-12 rounded-xl" placeholder="Society name e.g. DLF Park Place" />
                <Input className="h-12 rounded-xl" placeholder="Tower / block" />
                <Input className="h-12 rounded-xl" placeholder="BHK and size e.g. 3 BHK, 1983 sq.ft." />
                <Input className="h-12 rounded-xl" placeholder={purpose === 'rent' ? 'Expected rent e.g. ₹85,000/month' : 'Expected price e.g. ₹5.5 Cr'} />
                <Input className="h-12 rounded-xl" placeholder="Your phone number" />
                <Button className="w-full h-12 rounded-xl bg-navy-700 hover:bg-navy-800 text-white font-semibold">Continue <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </div>
              <p className="text-xs text-navy-400 mt-4 text-center">Form currently connects to the product flow. Backend lead API can be wired in the next step.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-white text-navy-700 border-navy-200">How owner listing works</Badge>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-navy-900">Designed to create inventory, not just pages.</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((step, index) => { const Icon = step.icon; return <div key={step.title} className="rounded-[2rem] bg-white border border-navy-100 p-6 shadow-sm"><div className="w-12 h-12 rounded-2xl bg-navy-900 text-white flex items-center justify-center mb-5"><Icon className="w-6 h-6" /></div><p className="text-sm text-gold-600 font-bold mb-2">Step {index + 1}</p><h3 className="text-xl font-display font-bold text-navy-900">{step.title}</h3><p className="text-sm text-navy-500 mt-2">{step.text}</p></div>; })}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="rounded-[2rem] bg-navy-900 p-8 md:p-10 text-white grid md:grid-cols-2 gap-8 items-center">
            <div>
              <UserRound className="w-10 h-10 text-gold-400 mb-4" />
              <h2 className="text-3xl font-display font-bold">Broker and owner dashboards come next.</h2>
              <p className="text-navy-100 mt-3">Bulk upload, verification, lead routing and package monetization should be wired after the UI foundation is stable.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {['Lead capture', 'Photo verification', 'Featured listing', 'Society matching'].map((item) => <div key={item} className="rounded-2xl bg-white/10 p-4 text-sm">{item}</div>)}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
