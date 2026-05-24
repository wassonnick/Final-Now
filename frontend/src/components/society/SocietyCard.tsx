import { Link } from 'react-router-dom';
import { MapPin, Home, Star, TrendingUp, Shield, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SocietyScoreCard } from './SocietyScoreCard';
import { cn, formatPrice } from '@/lib/utils';
import type { Society } from '@/types';

interface SocietyCardProps {
  society: Society;
  featured?: boolean;
}

export function SocietyCard({ society, featured = false }: SocietyCardProps) {
  const avgRent = society.locality?.avg_rent_2bhk || 35000;

  return (
    <div className={cn(
      "group bg-white rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-xl",
      featured ? 'border-gold-300 shadow-md' : 'border-navy-100 shadow-sm'
    )}>
      {/* Image Section */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <img 
          src={society.cover_image || `https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=500&fit=crop`} 
          alt={society.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900/60 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {society.is_verified && (
            <Badge className="bg-green-500/90 text-white border-0 text-xs">
              <Shield className="w-3 h-3 mr-1" /> Verified
            </Badge>
          )}
          {featured && (
            <Badge className="bg-gold-500/90 text-navy-900 border-0 text-xs font-semibold">
              <Star className="w-3 h-3 mr-1" /> Featured
            </Badge>
          )}
          {society.construction_status === 'ready' && (
            <Badge variant="secondary" className="bg-white/90 text-navy-700 text-xs">
              Ready to Move
            </Badge>
          )}
        </div>

        {/* Score Overlay */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="glass-card rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold",
                society.overall_score >= 90 ? 'bg-green-100 text-green-700' :
                society.overall_score >= 75 ? 'bg-lime-100 text-lime-700' :
                'bg-yellow-100 text-yellow-700'
              )}>
                {society.overall_score}
              </div>
              <div>
                <p className="text-xs font-medium text-navy-700">Society Score</p>
                <p className="text-xs text-navy-500">{society.review_count} reviews</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-navy-500">Avg. Rent</p>
              <p className="text-sm font-bold text-navy-900">{formatPrice(avgRent)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h3 className="text-lg font-semibold text-navy-900 group-hover:text-navy-600 transition-colors">
              {society.name}
            </h3>
            <div className="flex items-center gap-1 text-sm text-navy-500 mt-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{society.locality?.name || 'Gurgaon'}</span>
            </div>
          </div>
          {society.builder && (
            <div className="text-right shrink-0">
              <p className="text-xs text-navy-400">by</p>
              <p className="text-sm font-medium text-navy-700">{society.builder.name}</p>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 my-4 py-4 border-y border-navy-50">
          <div className="text-center">
            <p className="text-lg font-bold text-navy-900">{society.total_towers}</p>
            <p className="text-xs text-navy-500">Towers</p>
          </div>
          <div className="text-center border-x border-navy-50">
            <p className="text-lg font-bold text-navy-900">{society.total_units}</p>
            <p className="text-xs text-navy-500">Units</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-navy-900">{society.possession_year}</p>
            <p className="text-xs text-navy-500">Possession</p>
          </div>
        </div>

        {/* Amenities Preview */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(society.amenities || {})
            .filter(([_, v]) => v)
            .slice(0, 4)
            .map(([key]) => (
              <Badge key={key} variant="outline" className="text-xs border-navy-200 text-navy-600">
                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            ))}
          {Object.values(society.amenities || {}).filter(Boolean).length > 4 && (
            <Badge variant="outline" className="text-xs border-navy-200 text-navy-400">
              +{Object.values(society.amenities || {}).filter(Boolean).length - 4} more
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link to={`/society/${society.slug}`} className="flex-1">
            <Button className="w-full bg-navy-500 hover:bg-navy-600 text-white">
              <Eye className="w-4 h-4 mr-2" />
              View Society
            </Button>
          </Link>
          <Button variant="outline" className="border-navy-200 text-navy-600 hover:bg-navy-50">
            <TrendingUp className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
