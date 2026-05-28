import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Building2, CheckCircle2, Grid3X3, Home, List, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchPublicSocieties, getPublicProperties, propertyImage, propertyUrl, searchableText, societyImage, formatPublicLocation } from '@/lib/publicData';
import { cn } from '@/lib/utils';

const tabs = [
  { key: 'societies', label: 'Societies', icon: Building2 },
  { key: 'rent', label: 'Rent', icon: Home },
  { key: 'buy', label: 'Buy', icon: Home },
];

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'societies';
  const initialQuery = searchParams.get('q') || '';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [query, setQuery] = useState(initialQuery);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [societies, setSocieties] = useState<any[]>([]);
  const properties = useMemo(() => getPublicProperties(), []);

  useEffect(() => {
    fetchPublicSocieties()
      .then(setSocieties)
      .catch((error) => console.error('Societies fetch failed:', error));
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
          ? property.listingType === 'Buy / Resale' || property.listingType === 'Sell Listing' || property.listingType === 'Builder Floor'
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

  return (
    <div className="min-h-screen bg-ivory-100">
      <section className="bg-white border-b border-navy-100">
        <div className="container mx-auto px-4 py-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-navy-600">Admin powered search</p>
          <h1 className="mt-3 text-4xl md:text-6xl font-extrabold text-navy-900 tracking-tight">Search societies and live inventory.</h1>
          <p className="mt-4 max-w-2xl text-lg text-navy-500">Societies and properties published in admin now appear here automatically through local admin data.</p>

          <div className="mt-8 rounded-[2rem] bg-white border border-navy-100 shadow-soft p-4">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-navy-400" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitSearch()} placeholder="Search society, locality, budget, BHK or lifestyle..." className="h-14 rounded-full border-navy-100 pl-12 text-base" />
              </div>
              <Button onClick={submitSearch} className="h-14 rounded-full bg-navy-600 px-8 hover:bg-navy-700">Search</Button>
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
                <Button variant="outline" size="sm" className="rounded-full"><SlidersHorizontal className="mr-2 h-4 w-4" /> Filters</Button>
                <Button variant="outline" size="sm" onClick={() => setViewMode('grid')} className={cn('rounded-full', viewMode === 'grid' && 'bg-navy-50')}><Grid3X3 className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => setViewMode('list')} className={cn('rounded-full', viewMode === 'list' && 'bg-navy-50')}><List className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        {activeTab === 'societies' ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSocieties.map((society) => (
              <Link key={society.id} to={`/society/${society.slug}`} className="group overflow-hidden rounded-[2rem] border border-navy-100 bg-white shadow-sm hover:shadow-apple transition-all">
                <div className="relative h-64 overflow-hidden bg-navy-50"><img src={societyImage(society)} alt={society.name} className="h-full w-full object-cover group-hover:scale-[1.03] transition" /><span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-sm font-semibold text-navy-900">Score {society.score || '8.5'}</span></div>
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-navy-900">{society.name}</h2>
                  <p className="mt-2 flex items-center gap-2 text-navy-500"><MapPin className="h-4 w-4" /> {formatPublicLocation(society)}</p>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div><p className="text-navy-400">Rent</p><p className="font-semibold text-navy-900">{society.rentRange || 'On request'}</p></div><div><p className="text-navy-400">Buy</p><p className="font-semibold text-navy-900">{society.buyRange || 'On request'}</p></div></div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className={cn(viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4')}>
            {filteredProperties.map((property) => (
              <Link key={property.id} to={propertyUrl(property)} className={cn('group overflow-hidden border border-navy-100 bg-white shadow-sm hover:shadow-apple transition-all', viewMode === 'grid' ? 'rounded-[2rem]' : 'rounded-[1.5rem] grid md:grid-cols-[260px_1fr]')}>
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
      </section>
    </div>
  );
}
