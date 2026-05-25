import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeIndianRupee, BarChart3, Building2, CheckCircle2, HeartHandshake, Home, KeyRound, MapPin, School, Shield, Sparkles, Star, TrendingUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HeroSearch } from '@/components/home/HeroSearch';

const societies = [
  { name: 'DLF The Aralias', slug: 'dlf-the-aralias', area: 'Golf Course Road', score: '9.2', rent: '₹3.5L+', buy: '₹25Cr+', image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&h=650&fit=crop', tags: ['Ultra luxury', 'Golf living'] },
  { name: 'DLF Park Place', slug: 'dlf-park-place', area: 'Sector 54', score: '9.1', rent: '₹85K+', buy: '₹5.5Cr+', image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&h=650&fit=crop', tags: ['Family', 'Metro access'] },
  { name: 'DLF The Crest', slug: 'dlf-the-crest', area: 'Sector 54', score: '9.0', rent: '₹1.2L+', buy: '₹8Cr+', image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=900&h=650&fit=crop', tags: ['Luxury', 'High demand'] },
  { name: 'M3M Golf Estate', slug: 'm3m-golf-estate', area: 'Sector 65', score: '8.6', rent: '₹70K+', buy: '₹4Cr+', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&h=650&fit=crop', tags: ['Golf course', 'New Gurgaon'] },
];

const lifestyles = [
  { icon: Users, title: 'Family Friendly', text: 'Societies with schools, parks, security and stable resident mix.' },
  { icon: Sparkles, title: 'Luxury Living', text: 'Premium towers, clubhouses, concierge-style amenities and elite addresses.' },
  { icon: MapPin, title: 'Near Office Hubs', text: 'CyberHub, Golf Course Road, Horizon Center and Rapid Metro access.' },
  { icon: HeartHandshake, title: 'Pet Friendly', text: 'Societies with better pet policies, open areas and practical daily living.' },
];

const intelligence = [
  { icon: Shield, label: 'Security', value: '20%' },
  { icon: CheckCircle2, label: 'Maintenance', value: '20%' },
  { icon: Star, label: 'Amenities', value: '15%' },
  { icon: MapPin, label: 'Connectivity', value: '15%' },
  { icon: School, label: 'Family fit', value: '10%' },
  { icon: TrendingUp, label: 'Demand', value: '20%' },
];

export function HomePage() {
  useEffect(() => window.scrollTo(0, 0), []);

  return (
    <div className="min-h-screen bg-ivory-100">
      <HeroSearch />

      <section className="py-10 bg-white border-b border-navy-100">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['150+', 'Verified Societies'],
              ['5,000+', 'Homes tracked'],
              ['Rent + Buy + Sell', 'One society profile'],
              ['Gurgaon First', 'Bangalore next'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl bg-ivory-100 p-5 text-center border border-navy-100">
                <p className="text-2xl font-display font-bold text-navy-900">{value}</p>
                <p className="text-sm text-navy-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-ivory-100">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div>
              <Badge className="mb-4 bg-gold-100 text-gold-700 border-gold-200">Society-first marketplace</Badge>
              <h2 className="text-3xl md:text-5xl font-display font-bold text-navy-900 tracking-tight">Start with the society, not the listing.</h2>
              <p className="text-lg text-navy-500 mt-4 max-w-2xl">Each society becomes a decision page: lifestyle, rent range, resale range, demand, reviews and available inventory.</p>
            </div>
            <Link to="/search?tab=societies">
              <Button variant="outline" className="rounded-full border-navy-200 text-navy-700 hover:bg-white">Explore Societies <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {societies.map((society) => (
              <Link key={society.slug} to={`/society/${society.slug}`} className="group overflow-hidden rounded-[2rem] bg-white border border-navy-100 shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="relative h-64 overflow-hidden">
                  <img src={society.image} alt={society.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/20 to-transparent" />
                  <div className="absolute top-4 right-4 rounded-full bg-white/95 px-3 py-1 text-sm font-bold text-navy-900">Score {society.score}</div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-sm text-gold-300 mb-1">{society.area}</p>
                    <h3 className="text-2xl font-display font-bold text-white">{society.name}</h3>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-2xl bg-ivory-100 p-3"><p className="text-xs text-navy-400">Rent from</p><p className="font-bold text-navy-900">{society.rent}</p></div>
                    <div className="rounded-2xl bg-ivory-100 p-3"><p className="text-xs text-navy-400">Buy from</p><p className="font-bold text-navy-900">{society.buy}</p></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {society.tags.map((tag) => <span key={tag} className="text-xs rounded-full bg-navy-50 text-navy-600 px-2.5 py-1">{tag}</span>)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <Badge className="mb-4 bg-navy-100 text-navy-700 border-navy-200">Rent • Buy • Sell</Badge>
              <h2 className="text-3xl md:text-5xl font-display font-bold text-navy-900 tracking-tight">One society profile. Three transaction flows.</h2>
              <p className="text-lg text-navy-500 mt-4">Users can understand DLF Park Place once, then switch between rentals, resale inventory and owner listing flows without losing context.</p>
              <div className="grid sm:grid-cols-3 gap-4 mt-8">
                {[
                  { icon: KeyRound, title: 'Rent', text: 'Verified homes, move-in dates, tenant fit.' },
                  { icon: Home, title: 'Buy', text: 'Resale price, appreciation and yield.' },
                  { icon: BadgeIndianRupee, title: 'Sell', text: 'Owner listing, AI description and leads.' },
                ].map((item) => {
                  const Icon = item.icon;
                  return <div key={item.title} className="rounded-2xl border border-navy-100 bg-ivory-100 p-5"><Icon className="w-6 h-6 text-gold-600 mb-3" /><h3 className="font-bold text-navy-900">{item.title}</h3><p className="text-sm text-navy-500 mt-1">{item.text}</p></div>;
                })}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/search?tab=rent"><Button className="rounded-full bg-navy-700 hover:bg-navy-800">Find Rentals</Button></Link>
                <Link to="/search?tab=buy"><Button variant="outline" className="rounded-full">Explore Buy</Button></Link>
                <Link to="/sell"><Button variant="outline" className="rounded-full border-gold-300 text-navy-900">List to Sell/Rent</Button></Link>
              </div>
            </div>
            <div className="rounded-[2rem] bg-navy-900 p-6 md:p-8 text-white shadow-2xl">
              <div className="flex items-center justify-between mb-8"><div><p className="text-gold-300 text-sm">Society intelligence</p><h3 className="text-3xl font-display font-bold">DLF Park Place</h3></div><div className="text-right"><p className="text-sm text-navy-200">Overall</p><p className="text-4xl font-bold text-gold-400">9.1</p></div></div>
              <div className="space-y-4">
                {intelligence.map((item) => { const Icon = item.icon; return <div key={item.label} className="flex items-center gap-4 rounded-2xl bg-white/10 p-4"><Icon className="w-5 h-5 text-gold-300" /><div className="flex-1"><div className="flex justify-between text-sm mb-2"><span>{item.label}</span><span>{item.value}</span></div><div className="h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-gold-400" style={{ width: item.label === 'Demand' ? '90%' : '84%' }} /></div></div></div>; })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-ivory-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-white text-navy-700 border-navy-200">Explore by lifestyle</Badge>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-navy-900">People choose societies for daily life.</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {lifestyles.map((item) => { const Icon = item.icon; return <Link key={item.title} to={`/search?tab=societies&q=${encodeURIComponent(item.title)}`} className="rounded-[2rem] bg-white p-6 border border-navy-100 hover:shadow-xl transition-all"><Icon className="w-8 h-8 text-gold-600 mb-5" /><h3 className="text-xl font-display font-bold text-navy-900">{item.title}</h3><p className="text-sm text-navy-500 mt-2">{item.text}</p></Link>; })}
          </div>
        </div>
      </section>

      <section className="py-20 bg-navy-950 text-white">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <BarChart3 className="w-12 h-12 text-gold-400 mx-auto mb-5" />
          <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight">Market intelligence that portals usually hide.</h2>
          <p className="text-lg text-navy-100 mt-4 mb-8">Rent trends, resale movement, demand score, rental yield and society comparison become the reason users return.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/insights"><Button className="rounded-full bg-gold-500 hover:bg-gold-600 text-navy-950 font-semibold">View Insights</Button></Link>
            <Link to="/ai-advisor"><Button variant="outline" className="rounded-full border-white/20 text-white hover:bg-white/10">Ask AI Advisor</Button></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
