import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const examples = ['DLF Crest', 'DLF Park Place', 'Golf Course Road', 'Family Friendly', 'Near Cyber Hub'];

export function HeroSearch() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (value = query) => {
    const params = new URLSearchParams();
    params.set('tab', 'societies');
    if (value.trim()) params.set('q', value.trim());
    navigate(`/search?${params.toString()}`);
  };

  return (
    <section className="relative overflow-hidden bg-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_14%,#EEF4FF_0%,transparent_34%),radial-gradient(circle_at_88%_26%,#F3F7FF_0%,transparent_38%)]" />

      <div className="relative container mx-auto px-4 pt-24 pb-24 md:pt-28 md:pb-28">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-12 lg:gap-16 items-center">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#EEF4FF] text-[#4F7DF3] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] mb-8">
              <Sparkles className="w-3.5 h-3.5" /> Society-first platform
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-[-0.04em] leading-[0.95] text-navy-900 text-balance">
              Discover Better Societies.
              <span className="block text-navy-600">Find Better Homes.</span>
            </h1>

            <p className="text-lg md:text-xl text-navy-500 mt-7 max-w-2xl leading-relaxed">
              Verified societies, real inventory, resident reviews and market intelligence built around how people actually choose where to live.
            </p>

            <div className="mt-12 max-w-5xl">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-[2rem] sm:rounded-full bg-white border border-slate-200 shadow-[0_24px_70px_rgba(15,23,42,0.10)] p-2">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search society, locality, builder or ask anything..."
                    className="h-16 pl-13 pr-5 border-0 bg-transparent text-base md:text-lg text-navy-900 placeholder:text-slate-400 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>

                <Button
                  onClick={() => handleSearch()}
                  size="lg"
                  className="h-14 rounded-full bg-[#4F7DF3] hover:bg-[#416DE0] px-8 text-white shadow-sm"
                >
                  Search <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2.5 mt-5">
                {examples.map((example) => (
                  <button
                    key={example}
                    onClick={() => {
                      setQuery(example);
                      handleSearch(example);
                    }}
                    className="rounded-full bg-slate-50 border border-slate-200 px-4 py-2 text-sm text-navy-600 hover:bg-[#EEF4FF] hover:border-[#DCE8FF] hover:text-[#4F7DF3] transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative min-h-[430px] lg:min-h-[560px]">
            <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden shadow-[0_28px_80px_rgba(15,23,42,0.14)] border border-white">
              <img
                src="https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=1600&q=90"
                alt="Premium society landscape"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-white/22 via-transparent to-[#EEF4FF]/18" />
            </div>

            <div className="hidden md:block absolute right-6 top-8 glass-card rounded-3xl p-5 max-w-[260px]">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#EEF4FF] flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-[#4F7DF3]" />
                </div>
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
