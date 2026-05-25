import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Home, KeyRound, MapPin, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const examples = ['DLF Park Place', 'DLF Crest', 'Golf Course Road', '3 BHK under ₹60K', 'Pet friendly'];
const modes = [
  { key: 'societies', label: 'Societies', icon: Building2 },
  { key: 'rent', label: 'Rent', icon: KeyRound },
  { key: 'buy', label: 'Buy', icon: Home },
];

export function HeroSearch() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('societies');
  const navigate = useNavigate();

  const handleSearch = () => {
    const params = new URLSearchParams();
    params.set('tab', mode);
    if (query.trim()) params.set('q', query.trim());
    navigate(`/search?${params.toString()}`);
  };

  return (
    <section className="relative overflow-hidden bg-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_10%,#EEF4FF_0%,transparent_32%),radial-gradient(circle_at_86%_38%,#E8F0FE_0%,transparent_36%)]" />
      <div className="relative container mx-auto px-4 pt-16 pb-10 md:pt-24 md:pb-16">
        <div className="grid lg:grid-cols-[0.92fr_1.08fr] gap-10 lg:gap-14 items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-navy-100 text-navy-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] mb-7">
              <Sparkles className="w-3.5 h-3.5" /> Society-first platform
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold leading-[0.95] text-navy-900 text-balance">
              Discover the Society.
              <span className="block text-navy-600">Then Find the Home.</span>
            </h1>

            <p className="text-lg md:text-xl text-navy-500 mt-7 max-w-xl leading-relaxed">
              Verified societies, real inventory, resident signals and market intelligence — designed for Gurgaon first, Bangalore next.
            </p>

            <div className="mt-9 rounded-[2rem] bg-white border border-navy-100 shadow-apple p-4 md:p-5 max-w-3xl">
              <div className="flex gap-2 mb-4 rounded-2xl bg-ivory-300 p-1">
                {modes.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setMode(item.key)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-all',
                        mode === item.key ? 'bg-white text-navy-700 shadow-sm' : 'text-navy-500 hover:text-navy-900'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search society, sector, builder or locality..."
                    className="h-14 pl-12 rounded-2xl border-navy-100 bg-white text-base focus-visible:ring-navy-200"
                  />
                </div>
                <Button onClick={handleSearch} size="lg" className="h-14 rounded-2xl bg-navy-600 hover:bg-navy-700 px-8 text-white shadow-sm">
                  Search <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {examples.map((example) => (
                  <button
                    key={example}
                    onClick={() => { setQuery(example); navigate(`/search?tab=${mode}&q=${encodeURIComponent(example)}`); }}
                    className="rounded-full bg-ivory-300 px-3.5 py-2 text-sm text-navy-600 hover:bg-navy-100 hover:text-navy-800 transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative min-h-[460px] lg:min-h-[590px]">
            <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden shadow-apple border border-white">
              <img
                src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1400&q=88"
                alt="Premium society landscape"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-white/78 via-white/20 to-transparent lg:from-transparent lg:via-white/10 lg:to-transparent" />
            </div>

            <div className="absolute left-6 right-6 bottom-6 grid grid-cols-2 gap-3">
              <div className="glass-card rounded-3xl p-5">
                <p className="text-3xl font-bold text-navy-900">150+</p>
                <p className="text-sm text-navy-500">Verified societies</p>
              </div>
              <div className="glass-card rounded-3xl p-5">
                <div className="flex items-center gap-2 text-navy-700 font-semibold"><ShieldCheck className="w-5 h-5" /> 100%</div>
                <p className="text-sm text-navy-500 mt-1">Real inventory signals</p>
              </div>
            </div>

            <div className="hidden md:block absolute right-6 top-10 glass-card rounded-3xl p-5 max-w-[260px]">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-navy-100 flex items-center justify-center"><MapPin className="w-5 h-5 text-navy-600" /></div>
                <div>
                  <p className="font-semibold text-navy-900">Gurgaon focused</p>
                  <p className="text-sm text-navy-500 mt-1">Built society by society, not listing by listing.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
