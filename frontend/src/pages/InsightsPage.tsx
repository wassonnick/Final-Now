// C71 insights copy: data-driven society and investment decision language.
import { useState } from 'react';
import { TrendingUp, TrendingDown, MapPin, Home, DollarSign, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, formatPrice } from '@/lib/utils';

const localityData = [
  { name: 'Golf Course Road', rent_1bhk: 28000, rent_2bhk: 52000, rent_3bhk: 75000, rent_4bhk: 120000, trend: 12, demand: 'High', occupancy: 94 },
  { name: 'DLF Phase 1-5', rent_1bhk: 25000, rent_2bhk: 45000, rent_3bhk: 65000, rent_4bhk: 95000, trend: 8, demand: 'High', occupancy: 92 },
  { name: 'Golf Course Extension', rent_1bhk: 18000, rent_2bhk: 35000, rent_3bhk: 50000, rent_4bhk: 75000, trend: 15, demand: 'Very High', occupancy: 96 },
  { name: 'Sohna Road', rent_1bhk: 14000, rent_2bhk: 26000, rent_3bhk: 40000, rent_4bhk: 60000, trend: 5, demand: 'Medium', occupancy: 88 },
  { name: 'Sector 57', rent_1bhk: 16000, rent_2bhk: 28000, rent_3bhk: 45000, rent_4bhk: 65000, trend: 7, demand: 'Medium', occupancy: 90 },
  { name: 'Sushant Lok', rent_1bhk: 17000, rent_2bhk: 32000, rent_3bhk: 48000, rent_4bhk: 70000, trend: 6, demand: 'Medium', occupancy: 89 },
];

const rentTrends = [
  { month: 'Jan', golf_course: 48000, dlf: 42000, extension: 32000 },
  { month: 'Feb', golf_course: 48500, dlf: 42500, extension: 32500 },
  { month: 'Mar', golf_course: 49000, dlf: 43000, extension: 33000 },
  { month: 'Apr', golf_course: 50000, dlf: 43500, extension: 33500 },
  { month: 'May', golf_course: 51000, dlf: 44000, extension: 34000 },
  { month: 'Jun', golf_course: 52000, dlf: 45000, extension: 35000 },
];

export function InsightsPage() {
  const [selectedBhk, setSelectedBhk] = useState(2);

  const bhkKey = `rent_${selectedBhk}bhk` as keyof typeof localityData[0];

  return (
    <div className="min-h-screen bg-ivory-100">
      <div className="bg-navy-500 py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3">
            Gurgaon Real Estate Insights: Data-Driven Decisions
          </h1>
          <p className="text-lg text-navy-200">
            Understand market trends, price movement, rental yields and investment returns before shortlisting a Gurgaon society.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Avg Rent (2BHK)', value: '₹42,500', trend: '+8%', up: true },
            { label: 'Avg. Property Growth', value: '12.5%', trend: 'YoY', up: true },
            { label: 'Avg Occupancy', value: '91.5%', trend: '+2%', up: true },
            { label: 'Active Listings', value: '2,450', trend: '+15%', up: true },
          ].map((metric, i) => (
            <div key={i} className="bg-white rounded-xl border border-navy-100 p-5">
              <p className="text-sm text-navy-500 mb-1">{metric.label}</p>
              <p className="text-2xl font-bold text-navy-900">{metric.value}</p>
              <div className="flex items-center gap-1 mt-1">
                {metric.up ? (
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                )}
                <span className={cn("text-sm", metric.up ? "text-green-600" : "text-red-600")}>
                  {metric.trend}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* BHK Selector */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm font-medium text-navy-700">View rent for:</span>
          {[1, 2, 3, 4].map(bhk => (
            <button
              key={bhk}
              onClick={() => setSelectedBhk(bhk)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                selectedBhk === bhk
                  ? "bg-navy-500 text-white"
                  : "bg-white text-navy-600 border border-navy-200 hover:border-navy-300"
              )}
            >
              {bhk} BHK
            </button>
          ))}
        </div>

        {/* Locality Comparison Table */}
        <div className="bg-white rounded-2xl border border-navy-100 overflow-hidden mb-8">
          <div className="p-6 border-b border-navy-100">
            <h2 className="text-xl font-semibold text-navy-900">Rent by Locality</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-navy-50">
                  <th className="text-left p-4 text-sm font-semibold text-navy-700">Locality</th>
                  <th className="text-right p-4 text-sm font-semibold text-navy-700">Avg Rent</th>
                  <th className="text-center p-4 text-sm font-semibold text-navy-700">YoY Trend</th>
                  <th className="text-center p-4 text-sm font-semibold text-navy-700">Demand</th>
                  <th className="text-center p-4 text-sm font-semibold text-navy-700">Occupancy</th>
                </tr>
              </thead>
              <tbody>
                {localityData.map((loc, i) => (
                  <tr key={i} className="border-t border-navy-50 hover:bg-navy-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-navy-400" />
                        <span className="font-medium text-navy-900">{loc.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right font-bold text-navy-900">
                      {formatPrice(loc[bhkKey] as number)}
                    </td>
                    <td className="p-4 text-center">
                      <Badge className={cn(
                        loc.trend > 10 ? "bg-green-100 text-green-700" :
                        loc.trend > 5 ? "bg-lime-100 text-lime-700" :
                        "bg-yellow-100 text-yellow-700"
                      )}>
                        <TrendingUp className="w-3 h-3 mr-1" /> +{loc.trend}%
                      </Badge>
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant="outline" className={cn(
                        loc.demand === 'Very High' ? "border-green-300 text-green-700" :
                        loc.demand === 'High' ? "border-lime-300 text-lime-700" :
                        "border-yellow-300 text-yellow-700"
                      )}>
                        {loc.demand}
                      </Badge>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-navy-100 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full",
                              loc.occupancy >= 95 ? "bg-green-500" :
                              loc.occupancy >= 90 ? "bg-lime-500" : "bg-yellow-500"
                            )}
                            style={{ width: `${loc.occupancy}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-navy-700">{loc.occupancy}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trend Chart Placeholder */}
        <div className="bg-white rounded-2xl border border-navy-100 p-6">
          <h2 className="text-xl font-semibold text-navy-900 mb-4">6-Month Rent Trend (2BHK)</h2>
          <div className="h-64 flex items-end gap-4">
            {rentTrends.map((month, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex gap-1 h-48 items-end">
                  <div 
                    className="flex-1 bg-navy-500 rounded-t-lg opacity-80"
                    style={{ height: `${(month.golf_course / 60000) * 100}%` }}
                    title={`Golf Course: ₹${month.golf_course}`}
                  />
                  <div 
                    className="flex-1 bg-navy-300 rounded-t-lg opacity-60"
                    style={{ height: `${(month.dlf / 60000) * 100}%` }}
                    title={`DLF: ₹${month.dlf}`}
                  />
                  <div 
                    className="flex-1 bg-gold-500 rounded-t-lg opacity-80"
                    style={{ height: `${(month.extension / 60000) * 100}%` }}
                    title={`Extension: ₹${month.extension}`}
                  />
                </div>
                <span className="text-xs text-navy-500">{month.month}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-navy-500 rounded" />
              <span className="text-sm text-navy-600">Golf Course Road</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-navy-300 rounded" />
              <span className="text-sm text-navy-600">DLF Phase</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gold-500 rounded" />
              <span className="text-sm text-navy-600">Golf Course Ext</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
