import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Home, IndianRupee, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const localities = [
  'DLF Phase 1-5', 'Golf Course Road', 'Golf Course Extension', 
  'Sohna Road', 'Sector 57', 'Sector 49', 'Sushant Lok', 'Dwarka Expressway'
];

const bhkOptions = [1, 2, 3, 4, 5];

const budgetRanges = [
  { label: 'Under ₹25K', min: 0, max: 25000 },
  { label: '₹25K - ₹40K', min: 25000, max: 40000 },
  { label: '₹40K - ₹60K', min: 40000, max: 60000 },
  { label: '₹60K - ₹80K', min: 60000, max: 80000 },
  { label: '₹80K+', min: 80000, max: 500000 },
];

export function HeroSearch() {
  const [query, setQuery] = useState('');
  const [selectedLocality, setSelectedLocality] = useState('');
  const [selectedBhk, setSelectedBhk] = useState<number[]>([]);
  const [selectedBudget, setSelectedBudget] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (selectedLocality) params.set('locality', selectedLocality);
    if (selectedBhk.length) params.set('bhk', selectedBhk.join(','));
    if (selectedBudget) {
      const budget = budgetRanges.find(b => b.label === selectedBudget);
      if (budget) {
        params.set('budgetMin', budget.min.toString());
        params.set('budgetMax', budget.max.toString());
      }
    }
    navigate(`/search?${params.toString()}`);
  };

  const toggleBhk = (bhk: number) => {
    setSelectedBhk(prev => 
      prev.includes(bhk) ? prev.filter(b => b !== bhk) : [...prev, bhk]
    );
  };

  return (
    <div className="relative w-full">
      {/* Background */}
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80')] bg-cover bg-center opacity-20 mix-blend-overlay" />

      <div className="relative container mx-auto px-4 py-20 md:py-28">
        <div className="max-w-4xl mx-auto text-center">
          {/* Headline */}
          <Badge className="mb-6 bg-white/10 text-white border-white/20 backdrop-blur-sm px-4 py-1.5 text-sm">
            <MapPin className="w-3.5 h-3.5 mr-1.5" />
            Currently serving Gurgaon • Bangalore coming soon
          </Badge>

          <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-4 leading-tight">
            Discover Gurgaon's
            <span className="block text-gold-400">Best Societies</span>
            Before You Rent
          </h1>

          <p className="text-lg md:text-xl text-navy-200 mb-10 max-w-2xl mx-auto">
            India's first Society Intelligence Platform. Evaluate societies on security, maintenance, amenities & more — before you even visit.
          </p>

          {/* Search Box */}
          <div className="bg-white rounded-2xl shadow-2xl p-4 md:p-6">
            {/* Main Search */}
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
                <Input
                  type="text"
                  placeholder="Search by society name, locality, or builder..."
                  className="pl-10 h-14 text-base border-navy-200 focus-visible:ring-navy-300"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button 
                size="lg" 
                className="h-14 px-8 bg-navy-500 hover:bg-navy-600 text-white text-base font-medium"
                onClick={handleSearch}
              >
                <Search className="w-5 h-5 mr-2" />
                Search
              </Button>
            </div>

            {/* Quick Filters Toggle */}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm text-navy-500 hover:text-navy-700 transition-colors mb-3"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {showFilters ? 'Hide Filters' : 'More Filters'}
              <ChevronDown className={cn("w-4 h-4 transition-transform", showFilters && "rotate-180")} />
            </button>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="space-y-4 pt-4 border-t border-navy-100 animate-slide-up">
                {/* Locality */}
                <div>
                  <label className="text-sm font-medium text-navy-700 mb-2 block">Locality</label>
                  <div className="flex flex-wrap gap-2">
                    {localities.map(loc => (
                      <button
                        key={loc}
                        onClick={() => setSelectedLocality(selectedLocality === loc ? '' : loc)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm transition-all",
                          selectedLocality === loc 
                            ? "bg-navy-500 text-white" 
                            : "bg-navy-50 text-navy-600 hover:bg-navy-100"
                        )}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>

                {/* BHK */}
                <div>
                  <label className="text-sm font-medium text-navy-700 mb-2 block">BHK</label>
                  <div className="flex flex-wrap gap-2">
                    {bhkOptions.map(bhk => (
                      <button
                        key={bhk}
                        onClick={() => toggleBhk(bhk)}
                        className={cn(
                          "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                          selectedBhk.includes(bhk)
                            ? "bg-navy-500 text-white"
                            : "bg-navy-50 text-navy-600 hover:bg-navy-100"
                        )}
                      >
                        {bhk} BHK
                      </button>
                    ))}
                  </div>
                </div>

                {/* Budget */}
                <div>
                  <label className="text-sm font-medium text-navy-700 mb-2 block">Budget</label>
                  <div className="flex flex-wrap gap-2">
                    {budgetRanges.map(range => (
                      <button
                        key={range.label}
                        onClick={() => setSelectedBudget(selectedBudget === range.label ? '' : range.label)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm transition-all",
                          selectedBudget === range.label
                            ? "bg-gold-500 text-navy-900 font-medium"
                            : "bg-navy-50 text-navy-600 hover:bg-navy-100"
                        )}
                      >
                        <IndianRupee className="w-3 h-3 inline mr-1" />
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
            {[
              { value: '100+', label: 'Societies Verified' },
              { value: '2,500+', label: 'Properties Listed' },
              { value: '8', label: 'Intelligence Parameters' },
              { value: '4.8★', label: 'Average Rating' },
            ].map((stat, i) => (
              <div key={i} className="glass-card rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-navy-200">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
