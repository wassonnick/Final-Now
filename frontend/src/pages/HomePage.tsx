import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, Shield, Star, MapPin, Building2, Sparkles, BarChart3, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HeroSearch } from '@/components/home/HeroSearch';
import { SocietyCard } from '@/components/society/SocietyCard';
import { useAppStore } from '@/store';

// Mock featured societies data with real market data
const featuredSocieties = [
  {
    id: 's1',
    name: 'DLF The Aralias',
    slug: 'dlf-the-aralias',
    builder_id: 'b1',
    locality_id: 'l2',
    address: 'Golf Course Road, Sector 42, Gurgaon',
    total_towers: 5,
    total_units: 250,
    possession_year: 2008,
    construction_status: 'ready',
    security_score: 95.0,
    maintenance_score: 92.0,
    amenities_score: 96.0,
    connectivity_score: 94.0,
    family_friendly_score: 90.0,
    pet_friendly_score: 75.0,
    construction_quality_score: 95.0,
    rental_demand_score: 88.0,
    overall_score: 91.6,
    security_features: { gated: true, cctv: true, security_24_7: true, intercom: true, access_control: true, security_personnel: true },
    amenities: { swimming_pool: true, gym: true, club_house: true, tennis_court: true, basketball_court: true, jogging_track: true, kids_play_area: true, senior_citizen_area: true, party_hall: true, library: true, spa: true },
    nearby_facilities: { metro_station_km: 2.8, hospital_km: 1.5, school_km: 2.0, mall_km: 1.2, market_km: 0.8 },
    cover_image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=500&fit=crop',
    gallery_images: [],
    is_verified: true,
    featured: true,
    status: 'active',
    view_count: 15420,
    review_count: 128,
    avg_rating: 4.8,
    builder: { id: 'b1', name: 'DLF Limited', slug: 'dlf-limited', logo_url: '', reputation_score: 4.5, total_projects: 30, rera_registered: true },
    locality: { id: 'l2', name: 'Golf Course Road', slug: 'golf-course-road', city: 'Gurgaon', avg_rent_1bhk: 28000, avg_rent_2bhk: 52000, avg_rent_3bhk: 75000, avg_rent_4bhk: 120000, price_per_sqft: 25000, metro_distance_km: 2.8, connectivity_score: 9.5, safety_score: 9.3, lifestyle_score: 9.9 }
  },
  {
    id: 's2',
    name: 'DLF Park Place',
    slug: 'dlf-park-place',
    builder_id: 'b1',
    locality_id: 'l2',
    address: 'Golf Course Road, Sector 54, Gurgaon',
    total_towers: 8,
    total_units: 450,
    possession_year: 2012,
    construction_status: 'ready',
    security_score: 93.0,
    maintenance_score: 90.0,
    amenities_score: 94.0,
    connectivity_score: 95.0,
    family_friendly_score: 92.0,
    pet_friendly_score: 80.0,
    construction_quality_score: 93.0,
    rental_demand_score: 90.0,
    overall_score: 90.9,
    security_features: { gated: true, cctv: true, security_24_7: true, intercom: true, access_control: true },
    amenities: { swimming_pool: true, gym: true, club_house: true, squash_court: true, badminton_court: true, jogging_track: true, kids_play_area: true, theatre: true, business_center: true },
    nearby_facilities: { metro_station_km: 2.5, hospital_km: 1.8, school_km: 1.5, mall_km: 1.0, market_km: 0.5 },
    cover_image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=500&fit=crop',
    gallery_images: [],
    is_verified: true,
    featured: true,
    status: 'active',
    view_count: 12850,
    review_count: 95,
    avg_rating: 4.7,
    builder: { id: 'b1', name: 'DLF Limited', slug: 'dlf-limited', logo_url: '', reputation_score: 4.5, total_projects: 30, rera_registered: true },
    locality: { id: 'l2', name: 'Golf Course Road', slug: 'golf-course-road', city: 'Gurgaon', avg_rent_1bhk: 28000, avg_rent_2bhk: 52000, avg_rent_3bhk: 75000, avg_rent_4bhk: 120000, price_per_sqft: 25000, metro_distance_km: 2.8, connectivity_score: 9.5, safety_score: 9.3, lifestyle_score: 9.9 }
  },
  {
    id: 's8',
    name: 'SS The Hibiscus',
    slug: 'ss-the-hibiscus',
    builder_id: 'b8',
    locality_id: 'l2',
    address: 'Golf Course Road, Sector 50, Gurgaon',
    total_towers: 6,
    total_units: 300,
    possession_year: 2011,
    construction_status: 'ready',
    security_score: 90.0,
    maintenance_score: 88.0,
    amenities_score: 90.0,
    connectivity_score: 92.0,
    family_friendly_score: 88.0,
    pet_friendly_score: 82.0,
    construction_quality_score: 90.0,
    rental_demand_score: 87.0,
    overall_score: 89.4,
    security_features: { gated: true, cctv: true, security_24_7: true, intercom: true, access_control: true },
    amenities: { swimming_pool: true, gym: true, club_house: true, squash_court: true, badminton_court: true, jogging_track: true, kids_play_area: true, roof_garden: true, party_lawn: true },
    nearby_facilities: { metro_station_km: 3.0, hospital_km: 2.0, school_km: 1.5, mall_km: 1.8, market_km: 1.0 },
    cover_image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=500&fit=crop',
    gallery_images: [],
    is_verified: true,
    featured: true,
    status: 'active',
    view_count: 13500,
    review_count: 89,
    avg_rating: 4.6,
    builder: { id: 'b8', name: 'SS Group', slug: 'ss-group', logo_url: '', reputation_score: 4.0, total_projects: 8, rera_registered: true },
    locality: { id: 'l2', name: 'Golf Course Road', slug: 'golf-course-road', city: 'Gurgaon', avg_rent_1bhk: 28000, avg_rent_2bhk: 52000, avg_rent_3bhk: 75000, avg_rent_4bhk: 120000, price_per_sqft: 25000, metro_distance_km: 2.8, connectivity_score: 9.5, safety_score: 9.3, lifestyle_score: 9.9 }
  },
  {
    id: 's12',
    name: 'DLF The Magnolias',
    slug: 'dlf-the-magnolias',
    builder_id: 'b1',
    locality_id: 'l2',
    address: 'Golf Course Road, Sector 42, Gurgaon',
    total_towers: 4,
    total_units: 200,
    possession_year: 2010,
    construction_status: 'ready',
    security_score: 96.0,
    maintenance_score: 94.0,
    amenities_score: 97.0,
    connectivity_score: 95.0,
    family_friendly_score: 88.0,
    pet_friendly_score: 70.0,
    construction_quality_score: 96.0,
    rental_demand_score: 85.0,
    overall_score: 92.1,
    security_features: { gated: true, cctv: true, security_24_7: true, intercom: true, access_control: true, biometric: true },
    amenities: { swimming_pool: true, gym: true, club_house: true, private_theatre: true, wine_cellar: true, jogging_track: true, kids_play_area: true, spa: true, salon: true, concierge: true },
    nearby_facilities: { metro_station_km: 2.5, hospital_km: 1.5, school_km: 2.0, mall_km: 1.0, market_km: 0.5 },
    cover_image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&h=500&fit=crop',
    gallery_images: [],
    is_verified: true,
    featured: true,
    status: 'active',
    view_count: 16800,
    review_count: 142,
    avg_rating: 4.9,
    builder: { id: 'b1', name: 'DLF Limited', slug: 'dlf-limited', logo_url: '', reputation_score: 4.5, total_projects: 30, rera_registered: true },
    locality: { id: 'l2', name: 'Golf Course Road', slug: 'golf-course-road', city: 'Gurgaon', avg_rent_1bhk: 28000, avg_rent_2bhk: 52000, avg_rent_3bhk: 75000, avg_rent_4bhk: 120000, price_per_sqft: 25000, metro_distance_km: 2.8, connectivity_score: 9.5, safety_score: 9.3, lifestyle_score: 9.9 }
  }
];

const intelligenceParams = [
  { icon: Shield, label: 'Security', desc: '24/7 guards, CCTV, access control', score: '20%' },
  { icon: TrendingUp, label: 'Maintenance', desc: 'Upkeep quality & response time', score: '20%' },
  { icon: Star, label: 'Amenities', desc: 'Pools, gyms, clubhouses', score: '15%' },
  { icon: MapPin, label: 'Connectivity', desc: 'Metro, roads, airport access', score: '15%' },
  { icon: Building2, label: 'Family Friendly', desc: 'Schools, parks, safety', score: '10%' },
  { icon: Sparkles, label: 'Pet Friendly', desc: 'Pet policies & spaces', score: '5%' },
  { icon: BarChart3, label: 'Construction', desc: 'Build quality & materials', score: '10%' },
  { icon: CheckCircle2, label: 'Rental Demand', desc: 'Market popularity', score: '5%' },
];

export function HomePage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <HeroSearch />

      {/* How It Works */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-navy-100 text-navy-700 border-navy-200">How It Works</Badge>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-navy-900 mb-4">
              Society Intelligence, Not Just Listings
            </h2>
            <p className="text-lg text-navy-500 max-w-2xl mx-auto">
              We evaluate every society on 8 verified parameters so you can make an informed decision before you even visit.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {intelligenceParams.map((param, i) => {
              const Icon = param.icon;
              return (
                <div key={i} className="group p-6 rounded-2xl bg-ivory-100 border border-navy-100 hover:border-gold-300 hover:shadow-lg transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-navy-500 flex items-center justify-center mb-4 group-hover:bg-gold-500 transition-colors">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-navy-900 mb-1">{param.label}</h3>
                  <p className="text-sm text-navy-500 mb-2">{param.desc}</p>
                  <Badge variant="outline" className="text-xs border-gold-300 text-gold-600">
                    Weight: {param.score}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Societies */}
      <section className="py-16 bg-ivory-100">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <div>
              <Badge className="mb-2 bg-gold-100 text-gold-700 border-gold-200">Featured</Badge>
              <h2 className="text-3xl font-display font-bold text-navy-900">Top Rated Societies</h2>
            </div>
            <Link to="/search">
              <Button variant="outline" className="border-navy-200 text-navy-700 hover:bg-navy-50">
                View All <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredSocieties.map((society) => (
              <SocietyCard key={society.id} society={society} featured={society.featured} />
            ))}
          </div>
        </div>
      </section>

      {/* AI Advisor CTA */}
      <section className="py-16 bg-navy-500">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-16 h-16 bg-gold-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-navy-900" />
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
              Not Sure Which Society Fits You?
            </h2>
            <p className="text-lg text-navy-200 mb-8 max-w-2xl mx-auto">
              Our AI Rental Advisor analyzes your budget, office location, and lifestyle preferences to recommend the perfect societies for you.
            </p>
            <Link to="/ai-advisor">
              <Button size="lg" className="bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold px-8">
                Try AI Advisor <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Market Insights Preview */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-navy-100 text-navy-700 border-navy-200">Market Intelligence</Badge>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-navy-900 mb-4">
                Rent Trends & Demand Analytics
              </h2>
              <p className="text-lg text-navy-500 mb-6">
                Get real-time insights into Gurgaon's rental market. Track rent trends, demand patterns, and occupancy rates across localities.
              </p>
              <div className="space-y-4">
                {[
                  { label: 'Golf Course Road', trend: '+12%', rent: '₹52K avg' },
                  { label: 'DLF Phase 1-5', trend: '+8%', rent: '₹45K avg' },
                  { label: 'Golf Course Extension', trend: '+15%', rent: '₹35K avg' },
                  { label: 'Sohna Road', trend: '+5%', rent: '₹26K avg' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-ivory-100 border border-navy-100">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-navy-400" />
                      <span className="font-medium text-navy-800">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        <TrendingUp className="w-3 h-3 mr-1" /> {item.trend}
                      </Badge>
                      <span className="text-sm font-semibold text-navy-700">{item.rent}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/insights" className="inline-flex items-center gap-2 mt-6 text-navy-600 hover:text-navy-800 font-medium">
                View Full Analytics <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-navy-100">
                <img 
                  src="https://images.unsplash.com/photo-1486406146926-c627a92e1c4c?w=800&h=600&fit=crop" 
                  alt="Gurgaon Skyline" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-4 border border-navy-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-navy-900">Rental Yield</p>
                    <p className="text-lg font-bold text-green-600">3.2% - 4.8%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 bg-ivory-100 border-y border-navy-100">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {[
              { icon: Shield, text: 'Verified Properties' },
              { icon: CheckCircle2, text: 'Real Reviews' },
              { icon: Star, text: 'Intelligence Scoring' },
              { icon: TrendingUp, text: 'Market Analytics' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center gap-2 text-navy-600">
                  <Icon className="w-5 h-5 text-gold-500" />
                  <span className="font-medium">{item.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
