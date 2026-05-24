import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  MapPin, Home, Star, TrendingUp, Shield, Wrench, Dumbbell, Train, 
  Users, Dog, HardHat, CheckCircle2, Phone, Mail, Heart, Share2,
  ChevronRight, Calendar, Building, ArrowRight, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { SocietyScoreCard } from '@/components/society/SocietyScoreCard';
import { useAppStore } from '@/store';
import { cn, formatPrice } from '@/lib/utils';
import type { Society, Property, Review } from '@/types';

// Mock society data
const mockSociety: Society = {
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
  cover_image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=700&fit=crop',
  gallery_images: [
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=600&h=400&fit=crop',
  ],
  is_verified: true,
  featured: true,
  status: 'active',
  view_count: 15420,
  review_count: 128,
  avg_rating: 4.8,
  builder: { id: 'b1', name: 'DLF Limited', slug: 'dlf-limited', logo_url: '', reputation_score: 4.5, total_projects: 30, rera_registered: true },
  locality: { id: 'l2', name: 'Golf Course Road', slug: 'golf-course-road', city: 'Gurgaon', avg_rent_1bhk: 28000, avg_rent_2bhk: 52000, avg_rent_3bhk: 75000, avg_rent_4bhk: 120000, price_per_sqft: 25000, metro_distance_km: 2.8, connectivity_score: 9.5, safety_score: 9.3, lifestyle_score: 9.9 },
  score_breakdown: {
    security: 95.0,
    maintenance: 92.0,
    amenities: 96.0,
    connectivity: 94.0,
    family_friendly: 90.0,
    pet_friendly: 75.0,
    construction_quality: 95.0,
    rental_demand: 88.0,
  },
  intelligence_summary: {
    overall_score: 91.6,
    grade: 'A+',
    verdict: 'Exceptional society. Highly recommended for premium renters.',
    strengths: [
      { category: 'amenities', score: 96.0, label: 'Amenities' },
      { category: 'security', score: 95.0, label: 'Security' },
      { category: 'construction_quality', score: 95.0, label: 'Construction' },
    ],
    weaknesses: [
      { category: 'pet_friendly', score: 75.0, label: 'Pet Friendly' },
    ],
  }
};

const mockProperties: Property[] = [
  {
    id: 'p1',
    society_id: 's1',
    title: '3BHK Luxury Apartment in The Aralias',
    slug: '3bhk-luxury-apartment-aralias',
    property_type: 'apartment',
    bhk: 3,
    area_sqft: 2800,
    rent_amount: 75000,
    maintenance_amount: 8000,
    deposit_months: 3,
    negotiable: true,
    floor_number: 8,
    total_floors: 20,
    facing: 'East',
    furnished_status: 'fully_furnished',
    bedrooms: 3,
    bathrooms: 4,
    balconies: 3,
    parking_count: 2,
    features: { ac: true, modular_kitchen: true, wardrobes: true, fans: true, lights: true, curtains: true, geyser: true, chimney: true, microwave: true, refrigerator: true, washing_machine: true, sofa: true, dining_table: true, tv: true, beds: true, study_table: true },
    photos: ['https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600&h=400&fit=crop'],
    is_verified: true,
    is_available: true,
    status: 'active',
    view_count: 450,
  },
  {
    id: 'p2',
    society_id: 's1',
    title: '4BHK Penthouse in The Aralias',
    slug: '4bhk-penthouse-aralias',
    property_type: 'penthouse',
    bhk: 4,
    area_sqft: 4200,
    rent_amount: 120000,
    maintenance_amount: 12000,
    deposit_months: 3,
    negotiable: false,
    floor_number: 20,
    total_floors: 20,
    facing: 'South-East',
    furnished_status: 'fully_furnished',
    bedrooms: 4,
    bathrooms: 5,
    balconies: 4,
    parking_count: 3,
    features: { ac: true, modular_kitchen: true, wardrobes: true, private_terrace: true, jacuzzi: true, home_theatre: true, servant_quarter: true },
    photos: ['https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=600&h=400&fit=crop'],
    is_verified: true,
    is_available: true,
    status: 'active',
    view_count: 320,
  }
];

const mockReviews: Review[] = [
  {
    id: 'r1',
    society_id: 's1',
    user_id: 'u1',
    rating: 5.0,
    title: 'Best society in Gurgaon',
    content: 'Living here for 3 years. Security is top notch, maintenance is prompt. The club house and amenities are world class. Perfect for families. The golf course view is breathtaking every morning.',
    security_rating: 5.0,
    maintenance_rating: 5.0,
    amenities_rating: 5.0,
    connectivity_rating: 4.5,
    management_rating: 5.0,
    value_for_money_rating: 4.0,
    lived_duration_months: 36,
    is_verified_resident: true,
    helpful_count: 45,
    created_at: '2024-01-15',
  },
  {
    id: 'r2',
    society_id: 's1',
    user_id: 'u2',
    rating: 4.5,
    title: 'Premium living but expensive',
    content: 'Excellent society with great amenities. Only downside is the high maintenance charges. But you get what you pay for. The swimming pool and gym are always well maintained.',
    security_rating: 5.0,
    maintenance_rating: 4.5,
    amenities_rating: 5.0,
    connectivity_rating: 4.5,
    management_rating: 4.5,
    value_for_money_rating: 3.5,
    lived_duration_months: 24,
    is_verified_resident: true,
    helpful_count: 32,
    created_at: '2024-03-20',
  },
  {
    id: 'r3',
    society_id: 's1',
    user_id: 'u3',
    rating: 5.0,
    title: 'Worth every penny',
    content: 'Moved here from Delhi and the difference is night and day. The security is unmatched, the management is responsive, and the community is wonderful. My kids love the play areas.',
    security_rating: 5.0,
    maintenance_rating: 5.0,
    amenities_rating: 5.0,
    connectivity_rating: 4.0,
    management_rating: 5.0,
    value_for_money_rating: 4.5,
    lived_duration_months: 18,
    is_verified_resident: true,
    helpful_count: 28,
    created_at: '2024-05-10',
  }
];

export function SocietyPage() {
  const { slug } = useParams();
  const [activeImage, setActiveImage] = useState(0);
  const [isShortlisted, setIsShortlisted] = useState(false);
  const { addToCompare, compareList, removeFromCompare } = useAppStore();

  const society = mockSociety;
  const isCompared = compareList.some(s => s.id === society.id);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  const allImages = [society.cover_image, ...society.gallery_images];

  return (
    <div className="min-h-screen bg-ivory-100">
      {/* Breadcrumb & Actions */}
      <div className="bg-white border-b border-navy-100">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <nav className="flex items-center gap-2 text-sm text-navy-500">
              <Link to="/" className="hover:text-navy-700">Home</Link>
              <ChevronRight className="w-4 h-4" />
              <Link to="/search" className="hover:text-navy-700">Societies</Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-navy-900 font-medium">{society.name}</span>
            </nav>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className={cn("border-navy-200", isShortlisted && "bg-red-50 border-red-200 text-red-600")}
                onClick={() => setIsShortlisted(!isShortlisted)}
              >
                <Heart className={cn("w-4 h-4 mr-1.5", isShortlisted && "fill-current")} />
                {isShortlisted ? 'Saved' : 'Save'}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className={cn("border-navy-200", isCompared && "bg-navy-50 border-navy-300")}
                onClick={() => isCompared ? removeFromCompare(society.id) : addToCompare(society)}
              >
                <TrendingUp className="w-4 h-4 mr-1.5" />
                {isCompared ? 'Comparing' : 'Compare'}
              </Button>
              <Button variant="outline" size="sm" className="border-navy-200">
                <Share2 className="w-4 h-4 mr-1.5" /> Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Gallery */}
      <div className="bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main Image */}
            <div className="lg:col-span-2 relative aspect-[16/9] rounded-2xl overflow-hidden">
              <img 
                src={allImages[activeImage]} 
                alt={society.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-900/40 via-transparent to-transparent" />

              {/* Badges */}
              <div className="absolute top-4 left-4 flex gap-2">
                {society.is_verified && (
                  <Badge className="bg-green-500 text-white border-0">
                    <Shield className="w-3 h-3 mr-1" /> Verified Society
                  </Badge>
                )}
                <Badge className="bg-gold-500 text-navy-900 border-0 font-semibold">
                  <Star className="w-3 h-3 mr-1" /> {society.avg_rating} Rating
                </Badge>
              </div>
            </div>

            {/* Thumbnails */}
            <div className="grid grid-cols-2 gap-3">
              {allImages.slice(1, 5).map((img, i) => (
                <button
                  key={i}
                  className={cn(
                    "relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all",
                    activeImage === i + 1 ? "border-navy-500" : "border-transparent hover:border-navy-200"
                  )}
                  onClick={() => setActiveImage(i + 1)}
                >
                  <img src={img} alt={`${society.name} ${i + 1}`} className="w-full h-full object-cover" />
                  {i === 3 && (
                    <div className="absolute inset-0 bg-navy-900/60 flex items-center justify-center">
                      <span className="text-white font-medium">+{allImages.length - 5} more</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Society Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header Info */}
            <div>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h1 className="text-3xl md:text-4xl font-display font-bold text-navy-900 mb-2">
                    {society.name}
                  </h1>
                  <div className="flex items-center gap-2 text-navy-500">
                    <MapPin className="w-4 h-4" />
                    <span>{society.address}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold",
                    society.overall_score >= 90 ? 'bg-green-100 text-green-700' :
                    society.overall_score >= 75 ? 'bg-lime-100 text-lime-700' :
                    'bg-yellow-100 text-yellow-700'
                  )}>
                    {society.overall_score}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Badge variant="outline" className="border-navy-200 text-navy-600">
                  <Building className="w-3 h-3 mr-1" /> {society.builder?.name}
                </Badge>
                <Badge variant="outline" className="border-navy-200 text-navy-600">
                  <Home className="w-3 h-3 mr-1" /> {society.total_towers} Towers
                </Badge>
                <Badge variant="outline" className="border-navy-200 text-navy-600">
                  <Calendar className="w-3 h-3 mr-1" /> {society.possession_year}
                </Badge>
                <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Ready to Move
                </Badge>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="intelligence" className="w-full">
              <TabsList className="w-full bg-white border border-navy-100 p-1 rounded-xl">
                <TabsTrigger value="intelligence" className="flex-1 rounded-lg data-[state=active]:bg-navy-500 data-[state=active]:text-white">
                  Intelligence
                </TabsTrigger>
                <TabsTrigger value="properties" className="flex-1 rounded-lg data-[state=active]:bg-navy-500 data-[state=active]:text-white">
                  Properties ({mockProperties.length})
                </TabsTrigger>
                <TabsTrigger value="reviews" className="flex-1 rounded-lg data-[state=active]:bg-navy-500 data-[state=active]:text-white">
                  Reviews ({society.review_count})
                </TabsTrigger>
                <TabsTrigger value="amenities" className="flex-1 rounded-lg data-[state=active]:bg-navy-500 data-[state=active]:text-white">
                  Amenities
                </TabsTrigger>
              </TabsList>

              {/* Intelligence Tab */}
              <TabsContent value="intelligence" className="mt-6">
                <SocietyScoreCard society={society} />

                {/* Nearby Facilities */}
                <div className="mt-8 bg-white rounded-2xl border border-navy-100 p-6">
                  <h3 className="text-xl font-semibold text-navy-900 mb-4">Nearby Facilities</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(society.nearby_facilities || {}).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-ivory-100">
                        <span className="text-sm font-medium text-navy-700 capitalize">
                          {key.replace(/_/g, ' ').replace('km', '')}
                        </span>
                        <span className="text-sm font-bold text-navy-900">{value} km</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rent Analytics */}
                <div className="mt-8 bg-white rounded-2xl border border-navy-100 p-6">
                  <h3 className="text-xl font-semibold text-navy-900 mb-4">Rent Analytics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: '1 BHK', rent: society.locality?.avg_rent_1bhk },
                      { label: '2 BHK', rent: society.locality?.avg_rent_2bhk },
                      { label: '3 BHK', rent: society.locality?.avg_rent_3bhk },
                      { label: '4 BHK', rent: society.locality?.avg_rent_4bhk },
                    ].map((item) => (
                      <div key={item.label} className="text-center p-4 rounded-xl bg-ivory-100 border border-navy-100">
                        <p className="text-sm text-navy-500 mb-1">{item.label} Avg Rent</p>
                        <p className="text-xl font-bold text-navy-900">{formatPrice(item.rent || 0)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Properties Tab */}
              <TabsContent value="properties" className="mt-6 space-y-4">
                {mockProperties.map(property => (
                  <div key={property.id} className="bg-white rounded-2xl border border-navy-100 p-6 hover:shadow-lg transition-shadow">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="w-full md:w-48 h-32 rounded-xl overflow-hidden shrink-0">
                        <img src={property.photos[0]} alt={property.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-navy-900">{property.title}</h3>
                            <p className="text-sm text-navy-500">{property.area_sqft} sq.ft • {property.facing} facing</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-navy-900">{formatPrice(property.rent_amount)}</p>
                            <p className="text-sm text-navy-500">/month</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge variant="outline" className="text-xs">{property.bhk} BHK</Badge>
                          <Badge variant="outline" className="text-xs">{property.bathrooms} Baths</Badge>
                          <Badge variant="outline" className="text-xs">{property.balconies} Balconies</Badge>
                          <Badge variant="outline" className="text-xs">{property.parking_count} Parking</Badge>
                          <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <Link to={`/property/${property.slug}`}>
                            <Button size="sm" className="bg-navy-500 hover:bg-navy-600">
                              View Details <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                          </Link>
                          <Button variant="outline" size="sm" className="border-navy-200">
                            <Phone className="w-4 h-4 mr-1" /> Contact Owner
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews" className="mt-6 space-y-4">
                <div className="bg-white rounded-2xl border border-navy-100 p-6">
                  <div className="flex items-center gap-8 mb-6">
                    <div className="text-center">
                      <p className="text-5xl font-bold text-navy-900">{society.avg_rating}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star key={star} className={cn(
                            "w-4 h-4",
                            star <= Math.round(society.avg_rating) ? "text-gold-500 fill-gold-500" : "text-navy-200"
                          )} />
                        ))}
                      </div>
                      <p className="text-sm text-navy-500 mt-1">{society.review_count} reviews</p>
                    </div>
                    <div className="flex-1 space-y-2">
                      {[5, 4, 3, 2, 1].map(rating => {
                        const count = mockReviews.filter(r => Math.round(r.rating) === rating).length;
                        const percentage = (count / mockReviews.length) * 100;
                        return (
                          <div key={rating} className="flex items-center gap-3">
                            <span className="text-sm text-navy-600 w-8">{rating}★</span>
                            <div className="flex-1 h-2 bg-navy-100 rounded-full overflow-hidden">
                              <div className="h-full bg-gold-500 rounded-full" style={{ width: `${percentage}%` }} />
                            </div>
                            <span className="text-sm text-navy-500 w-8">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {mockReviews.map(review => (
                  <div key={review.id} className="bg-white rounded-2xl border border-navy-100 p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-navy-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-navy-700">
                            {review.user_id === 'u1' ? 'RS' : review.user_id === 'u2' ? 'PG' : 'AK'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-navy-900">
                            {review.user_id === 'u1' ? 'Rahul Sharma' : review.user_id === 'u2' ? 'Priya Gupta' : 'Amit Kumar'}
                          </p>
                          <p className="text-xs text-navy-500">
                            {review.is_verified_resident && (
                              <span className="text-green-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Verified Resident
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-gold-500 fill-gold-500" />
                          <span className="font-bold text-navy-900">{review.rating}</span>
                        </div>
                        <p className="text-xs text-navy-500">{review.lived_duration_months} months</p>
                      </div>
                    </div>
                    <h4 className="font-semibold text-navy-800 mb-2">{review.title}</h4>
                    <p className="text-navy-600 text-sm leading-relaxed mb-4">{review.content}</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Security', score: review.security_rating },
                        { label: 'Maintenance', score: review.maintenance_rating },
                        { label: 'Amenities', score: review.amenities_rating },
                        { label: 'Management', score: review.management_rating },
                      ].map(cat => (
                        <Badge key={cat.label} variant="outline" className="text-xs">
                          {cat.label}: {cat.score}★
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </TabsContent>

              {/* Amenities Tab */}
              <TabsContent value="amenities" className="mt-6">
                <div className="bg-white rounded-2xl border border-navy-100 p-6">
                  <h3 className="text-xl font-semibold text-navy-900 mb-6">Society Amenities</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(society.amenities || {}).map(([key, value]) => {
                      const icons: Record<string, any> = {
                        swimming_pool: Dumbbell,
                        gym: Dumbbell,
                        club_house: Home,
                        tennis_court: Dumbbell,
                        basketball_court: Dumbbell,
                        jogging_track: Train,
                        kids_play_area: Users,
                        senior_citizen_area: Users,
                        party_hall: Home,
                        library: Home,
                        spa: Star,
                      };
                      const Icon = icons[key] || CheckCircle2;
                      return (
                        <div key={key} className={cn(
                          "flex items-center gap-3 p-3 rounded-xl",
                          value ? "bg-green-50 border border-green-200" : "bg-navy-50 border border-navy-100 opacity-50"
                        )}>
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            value ? "bg-green-100" : "bg-navy-100"
                          )}>
                            <Icon className={cn("w-5 h-5", value ? "text-green-600" : "text-navy-400")} />
                          </div>
                          <div>
                            <p className={cn("font-medium", value ? "text-green-800" : "text-navy-400")}>
                              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </p>
                            {value && <p className="text-xs text-green-600">Available</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Security Features */}
                <div className="mt-6 bg-white rounded-2xl border border-navy-100 p-6">
                  <h3 className="text-xl font-semibold text-navy-900 mb-6">Security Features</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(society.security_features || {}).map(([key, value]) => (
                      <div key={key} className={cn(
                        "flex items-center gap-3 p-3 rounded-xl",
                        value ? "bg-green-50 border border-green-200" : "bg-navy-50 border border-navy-100 opacity-50"
                      )}>
                        <Shield className={cn("w-5 h-5", value ? "text-green-600" : "text-navy-400")} />
                        <span className={cn("font-medium", value ? "text-green-800" : "text-navy-400")}>
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Sticky Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* Contact Card */}
              <div className="bg-white rounded-2xl border border-navy-100 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-navy-900 mb-4">Interested in this society?</h3>
                <div className="space-y-3">
                  <Button className="w-full bg-navy-500 hover:bg-navy-600 text-white h-12">
                    <Phone className="w-4 h-4 mr-2" /> Schedule a Visit
                  </Button>
                  <Button variant="outline" className="w-full border-navy-200 text-navy-700 h-12">
                    <Mail className="w-4 h-4 mr-2" /> Send Enquiry
                  </Button>
                </div>
                <p className="text-xs text-navy-400 mt-3 text-center">
                  Our relationship manager will contact you within 30 minutes
                </p>
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-2xl border border-navy-100 p-6">
                <h3 className="text-sm font-semibold text-navy-900 mb-4 uppercase tracking-wider">Quick Facts</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Total Towers', value: society.total_towers },
                    { label: 'Total Units', value: society.total_units },
                    { label: 'Possession Year', value: society.possession_year },
                    { label: 'Construction Status', value: society.construction_status === 'ready' ? 'Ready to Move' : society.construction_status },
                    { label: 'Builder', value: society.builder?.name },
                    { label: 'Locality', value: society.locality?.name },
                  ].map((fact, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-navy-50 last:border-0">
                      <span className="text-sm text-navy-500">{fact.label}</span>
                      <span className="text-sm font-semibold text-navy-900">{fact.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trust Score */}
              <div className="bg-white rounded-2xl border border-navy-100 p-6">
                <h3 className="text-sm font-semibold text-navy-900 mb-3 uppercase tracking-wider">Trust Score</h3>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-green-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-navy-900">92/100</p>
                    <p className="text-xs text-navy-500">Based on verification & reviews</p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-navy-600">Society Verified</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-navy-600">Builder RERA Registered</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-navy-600">128 Resident Reviews</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
