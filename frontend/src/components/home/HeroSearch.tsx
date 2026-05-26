import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const examples = ['DLF Crest', 'DLF Park Place', 'Golf Course Road', 'Family Friendly', 'Near Cyber Hub'];

export function HeroSearch() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (value?: string) => {
    const searchValue = (value ?? query).trim();
    const params = new URLSearchParams();
    params.set('tab', 'societies');
    if (searchValue) params.set('q', searchValue);
    navigate(`/search?${params.toString()}`);
  };

  return (
    <section className="relative overflow-hidden bg-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#EEF4FF_0%,transparent_35%),linear-gradient(180deg,#FFFFFF_0%,#F8FBFF_100%)]" />

      <div className="relative container mx-auto px-4 pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="mx-auto max-w-6xl text-center">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            <Sparkles className="h-3.5 w-3.5" /> Society-first marketplace
          </div>

          <h1 className="mx-auto max-w-5xl text-balance text-5xl font-bold leading-[0.95] tracking-[-0.045em] text-navy-900 md:text-7xl lg:text-8xl">
            Discover Better Societies.
            <span className="block text-blue-600">Find Better Homes.</span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-navy-500 md:text-xl">
            Verified societies, real inventory, resident reviews and market intelligence built around how people actually choose where to live.
          </p>

          <div className="mx-auto mt-12 max-w-6xl rounded-[2rem] border border-slate-200 bg-white/95 p-3 shadow-[0_28px_80px_rgba(15,23,42,0.10)] backdrop-blur md:rounded-full md:p-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search society, locality, builder or ask anything..."
                  className="h-16 rounded-[1.35rem] border-0 bg-transparent pl-13 pr-4 text-base text-navy-900 shadow-none outline-none placeholder:text-slate-400 focus-visible:ring-0 md:h-18 md:text-lg"
                />
              </div>

              <Button
                onClick={() => handleSearch()}
                size="lg"
                className="h-16 rounded-[1.35rem] bg-blue-600 px-9 text-base font-semibold text-white shadow-sm hover:bg-blue-700 md:h-18 md:rounded-full md:px-11"
              >
                Search Societies <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 px-2 pb-1 pt-4 md:justify-start md:px-5">
              <span className="mr-1 text-sm text-navy-400">Popular searches:</span>
              {examples.map((example) => (
                <button
                  key={example}
                  onClick={() => {
                    setQuery(example);
                    handleSearch(example);
                  }}
                  className="rounded-full bg-slate-100 px-4 py-2 text-sm text-navy-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-7xl overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_30px_90px_rgba(15,23,42,0.12)] md:rounded-[2.5rem]">
          <div className="relative h-[300px] md:h-[430px] lg:h-[520px]">
            <img
              src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1800&q=90"
              alt="Premium residential society landscape"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white/35 via-white/0 to-white/10" />
          </div>
        </div>
      </div>
    </section>
  );
}
