import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Bot, Building2, CheckCircle2, Grid3X3, Home, List, MapPin, MapPinned, Search, Shield, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchPublicProperties, fetchPublicSocieties, propertyImage, propertyUrl, searchableText, societyImage, formatPublicLocation } from '@/lib/publicData';
import { cn } from '@/lib/utils';

const tabs = [
  { key: 'societies', label: 'Societies', icon: Building2 },
  { key: 'rent', label: 'Rent', icon: Home },
  { key: 'buy', label: 'Buy', icon: Home },
];

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'societies';
  const initialQuery = searchParams.get('q') || searchParams.get('locality') || '';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [query, setQuery] = useState(initialQuery);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showMap, setShowMap] = useState(false);

  const [societies, setSocieties] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);

  useEffect(() => {
    fetchPublicSocieties()
      .then(setSocieties)
      .catch((error) => console.error('Societies fetch failed:', error));
    fetchPublicProperties()
      .then(setProperties)
      .catch((error) => console.error('Properties fetch failed:', error));
  }, []);

  const filteredSocieties = useMemo(() => {
    const q = query.toLowerCase().trim();
    return societies.filter((society) => !q || searchableText(society.name, society.builder, society.sector, society.locality, society.amenities.join(' '), society.nearbyOfficeHubs).includes(q));
  }, [query, societies]);

  const filteredProperties = useMemo(() => {
    const q = query.toLowerCase().trim();
    return properties.filter((property) => {
      const typeMatch = activeTab === 'rent'
        ? property.listingType === 'Rent'
        : activeTab === 'buy'
          ? property.listingType === 'Sale' || property.listingType === 'Buy / Resale' || property.listingType === 'Sell Listing' || property.listingType === 'Builder Floor'
          : true;
      const queryMatch = !q || searchableText(property.title, property.society, property.locality, property.price, property.listingType, property.amenities.join(' ')).includes(q);
      return typeMatch && queryMatch;
    });
  }, [activeTab, properties, query]);

  const updateTab = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    if (query) params.set('q', query);
    setSearchParams(params);
  };

  const submitSearch = () => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', activeTab);
    if (query.trim()) params.set('q', query.trim()); else params.delete('q');
    setSearchParams(params);
  };

  const visibleCount = activeTab === 'societies' ? filteredSocieties.length : filteredProperties.length;
  const selectedSociety = filteredSocieties[0] || societies[0];
  const recommendedSocieties = filteredSocieties.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <section className="bg-white border-b border-navy-100">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Search results</p>
              <h1 className="mt-3 text-4xl font-extrabold text-navy-900 md:text-5xl">Find verified societies and homes.</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-navy-500">Filter inventory, compare societies, open map intelligence, or ask AI to build a shortlist from the same results.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="rounded-full border-navy-200 bg-white text-navy-700">
                <Link to="/compare">Compare</Link>
              </Button>
              <Button asChild className="rounded-full bg-blue-600 hover:bg-blue-700">
                <Link to="/ai-advisor">AI Advisor <Sparkles className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>

          <div className="mt-7 rounded-[1.5rem] bg-white border border-navy-100 shadow-soft p-4">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-navy-400" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitSearch()} placeholder="Search society, locality, builder, budget, BHK or lifestyle..." className="h-14 rounded-full border-navy-100 pl-12 text-base" />
              </div>
              <Button onClick={submitSearch} className="h-14 rounded-full bg-blue-600 px-8 hover:bg-blue-700">Search</Button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button key={tab.key} onClick={() => updateTab(tab.key)} className={cn('inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition', activeTab === tab.key ? 'bg-navy-600 text-white' : 'bg-ivory-200 text-navy-600 hover:bg-navy-100')}>
                    <Icon className="h-4 w-4" /> {tab.label}
                  </button>
                );
              })}
              <div className="ml-auto hidden md:flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => setShowMap((value) => !value)}><MapPinned className="mr-2 h-4 w-4" /> {showMap ? 'Hide map' : 'Map'}</Button>
                <Button variant="outline" size="sm" className="rounded-full"><SlidersHorizontal className="mr-2 h-4 w-4" /> Filters</Button>
                <Button variant="outline" size="sm" onClick={() => setViewMode('grid')} className={cn('rounded-full', viewMode === 'grid' && 'bg-navy-50')}><Grid3X3 className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => setViewMode('list')} className={cn('rounded-full', viewMode === 'list' && 'bg-navy-50')}><List className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[1.5rem] border border-navy-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-navy-900">Filters</h2>
                <SlidersHorizontal className="h-4 w-4 text-navy-400" />
              </div>
              <div className="mt-5 space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-navy-400">Intent</p>
                  <div className="mt-3 grid gap-2">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button key={tab.key} onClick={() => updateTab(tab.key)} className={cn('flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-semibold transition', activeTab === tab.key ? 'bg-blue-50 text-blue-700' : 'bg-ivory-200 text-navy-600 hover:bg-navy-50')}>
                          <span className="flex items-center gap-2"><Icon className="h-4 w-4" /> {tab.label}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-navy-400">Popular locality</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {['Sohna Road', 'Golf Course Road', 'Dwarka Expressway', 'Sector 54', 'Sector 70'].map((item) => (
                      <button key={item} onClick={() => setQuery(item)} className="rounded-full border border-navy-100 bg-white px-3 py-2 text-xs font-semibold text-navy-600 hover:border-blue-200 hover:bg-blue-50">
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl bg-[#EFF6FF] p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-blue-700"><Shield className="h-4 w-4" /> Public-safe data</div>
                  <p className="mt-2 text-sm leading-6 text-navy-500">Only live properties and published society profiles are shown here.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-navy-100 bg-navy-900 p-5 text-white shadow-sm">
              <Bot className="h-5 w-5 text-blue-200" />
              <h3 className="mt-3 text-lg font-bold">Need a shortcut?</h3>
              <p className="mt-2 text-sm leading-6 text-navy-200">Let AI turn this search into a ranked shortlist by budget, commute and lifestyle.</p>
              <Button asChild className="mt-4 w-full rounded-full bg-white text-navy-900 hover:bg-navy-100">
                <Link to={`/ai-advisor?q=${encodeURIComponent(query)}`}>Open AI Advisor</Link>
              </Button>
            </div>
          </aside>

          <div className="min-w-0 space-y-6">
            <div className="flex flex-col gap-3 rounded-[1.5rem] border border-navy-100 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-navy-500">{visibleCount} result{visibleCount === 1 ? '' : 's'} found</p>
                <h2 className="text-xl font-bold text-navy-900">{query ? `Showing matches for "${query}"` : 'Explore published SocietyFlats inventory'}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="rounded-full" onClick={() => setShowMap((value) => !value)}><MapPinned className="mr-2 h-4 w-4" /> {showMap ? 'Hide map' : 'Map view'}</Button>
                <Button asChild variant="outline" className="rounded-full"><Link to="/compare">Compare</Link></Button>
                <Button asChild className="rounded-full bg-blue-600 hover:bg-blue-700"><Link to="/recommendations">Smart match</Link></Button>
              </div>
            </div>

            {showMap ? (
              <div className="grid gap-4 rounded-[1.5rem] border border-navy-100 bg-white p-4 shadow-sm lg:grid-cols-[1fr_300px]">
                <div className="min-h-[320px] rounded-[1.25rem] bg-[radial-gradient(circle_at_22%_25%,rgba(37,99,235,0.22),transparent_24%),linear-gradient(135deg,#e8f1ff,#f8fafc)] p-5">
                  <div className="flex h-full flex-col justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Map intelligence</p>
                      <h3 className="mt-2 text-2xl font-bold text-navy-900">{selectedSociety?.name || 'Select a society'}</h3>
                      <p className="mt-1 text-navy-500">{selectedSociety ? formatPublicLocation(selectedSociety) : 'Search results will anchor this map panel.'}</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {recommendedSocieties.map((society) => (
                        <Link key={society.id} to={`/society/${society.slug}`} className="rounded-2xl bg-white/90 p-3 shadow-sm">
                          <p className="text-sm font-bold text-navy-900">{society.name}</p>
                          <p className="mt-1 text-xs text-navy-500">{formatPublicLocation(society)}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="rounded-[1.25rem] bg-ivory-200 p-4">
                  <h3 className="font-bold text-navy-900">Nearby context</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="rounded-2xl bg-white p-3"><p className="text-navy-400">Metro</p><p className="font-semibold text-navy-800">{selectedSociety?.nearbyMetro || 'Needs verification'}</p></div>
                    <div className="rounded-2xl bg-white p-3"><p className="text-navy-400">Office hubs</p><p className="font-semibold text-navy-800">{selectedSociety?.nearbyOfficeHubs || 'Needs verification'}</p></div>
                    <div className="rounded-2xl bg-white p-3"><p className="text-navy-400">Map pin</p><p className="font-semibold text-navy-800">{selectedSociety?.latitude && selectedSociety?.longitude ? 'Available' : 'Admin review pending'}</p></div>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'societies' ? (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredSocieties.map((society) => (
              <Link key={society.id} to={`/society/${society.slug}`} className="group overflow-hidden rounded-[1.5rem] border border-navy-100 bg-white shadow-sm hover:shadow-apple transition-all">
                <div className="relative h-56 overflow-hidden bg-navy-50"><img src={societyImage(society)} alt={society.name} className="h-full w-full object-cover group-hover:scale-[1.03] transition" /><span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-sm font-semibold text-navy-900">Score {society.score || 'New'}</span></div>
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-navy-900">{society.name}</h2>
                  <p className="mt-2 flex items-center gap-2 text-navy-500"><MapPin className="h-4 w-4" /> {formatPublicLocation(society)}</p>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div><p className="text-navy-400">Rent</p><p className="font-semibold text-navy-900">{society.rentRange || 'On request'}</p></div><div><p className="text-navy-400">Buy</p><p className="font-semibold text-navy-900">{society.buyRange || 'On request'}</p></div></div>
                  <div className="mt-5 flex items-center justify-between border-t border-navy-100 pt-4 text-sm font-semibold text-blue-700">
                    View society <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className={cn(viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4')}>
            {filteredProperties.map((property) => (
              <Link key={property.id} to={propertyUrl(property)} className={cn('group overflow-hidden border border-navy-100 bg-white shadow-sm hover:shadow-apple transition-all', viewMode === 'grid' ? 'rounded-[1.5rem]' : 'rounded-[1.5rem] grid md:grid-cols-[260px_1fr]')}>
                <div className={cn('overflow-hidden bg-navy-50', viewMode === 'grid' ? 'h-60' : 'h-56 md:h-full')}><img src={propertyImage(property)} alt={property.title} className="h-full w-full object-cover group-hover:scale-[1.03] transition" /></div>
                <div className="p-6">
                  <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{property.listingType}</span>{property.verified ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Verified</span> : null}</div>
                  <h2 className="mt-4 text-2xl font-bold text-navy-900">{property.title}</h2>
                  <p className="mt-2 text-navy-500">{property.society} • {property.locality}</p>
                  <div className="mt-6 flex items-end justify-between"><div><p className="text-sm text-navy-400">Price</p><p className="text-xl font-bold text-navy-900">{property.price || 'On request'}</p></div><div className="text-right text-sm text-navy-500">{property.bedrooms || '-'} BHK<br />{property.areaSqft || '-'} sq.ft</div></div>
                </div>
              </Link>
            ))}
          </div>
        )}
          </div>
        </div>
      </section>
    </div>
  );
}
