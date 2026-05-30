import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, ExternalLink, FileText, MapPin, School, Shield, Train } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  findPublicSociety,
  formatPublicLocation,
  getSocietyProperties,
  propertyImage,
  societyImage,
} from '@/lib/publicData';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://final-now.onrender.com/api';

type ApiResponse<T> = {
  status?: string;
  data?: T;
};

type LaravelPaginated<T> = {
  data?: T[];
};

function splitLines(value?: string | null) {
  return String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function field<T = any>(item: any, camel: string, snake: string, fallback?: T): T {
  return (item?.[camel] ?? item?.[snake] ?? fallback) as T;
}

function listField(item: any, camel: string, snake: string): string[] {
  const value = item?.[camel] ?? item?.[snake];

  if (Array.isArray(value)) return value.filter(Boolean);

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function safeSocietyImage(society: any) {
  const imageStatus = field<string>(society, 'imageStatus', 'image_status', 'placeholder');
  const imageApprovedByAdmin = Boolean(field<boolean>(society, 'imageApprovedByAdmin', 'image_approved_by_admin', false));
  const approved = imageApprovedByAdmin
    && ['licensed_uploaded', 'self_shot_uploaded', 'developer_permission_received', 'approved_for_live'].includes(imageStatus);
  const approvedImage = field<string | null>(society, 'imageUrl', 'image_url', null)
    || field<string | null>(society, 'coverImage', 'cover_image', null);

  if (approved && approvedImage) return approvedImage;

  try {
    return societyImage(society);
  } catch {
    return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80';
  }
}

function safePropertyImage(property: any) {
  const images = listField(property, 'images', 'images');
  if (images[0]) return images[0];

  try {
    return propertyImage(property);
  } catch {
    return 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80';
  }
}

function safePropertyUrl(property: any) {
  const rawSlug = String(property?.slug || '');

  const slug = rawSlug
    .replace(/^\/+/, '')
    .replace(/^property\//, '')
    .replace(/^property\//, '');

  if (slug) {
    return `/property/${slug}`;
  }

  return `/property/${property?.id || 1}`;
}

function safeLocation(society: any) {
  try {
    return formatPublicLocation(society);
  } catch {
    return [field(society, 'sector', 'sector', ''), field(society, 'locality', 'locality', '')]
      .filter(Boolean)
      .join(', ');
  }
}

function extractApiArray<T>(payload: ApiResponse<T[] | LaravelPaginated<T>>): T[] {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray((payload?.data as LaravelPaginated<T>)?.data)) {
    return (payload.data as LaravelPaginated<T>).data || [];
  }
  return [];
}

export function SocietyPage() {
  const { slug } = useParams();
  const [apiSociety, setApiSociety] = useState<any | null>(null);
  const [apiProperties, setApiProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(Boolean(API_BASE_URL));
  const [error, setError] = useState<string | null>(null);

  const fallbackSociety = useMemo(() => findPublicSociety(slug), [slug]);

  useEffect(() => {
    let mounted = true;

    async function loadSociety() {
      if (!API_BASE_URL || !slug) {
        setLoading(false);
        return;
      }

      try {
        const societyResponse = await fetch(`${API_BASE_URL}/societies/${encodeURIComponent(slug)}`);
        if (!societyResponse.ok) throw new Error('Society API failed');

        const societyJson: ApiResponse<any> = await societyResponse.json();
        const societyData = societyJson.data || null;

        let propertyData: any[] = [];

        if (Array.isArray(societyData?.properties)) {
          propertyData = societyData.properties;
        } else {
          const propertiesResponse = await fetch(`${API_BASE_URL}/properties?q=${encodeURIComponent(societyData?.name || slug)}`);
          if (propertiesResponse.ok) {
            propertyData = extractApiArray(await propertiesResponse.json());
          }
        }

        if (mounted) {
          setApiSociety(societyData);
          setApiProperties(propertyData);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError('Unable to load live society data. Showing local fallback if available.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSociety();

    return () => {
      mounted = false;
    };
  }, [slug]);

  const society = apiSociety || fallbackSociety;
  const fallbackProperties = getSocietyProperties(society?.name);
  const properties = apiProperties.length ? apiProperties : fallbackProperties;

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory-100 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-navy-900">Loading society...</h1>
          <p className="mt-3 text-navy-500">Fetching live SocietyFlats data.</p>
        </div>
      </div>
    );
  }

  if (!society) {
    return (
      <div className="min-h-screen bg-ivory-100 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-navy-900">Society not found</h1>
          <p className="mt-3 text-navy-500">Create or verify this society in the admin panel.</p>
          <Button asChild className="mt-8 rounded-full bg-navy-600 hover:bg-navy-700">
            <Link to="/search?tab=societies">Back to search</Link>
          </Button>
        </div>
      </div>
    );
  }

  const imageStatus = field<string>(society, 'imageStatus', 'image_status', 'placeholder');
  const imageApproved = ['licensed_uploaded', 'self_shot_uploaded', 'developer_permission_received'].includes(imageStatus);
  const gallery = [
    safeSocietyImage(society),
    ...(imageApproved ? listField(society, 'galleryImages', 'gallery_images') : []),
  ]
    .filter(Boolean)
    .filter((value, index, self) => self.indexOf(value) === index)
    .slice(0, 4);

  const amenities = listField(society, 'amenities', 'amenities');

  const nearby = [
    { title: 'Schools', value: field(society, 'nearbySchools', 'nearby_schools', ''), icon: School },
    { title: 'Metro', value: field(society, 'nearbyMetro', 'nearby_metro', ''), icon: Train },
    { title: 'Hospitals', value: field(society, 'nearbyHospitals', 'nearby_hospitals', ''), icon: Shield },
    { title: 'Office hubs', value: field(society, 'nearbyOfficeHubs', 'nearby_office_hubs', ''), icon: Building2 },
  ];
  const sourceUrl = field<string>(society, 'sourceUrl', 'source_url', '');
  const reraUrl = field<string>(society, 'reraSearchUrl', 'rera_search_url', '') || (sourceUrl.toLowerCase().includes('rera') ? sourceUrl : '');
  const officialLinks = [
    ['Official Project Page', field(society, 'officialProjectUrl', 'official_project_url', '')],
    ['Developer Website', field(society, 'officialDeveloperUrl', 'official_developer_url', '')],
    ['Brochure', field(society, 'officialBrochureUrl', 'official_brochure_url', '')],
    ['Floor Plan', field(society, 'officialFloorPlanUrl', 'official_floor_plan_url', '')],
    ['Gallery Reference', field(society, 'officialGalleryUrl', 'official_gallery_url', '')],
    ['Google Maps', field(society, 'googleMapsUrl', 'google_maps_url', '')],
    ['RERA Search', reraUrl],
  ].filter(([, href]) => Boolean(href));

  return (
    <div className="min-h-screen bg-ivory-100">
      <section className="bg-white">
        <div className="container mx-auto px-4 py-6">
          <Button asChild variant="ghost" className="mb-5 rounded-full text-navy-600">
            <Link to="/search?tab=societies">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to societies
            </Link>
          </Button>

          {error ? (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
            <div className="h-[420px] overflow-hidden rounded-[2rem] bg-navy-50">
              <img src={gallery[0]} alt={society.name} className="h-full w-full object-cover" />
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
              {gallery.slice(1, 3).map((image) => (
                <div key={image} className="overflow-hidden rounded-[1.5rem] bg-navy-50">
                  <img src={image} alt={society.name} className="h-full min-h-[200px] w-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            <div className="rounded-[2rem] border border-navy-100 bg-white p-7 shadow-sm">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-4 flex flex-wrap gap-2">
                    <Badge className="border-blue-100 bg-blue-50 text-blue-700">
                      {field(society, 'status', 'status', 'Verified')}
                    </Badge>
                    {field<boolean>(society, 'featured', 'featured', false) ? (
                      <Badge className="border-amber-100 bg-amber-50 text-amber-700">Featured</Badge>
                    ) : null}
                  </div>
                  <h1 className="text-4xl font-extrabold tracking-tight text-navy-900 md:text-6xl">{society.name}</h1>
                  <p className="mt-3 flex items-center gap-2 text-lg text-navy-500">
                    <MapPin className="h-5 w-5" /> {safeLocation(society)}
                  </p>
                </div>
                <div className="min-w-32 rounded-[1.5rem] bg-navy-600 px-6 py-5 text-center text-white">
                  <p className="text-sm text-white/70">Society Score</p>
                  <p className="mt-1 text-4xl font-bold">{field(society, 'score', 'score', '8.5')}</p>
                </div>
              </div>
              {society.description ? <p className="mt-7 text-lg leading-relaxed text-navy-600">{society.description}</p> : null}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                ['Builder', field(society, 'builder', 'builder', 'Not added')],
                ['Total towers', field(society, 'totalTowers', 'total_towers', 'Not added')],
                ['Total units', field(society, 'totalUnits', 'total_units', 'Not added')],
                ['Year built', field(society, 'yearBuilt', 'year_built', 'Not added')],
                ['Maintenance', field(society, 'maintenanceCharges', 'maintenance_charges', 'Not added')],
                ['Rental yield', field(society, 'rentalYield', 'rental_yield', 'Not added')],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[1.5rem] border border-navy-100 bg-white p-5">
                  <p className="text-sm text-navy-400">{label}</p>
                  <p className="mt-2 font-semibold text-navy-900">{value || 'Not added'}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[2rem] border border-navy-100 bg-white p-7 shadow-sm">
              <h2 className="text-2xl font-bold text-navy-900">Available inventory</h2>
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {properties.length ? (
                  properties.map((property) => (
                    <Link
                      key={property.id || property.slug}
                      to={safePropertyUrl(property)}
                      className="overflow-hidden rounded-[1.5rem] border border-navy-100 transition-all hover:shadow-soft"
                    >
                      <div className="h-44 bg-navy-50">
                        <img src={safePropertyImage(property)} alt={property.title} className="h-full w-full object-cover" />
                      </div>
                      <div className="p-5">
                        <p className="text-xs font-semibold text-blue-700">{field(property, 'listingType', 'listing_type', 'Rent')}</p>
                        <h3 className="mt-2 font-bold text-navy-900">{property.title}</h3>
                        <p className="mt-2 text-sm text-navy-500">
                          {field(property, 'bedrooms', 'bedrooms', '-')} BHK • {field(property, 'areaSqft', 'area_sqft', '-')} sq.ft
                        </p>
                        <p className="mt-4 text-lg font-bold text-navy-900">{property.price || 'On request'}</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-navy-500">No live inventory yet. Add properties in admin and assign them to this society.</p>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-navy-100 bg-white p-7 shadow-sm">
              <h2 className="text-2xl font-bold text-navy-900">Amenities</h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {amenities.length ? amenities.map((item) => (
                  <span key={item} className="rounded-full bg-ivory-200 px-4 py-2 text-sm text-navy-700">{item}</span>
                )) : <p className="text-navy-500">No amenities added yet.</p>}
              </div>
            </div>

            <div className="rounded-[2rem] border border-navy-100 bg-white p-7 shadow-sm">
              <h2 className="text-2xl font-bold text-navy-900">Nearby intelligence</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {nearby.map((item) => {
                  const Icon = item.icon;
                  const lines = splitLines(item.value);
                  return (
                    <div key={item.title} className="rounded-[1.5rem] bg-ivory-200 p-5">
                      <Icon className="h-5 w-5 text-navy-600" />
                      <h3 className="mt-3 font-bold text-navy-900">{item.title}</h3>
                      {lines.length ? (
                        <ul className="mt-3 space-y-1 text-sm text-navy-600">
                          {lines.map((line) => <li key={line}>• {line}</li>)}
                        </ul>
                      ) : (
                        <p className="mt-3 text-sm text-navy-500">Not added yet.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {field(society, 'faq', 'faq', '') ? (
              <div className="rounded-[2rem] border border-navy-100 bg-white p-7 shadow-sm">
                <h2 className="text-2xl font-bold text-navy-900">FAQ</h2>
                <div className="mt-4 whitespace-pre-line leading-relaxed text-navy-600">{field(society, 'faq', 'faq', '')}</div>
              </div>
            ) : null}

            {officialLinks.length ? (
              <div className="rounded-[2rem] border border-navy-100 bg-white p-7 shadow-sm">
                <h2 className="text-2xl font-bold text-navy-900">Official references</h2>
                <p className="mt-2 text-sm leading-relaxed text-navy-500">
                  Project information is sourced from official/developer/RERA references where available and manually verified before being marked verified.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {officialLinks.map(([label, href]) => (
                    <a
                      key={label}
                      href={String(href)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-navy-100 bg-ivory-100 px-4 py-2 text-sm font-medium text-navy-700 hover:bg-ivory-200"
                    >
                      {label === 'Brochure' || label === 'Floor Plan' ? <FileText className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="space-y-5">
            <div className="sticky top-24 rounded-[2rem] border border-navy-100 bg-white p-6 shadow-soft">
              <h3 className="text-xl font-bold text-navy-900">Society market snapshot</h3>
              <div className="mt-5 space-y-4">
                {[
                  ['Rent range', field(society, 'rentRange', 'rent_range', 'On request')],
                  ['Buy range', field(society, 'buyRange', 'buy_range', 'On request')],
                  ['Average rent', field(society, 'averageRent', 'average_rent', 'Not added')],
                  ['Average sale price', field(society, 'averageSalePrice', 'average_sale_price', 'Not added')],
                  ['Price / sq ft', field(society, 'pricePerSqft', 'price_per_sqft', 'Not added')],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 border-b border-navy-100 pb-3 last:border-0">
                    <span className="text-sm text-navy-500">{label}</span>
                    <span className="text-right font-semibold text-navy-900">{value || 'Not added'}</span>
                  </div>
                ))}
              </div>
              <Button asChild className="mt-6 w-full rounded-full bg-navy-600 hover:bg-navy-700">
                <Link to={`/search?tab=rent&q=${encodeURIComponent(society.name)}`}>View homes in this society</Link>
              </Button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
