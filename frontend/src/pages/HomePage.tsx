import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeIndianRupee, BarChart3, Building2, CheckCircle2, HeartHandshake, Home, KeyRound, MapPin, School, Shield, Sparkles, Star, TrendingUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeroSearch } from '@/components/home/HeroSearch';

const societies = [
  { name: 'DLF Park Place', slug: 'dlf-park-place', area: 'Sector 54, Gurgaon', score: '9.2', rent: '₹60K - ₹1.2L', buy: '₹6.5Cr - ₹9Cr', image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&h=650&fit=crop', tags: ['Family', 'Metro access'] },
  { name: 'DLF The Crest', slug: 'dlf-the-crest', area: 'Sector 54, Gurgaon', score: '9.1', rent: '₹95K - ₹1.8L', buy: '₹8Cr - ₹14Cr', image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=900&h=650&fit=crop', tags: ['Luxury', 'High demand'] },
  { name: 'The Aralias', slug: 'dlf-the-aralias', area: 'Golf Course Road', score: '9.0', rent: '₹3.5L+', buy: '₹25Cr+', image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&h=650&fit=crop', tags: ['Ultra luxury', 'Golf living'] },
  { name: 'M3M Golf Estate', slug: 'm3m-golf-estate', area: 'Sector 65, Gurgaon', score: '8.8', rent: '₹70K - ₹1.4L', buy: '₹4Cr - ₹7Cr', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&h=650&fit=crop', tags: ['Golf course', 'New Gurgaon'] },
];

const lifestyles = [
  { icon: Users, title: 'Family Friendly', text: 'Schools, parks, security and stable resident mix.', image: 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=700&h=500&fit=crop' },
  { icon: Sparkles, title: 'Luxury Living', text: 'Premium towers, clubhouses and elite addresses.', image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=700&h=500&fit=crop' },
  { icon: MapPin, title: 'Near Office Hubs', text: 'CyberHub, Horizon Center and Rapid Metro access.', image: 'https://images.unsplash.com/photo-1494526585095-c41746248156?w=700&h=500&fit=crop' },
  { icon: HeartHandshake, title: 'Pet Friendly', text: 'Open areas, better policies and practical daily living.', image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=700&h=500&fit=crop' },
];

const intelligence = [
  { icon: Shield, label: 'Security', value: '9.4' },
  { icon: CheckCircle2, label: 'Maintenance', value: '9.0' },
  { icon: Star, label: 'Amenities', value: '8.8' },
  { icon: MapPin, label: 'Connectivity', value: '9.2' },
  { icon: School, label: 'Family fit', value: '8.9' },
  { icon: TrendingUp, label: 'Demand', value: '9.1' },
];

export function HomePage() {
  useEffect(() => window.scrollTo(0, 0), []);

  return (
    <div className="min-h-screen bg-white">
      <HeroSearch />

      <section className="bg-white py-8">
        <div className="container mx-auto px-4">
          <div className="rounded-[2rem] bg-white border border-navy-100 shadow-soft p-6 md:p-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              ['150+', 'Verified Societies', Building2],
              ['5,000+', 'Homes tracked', Home],
              ['2,500+', 'Resident Signals', Users],
              ['100%', 'No fake listing focus', Shield],
            ].map(([value, label, Icon]) => {
              const LucideIcon = Icon as typeof Building2;
              return (
                <div key={label as string} className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-navy-100 flex items-center justify-center shrink-0"><LucideIcon className="w-6 h-6 text-navy-600" /></div>
                  <div><p className="text-3xl font-bold text-navy-900">{value as string}</p><p className="text-sm text-navy-500">{label as string}</p></div>
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
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-navy-600 mb-3">Featured Societies</p>
              <h2 className="text-4xl md:text-6xl font-extrabold text-navy-900 tracking-tight">Top rated societies in Gurgaon.</h2>
              <p className="text-lg text-navy-500 mt-4 max-w-2xl">Clean, verified society pages for rent, buy and sell decisions — not cluttered listing pages.</p>
            </div>
            <Link to="/search?tab=societies"><Button variant="outline" className="rounded-full border-navy-200 text-navy-700 hover:bg-navy-50">View all societies <ArrowRight className="w-4 h-4 ml-2" /></Button></Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {societies.map((society) => (
              <Link key={society.slug} to={`/society/${society.slug}`} className="group overflow-hidden rounded-[2rem] bg-white border border-navy-100 shadow-sm hover:shadow-apple transition-all duration-300">
                <div className="relative h-56 overflow-hidden bg-navy-50">
                  <img src={society.image} alt={society.name} className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-950/35 to-transparent" />
                  <div className="absolute top-4 left-4 rounded-full bg-white/95 px-3 py-1 text-sm font-semibold text-navy-900 shadow-sm">Score {society.score}</div>
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-bold text-navy-900">{society.name}</h3>
                  <p className="text-sm text-navy-500 mt-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {society.area}</p>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-navy-400">Rent</p><p className="font-semibold text-navy-900">{society.rent}</p></div>
                    <div><p className="text-navy-400">Buy</p><p className="font-semibold text-navy-900">{society.buy}</p></div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">{society.tags.map((tag) => <span key={tag} className="text-xs rounded-full bg-navy-100 text-navy-600 px-2.5 py-1">{tag}</span>)}</div>
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
                <Link key={item.title} to={`/search?tab=societies&q=${encodeURIComponent(item.title)}`} className="group relative overflow-hidden rounded-[2rem] min-h-[270px] shadow-sm hover:shadow-apple transition-all">
                  <img src={item.image} alt={item.title} className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-950/78 via-navy-950/20 to-transparent" />
                  <div className="absolute bottom-0 p-6 text-white">
                    <Icon className="w-8 h-8 mb-4" />
                    <h3 className="text-2xl font-bold text-white">{item.title}</h3>
                    <p className="text-sm text-white/82 mt-2">{item.text}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
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
              <div className="mt-8 flex flex-wrap gap-3"><Link to="/search?tab=rent"><Button className="rounded-full bg-navy-600 hover:bg-navy-700">Find Rentals</Button></Link><Link to="/search?tab=buy"><Button variant="outline" className="rounded-full">Explore Buy</Button></Link><Link to="/sell"><Button variant="outline" className="rounded-full border-navy-200 text-navy-700">List Property</Button></Link></div>
            </div>
            <div className="rounded-[2.5rem] bg-ivory-200 border border-navy-100 p-6 md:p-8 shadow-soft">
              <div className="flex items-center justify-between mb-8"><div><p className="text-navy-500 text-sm">Society intelligence</p><h3 className="text-3xl font-bold text-navy-900">DLF Park Place</h3></div><div className="text-right"><p className="text-sm text-navy-400">Overall</p><p className="text-5xl font-extrabold text-navy-600">9.1</p></div></div>
              <div className="grid sm:grid-cols-2 gap-4">{intelligence.map((item) => { const Icon = item.icon; return <div key={item.label} className="rounded-2xl bg-white border border-navy-100 p-4 flex items-center gap-4"><div className="w-11 h-11 rounded-2xl bg-navy-100 flex items-center justify-center"><Icon className="w-5 h-5 text-navy-600" /></div><div><p className="text-sm text-navy-500">{item.label}</p><p className="text-xl font-bold text-navy-900">{item.value}</p></div></div>; })}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-navy-900 text-white">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <BarChart3 className="w-12 h-12 text-navy-300 mx-auto mb-5" />
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white">Market intelligence without the noise.</h2>
          <p className="text-lg text-navy-200 mt-5 mb-8">Rent trends, resale movement, demand score, rental yield and society comparison become the reason users return.</p>
          <div className="flex flex-wrap justify-center gap-3"><Link to="/insights"><Button className="rounded-full bg-white hover:bg-navy-100 text-navy-900 font-semibold">View Insights</Button></Link><Link to="/ai-advisor"><Button variant="outline" className="rounded-full border-white/20 text-white hover:bg-white/10">Ask AI Advisor</Button></Link></div>
        </div>
      </section>
    </div>
  );
}
