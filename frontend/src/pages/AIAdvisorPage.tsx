import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, MapPin, IndianRupee, Users, Dog, Briefcase, Home, ArrowRight, Star, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { SocietyCard } from '@/components/society/SocietyCard';
import { cn, formatPrice } from '@/lib/utils';
import type { Society, AIRecommendation } from '@/types';

const officeLocations = [
  'Cyber City', 'DLF Cyber Park', 'Sector 44', 'Udyog Vihar', 'MG Road', 'Sector 62'
];

const priorities = [
  { id: 'security', label: 'Security', icon: CheckCircle2 },
  { id: 'amenities', label: 'Amenities', icon: Home },
  { id: 'connectivity', label: 'Connectivity', icon: MapPin },
  { id: 'family', label: 'Family Friendly', icon: Users },
  { id: 'pets', label: 'Pet Friendly', icon: Dog },
  { id: 'budget', label: 'Budget Friendly', icon: IndianRupee },
];

// Mock AI recommendations
const mockRecommendations: AIRecommendation[] = [
  {
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
      security_score: 95.0,
      maintenance_score: 92.0,
      amenities_score: 96.0,
      connectivity_score: 94.0,
      family_friendly_score: 90.0,
      pet_friendly_score: 75.0,
      construction_quality_score: 95.0,
      rental_demand_score: 88.0,
      overall_score: 91.6,
      security_features: { gated: true, cctv: true, security_24_7: true },
      amenities: { swimming_pool: true, gym: true, club_house: true },
      nearby_facilities: { metro_station_km: 2.8, hospital_km: 1.5 },
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
    match_score: 96,
    match_reasons: [
      'Excellent security matches your priority',
      'Close to Cyber City (2.1 km)',
      'Premium amenities aligned with your lifestyle',
      'Family-friendly environment'
    ],
    rent_estimate: 75000
  },
  {
    society: {
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
      security_features: { gated: true, cctv: true, security_24_7: true },
      amenities: { swimming_pool: true, gym: true, club_house: true },
      nearby_facilities: { metro_station_km: 2.5, hospital_km: 1.8 },
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
    match_score: 92,
    match_reasons: [
      'Best connectivity score in the area',
      'Within your budget range',
      'High rental demand ensures resale value',
      'Verified by 95 residents'
    ],
    rent_estimate: 65000
  },
  {
    society: {
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
      security_features: { gated: true, cctv: true, security_24_7: true },
      amenities: { swimming_pool: true, gym: true, club_house: true },
      nearby_facilities: { metro_station_km: 3.0, hospital_km: 2.0 },
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
    match_score: 88,
    match_reasons: [
      'Pet-friendly policies match your requirement',
      'Good value for money',
      'Strong construction quality',
      'Close to your office location'
    ],
    rent_estimate: 68000
  }
];

export function AIAdvisorPage() {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [preferences, setPreferences] = useState({
    budget: 60000,
    officeLocation: '',
    bhk: 3,
    familySize: 3,
    hasPets: false,
    selectedPriorities: [] as string[],
  });

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowResults(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 2500);
  };

  const togglePriority = (id: string) => {
    setPreferences(prev => ({
      ...prev,
      selectedPriorities: prev.selectedPriorities.includes(id)
        ? prev.selectedPriorities.filter(p => p !== id)
        : [...prev.selectedPriorities, id]
    }));
  };

  if (showResults) {
    return (
      <div className="min-h-screen bg-ivory-100">
        <div className="bg-navy-500 py-12">
          <div className="container mx-auto px-4 text-center">
            <div className="w-16 h-16 bg-gold-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-navy-900" />
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3">
              AI-Powered Recommendations
            </h1>
            <p className="text-lg text-navy-200 max-w-2xl mx-auto">
              Based on your preferences, we analyzed 100+ societies and found these perfect matches for you.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Preference Summary */}
          <div className="bg-white rounded-2xl border border-navy-100 p-6 mb-8">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-medium text-navy-500">Your Preferences:</span>
              <Badge variant="outline" className="border-navy-200">
                <IndianRupee className="w-3 h-3 mr-1" /> Budget: {formatPrice(preferences.budget)}
              </Badge>
              <Badge variant="outline" className="border-navy-200">
                <Briefcase className="w-3 h-3 mr-1" /> Office: {preferences.officeLocation || 'Any'}
              </Badge>
              <Badge variant="outline" className="border-navy-200">
                <Home className="w-3 h-3 mr-1" /> {preferences.bhk} BHK
              </Badge>
              <Badge variant="outline" className="border-navy-200">
                <Users className="w-3 h-3 mr-1" /> Family: {preferences.familySize}
              </Badge>
              {preferences.hasPets && (
                <Badge variant="outline" className="border-navy-200">
                  <Dog className="w-3 h-3 mr-1" /> Pet Friendly
                </Badge>
              )}
              <Button variant="ghost" size="sm" className="text-navy-500" onClick={() => setShowResults(false)}>
                Edit Preferences
              </Button>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-8">
            {mockRecommendations.map((rec, index) => (
              <div key={rec.society.id} className="relative">
                {/* Match Score Badge */}
                <div className="absolute -top-3 left-6 z-10">
                  <Badge className={cn(
                    "px-3 py-1 text-sm font-bold",
                    index === 0 ? "bg-green-500 text-white" : 
                    index === 1 ? "bg-lime-500 text-white" : "bg-navy-500 text-white"
                  )}>
                    <Star className="w-3 h-3 mr-1" /> {rec.match_score}% Match
                  </Badge>
                </div>

                <div className="bg-white rounded-2xl border border-navy-100 overflow-hidden hover:shadow-xl transition-shadow">
                  <div className="grid grid-cols-1 lg:grid-cols-3">
                    <div className="lg:col-span-1">
                      <SocietyCard society={rec.society} />
                    </div>
                    <div className="lg:col-span-2 p-6">
                      <h3 className="text-xl font-semibold text-navy-900 mb-2">
                        Why this matches you
                      </h3>
                      <div className="space-y-3 mb-6">
                        {rec.match_reasons.map((reason, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            </div>
                            <p className="text-navy-700">{reason}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-4 p-4 bg-ivory-100 rounded-xl mb-4">
                        <div>
                          <p className="text-sm text-navy-500">Estimated Rent</p>
                          <p className="text-2xl font-bold text-navy-900">{formatPrice(rec.rent_estimate)}</p>
                        </div>
                        <div className="h-10 w-px bg-navy-200" />
                        <div>
                          <p className="text-sm text-navy-500">Monthly Savings</p>
                          <p className="text-lg font-semibold text-green-600">
                            {formatPrice(preferences.budget - rec.rent_estimate)}
                          </p>
                        </div>
                        <div className="h-10 w-px bg-navy-200" />
                        <div>
                          <p className="text-sm text-navy-500">Commute Time</p>
                          <p className="text-lg font-semibold text-navy-900">~15 min</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Link to={`/society/${rec.society.slug}`} className="flex-1">
                          <Button className="w-full bg-navy-500 hover:bg-navy-600">
                            View Society Details <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </Link>
                        <Button variant="outline" className="border-navy-200">
                          Schedule Visit
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory-100">
      {/* Hero */}
      <div className="bg-navy-500 py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-gold-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-navy-900" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3">
            AI Rental Advisor
          </h1>
          <p className="text-lg text-navy-200 max-w-2xl mx-auto">
            Tell us your preferences and our AI will find the perfect societies for you.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Progress */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-semibold",
                step >= s ? "bg-navy-500 text-white" : "bg-navy-100 text-navy-400"
              )}>
                {s}
              </div>
              {s < 3 && (
                <div className={cn(
                  "w-24 md:w-40 h-1 mx-2 rounded",
                  step > s ? "bg-navy-500" : "bg-navy-100"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Basic Requirements */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-navy-100 p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-navy-900 mb-6">Your Requirements</h2>

            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-navy-700 mb-2 block">Monthly Budget</label>
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-2xl font-bold text-navy-900">{formatPrice(preferences.budget)}</span>
                </div>
                <Slider
                  value={[preferences.budget]}
                  onValueChange={([val]) => setPreferences(prev => ({ ...prev, budget: val }))}
                  min={15000}
                  max={200000}
                  step={5000}
                />
                <div className="flex justify-between text-xs text-navy-400 mt-1">
                  <span>₹15K</span>
                  <span>₹2L</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-navy-700 mb-2 block">Office Location</label>
                <div className="flex flex-wrap gap-2">
                  {officeLocations.map(loc => (
                    <button
                      key={loc}
                      onClick={() => setPreferences(prev => ({ ...prev, officeLocation: loc }))}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm transition-all",
                        preferences.officeLocation === loc
                          ? "bg-navy-500 text-white"
                          : "bg-navy-50 text-navy-600 hover:bg-navy-100"
                      )}
                    >
                      <Briefcase className="w-3 h-3 inline mr-1" />
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-navy-700 mb-2 block">BHK Preference</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(bhk => (
                    <button
                      key={bhk}
                      onClick={() => setPreferences(prev => ({ ...prev, bhk }))}
                      className={cn(
                        "flex-1 py-3 rounded-lg text-sm font-medium transition-all",
                        preferences.bhk === bhk
                          ? "bg-navy-500 text-white"
                          : "bg-navy-50 text-navy-600 hover:bg-navy-100"
                      )}
                    >
                      {bhk} BHK
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button 
              className="w-full mt-8 bg-navy-500 hover:bg-navy-600 h-12"
              onClick={() => setStep(2)}
            >
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step 2: Lifestyle */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-navy-100 p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-navy-900 mb-6">Lifestyle Preferences</h2>

            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-navy-700 mb-2 block">Family Size</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, '6+'].map(size => (
                    <button
                      key={size}
                      onClick={() => setPreferences(prev => ({ ...prev, familySize: typeof size === 'number' ? size : 6 }))}
                      className={cn(
                        "flex-1 py-3 rounded-lg text-sm font-medium transition-all",
                        preferences.familySize === (typeof size === 'number' ? size : 6)
                          ? "bg-navy-500 text-white"
                          : "bg-navy-50 text-navy-600 hover:bg-navy-100"
                      )}
                    >
                      <Users className="w-4 h-4 mx-auto mb-1" />
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-navy-700 mb-3 block">Do you have pets?</label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setPreferences(prev => ({ ...prev, hasPets: true }))}
                    className={cn(
                      "flex-1 py-4 rounded-xl border-2 transition-all",
                      preferences.hasPets
                        ? "border-navy-500 bg-navy-50"
                        : "border-navy-100 hover:border-navy-200"
                    )}
                  >
                    <Dog className="w-6 h-6 mx-auto mb-2 text-navy-600" />
                    <span className="font-medium text-navy-700">Yes, I have pets</span>
                  </button>
                  <button
                    onClick={() => setPreferences(prev => ({ ...prev, hasPets: false }))}
                    className={cn(
                      "flex-1 py-4 rounded-xl border-2 transition-all",
                      !preferences.hasPets
                        ? "border-navy-500 bg-navy-50"
                        : "border-navy-100 hover:border-navy-200"
                    )}
                  >
                    <Home className="w-6 h-6 mx-auto mb-2 text-navy-600" />
                    <span className="font-medium text-navy-700">No pets</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-navy-700 mb-3 block">
                  What matters most to you? (Select up to 3)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {priorities.map(p => {
                    const Icon = p.icon;
                    const isSelected = preferences.selectedPriorities.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => togglePriority(p.id)}
                        className={cn(
                          "p-4 rounded-xl border-2 text-left transition-all",
                          isSelected
                            ? "border-navy-500 bg-navy-50"
                            : "border-navy-100 hover:border-navy-200"
                        )}
                      >
                        <Icon className={cn("w-5 h-5 mb-2", isSelected ? "text-navy-600" : "text-navy-400")} />
                        <span className={cn("font-medium text-sm", isSelected ? "text-navy-800" : "text-navy-600")}>
                          {p.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <Button 
                variant="outline" 
                className="flex-1 border-navy-200"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button 
                className="flex-1 bg-navy-500 hover:bg-navy-600 h-12"
                onClick={() => setStep(3)}
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Analyze */}
        {step === 3 && (
          <div className="bg-white rounded-2xl border border-navy-100 p-8 shadow-sm text-center">
            {!isAnalyzing ? (
              <>
                <h2 className="text-2xl font-semibold text-navy-900 mb-4">Ready to find your perfect society?</h2>
                <p className="text-navy-500 mb-8">
                  Our AI will analyze 100+ societies based on your preferences and recommend the best matches.
                </p>

                <div className="bg-ivory-100 rounded-xl p-6 mb-8 text-left">
                  <h3 className="font-semibold text-navy-900 mb-3">Summary</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm text-navy-600">
                      <IndianRupee className="w-4 h-4 text-navy-400" />
                      Budget: {formatPrice(preferences.budget)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-navy-600">
                      <Briefcase className="w-4 h-4 text-navy-400" />
                      Office: {preferences.officeLocation || 'Any'}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-navy-600">
                      <Home className="w-4 h-4 text-navy-400" />
                      {preferences.bhk} BHK
                    </div>
                    <div className="flex items-center gap-2 text-sm text-navy-600">
                      <Users className="w-4 h-4 text-navy-400" />
                      Family: {preferences.familySize}
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full bg-navy-500 hover:bg-navy-600 h-14 text-lg"
                  onClick={handleAnalyze}
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Find My Perfect Society
                </Button>
              </>
            ) : (
              <div className="py-12">
                <div className="w-20 h-20 bg-navy-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <Loader2 className="w-10 h-10 text-navy-500 animate-spin" />
                </div>
                <h3 className="text-xl font-semibold text-navy-900 mb-2">Analyzing societies...</h3>
                <p className="text-navy-500">Our AI is evaluating 100+ parameters across all societies</p>
                <div className="mt-6 max-w-md mx-auto">
                  <div className="h-2 bg-navy-100 rounded-full overflow-hidden">
                    <div className="h-full bg-navy-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
