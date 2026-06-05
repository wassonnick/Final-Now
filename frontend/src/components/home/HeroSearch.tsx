import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIAdvisorChatBox } from '@/components/AIAdvisorChatBox';

const popularSearches = ['DLF Crest', 'Golf Course Road', 'DLF Park Place', 'Pet friendly'];
const searchModes = ['Rent', 'Buy', 'Resale', 'Ask AI'];

export function HeroSearch() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('Rent');
  const navigate = useNavigate();

  const handleSearch = () => {
    const trimmed = query.trim();
    if (mode === 'Ask AI') {
      navigate(`/ai-advisor${trimmed ? `?q=${encodeURIComponent(trimmed)}` : ''}`);
      return;
    }

    const params = new URLSearchParams();
    params.set('tab', mode.toLowerCase());
    if (trimmed) params.set('q', trimmed);
    navigate(`/search?${params.toString()}`);
  };

  const handlePopularSearch = (item: string) => {
    setQuery(item);
    navigate(`/search?tab=societies&q=${encodeURIComponent(item)}`);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-ivory-100 via-white to-blue-50">
      <div className="absolute right-[-12rem] top-[-14rem] h-[32rem] w-[32rem] rounded-full bg-blue-100/55 blur-3xl" />
      <div className="absolute bottom-[-16rem] left-[-12rem] h-[28rem] w-[28rem] rounded-full bg-ivory-200/70 blur-3xl" />

      <div className="container relative mx-auto grid gap-3 px-4 py-3 sm:py-5 lg:min-h-[calc(100svh-5rem)] lg:grid-cols-[minmax(0,1.42fr)_minmax(315px,0.72fr)] lg:items-start lg:gap-6 lg:py-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(330px,0.7fr)] xl:gap-8 xl:py-7 2xl:py-8">
        <div className="w-full min-w-0">
          <div className="mb-2 inline-flex items-center gap-3 rounded-full border border-blue-100 bg-white/85 px-3.5 py-1.5 shadow-sm backdrop-blur lg:mb-2.5">
            <span className="h-2 w-2 rounded-full bg-gold-500" />
            <span className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Gurgaon Society Intelligence</span>
          </div>

          <h1 className="max-w-[39rem] font-display text-[2.35rem] font-semibold leading-[0.96] tracking-[-0.025em] text-navy-950 sm:text-6xl lg:text-[2.65rem] xl:text-[3rem] 2xl:text-[3.2rem]">
            Find a society
            <span className="block">you will actually</span>
            <em className="block text-blue-700">love living in.</em>
          </h1>

          <p className="mt-2 max-w-[41rem] text-[15px] leading-6 text-navy-500 sm:text-lg lg:max-w-[35rem] lg:text-[0.95rem] lg:leading-6 xl:text-base xl:leading-7">
            Verified scores on security, maintenance, amenities and connectivity, before you sign a lease or buy a home.
          </p>

          <div className="mt-3 w-full rounded-[1.25rem] border border-blue-100 bg-white/92 p-2 shadow-premium backdrop-blur lg:max-w-[60rem]">
            <div className="mb-1.5 grid grid-cols-4 gap-1 px-1 pt-1 sm:flex">
              {searchModes.map((item) => (
                <button
                  key={item}
                  onClick={() => setMode(item)}
                  className={`rounded-2xl px-2 py-1.5 text-[13px] sm:px-3.5 sm:text-sm font-black transition ${
                    mode === item ? 'bg-blue-700 text-white shadow-sm' : 'text-navy-400 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 rounded-[1.15rem] bg-white px-3 py-2 lg:flex-row lg:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Search className="h-5 w-5 shrink-0 text-blue-500" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
                  placeholder="Search society, sector or landmark..."
                  className="h-11 min-w-0 flex-1 border-0 bg-transparent text-base font-semibold text-navy-950 outline-none placeholder:text-navy-300"
                />
              </div>

              <Button
                onClick={handleSearch}
                className="h-11 w-full rounded-full bg-blue-700 px-6 text-base font-black text-white shadow-lg shadow-blue-700/20 hover:bg-blue-800 lg:w-auto lg:min-w-[10.5rem]"
              >
                Search Societies
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <p className="px-4 pb-1 pt-0 text-xs font-semibold text-navy-400 xl:text-sm">
              Search by society, sector, road or landmark.
            </p>
          </div>

          <div className="mt-3 block lg:flex lg:flex-nowrap lg:items-center lg:gap-2 lg:overflow-hidden">
            <span className="mb-2 block shrink-0 text-sm font-semibold text-navy-400 lg:mb-0 lg:mr-1">Popular searches:</span>
            <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-wrap lg:gap-2">
            {popularSearches.map((item, index) => (
              <button
                key={item}
                onClick={() => handlePopularSearch(item)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-blue-100 bg-white/75 px-3 py-1.5 text-xs font-bold text-navy-500 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50 hover:text-blue-700 xl:text-sm"
              >
                {index === 3 ? <Sparkles className="h-3.5 w-3.5 text-blue-500" /> : <MapPin className="h-3.5 w-3.5 text-blue-500" />}
                {item}
              </button>
            ))}
            </div>
          </div>
        </div>

        <div className="hidden min-w-0 justify-self-end lg:block lg:pt-1">
          <AIAdvisorChatBox />
        </div>
      </div>
    </section>
  );
}
