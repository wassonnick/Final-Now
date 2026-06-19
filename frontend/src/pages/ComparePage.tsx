import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Plus, ArrowRight, CheckCircle2, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store';
import { cn, getScoreGrade, formatPrice } from '@/lib/utils';
import type { Society } from '@/types';
import { societyPlaceholderImage } from '@/lib/societyImages';

const scoreCategories = [
  { key: 'security_score', label: 'Security' },
  { key: 'maintenance_score', label: 'Maintenance' },
  { key: 'amenities_score', label: 'Amenities' },
  { key: 'connectivity_score', label: 'Connectivity' },
  { key: 'family_friendly_score', label: 'Family Friendly' },
  { key: 'pet_friendly_score', label: 'Pet Friendly' },
  { key: 'construction_quality_score', label: 'Construction' },
  { key: 'rental_demand_score', label: 'Rental Demand' },
];

const amenityList = [
  'swimming_pool', 'gym', 'club_house', 'tennis_court', 'basketball_court',
  'jogging_track', 'kids_play_area', 'senior_citizen_area', 'party_hall', 'library', 'spa'
];

export function ComparePage() {
  const { compareList, removeFromCompare, clearCompare } = useAppStore();
  const [showAddModal, setShowAddModal] = useState(false);

  if (compareList.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <section className="border-b border-navy-100 bg-white">
          <div className="container mx-auto px-4 py-10">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Compare journey</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-extrabold text-navy-900 md:text-5xl">Shortlist societies with the same decision grid.</h1>
            <p className="mt-3 max-w-2xl text-navy-500">
              Compare location, live inventory, amenities and public-safe data before opening a society profile or asking AI for a recommendation.
            </p>
          </div>
        </section>

        <div className="container mx-auto px-4 py-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="rounded-[2rem] border border-navy-100 bg-white p-7 shadow-sm">
              <div className="grid gap-4 md:grid-cols-3">
                {['DLF Park Place', 'M3M Heights', 'Emaar Palm Hills'].map((name, index) => (
                  <div key={name} className="rounded-[1.5rem] bg-[#F8FAFC] p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-navy-400">Society {index + 1}</p>
                    <h3 className="mt-3 text-xl font-bold text-navy-900">{name}</h3>
                    <div className="mt-5 space-y-3 text-sm text-navy-600">
                      <div className="flex justify-between"><span>Score</span><span className="font-bold text-navy-900">{['9.1', '8.7', '8.4'][index]}</span></div>
                      <div className="flex justify-between"><span>Metro</span><span>Nearby</span></div>
                      <div className="flex justify-between"><span>Inventory</span><span>Live</span></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-7 flex flex-col gap-3 rounded-[1.5rem] bg-blue-50 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-bold text-navy-900">No societies selected yet</h2>
                  <p className="mt-1 text-sm text-navy-600">Start from search, then open society profiles and compare your shortlist.</p>
                </div>
                <Button asChild className="rounded-full bg-blue-600 hover:bg-blue-700">
                  <Link to="/search?tab=societies">
                    Browse Societies <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>

            <aside className="rounded-[2rem] border border-navy-100 bg-navy-900 p-6 text-white shadow-sm">
              <Plus className="h-6 w-6 text-blue-200" />
              <h2 className="mt-4 text-2xl font-bold">Need a ranked answer?</h2>
              <p className="mt-3 text-sm leading-6 text-navy-200">
                Use the advisor when the choice depends on budget, commute, school access or rental intent.
              </p>
              <Button asChild className="mt-6 w-full rounded-full bg-white text-navy-900 hover:bg-navy-100">
                <Link to="/ai-advisor">Open AI Advisor</Link>
              </Button>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  const getBestScore = (key: string) => {
    return Math.max(...compareList.map(s => s[key as keyof Society] as number));
  };

  return (
    <div className="min-h-screen bg-ivory-100">
      <div className="bg-white border-b border-navy-100">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600">Compare journey</p>
              <h1 className="mt-1 text-2xl font-semibold text-navy-900">Compare Societies</h1>
              <p className="text-sm text-navy-500 mt-1">Side-by-side comparison on intelligence, amenities, stats and next actions</p>
            </div>
            <div className="flex items-center gap-3">
              {compareList.length < 3 && (
                <Link to="/search">
                  <Button variant="outline" className="border-navy-200">
                    <Plus className="w-4 h-4 mr-2" /> Add Society
                  </Button>
                </Link>
              )}
              <Button variant="ghost" className="text-navy-500" onClick={clearCompare}>
                <X className="w-4 h-4 mr-2" /> Clear All
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left p-4 w-48 bg-white rounded-tl-xl sticky left-0 z-10">Parameter</th>
                {compareList.map(society => (
                  <th key={society.id} className="p-4 min-w-[280px] bg-white">
                    <div className="relative">
                      <button
                        onClick={() => removeFromCompare(society.id)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors"
                      >
                        <X className="w-3 h-3 text-red-600" />
                      </button>
                      <img 
                        src={society.cover_image || societyPlaceholderImage(society.name, society.locality?.name || 'Gurugram')} 
                        alt={society.name}
                        className="w-full h-32 object-cover rounded-xl mb-3"
                      />
                      <h3 className="font-semibold text-navy-900">{society.name}</h3>
                      <p className="text-sm text-navy-500">{society.locality?.name}</p>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="space-y-2">
              {/* Overall Score */}
              <tr className="bg-white">
                <td className="p-4 font-semibold text-navy-900 sticky left-0 bg-white">Overall Score</td>
                {compareList.map(society => (
                  <td key={society.id} className="p-4 text-center">
                    <div className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-xl",
                      society.overall_score >= 90 ? 'bg-green-50' :
                      society.overall_score >= 75 ? 'bg-lime-50' : 'bg-yellow-50'
                    )}>
                      <span className={cn(
                        "text-2xl font-bold",
                        society.overall_score >= 90 ? 'text-green-700' :
                        society.overall_score >= 75 ? 'text-lime-700' : 'text-yellow-700'
                      )}>
                        {society.overall_score}
                      </span>
                      <span className="text-sm font-medium text-navy-600">/100</span>
                    </div>
                    <p className="text-sm font-semibold mt-1">{getScoreGrade(society.overall_score)}</p>
                  </td>
                ))}
              </tr>

              <tr><td colSpan={compareList.length + 1}><div className="h-2" /></td></tr>

              {/* Score Breakdown */}
              {scoreCategories.map(cat => {
                const bestScore = getBestScore(cat.key);
                return (
                  <tr key={cat.key} className="bg-white hover:bg-navy-50/50 transition-colors">
                    <td className="p-4 font-medium text-navy-700 sticky left-0 bg-white">{cat.label}</td>
                    {compareList.map(society => {
                      const score = society[cat.key as keyof Society] as number;
                      const isBest = score === bestScore;
                      return (
                        <td key={society.id} className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="h-2 bg-navy-100 rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    isBest ? "bg-green-500" : "bg-navy-400"
                                  )}
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                            </div>
                            <span className={cn(
                              "font-semibold w-10 text-right",
                              isBest ? "text-green-600" : "text-navy-700"
                            )}>
                              {score}
                            </span>
                            {isBest && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              <tr><td colSpan={compareList.length + 1}><div className="h-2" /></td></tr>

              {/* Amenities */}
              <tr className="bg-white">
                <td className="p-4 font-semibold text-navy-900 sticky left-0 bg-white" colSpan={compareList.length + 1}>
                  Amenities Comparison
                </td>
              </tr>
              {amenityList.map(amenity => (
                <tr key={amenity} className="bg-white hover:bg-navy-50/50 transition-colors">
                  <td className="p-4 text-sm text-navy-600 sticky left-0 bg-white capitalize">
                    {amenity.replace(/_/g, ' ')}
                  </td>
                  {compareList.map(society => {
                    const hasAmenity = society.amenities?.[amenity];
                    return (
                      <td key={society.id} className="p-4 text-center">
                        {hasAmenity ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <Minus className="w-5 h-5 text-navy-300 mx-auto" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              <tr><td colSpan={compareList.length + 1}><div className="h-2" /></td></tr>

              {/* Quick Stats */}
              <tr className="bg-white">
                <td className="p-4 font-semibold text-navy-900 sticky left-0 bg-white">Quick Stats</td>
                {compareList.map(society => (
                  <td key={society.id} className="p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-navy-500">Towers</span>
                        <span className="font-medium">{society.total_towers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-navy-500">Units</span>
                        <span className="font-medium">{society.total_units}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-navy-500">Possession</span>
                        <span className="font-medium">{society.possession_year}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-navy-500">Reviews</span>
                        <span className="font-medium">{society.review_count}</span>
                      </div>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Rent Estimate */}
              <tr className="bg-white">
                <td className="p-4 font-semibold text-navy-900 sticky left-0 bg-white">Avg. 3BHK Rent</td>
                {compareList.map(society => (
                  <td key={society.id} className="p-4 text-center">
                    <p className="text-lg font-bold text-navy-900">
                      {formatPrice(society.locality?.avg_rent_3bhk || 0)}
                    </p>
                  </td>
                ))}
              </tr>

              {/* Actions */}
              <tr className="bg-white">
                <td className="p-4 sticky left-0 bg-white rounded-bl-xl" />
                {compareList.map(society => (
                  <td key={society.id} className="p-4">
                    <Link to={`/society/${society.slug}`}>
                      <Button className="w-full bg-navy-500 hover:bg-navy-600">
                        View Details <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
