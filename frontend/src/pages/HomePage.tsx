import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeIndianRupee, Building2, CheckCircle2, HeartHandshake, Home, KeyRound, MapPin, Shield, Sparkles, Star, TrendingUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeroSearch } from '@/components/home/HeroSearch';
import { fetchPublicProperties, fetchPublicSocieties, propertyImage, propertyUrl, societyImage, formatPublicLocation } from '@/lib/publicData';

const lifestyles = [
  { icon: Users, title: 'Family Friendly', text: 'Schools, parks, security and stable resident mix.' },
  { icon: Sparkles, title: 'Luxury Living', text: 'Premium towers, clubhouses and elite addresses.' },
  { icon: MapPin, title: 'Near Cyber Hub', text: 'Shorter office commute and stronger rental demand.' },
  { icon: HeartHandshake, title: 'Pet Friendly', text: 'Open areas, practical daily living and friendlier policies.' },
];

export function HomePage() {
  const [societies, setSocieties] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchPublicSocieties()
      .then((items) => setSocieties(items.slice(0, 4)))
      .catch((error) => console.error('Societies fetch failed:', error));
    fetchPublicProperties()
      .then((items) => setProperties(items.slice(0, 6)))
      .catch((error) => console.error('Properties fetch failed:', error));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <HeroSearch />

      <section className="bg-white py-8">
        <div className="container mx-auto px-4">
          <div className="rounded-[2rem] bg-white border border-navy-100 shadow-soft p-6 md:p-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              [`${societies.length}+`, 'Live Societies', Building2],
              [`${properties.length}+`, 'Live Homes', Home],
              ['Admin', 'Managed Inventory', Users],
              ['100%', 'Society-first data', Shield],
            ].map(([value, label, Icon]) => {
              const LucideIcon = Icon as typeof Building2;
              return (
                <div key={String(label)} className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-navy-100 flex items-center justify-center shrink-0"><LucideIcon className="w-6 h-6 text-navy-600" /></div>
                  <div><p className="text-3xl font-bold text-navy-900">{String(value)}</p><p className="text-sm text-navy-500">{String(label)}</p></div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-navy-600 mb-3">From Admin Inventory</p>
              <h2 className="text-4xl md:text-6xl font-extrabold text-navy-900 tracking-tight">Featured societies in Gurgaon.</h2>
              <p className="text-lg text-navy-500 mt-4 max-w-2xl">Society profiles now come from your admin panel, including score, media, SEO and nearby intelligence.</p>
            </div>
            <Link to="/search?tab=societies"><Button variant="outline" className="rounded-full border-navy-200 text-navy-700 hover:bg-navy-50">View all societies <ArrowRight className="w-4 h-4 ml-2" /></Button></Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {societies.map((society) => (
              <Link key={society.id} to={`/society/${society.slug}`} className="group overflow-hidden rounded-[2rem] bg-white border border-navy-100 shadow-sm hover:shadow-apple transition-all duration-300">
                <div className="relative h-56 overflow-hidden bg-navy-50">
                  <img src={societyImage(society)} alt={society.name} className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-950/35 to-transparent" />
                  <div className="absolute top-4 left-4 rounded-full bg-white/95 px-3 py-1 text-sm font-semibold text-navy-900 shadow-sm">Score {society.score || '8.5'}</div>
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-bold text-navy-900">{society.name}</h3>
                  <p className="text-sm text-navy-500 mt-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {formatPublicLocation(society)}</p>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-navy-400">Rent</p><p className="font-semibold text-navy-900">{society.rentRange || 'On request'}</p></div>
                    <div><p className="text-navy-400">Buy</p><p className="font-semibold text-navy-900">{society.buyRange || 'On request'}</p></div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">{society.amenities.slice(0, 2).map((tag) => <span key={tag} className="text-xs rounded-full bg-navy-100 text-navy-600 px-2.5 py-1">{tag}</span>)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-ivory-200">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-navy-600 mb-3">Explore by lifestyle</p>
            <h2 className="text-4xl md:text-6xl font-extrabold text-navy-900">Find the society that fits your day.</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {lifestyles.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.title} to={`/search?tab=societies&q=${encodeURIComponent(item.title)}`} className="group rounded-[2rem] min-h-[230px] border border-navy-100 bg-white p-7 shadow-sm hover:shadow-apple transition-all">
                  <Icon className="w-9 h-9 text-navy-600 mb-5" />
                  <h3 className="text-2xl font-bold text-navy-900">{item.title}</h3>
                  <p className="text-sm text-navy-500 mt-3 leading-relaxed">{item.text}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-navy-600 mb-3">Latest Inventory</p>
              <h2 className="text-4xl md:text-6xl font-extrabold text-navy-900 tracking-tight">Rent, buy and resale listings.</h2>
              <p className="text-lg text-navy-500 mt-4 max-w-2xl">Properties created in admin now appear on the public homepage and search pages.</p>
            </div>
            <Link to="/search?tab=rent"><Button className="rounded-full bg-navy-600 hover:bg-navy-700">Explore inventory <ArrowRight className="w-4 h-4 ml-2" /></Button></Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {properties.map((property) => (
              <Link key={property.id} to={propertyUrl(property)} className="group overflow-hidden rounded-[2rem] border border-navy-100 bg-white shadow-sm hover:shadow-apple transition-all">
                <div className="h-56 overflow-hidden bg-navy-50">
                  <img src={propertyImage(property)} alt={property.title} className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{property.listingType}</span>
                    {property.verified ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Verified</span> : null}
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-navy-900">{property.title}</h3>
                  <p className="mt-2 text-sm text-navy-500">{property.society} • {property.locality}</p>
                  <div className="mt-5 flex items-end justify-between">
                    <div><p className="text-sm text-navy-400">Price</p><p className="text-lg font-bold text-navy-900">{property.price || 'On request'}</p></div>
                    <div className="text-right text-sm text-navy-500">{property.bedrooms || '-'} BHK<br />{property.areaSqft || '-'} sq.ft</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-10 items-center rounded-[2.5rem] bg-ivory-200 border border-navy-100 p-8 md:p-12">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-navy-600 mb-3">Rent • Buy • Sell</p>
              <h2 className="text-4xl md:text-6xl font-extrabold text-navy-900 tracking-tight">One society profile. Three transaction flows.</h2>
              <p className="text-lg text-navy-500 mt-5 leading-relaxed">Understand a society once, then switch between rentals, resale inventory and owner listing flows without losing context.</p>
              <div className="grid sm:grid-cols-3 gap-4 mt-8">
                {[
                  { icon: KeyRound, title: 'Rent', text: 'Move-in dates and tenant fit.' },
                  { icon: Home, title: 'Buy', text: 'Price, appreciation and yield.' },
                  { icon: BadgeIndianRupee, title: 'Sell', text: 'Owner listing and qualified leads.' },
                ].map((item) => {
                  const Icon = item.icon;
                  return <div key={item.title} className="rounded-[1.5rem] border border-navy-100 bg-white p-5 shadow-sm"><Icon className="w-6 h-6 text-navy-600 mb-3" /><h3 className="font-bold text-navy-900">{item.title}</h3><p className="text-sm text-navy-500 mt-1">{item.text}</p></div>;
                })}
              </div>
            </div>
            <div className="rounded-[2rem] bg-white p-6 shadow-sm border border-navy-100">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Star, label: 'Top societies', value: societies.length },
                  { icon: TrendingUp, label: 'Live inventory', value: properties.length },
                  { icon: Shield, label: 'Verified homes', value: properties.filter((p) => p.verified).length },
                  { icon: Building2, label: 'Featured societies', value: societies.filter((s) => s.featured).length },
                ].map((item) => {
                  const Icon = item.icon;
                  return <div key={item.label} className="rounded-[1.5rem] bg-ivory-200 p-5"><Icon className="h-5 w-5 text-navy-600" /><p className="mt-4 text-3xl font-bold text-navy-900">{item.value}</p><p className="text-sm text-navy-500">{item.label}</p></div>;
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
