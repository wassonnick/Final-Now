import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Loader2, MapPin, Search, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://final-now.onrender.com/api';

type Society = {
  id: number;
  name: string;
  slug: string;
  builder?: string | null;
  sector?: string | null;
  locality?: string | null;
  description?: string | null;
  rent_range?: string | null;
  buy_range?: string | null;
  score?: string | number | null;
  status?: string | null;
  featured?: boolean;
  cover_image?: string | null;
  gallery_images?: string[] | null;
  image_url?: string | null;
  image_status?: string | null;
  properties_count?: number;
};

type ApiResponse = {
  status?: string;
  data?: {
    data?: Society[];
  } | Society[];
};

const fallbackImage =
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80';

function extractSocieties(payload: ApiResponse): Society[] {
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.data)) return payload.data.data;
  return [];
}

function societyImage(society: Society) {
  const approved = ['licensed_uploaded', 'self_shot_uploaded', 'developer_permission_received'].includes(String(society.image_status || ''));
  if (approved && society.image_url) return society.image_url;
  if (approved && society.cover_image) return society.cover_image;
  if (approved && Array.isArray(society.gallery_images) && society.gallery_images[0]) return society.gallery_images[0];
  return fallbackImage;
}

function societyLocation(society: Society) {
  return [society.sector, society.locality].filter(Boolean).join(', ') || 'Gurgaon';
}

export function SocietiesPage() {
  const [societies, setSocieties] = useState<Society[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(Boolean(API_BASE_URL));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSocieties() {
      if (!API_BASE_URL) {
        setLoading(false);
        setError('Live API URL is not configured.');
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/societies`);
        if (!response.ok) throw new Error('Unable to fetch societies');

        const json: ApiResponse = await response.json();

        if (mounted) {
          setSocieties(extractSocieties(json));
          setError(null);
        }
      } catch {
        if (mounted) {
          setError('Unable to load societies right now.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSocieties();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredSocieties = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return societies;

    return societies.filter((society) => {
      return [
        society.name,
        society.builder,
        society.sector,
        society.locality,
        society.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(value);
    });
  }, [query, societies]);

  return (
    <div className="min-h-screen bg-ivory-100">
      <section className="border-b border-navy-100 bg-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl">
            <Badge className="rounded-full border-blue-100 bg-blue-50 px-4 py-1 text-blue-700">
              Gurgaon Society Intelligence
            </Badge>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-navy-900 md:text-6xl">
              Explore verified societies in Gurgaon
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-navy-500">
              Compare society scores, rent ranges, sale ranges, amenities and available inventory before shortlisting your next home.
            </p>
          </div>

          <div className="mt-8 flex max-w-2xl items-center gap-3 rounded-full border border-navy-100 bg-ivory-100 px-5 py-3 shadow-sm">
            <Search className="h-5 w-5 text-navy-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search society, sector, builder or locality..."
              className="w-full bg-transparent text-navy-800 outline-none placeholder:text-navy-400"
            />
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-[2rem] border border-navy-100 bg-white">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
              <p className="mt-4 text-navy-500">Loading live societies...</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-amber-800">
            {error}
          </div>
        ) : filteredSocieties.length ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredSocieties.map((society) => (
              <Link
                key={society.id || society.slug}
                to={`/society/${society.slug}`}
                className="group overflow-hidden rounded-[2rem] border border-navy-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-soft"
              >
                <div className="relative h-56 bg-navy-50">
                  <img
                    src={societyImage(society)}
                    alt={society.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute left-4 top-4 flex gap-2">
                    {society.featured ? (
                      <Badge className="rounded-full bg-amber-50 text-amber-700">
                        <Star className="mr-1 h-3 w-3" /> Featured
                      </Badge>
                    ) : null}
                    <Badge className="rounded-full bg-white/90 text-navy-700">
                      {society.status || 'Verified'}
                    </Badge>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-navy-900">{society.name}</h2>
                      <p className="mt-2 flex items-center gap-2 text-sm text-navy-500">
                        <MapPin className="h-4 w-4" />
                        {societyLocation(society)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-navy-600 px-4 py-3 text-center text-white">
                      <p className="text-xs text-white/70">Score</p>
                      <p className="text-xl font-bold">{society.score || '8.5'}</p>
                    </div>
                  </div>

                  <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-navy-500">
                    {society.description || 'Verified Gurgaon society with live inventory and society intelligence.'}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-ivory-200 p-4">
                      <p className="text-xs text-navy-400">Rent range</p>
                      <p className="mt-1 font-bold text-navy-900">{society.rent_range || 'On request'}</p>
                    </div>
                    <div className="rounded-2xl bg-ivory-200 p-4">
                      <p className="text-xs text-navy-400">Buy range</p>
                      <p className="mt-1 font-bold text-navy-900">{society.buy_range || 'On request'}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-navy-100 pt-4">
                    <span className="flex items-center gap-2 text-sm text-navy-500">
                      <Building2 className="h-4 w-4" />
                      {society.properties_count || 0} listings
                    </span>
                    <Button variant="ghost" className="rounded-full text-blue-700 hover:bg-blue-50">
                      View society
                    </Button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-navy-100 bg-white p-10 text-center">
            <h2 className="text-2xl font-bold text-navy-900">No societies found</h2>
            <p className="mt-2 text-navy-500">Try a different society, builder, sector or locality.</p>
          </div>
        )}
      </section>
    </div>
  );
}
