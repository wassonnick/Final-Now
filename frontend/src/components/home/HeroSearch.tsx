import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Sparkles, ShieldCheck, Building2, Home, KeyRound, BadgeIndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const examples = ['DLF Park Place', 'DLF Crest', 'Golf Course Road', '3 BHK under ₹60K', 'Pet friendly societies'];
const modes = [
  { key: 'societies', label: 'Societies', icon: Building2 },
  { key: 'rent', label: 'Rent', icon: KeyRound },
  { key: 'buy', label: 'Buy', icon: Home },
  { key: 'sell', label: 'Sell', icon: BadgeIndianRupee },
];

export function HeroSearch() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('societies');
  const navigate = useNavigate();

  const handleSearch = () => {
    if (mode === 'sell') {
      navigate('/sell');
      return;
    }
    const params = new URLSearchParams();
    params.set('tab', mode);
    if (query.trim()) params.set('q', query.trim());
    navigate(`/search?${params.toString()}`);
  };

  return (
    <section className="relative overflow-hidden bg-navy-950">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&q=85')] bg-cover bg-center opacity-28" />
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950/70 via-navy-900/86 to-navy-950" />
      <div className="absolute -right-24 top-20 h-80 w-80 rounded-full bg-gold-500/20 blur-3xl" />
      <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

      <div className="relative container mx-auto px-4 py-20 md:py-28">
        <div className="max-w-5xl mx-auto text-center">
          <Badge className="mb-6 bg-white/10 text-white border-white/20 backdrop-blur-sm px-4 py-1.5 text-sm">
            <MapPin className="w-3.5 h-3.5 mr-1.5" />
            Gurgaon first • Bangalore highlighted next
          </Badge>

          <h1 className="text-4xl md:text-7xl font-display font-bold text-white mb-5 leading-[1.02] tracking-tight">
            Discover the Society.
            <span className="block text-gold-400">Then Find the Home.</span>
          </h1>

          <p className="text-lg md:text-xl text-navy-100 mb-10 max-w-3xl mx-auto">
            Society-first marketplace for rent, buy and sell — with verified inventory, resident signals and market intelligence before you make a decision.
          </p>

          <div className="bg-white/96 backdrop-blur rounded-[2rem] shadow-2xl p-4 md:p-6 max-w-4xl mx-auto text-left">
            <div className="grid grid-cols-4 gap-2 mb-4 rounded-2xl bg-navy-50 p-1">
              {modes.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => setMode(item.key)}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all',
                      mode === item.key ? 'bg-white text-navy-900 shadow-sm' : 'text-navy-500 hover:text-navy-900'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-500" />
                <Input
                  type="text"
                  placeholder="Search society, sector, builder or ask: 3 BHK near CyberHub under 60k"
                  className="pl-12 h-14 text-base rounded-2xl border-navy-200 focus-visible:ring-navy-300"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button size="lg" className="h-14 px-8 rounded-2xl bg-navy-700 hover:bg-navy-800 text-white text-base font-semibold" onClick={handleSearch}>
                <Search className="w-5 h-5 mr-2" />
                {mode === 'sell' ? 'Start Selling' : 'Search'}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {examples.map((example) => (
                <button key={example} onClick={() => { setQuery(example); navigate(`/search?tab=${mode === 'sell' ? 'societies' : mode}&q=${encodeURIComponent(example)}`); }} className="rounded-full bg-ivory-100 px-3 py-1.5 text-sm text-navy-600 hover:bg-gold-100 hover:text-navy-900 transition-colors">
                  {example}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
            {[
              { value: '150+', label: 'Verified Societies' },
              { value: '5,000+', label: 'Homes Tracked' },
              { value: '2,500+', label: 'Resident Signals' },
              { value: '100%', label: 'Society-first Search' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur p-4 text-center">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-navy-100">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-7 flex items-center justify-center gap-2 text-sm text-navy-100">
            <ShieldCheck className="w-4 h-4 text-gold-400" />
            Choose the right society before choosing the flat.
          </div>
        </div>
      </div>
    </section>
  );
}
