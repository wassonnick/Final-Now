import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BedDouble,
  Building2,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  Star,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

type Property = {
  id: number;
  title: string;
  slug: string;
  listing_type?: string;
  property_type?: string;
  bedrooms?: string | number;
  area_sqft?: string | number;
  price?: string | number;
  furnished_status?: string;
  featured?: boolean;
  verified?: boolean;
  locality?: string;
  society?: string;
  images?: string[] | null;
};

type ApiResponse = {
  status?: string;
  data?: {
    data?: Property[];
  } | Property[];
};

const fallbackImage =
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1400&q=80';

function extractProperties(payload: ApiResponse): Property[] {
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.data)) return payload.data.data;
  return [];
}

function propertyImage(property: Property) {
  if (Array.isArray(property.images) && property.images[0]) {
    return property.images[0];
  }

  return fallbackImage;
}

export function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(Boolean(API_BASE_URL));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadProperties() {
      if (!API_BASE_URL) {
        setLoading(false);
        setError('API URL missing.');
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/properties`);

        if (!response.ok) {
          throw new Error('Unable to fetch properties');
        }

        const json: ApiResponse = await response.json();

        if (mounted) {
          setProperties(extractProperties(json));
          setError(null);
        }
      } catch {
        if (mounted) {
          setError('Unable to load properties.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProperties();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredProperties = useMemo(() => {
    const value = query.trim().toLowerCase();

    if (!value) return properties;

    return properties.filter((property) =>
      [
        property.title,
        property.society,
        property.locality,
        property.property_type,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(value)
    );
  }, [properties, query]);

  return (
    <div className="min-h-screen bg-ivory-100">
      <section className="border-b border-navy-100 bg-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-4 py-1 text-sm font-medium text-blue-700">
              Live Gurgaon Inventory
            </div>

            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-navy-900 md:text-6xl">
              Discover verified Gurgaon properties
            </h1>

            <p className="mt-5 text-lg leading-relaxed text-navy-500">
              Browse premium rental inventory backed by SocietyFlats intelligence,
              verified societies and real pricing insights.
            </p>
          </div>

          <div className="mt-8 flex max-w-2xl items-center gap-3 rounded-full border border-navy-100 bg-ivory-100 px-5 py-3 shadow-sm">
            <Search className="h-5 w-5 text-navy-400" />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search property, society or locality..."
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
              <p className="mt-4 text-navy-500">Loading live properties...</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-amber-800">
            {error}
          </div>
        ) : filteredProperties.length ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredProperties.map((property) => (
              <Link
                key={property.id}
                to={`/property/${property.slug}`}
                className="group overflow-hidden rounded-[2rem] border border-navy-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-soft"
              >
                <div className="relative h-64 overflow-hidden bg-navy-50">
                  <img
                    src={propertyImage(property)}
                    alt={property.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  <div className="absolute left-4 top-4 flex gap-2">
                    <div className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-navy-700">
                      {property.listing_type || 'Rent'}
                    </div>

                    {property.featured ? (
                      <div className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        <Star className="h-3 w-3" />
                        Featured
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="line-clamp-1 text-xl font-bold text-navy-900">
                        {property.title}
                      </h2>

                      <p className="mt-2 flex items-center gap-2 text-sm text-navy-500">
                        <MapPin className="h-4 w-4" />
                        {property.society || property.locality || 'Gurgaon'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-navy-600 px-4 py-3 text-center text-white">
                      <p className="text-xs text-white/70">Price</p>
                      <p className="text-sm font-bold">
                        {property.price || 'On request'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-ivory-200 p-3 text-center">
                      <BedDouble className="mx-auto h-4 w-4 text-navy-500" />
                      <p className="mt-2 text-xs text-navy-400">BHK</p>
                      <p className="font-bold text-navy-900">
                        {property.bedrooms || '-'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-ivory-200 p-3 text-center">
                      <Building2 className="mx-auto h-4 w-4 text-navy-500" />
                      <p className="mt-2 text-xs text-navy-400">Type</p>
                      <p className="font-bold text-navy-900">
                        {property.property_type || 'Apartment'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-ivory-200 p-3 text-center">
                      <ShieldCheck className="mx-auto h-4 w-4 text-navy-500" />
                      <p className="mt-2 text-xs text-navy-400">Area</p>
                      <p className="font-bold text-navy-900">
                        {property.area_sqft || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-navy-100 pt-4">
                    <span className="text-sm text-navy-500">
                      {property.furnished_status || 'Semi Furnished'}
                    </span>

                    <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
                      View Property
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-navy-100 bg-white p-10 text-center">
            <h2 className="text-2xl font-bold text-navy-900">
              No properties found
            </h2>

            <p className="mt-2 text-navy-500">
              Try searching with another locality or society.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
