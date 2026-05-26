import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Home, KeyRound, PlusCircle, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const examples = ['DLF Crest', 'DLF Park Place', 'Golf Course Road', 'Family Friendly', 'Near Cyber Hub'];

const actionCards = [
  {
    label: 'Rent',
    title: 'Rent a home',
    description: 'Verified rentals in Gurgaon societies',
    icon: KeyRound,
    path: '/search?tab=rent',
  },
  {
    label: 'Buy',
    title: 'Buy a home',
    description: 'Compare societies before buying',
    icon: Home,
    path: '/search?tab=buy',
  },
  {
    label: 'Sell',
    title: 'Sell / List',
    description: 'List your property for verified leads',
    icon: PlusCircle,
    path: '/sell',
  },
];

export function HeroSearch() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = () => {
    const params = new URLSearchParams();
    params.set('tab', 'societies');
    if (query.trim()) params.set('q', query.trim());
    navigate(`/search?${params.toString()}`);
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
    navigate(`/search?tab=societies&q=${encodeURIComponent(example)}`);
  };

  return (
    <section className="relative overflow-hidden bg-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#EEF4FF_0%,transparent_42%),linear-gradient(180deg,#FFFFFF_0%,#F8FAFC_100%)]" />

      <div className="relative container mx-auto px-4 pt-14 pb-14 md:pt-20 md:pb-20">
        <div className="mx-auto max-w-6xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 shadow-sm ring-1 ring-blue-100">
            <Sparkles className="h-3.5 w-3.5" />
            Society-first marketplace
          </div>

          <h1 className="mx-auto mt-7 max-w-5xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-slate-950 sm:text-5xl md:text-6xl lg:text-[64px]">
            Discover Better Societies.
            <span className="block text-blue-600">Find Better Homes.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
            Verified societies, real inventory, resident reviews and market intelligence built around how people actually choose where to live.
          </p>

          <div className="mx-auto mt-10 max-w-5xl rounded-[2rem] border border-slate-200 bg-white p-3 shadow-[0_24px_80px_rgba(15,23,42,0.10)] md:rounded-full md:p-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-full bg-white px-3 py-2 md:px-5">
                <Search className="h-5 w-5 shrink-0 text-slate-400" />

                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
                  placeholder="Search society, locality, builder or ask anything..."
                  className="h-12 min-w-0 flex-1 border-0 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400 md:text-lg"
                />
              </div>

              <Button
                onClick={handleSearch}
                size="lg"
                className="h-14 rounded-full bg-blue-600 px-8 text-base font-semibold text-white shadow-sm hover:bg-blue-700 md:h-16 md:px-10"
              >
                Search
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mx-auto mt-6 grid max-w-5xl gap-3 md:grid-cols-3">
            {actionCards.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className="group flex items-center gap-4 rounded-3xl border border-slate-200 bg-white/90 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-[0_18px_50px_rgba(15,23,42,0.10)]"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold uppercase tracking-[0.14em] text-blue-600">{item.label}</span>
                    <span className="mt-0.5 block text-base font-semibold text-slate-950">{item.title}</span>
                    <span className="mt-1 block text-sm text-slate-500">{item.description}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 md:gap-3">
            <span className="mr-1 text-sm text-slate-500">Popular searches:</span>
            {examples.map((example) => (
              <button
                key={example}
                onClick={() => handleExampleClick(example)}
                className="rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-medium text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
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
