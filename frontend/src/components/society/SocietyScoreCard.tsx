import { Shield, Wrench, Dumbbell, Train, Users, Dog, HardHat, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn, getScoreColor, getScoreGrade } from '@/lib/utils';
import type { Society } from '@/types';

interface ScoreCardProps {
  society: Society;
  compact?: boolean;
}

const scoreConfig = [
  { key: 'security_score', label: 'Security', icon: Shield, weight: 0.20, color: 'bg-blue-500' },
  { key: 'maintenance_score', label: 'Maintenance', icon: Wrench, weight: 0.20, color: 'bg-emerald-500' },
  { key: 'amenities_score', label: 'Amenities', icon: Dumbbell, weight: 0.15, color: 'bg-purple-500' },
  { key: 'connectivity_score', label: 'Connectivity', icon: Train, weight: 0.15, color: 'bg-orange-500' },
  { key: 'family_friendly_score', label: 'Family Friendly', icon: Users, weight: 0.10, color: 'bg-pink-500' },
  { key: 'pet_friendly_score', label: 'Pet Friendly', icon: Dog, weight: 0.05, color: 'bg-teal-500' },
  { key: 'construction_quality_score', label: 'Construction', icon: HardHat, weight: 0.10, color: 'bg-indigo-500' },
  { key: 'rental_demand_score', label: 'Rental Demand', icon: TrendingUp, weight: 0.05, color: 'bg-amber-500' },
];

export function SocietyScoreCard({ society, compact = false }: ScoreCardProps) {
  const overall = society.overall_score;
  const grade = getScoreGrade(overall);
  const colorClass = getScoreColor(overall);

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold", colorClass)}>
          {grade}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-navy-700">Society Score</span>
            <span className="text-sm font-bold text-navy-900">{overall}/100</span>
          </div>
          <div className="h-2 bg-navy-100 rounded-full overflow-hidden">
            <div 
              className={cn("h-full rounded-full transition-all duration-700", 
                overall >= 90 ? 'bg-green-500' : overall >= 75 ? 'bg-lime-500' : overall >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{ width: `${overall}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-gradient-to-br from-navy-500 to-navy-700 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-navy-100">Society Intelligence Score</h3>
            <p className="text-sm text-navy-200 mt-1">Based on 8 verified parameters</p>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
              <div>
                <span className="text-3xl font-bold">{grade}</span>
                <p className="text-xs text-navy-200">Grade</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-5xl font-bold">{overall}</span>
          <span className="text-lg text-navy-200 mb-2">/100</span>
        </div>
        <div className="mt-3 h-3 bg-navy-800/50 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gold-400 rounded-full transition-all duration-1000"
            style={{ width: `${overall}%` }}
          />
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="p-6 space-y-4">
        {scoreConfig.map((config) => {
          const score = society[config.key as keyof Society] as number;
          const Icon = config.icon;
          return (
            <div key={config.key} className="group">
              <div className="flex items-center gap-3 mb-1.5">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", config.color.replace('bg-', 'bg-opacity-10 bg-'))}>
                  <Icon className={cn("w-4 h-4", config.color.replace('bg-', 'text-'))} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-navy-700">{config.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-navy-900">{score}</span>
                      <span className="text-xs text-navy-400">({Math.round(config.weight * 100)}%)</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="ml-11">
                <div className="h-2 bg-navy-50 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-700", config.color)}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Verdict */}
      <div className="px-6 pb-6">
        <div className={cn(
          "p-4 rounded-xl flex items-start gap-3",
          overall >= 80 ? 'bg-green-50 border border-green-200' : overall >= 65 ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'
        )}>
          {overall >= 80 ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="text-sm font-medium text-navy-800">
              {overall >= 90 ? 'Exceptional society. Highly recommended for premium renters.' :
               overall >= 80 ? 'Excellent society with strong fundamentals. Great choice.' :
               overall >= 70 ? 'Good society with some areas for improvement. Worth considering.' :
               'Average society. Evaluate carefully before deciding.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
