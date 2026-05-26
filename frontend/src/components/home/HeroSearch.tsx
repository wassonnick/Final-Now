import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const examples = ['DLF Crest', 'DLF Park Place', 'Golf Course Road', 'Family Friendly', 'Near Cyber Hub'];

export function HeroSearch() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = () => {
    const params = new URLSearchParams();
    params.set('tab', 'societies');
    if (query.trim()) params.set('q', query.trim());
    navigate(`/search?${params.toString()}`);
  };

  const handleExample = (example: string) => {
    setQuery(example);
    const params = new URLSearchParams();
    params.set('tab', 'societies');
    params.set('q', example);
    navigate(`/search?${params.toString()}`);
  };

  return (
    <section className="relative overflow-hidden bg-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#EEF4FF_0%,transparent_42%),linear-gradient(180deg,#FFFFFF_0%,#F8FAFC_100%)]" />

      <div className="relative container mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-24">
        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] mb-7">
            <Sparkles className="w-3.5 h-3.5" /> Society-first marketplace
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.06] tracking-[-0.045em] text-slate-950 text-balance">
            Discover Better Societies.
            <span className="block text-blue-600">Find Better Homes.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base md:text-lg leading-relaxed text-slate-600">
            Verified societies, real inventory, resident reviews and market intelligence built around how people actually choose where to live.
          </p>

          <div className="mx-auto mt-10 max-w-6xl rounded-[2rem] md:rounded-full border border-slate-200 bg-white p-3 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search society, locality, builder or ask anything..."
                  className="h-14 md:h-16 rounded-full border-0 bg-transparent pl-14 pr-4 text-base md:text-lg text-slate-900 placeholder:text-slate-400 shadow-none focus-visible:ring-0"
                />
              </div>

              <Button
                onClick={handleSearch}
                size="lg"
                className="h-14 md:h-16 rounded-full bg-blue-600 hover:bg-blue-700 px-8 md:px-10 text-white text-base font-semibold shadow-sm"
              >
                Search Societies <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mx-auto mt-6 flex max-w-4xl flex-wrap items-center justify-center gap-2.5 text-sm text-slate-500">
            <span className="mr-1">Popular searches:</span>
            {examples.map((example) => (
              <button
                key={example}
                onClick={() => handleExample(example)}
                className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-blue-600 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
