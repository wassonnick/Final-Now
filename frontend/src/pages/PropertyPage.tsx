import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Home, Bed, Bath, Maximize, Car, Wind, CheckCircle2, Phone, Mail, Heart, Share2, ArrowRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, formatPrice } from '@/lib/utils';
import type { Property } from '@/types';

const mockProperty: Property = {
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
  photos: [
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&h=600&fit=crop',
  ],
  is_verified: true,
  is_available: true,
  status: 'active',
  view_count: 450,
  society: {
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
    security_score: 95,
    maintenance_score: 92,
    amenities_score: 96,
    connectivity_score: 94,
    family_friendly_score: 90,
    pet_friendly_score: 75,
    construction_quality_score: 95,
    rental_demand_score: 88,
    overall_score: 91.6,
    security_features: {},
    amenities: {},
    nearby_facilities: {},
    cover_image: '',
    gallery_images: [],
    is_verified: true,
    featured: true,
    status: 'active',
    view_count: 15420,
    review_count: 128,
    avg_rating: 4.8,
    locality: { id: 'l2', name: 'Golf Course Road', slug: 'golf-course-road', city: 'Gurgaon', avg_rent_1bhk: 28000, avg_rent_2bhk: 52000, avg_rent_3bhk: 75000, avg_rent_4bhk: 120000, price_per_sqft: 25000, metro_distance_km: 2.8, connectivity_score: 9.5, safety_score: 9.3, lifestyle_score: 9.9 }
  }
};

export function PropertyPage() {
  const { slug } = useParams();
  const [activeImage, setActiveImage] = useState(0);
  const [isShortlisted, setIsShortlisted] = useState(false);
  const property = mockProperty;

  const featureCategories = [
    { label: 'Furniture', items: ['sofa', 'dining_table', 'tv', 'beds', 'study_table', 'wardrobes'] },
    { label: 'Appliances', items: ['ac', 'microwave', 'refrigerator', 'washing_machine', 'geyser', 'chimney'] },
    { label: 'Fixtures', items: ['fans', 'lights', 'curtains', 'modular_kitchen'] },
  ];

  return (
    <div className="min-h-screen bg-ivory-100">
      {/* Gallery */}
      <div className="bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3 relative aspect-[16/9] rounded-2xl overflow-hidden">
              <img 
                src={property.photos[activeImage]} 
                alt={property.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 flex gap-2">
                <Badge className="bg-green-500 text-white border-0">
                  <Shield className="w-3 h-3 mr-1" /> Verified Property
                </Badge>
                {property.negotiable && (
                  <Badge className="bg-gold-500 text-navy-900 border-0 font-semibold">
                    Negotiable
                  </Badge>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
              {property.photos.slice(1, 4).map((photo, i) => (
                <button
                  key={i}
                  className={cn(
                    "relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all",
                    activeImage === i + 1 ? "border-navy-500" : "border-transparent hover:border-navy-200"
                  )}
                  onClick={() => setActiveImage(i + 1)}
                >
                  <img src={photo} alt={`${property.title} ${i + 2}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold text-navy-900 mb-2">{property.title}</h1>
                  <div className="flex items-center gap-2 text-navy-500">
                    <MapPin className="w-4 h-4" />
                    <span>{property.society?.address}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className={cn(isShortlisted && "bg-red-50 border-red-200 text-red-600")}
                    onClick={() => setIsShortlisted(!isShortlisted)}
                  >
                    <Heart className={cn("w-4 h-4 mr-1.5", isShortlisted && "fill-current")} />
                    {isShortlisted ? 'Saved' : 'Save'}
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share2 className="w-4 h-4 mr-1.5" /> Share
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="outline" className="border-navy-200">
                  <Home className="w-3 h-3 mr-1" /> {property.property_type}
                </Badge>
                <Badge variant="outline" className="border-navy-200">
                  <Bed className="w-3 h-3 mr-1" /> {property.bhk} BHK
                </Badge>
                <Badge variant="outline" className="border-navy-200">
                  <Maximize className="w-3 h-3 mr-1" /> {property.area_sqft} sq.ft
                </Badge>
                <Badge variant="outline" className="border-navy-200">
                  <Car className="w-3 h-3 mr-1" /> {property.parking_count} Parking
                </Badge>
                <Badge className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Available Now
                </Badge>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="w-full bg-white border border-navy-100 p-1 rounded-xl">
                <TabsTrigger value="details" className="flex-1 rounded-lg data-[state=active]:bg-navy-500 data-[state=active]:text-white">
                  Details
                </TabsTrigger>
                <TabsTrigger value="features" className="flex-1 rounded-lg data-[state=active]:bg-navy-500 data-[state=active]:text-white">
                  Features
                </TabsTrigger>
                <TabsTrigger value="society" className="flex-1 rounded-lg data-[state=active]:bg-navy-500 data-[state=active]:text-white">
                  Society Info
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-6">
                <div className="bg-white rounded-2xl border border-navy-100 p-6">
                  <h3 className="text-lg font-semibold text-navy-900 mb-4">Property Details</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {[
                      { label: 'Property Type', value: property.property_type },
                      { label: 'BHK', value: `${property.bhk} BHK` },
                      { label: 'Area', value: `${property.area_sqft} sq.ft` },
                      { label: 'Floor', value: `${property.floor_number} of ${property.total_floors}` },
                      { label: 'Facing', value: property.facing },
                      { label: 'Furnished', value: property.furnished_status?.replace('_', ' ') },
                      { label: 'Bedrooms', value: property.bedrooms },
                      { label: 'Bathrooms', value: property.bathrooms },
                      { label: 'Balconies', value: property.balconies },
                      { label: 'Parking', value: `${property.parking_count} slots` },
                      { label: 'Deposit', value: `${property.deposit_months} months` },
                      { label: 'Available From', value: 'Immediate' },
                    ].map((detail, i) => (
                      <div key={i}>
                        <p className="text-sm text-navy-500 mb-1">{detail.label}</p>
                        <p className="font-medium text-navy-900 capitalize">{detail.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="features" className="mt-6">
                <div className="bg-white rounded-2xl border border-navy-100 p-6">
                  <h3 className="text-lg font-semibold text-navy-900 mb-4">Features & Furnishings</h3>
                  <div className="space-y-6">
                    {featureCategories.map(cat => (
                      <div key={cat.label}>
                        <h4 className="text-sm font-medium text-navy-700 mb-3">{cat.label}</h4>
                        <div className="flex flex-wrap gap-2">
                          {cat.items.map(item => {
                            const hasFeature = property.features?.[item];
                            return (
                              <Badge 
                                key={item} 
                                className={cn(
                                  "text-sm",
                                  hasFeature 
                                    ? "bg-green-50 text-green-700 border-green-200" 
                                    : "bg-navy-50 text-navy-400 border-navy-100 opacity-50"
                                )}
                              >
                                {hasFeature && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                {item.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="society" className="mt-6">
                <div className="bg-white rounded-2xl border border-navy-100 p-6">
                  <h3 className="text-lg font-semibold text-navy-900 mb-4">Society Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-ivory-100 rounded-xl">
                      <p className="text-sm text-navy-500">Society Name</p>
                      <p className="font-semibold text-navy-900">{property.society?.name}</p>
                    </div>
                    <div className="p-4 bg-ivory-100 rounded-xl">
                      <p className="text-sm text-navy-500">Overall Score</p>
                      <p className="font-semibold text-navy-900">{property.society?.overall_score}/100</p>
                    </div>
                    <div className="p-4 bg-ivory-100 rounded-xl">
                      <p className="text-sm text-navy-500">Total Towers</p>
                      <p className="font-semibold text-navy-900">{property.society?.total_towers}</p>
                    </div>
                    <div className="p-4 bg-ivory-100 rounded-xl">
                      <p className="text-sm text-navy-500">Reviews</p>
                      <p className="font-semibold text-navy-900">{property.society?.review_count} reviews</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* Pricing Card */}
              <div className="bg-white rounded-2xl border border-navy-100 p-6 shadow-sm">
                <div className="text-center mb-6">
                  <p className="text-sm text-navy-500 mb-1">Monthly Rent</p>
                  <p className="text-4xl font-bold text-navy-900">{formatPrice(property.rent_amount)}</p>
                  <p className="text-sm text-navy-500 mt-1">+ {formatPrice(property.maintenance_amount)} maintenance</p>
                </div>

                <div className="space-y-3 p-4 bg-ivory-100 rounded-xl mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-navy-500">Rent</span>
                    <span className="font-medium">{formatPrice(property.rent_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-navy-500">Maintenance</span>
                    <span className="font-medium">{formatPrice(property.maintenance_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-navy-500">Deposit ({property.deposit_months} months)</span>
                    <span className="font-medium">{formatPrice(property.rent_amount * property.deposit_months)}</span>
                  </div>
                  <div className="border-t border-navy-200 pt-2 flex justify-between font-semibold">
                    <span className="text-navy-700">Total Monthly</span>
                    <span className="text-navy-900">{formatPrice(property.rent_amount + property.maintenance_amount)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button className="w-full bg-navy-500 hover:bg-navy-600 h-12">
                    <Phone className="w-4 h-4 mr-2" /> Contact Owner
                  </Button>
                  <Button variant="outline" className="w-full border-navy-200 h-12">
                    <Mail className="w-4 h-4 mr-2" /> Send Enquiry
                  </Button>
                </div>

                <p className="text-xs text-navy-400 mt-3 text-center">
                  Response time: Usually within 2 hours
                </p>
              </div>

              {/* Trust Badges */}
              <div className="bg-white rounded-2xl border border-navy-100 p-6">
                <h3 className="text-sm font-semibold text-navy-900 mb-3">Trust Indicators</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-navy-600">Property Verified</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-navy-600">Photos Verified</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-navy-600">Owner Identity Verified</span>
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
