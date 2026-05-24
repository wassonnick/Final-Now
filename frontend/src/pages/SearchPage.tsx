import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Grid3X3, List, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { SocietyCard } from '@/components/society/SocietyCard';
import { cn, debounce } from '@/lib/utils';
import type { Society, SearchFilters } from '@/types';

// Mock search results
const mockSocieties: Society[] = [
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
    security_features: { gated: true, cctv: true, security_24_7: true, intercom: true, access_control: true },
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
    id: 's3',
    name: 'M3M Golf Estate',
    slug: 'm3m-golf-estate',
    builder_id: 'b3',
    locality_id: 'l3',
    address: 'Golf Course Extension Road, Sector 65, Gurgaon',
    total_towers: 12,
    total_units: 800,
    possession_year: 2018,
    construction_status: 'ready',
    security_score: 88.0,
    maintenance_score: 85.0,
    amenities_score: 92.0,
    connectivity_score: 82.0,
    family_friendly_score: 88.0,
    pet_friendly_score: 70.0,
    construction_quality_score: 90.0,
    rental_demand_score: 85.0,
    overall_score: 86.4,
    security_features: { gated: true, cctv: true, security_24_7: true, intercom: true, access_control: true },
    amenities: { swimming_pool: true, gym: true, club_house: true, golf_simulator: true, cricket_pitch: true, jogging_track: true, kids_play_area: true, skating_rink: true, amphitheatre: true },
    nearby_facilities: { metro_station_km: 5.5, hospital_km: 3.5, school_km: 2.5, mall_km: 4.0, market_km: 2.0 },
    cover_image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=500&fit=crop',
    gallery_images: [],
    is_verified: true,
    featured: true,
    status: 'active',
    view_count: 11200,
    review_count: 76,
    avg_rating: 4.5,
    builder: { id: 'b3', name: 'M3M India', slug: 'm3m-india', logo_url: '', reputation_score: 4.2, total_projects: 15, rera_registered: true },
    locality: { id: 'l3', name: 'Golf Course Extension Road', slug: 'golf-course-extension-road', city: 'Gurgaon', avg_rent_1bhk: 18000, avg_rent_2bhk: 35000, avg_rent_3bhk: 50000, avg_rent_4bhk: 75000, price_per_sqft: 18000, metro_distance_km: 5.5, connectivity_score: 8.5, safety_score: 8.8, lifestyle_score: 9.0 }
  },
  {
    id: 's4',
    name: 'Ireo The Corridors',
    slug: 'ireo-the-corridors',
    builder_id: 'b4',
    locality_id: 'l3',
    address: 'Golf Course Extension Road, Sector 67A, Gurgaon',
    total_towers: 10,
    total_units: 600,
    possession_year: 2016,
    construction_status: 'ready',
    security_score: 86.0,
    maintenance_score: 84.0,
    amenities_score: 88.0,
    connectivity_score: 80.0,
    family_friendly_score: 85.0,
    pet_friendly_score: 65.0,
    construction_quality_score: 87.0,
    rental_demand_score: 82.0,
    overall_score: 83.6,
    security_features: { gated: true, cctv: true, security_24_7: true, intercom: true, access_control: true },
    amenities: { swimming_pool: true, gym: true, club_house: true, tennis_court: true, basketball_court: true, jogging_track: true, kids_play_area: true, yoga_deck: true },
    nearby_facilities: { metro_station_km: 6.0, hospital_km: 4.0, school_km: 3.0, mall_km: 4.5, market_km: 2.5 },
    cover_image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&h=500&fit=crop',
    gallery_images: [],
    is_verified: true,
    featured: false,
    status: 'active',
    view_count: 9850,
    review_count: 62,
    avg_rating: 4.4,
    builder: { id: 'b4', name: 'Ireo', slug: 'ireo', logo_url: '', reputation_score: 4.3, total_projects: 12, rera_registered: true },
    locality: { id: 'l3', name: 'Golf Course Extension Road', slug: 'golf-course-extension-road', city: 'Gurgaon', avg_rent_1bhk: 18000, avg_rent_2bhk: 35000, avg_rent_3bhk: 50000, avg_rent_4bhk: 75000, price_per_sqft: 18000, metro_distance_km: 5.5, connectivity_score: 8.5, safety_score: 8.8, lifestyle_score: 9.0 }
  },
  {
    id: 's5',
    name: 'Bestech Park View',
    slug: 'bestech-park-view',
    builder_id: 'b5',
    locality_id: 'l5',
    address: 'Sector 66, Gurgaon',
    total_towers: 8,
    total_units: 500,
    possession_year: 2015,
    construction_status: 'ready',
    security_score: 85.0,
    maintenance_score: 88.0,
    amenities_score: 90.0,
    connectivity_score: 78.0,
    family_friendly_score: 90.0,
    pet_friendly_score: 72.0,
    construction_quality_score: 86.0,
    rental_demand_score: 80.0,
    overall_score: 85.1,
    security_features: { gated: true, cctv: true, security_24_7: true, intercom: true, access_control: true },
    amenities: { swimming_pool: true, gym: true, club_house: true, badminton_court: true, volleyball_court: true, jogging_track: true, kids_play_area: true, senior_citizen_area: true, meditation_center: true },
    nearby_facilities: { metro_station_km: 4.5, hospital_km: 3.0, school_km: 2.0, mall_km: 3.5, market_km: 1.5 },
    cover_image: 'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=800&h=500&fit=crop',
    gallery_images: [],
    is_verified: true,
    featured: false,
    status: 'active',
    view_count: 8750,
    review_count: 58,
    avg_rating: 4.3,
    builder: { id: 'b5', name: 'Bestech Group', slug: 'bestech-group', logo_url: '', reputation_score: 4.1, total_projects: 10, rera_registered: true },
    locality: { id: 'l5', name: 'Sector 57', slug: 'sector-57', city: 'Gurgaon', avg_rent_1bhk: 16000, avg_rent_2bhk: 28000, avg_rent_3bhk: 45000, avg_rent_4bhk: 65000, price_per_sqft: 14000, metro_distance_km: 4.5, connectivity_score: 8.2, safety_score: 8.5, lifestyle_score: 8.3 }
  },
  {
    id: 's6',
    name: 'Vatika City',
    slug: 'vatika-city',
    builder_id: 'b6',
    locality_id: 'l5',
    address: 'Sector 49, Gurgaon',
    total_towers: 15,
    total_units: 1200,
    possession_year: 2010,
    construction_status: 'ready',
    security_score: 82.0,
    maintenance_score: 80.0,
    amenities_score: 85.0,
    connectivity_score: 85.0,
    family_friendly_score: 88.0,
    pet_friendly_score: 78.0,
    construction_quality_score: 82.0,
    rental_demand_score: 86.0,
    overall_score: 83.5,
    security_features: { gated: true, cctv: true, security_24_7: true, intercom: true, access_control: true },
    amenities: { swimming_pool: true, gym: true, club_house: true, tennis_court: true, basketball_court: true, jogging_track: true, kids_play_area: true, community_hall: true },
    nearby_facilities: { metro_station_km: 4.0, hospital_km: 2.5, school_km: 1.5, mall_km: 2.0, market_km: 1.0 },
    cover_image: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&h=500&fit=crop',
    gallery_images: [],
    is_verified: true,
    featured: false,
    status: 'active',
    view_count: 10200,
    review_count: 71,
    avg_rating: 4.2,
    builder: { id: 'b6', name: 'Vatika Group', slug: 'vatika-group', logo_url: '', reputation_score: 4.0, total_projects: 25, rera_registered: true },
    locality: { id: 'l5', name: 'Sector 57', slug: 'sector-57', city: 'Gurgaon', avg_rent_1bhk: 16000, avg_rent_2bhk: 28000, avg_rent_3bhk: 45000, avg_rent_4bhk: 65000, price_per_sqft: 14000, metro_distance_km: 4.5, connectivity_score: 8.2, safety_score: 8.5, lifestyle_score: 8.3 }
  }
];

const localities = ['All', 'DLF Phase 1-5', 'Golf Course Road', 'Golf Course Extension', 'Sohna Road', 'Sector 57', 'Sector 49', 'Sushant Lok'];
const bhkOptions = [1, 2, 3, 4, 5];
const sortOptions = [
  { label: 'Recommended', value: 'recommended' },
  { label: 'Highest Score', value: 'score_desc' },
  { label: 'Lowest Rent', value: 'rent_asc' },
  { label: 'Most Reviews', value: 'reviews_desc' },
  { label: 'Newest', value: 'newest' },
];

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState<SearchFilters>({
    locality: searchParams.get('locality') || '',
    bhk: searchParams.get('bhk')?.split(',').map(Number).filter(Boolean) || [],
    budgetMin: Number(searchParams.get('budgetMin')) || 10000,
    budgetMax: Number(searchParams.get('budgetMax')) || 200000,
    propertyType: searchParams.get('propertyType') || '',
    furnished: searchParams.get('furnished') || '',
    minScore: Number(searchParams.get('minScore')) || 0,
    petFriendly: searchParams.get('petFriendly') === 'true',
    familyFriendly: searchParams.get('familyFriendly') === 'true',
    sortBy: searchParams.get('sortBy') || 'recommended',
  });

  const [results, setResults] = useState<Society[]>(mockSocieties);
  const [isLoading, setIsLoading] = useState(false);

  const applyFilters = useCallback(() => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      let filtered = [...mockSocieties];

      if (filters.locality && filters.locality !== 'All') {
        filtered = filtered.filter(s => s.locality?.name === filters.locality);
      }

      if (filters.bhk?.length) {
        filtered = filtered.filter(s => filters.bhk?.includes(s.total_units > 300 ? 3 : 2));
      }

      if (filters.minScore) {
        filtered = filtered.filter(s => s.overall_score >= (filters.minScore || 0));
      }

      if (filters.petFriendly) {
        filtered = filtered.filter(s => s.pet_friendly_score >= 70);
      }

      if (filters.familyFriendly) {
        filtered = filtered.filter(s => s.family_friendly_score >= 80);
      }

      // Sort
      switch (filters.sortBy) {
        case 'score_desc':
          filtered.sort((a, b) => b.overall_score - a.overall_score);
          break;
        case 'reviews_desc':
          filtered.sort((a, b) => b.review_count - a.review_count);
          break;
        default:
          break;
      }

      setResults(filtered);
      setIsLoading(false);
    }, 500);
  }, [filters]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleBhk = (bhk: number) => {
    setFilters(prev => ({
      ...prev,
      bhk: prev.bhk?.includes(bhk) 
        ? prev.bhk.filter(b => b !== bhk)
        : [...(prev.bhk || []), bhk]
    }));
  };

  const activeFiltersCount = [
    filters.locality && filters.locality !== 'All',
    filters.bhk?.length,
    filters.budgetMin !== 10000 || filters.budgetMax !== 200000,
    filters.minScore,
    filters.petFriendly,
    filters.familyFriendly,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-ivory-100">
      {/* Search Header */}
      <div className="bg-white border-b border-navy-100">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
              <Input
                type="text"
                placeholder="Search societies, localities, builders..."
                className="pl-10 h-12 border-navy-200"
                defaultValue={searchParams.get('q') || ''}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                className={cn("border-navy-200", showFilters && "bg-navy-50 border-navy-300")}
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge className="ml-2 bg-navy-500 text-white">{activeFiltersCount}</Badge>
                )}
              </Button>
              <div className="flex border border-navy-200 rounded-lg overflow-hidden">
                <button 
                  className={cn("p-2.5", viewMode === 'grid' ? 'bg-navy-500 text-white' : 'bg-white text-navy-600')}
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button 
                  className={cn("p-2.5", viewMode === 'list' ? 'bg-navy-500 text-white' : 'bg-white text-navy-600')}
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Active Filter Chips */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {filters.locality && filters.locality !== 'All' && (
                <Badge variant="secondary" className="gap-1">
                  <MapPin className="w-3 h-3" /> {filters.locality}
                  <button onClick={() => updateFilter('locality', '')}><X className="w-3 h-3 ml-1" /></button>
                </Badge>
              )}
              {filters.bhk?.map(bhk => (
                <Badge key={bhk} variant="secondary" className="gap-1">
                  {bhk} BHK
                  <button onClick={() => toggleBhk(bhk)}><X className="w-3 h-3 ml-1" /></button>
                </Badge>
              ))}
              {filters.minScore > 0 && (
                <Badge variant="secondary" className="gap-1">
                  Score ≥ {filters.minScore}
                  <button onClick={() => updateFilter('minScore', 0)}><X className="w-3 h-3 ml-1" /></button>
                </Badge>
              )}
              {filters.petFriendly && (
                <Badge variant="secondary" className="gap-1">
                  Pet Friendly
                  <button onClick={() => updateFilter('petFriendly', false)}><X className="w-3 h-3 ml-1" /></button>
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar Filters */}
          {showFilters && (
            <aside className="w-72 shrink-0 hidden lg:block">
              <div className="bg-white rounded-xl border border-navy-100 p-5 sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-navy-900">Filters</h3>
                  {activeFiltersCount > 0 && (
                    <button 
                      className="text-sm text-navy-500 hover:text-navy-700"
                      onClick={() => setFilters({})}
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Locality */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-navy-700 mb-2 block">Locality</label>
                  <div className="space-y-1.5">
                    {localities.map(loc => (
                      <label key={loc} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox 
                          checked={filters.locality === loc || (loc === 'All' && !filters.locality)}
                          onCheckedChange={() => updateFilter('locality', loc === 'All' ? '' : loc)}
                        />
                        <span className="text-sm text-navy-600">{loc}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Separator className="my-4" />

                {/* BHK */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-navy-700 mb-2 block">BHK</label>
                  <div className="flex flex-wrap gap-2">
                    {bhkOptions.map(bhk => (
                      <button
                        key={bhk}
                        onClick={() => toggleBhk(bhk)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm transition-all",
                          filters.bhk?.includes(bhk)
                            ? "bg-navy-500 text-white"
                            : "bg-navy-50 text-navy-600 hover:bg-navy-100"
                        )}
                      >
                        {bhk} BHK
                      </button>
                    ))}
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Budget */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-navy-700 mb-2 block">
                    Budget: ₹{filters.budgetMin?.toLocaleString()} - ₹{filters.budgetMax?.toLocaleString()}
                  </label>
                  <Slider
                    value={[filters.budgetMin || 10000, filters.budgetMax || 200000]}
                    onValueChange={([min, max]) => {
                      updateFilter('budgetMin', min);
                      updateFilter('budgetMax', max);
                    }}
                    min={10000}
                    max={200000}
                    step={5000}
                    className="mt-2"
                  />
                </div>

                <Separator className="my-4" />

                {/* Society Score */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-navy-700 mb-2 block">
                    Min Society Score: {filters.minScore || 0}
                  </label>
                  <Slider
                    value={[filters.minScore || 0]}
                    onValueChange={([val]) => updateFilter('minScore', val)}
                    min={0}
                    max={100}
                    step={5}
                    className="mt-2"
                  />
                </div>

                <Separator className="my-4" />

                {/* Lifestyle */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-navy-700 mb-2 block">Lifestyle</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox 
                        checked={filters.petFriendly}
                        onCheckedChange={(checked) => updateFilter('petFriendly', checked)}
                      />
                      <span className="text-sm text-navy-600">Pet Friendly</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox 
                        checked={filters.familyFriendly}
                        onCheckedChange={(checked) => updateFilter('familyFriendly', checked)}
                      />
                      <span className="text-sm text-navy-600">Family Friendly</span>
                    </label>
                  </div>
                </div>
              </div>
            </aside>
          )}

          {/* Results */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-navy-500">
                Showing <span className="font-semibold text-navy-900">{results.length}</span> societies
              </p>
              <select 
                className="text-sm border border-navy-200 rounded-lg px-3 py-1.5 bg-white"
                value={filters.sortBy}
                onChange={(e) => updateFilter('sortBy', e.target.value)}
              >
                {sortOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white rounded-xl border border-navy-100 h-96 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className={cn(
                "grid gap-6",
                viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
              )}>
                {results.map(society => (
                  <SocietyCard key={society.id} society={society} />
                ))}
              </div>
            )}

            {results.length === 0 && !isLoading && (
              <div className="text-center py-16">
                <Search className="w-12 h-12 text-navy-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-navy-700 mb-2">No societies found</h3>
                <p className="text-navy-500">Try adjusting your filters to see more results.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
