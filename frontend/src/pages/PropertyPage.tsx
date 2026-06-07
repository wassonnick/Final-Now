import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bath,
  Bed,
  CalendarCheck,
  CheckCircle2,
  Heart,
  Home,
  Mail,
  MapPin,
  Maximize,
  Phone,
  Share2,
  Shield,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'https://final-now.onrender.com/api';

interface SocietyRef {
  name?: string;
  slug?: string;
  locality?: string;
  sector?: string;
}

interface Property {
  id?: number | string;
  title?: string;
  slug?: string;
  description?: string;
  listing_type?: string;
  listingType?: string;
  property_type?: string;
  propertyType?: string;
  status?: string;
  price?: string;
  rent?: string;
  area_sqft?: number | string;
  areaSqft?: number | string;
  bedrooms?: number | string;
  bathrooms?: number | string;
  furnished_status?: string;
  furnishedStatus?: string;
  maintenance?: string;
  security_deposit?: string;
  securityDeposit?: string;
  floor?: string;
  facing?: string;
  locality?: string;
  sector?: string;
  featured?: boolean;
  verified?: boolean;
  amenities?: string[] | string | null;
  images?: string[] | string | null;
  cover_image?: string | null;
  coverImage?: string | null;
  gallery_images?: string[] | string | null;
  galleryImages?: string[] | string | null;
  society?: string | SocietyRef | null;
  society_name?: string;
  societyName?: string;
  society_slug?: string;
  societySlug?: string;
}

type ApiResponse = {
  status?: string;
  data?: Property | { data?: Property };
  property?: Property;
};

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);

  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim();

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      // Fall back to comma/new-line splitting below.
    }

    return trimmed
      .split(/,|\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function valueOf<T = any>(item: any, camel: string, snake: string, fallback?: T): T {
  return (item?.[camel] ?? item?.[snake] ?? fallback) as T;
}

function extractProperty(payload: ApiResponse): Property | null {
  if (!payload) return null;

  if (payload.property) return payload.property;

  if (payload.data && 'data' in payload.data && payload.data.data) {
    return payload.data.data;
  }

  if (payload.data && !Array.isArray(payload.data)) {
    return payload.data as Property;
  }

  return null;
}

function cleanSlug(value?: string) {
  return String(value || '')
    .replace(/^\/+/, '')
    .replace(/^property\//, '')
    .trim();
}

function fallbackTitle(slug?: string) {
  const clean = cleanSlug(slug);
  if (!clean) return 'Property';
  return clean
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function safePrice(property: Property) {
  return property.price || property.rent || 'On request';
}

function safeListingType(property: Property) {
  return valueOf<string>(property, 'listingType', 'listing_type', 'Property');
}

function safePropertyType(property: Property) {
  return valueOf<string>(property, 'propertyType', 'property_type', 'Apartment');
}

function safeArea(property: Property) {
  return valueOf<string | number>(property, 'areaSqft', 'area_sqft', '-');
}

function safeFurnished(property: Property) {
  return valueOf<string>(property, 'furnishedStatus', 'furnished_status', '-');
}

function societyObject(property: Property): SocietyRef | null {
  return typeof property.society === 'object' && property.society
    ? property.society
    : null;
}

function societyNameFor(property: Property) {
  const society = societyObject(property);
  return (
    society?.name ||
    property.societyName ||
    property.society_name ||
    (typeof property.society === 'string' ? property.society : '') ||
    ''
  );
}

function societySlugFor(property: Property) {
  const society = societyObject(property);
  return society?.slug || property.societySlug || property.society_slug || '';
}

function societyLocalityFor(property: Property) {
  const society = societyObject(property);
  return society
    ? [society.sector, society.locality].filter(Boolean).join(', ')
    : [property.sector, property.locality].filter(Boolean).join(', ');
}

function propertyPhotos(property: Property) {
  const savedImages = parseList(property.images);
  const galleryImages = [
    ...parseList(property.galleryImages),
    ...parseList(property.gallery_images),
  ];
  const coverImage = property.coverImage || property.cover_image;

  const photos = [
    ...savedImages,
    ...galleryImages,
    ...(coverImage ? [coverImage] : []),
  ].filter(Boolean);

  return Array.from(new Set(photos)).length
    ? Array.from(new Set(photos))
    : [
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80',
      ];
}

export function PropertyPage() {
  const { slug } = useParams();

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [isShortlisted, setIsShortlisted] = useState(false);

  const [leadOpen, setLeadOpen] = useState(false);
  const [leadType, setLeadType] = useState<'callback' | 'enquiry'>('callback');
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [leadError, setLeadError] = useState('');

  const [leadForm, setLeadForm] = useState({
    name: '',
    phone: '',
    email: '',
    message: '',
  });

  useEffect(() => {
    let mounted = true;

    const fetchProperty = async () => {
      setLoading(true);
      setPageError('');

      try {
        const clean = cleanSlug(slug);

        if (!clean) {
          throw new Error('Missing property slug');
        }

        const response = await fetch(`${API_BASE}/properties/${encodeURIComponent(clean)}`, {
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Property API failed with ${response.status}`);
        }

        const data: ApiResponse = await response.json();
        const nextProperty = extractProperty(data);

        if (!nextProperty) {
          throw new Error('Property response did not include data');
        }

        if (mounted) {
          setProperty(nextProperty);
          setActiveImage(0);
        }
      } catch (error) {
        console.error('Property fetch failed:', error);

        if (mounted) {
          setProperty(null);
          setPageError('Unable to load this property right now.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchProperty();

    return () => {
      mounted = false;
    };
  }, [slug]);

  const societyName = property ? societyNameFor(property) : '';
  const societySlug = property ? societySlugFor(property) : '';
  const societyLocality = property ? societyLocalityFor(property) : '';
  const title = property?.title || fallbackTitle(slug);
  const photos = useMemo(() => (property ? propertyPhotos(property) : []), [property]);
  const amenities = useMemo(() => parseList(property?.amenities), [property?.amenities]);

  const openLead = (type: 'callback' | 'enquiry') => {
    setLeadType(type);
    setLeadOpen(true);
    setLeadSuccess(false);
    setLeadError('');
    setLeadForm((current) => ({
      ...current,
      message:
        type === 'callback'
          ? `I want a callback for ${title}.`
          : `I am interested in ${title}. Please share details.`,
    }));
  };

  const submitLead = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!property) return;

    setLeadSubmitting(true);
    setLeadError('');

    try {
      const response = await fetch(`${API_BASE}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: leadForm.name,
          phone: leadForm.phone,
          email: leadForm.email || null,
          message: leadForm.message,
          property_title: title,
          property_slug: property.slug || slug,
          society_name: societyName || property.locality || 'Gurgaon',
          source: leadType === 'callback' ? 'property_callback' : 'property_enquiry',
        }),
      });

      if (!response.ok) {
        throw new Error('Lead submission failed');
      }

      setLeadSuccess(true);
      setLeadForm({
        name: '',
        phone: '',
        email: '',
        message: '',
      });
    } catch {
      setLeadError('Unable to submit enquiry. Please try again.');
    } finally {
      setLeadSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory-100 py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
          <h1 className="mt-6 text-3xl font-bold text-navy-900">
            Loading property...
          </h1>
          <p className="mt-2 text-navy-500">Fetching live SocietyFlats data.</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-ivory-100 py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto max-w-xl rounded-[2rem] border border-navy-100 bg-white p-8 shadow-sm">
            <h1 className="text-3xl font-bold text-navy-900">
              Property not found
            </h1>
            <p className="mt-3 text-navy-500">
              {pageError || 'This property may have been removed or is not live yet.'}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild className="rounded-full bg-navy-600 hover:bg-navy-700">
                <Link to="/properties">Back to properties</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/search">Search live homes</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const whatsappMessage = encodeURIComponent(
    `Hi, I am interested in ${title}. Please share details.`
  );

  return (
    <div className="min-h-screen bg-ivory-100 pb-24 lg:pb-0">
      <div className="bg-white">
        <div className="container mx-auto px-4 py-5 md:py-6">
          <Button asChild variant="ghost" className="mb-4 rounded-full text-navy-600">
            <Link to={societySlug ? `/society/${societySlug}` : '/properties'}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {societySlug ? 'Back to society' : 'Back to properties'}
            </Link>
          </Button>

          <div
            className={cn(
              'grid gap-4',
              photos.length > 1 ? 'lg:grid-cols-[1fr_280px]' : 'lg:grid-cols-1'
            )}
          >
            <div className="relative h-[260px] overflow-hidden rounded-[1.5rem] bg-navy-50 md:h-[420px] lg:rounded-[2rem]">
              <img
                src={photos[activeImage] || photos[0]}
                alt={title}
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.src =
                    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80';
                }}
              />
              <div className="absolute left-4 top-4 flex gap-2">
                {property.verified ? (
                  <Badge className="border-0 bg-green-500 text-white">
                    <Shield className="mr-1 h-3 w-3" />
                    Verified
                  </Badge>
                ) : null}
                {property.featured ? (
                  <Badge className="border-0 bg-gold-500 text-navy-900">
                    Featured
                  </Badge>
                ) : null}
              </div>
            </div>

            {photos.length > 1 ? (
              <div className="hidden gap-3 lg:grid">
                {photos.slice(0, 3).map((photo, index) => (
                  <button
                    key={photo + index}
                    onClick={() => setActiveImage(index)}
                    className={cn(
                      'relative overflow-hidden rounded-2xl border-2 bg-navy-50',
                      activeImage === index ? 'border-navy-500' : 'border-transparent'
                    )}
                  >
                    <img
                      src={photo}
                      alt={title}
                      className="h-full min-h-[128px] w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}

            {photos.length > 1 ? (
              <div className="flex gap-3 overflow-x-auto pb-1 lg:hidden">
                {photos.slice(0, 5).map((photo, index) => (
                  <button
                    key={photo + index}
                    onClick={() => setActiveImage(index)}
                    className={cn(
                      'h-20 w-28 flex-shrink-0 overflow-hidden rounded-2xl border-2 bg-navy-50',
                      activeImage === index ? 'border-navy-500' : 'border-transparent'
                    )}
                  >
                    <img src={photo} alt={title} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2 md:space-y-6">
            <div className="rounded-[1.5rem] border border-navy-100 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Badge className="border-blue-100 bg-blue-50 text-blue-700">
                      {safeListingType(property)}
                    </Badge>
                    {property.status ? (
                      <Badge variant="outline">{property.status}</Badge>
                    ) : null}
                  </div>

                  <h1 className="text-3xl font-extrabold tracking-tight text-navy-900 md:text-5xl">
                    {title}
                  </h1>

                  <div className="mt-3 flex items-center gap-2 text-navy-500">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {societyName || 'Gurgaon'} • {property.locality || societyLocality || 'Gurgaon'}
                    </span>
                  </div>
                </div>

                <div className="hidden items-center gap-2 md:flex">
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(isShortlisted && 'border-red-200 bg-red-50 text-red-600')}
                    onClick={() => setIsShortlisted(!isShortlisted)}
                  >
                    <Heart className={cn('mr-1.5 h-4 w-4', isShortlisted && 'fill-current')} />
                    {isShortlisted ? 'Saved' : 'Save'}
                  </Button>

                  <Button variant="outline" size="sm">
                    <Share2 className="mr-1.5 h-4 w-4" />
                    Share
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 md:flex md:flex-wrap">
                <Badge variant="outline" className="justify-center rounded-full px-4 py-2">
                  <Home className="mr-1 h-3 w-3" />
                  {safePropertyType(property)}
                </Badge>
                <Badge variant="outline" className="justify-center rounded-full px-4 py-2">
                  <Bed className="mr-1 h-3 w-3" />
                  {property.bedrooms || '-'} BHK
                </Badge>
                <Badge variant="outline" className="justify-center rounded-full px-4 py-2">
                  <Bath className="mr-1 h-3 w-3" />
                  {property.bathrooms || '-'} Baths
                </Badge>
                <Badge variant="outline" className="justify-center rounded-full px-4 py-2">
                  <Maximize className="mr-1 h-3 w-3" />
                  {safeArea(property)} sq.ft
                </Badge>
              </div>

              <div className="mt-5 rounded-2xl bg-blue-50 p-4 md:hidden">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
                  Price
                </p>
                <p className="mt-1 text-2xl font-bold text-navy-900">
                  {safePrice(property)}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 md:hidden">
                <Button
                  onClick={() => openLead('callback')}
                  className="rounded-full bg-blue-600 hover:bg-blue-700"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Callback
                </Button>
                <Button
                  onClick={() => openLead('enquiry')}
                  variant="outline"
                  className="rounded-full border-navy-200"
                >
                  Enquire
                </Button>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-navy-100 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
              <h3 className="mb-5 text-2xl font-bold text-navy-900">Property Details</h3>
              <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
                {[
                  { label: 'Listing Type', value: safeListingType(property) },
                  { label: 'Price', value: safePrice(property) },
                  { label: 'Bedrooms', value: property.bedrooms },
                  { label: 'Bathrooms', value: property.bathrooms },
                  { label: 'Furnished', value: safeFurnished(property) },
                  { label: 'Facing', value: property.facing },
                ].map((detail) => (
                  <div key={detail.label}>
                    <p className="mb-1 text-sm text-navy-500">{detail.label}</p>
                    <p className="font-medium capitalize text-navy-900">
                      {detail.value || '-'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden rounded-[2rem] border border-navy-100 bg-white p-7 shadow-sm md:block">
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: 'Verified society', value: societyName || 'Gurgaon inventory', icon: Shield },
                  { label: 'Location context', value: societyLocality || property.locality || 'Gurgaon', icon: MapPin },
                  { label: 'Next action', value: 'Callback, visit or WhatsApp', icon: CalendarCheck },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-[1.25rem] bg-[#F8FAFC] p-4">
                      <Icon className="h-5 w-5 text-blue-600" />
                      <p className="mt-3 text-sm text-navy-400">{item.label}</p>
                      <p className="mt-1 font-semibold text-navy-900">{item.value}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-navy-100 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
              <h3 className="mb-4 text-2xl font-bold text-navy-900">Description</h3>
              <p className="whitespace-pre-line leading-relaxed text-navy-600">
                {property.description || 'No description available.'}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-navy-100 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
              <h3 className="mb-4 text-2xl font-bold text-navy-900">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {amenities.length ? (
                  amenities.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-ivory-200 px-4 py-2 text-sm text-navy-700"
                    >
                      {item}
                    </span>
                  ))
                ) : (
                  <p className="text-navy-500">No amenities added yet.</p>
                )}
              </div>
            </div>

            {societyName ? (
              <div className="rounded-[1.5rem] border border-navy-100 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600">
                  Society context
                </p>
                <h3 className="mt-2 text-2xl font-bold text-navy-900">
                  About {societyName}
                </h3>
                <p className="mt-3 text-navy-500">
                  Review the society profile before requesting a visit so the property decision includes location, amenities and inventory context.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {societySlug ? (
                    <Button asChild variant="outline" className="rounded-full">
                      <Link to={`/society/${societySlug}`}>View society profile</Link>
                    </Button>
                  ) : null}
                  <Button asChild variant="outline" className="rounded-full">
                    <Link to={`/compare?society=${encodeURIComponent(societyName)}`}>
                      Compare area
                    </Link>
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <aside className="hidden space-y-6 lg:block">
            <div className="sticky top-24 rounded-[2rem] border border-navy-100 bg-white p-6 shadow-soft">
              <p className="mb-1 text-sm text-navy-500">Price</p>
              <p className="text-3xl font-bold text-navy-900">
                {safePrice(property)}
              </p>

              <div className="mt-6 space-y-3">
                <Button
                  onClick={() => openLead('callback')}
                  className="w-full rounded-full bg-navy-600 hover:bg-navy-700"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Request callback
                </Button>

                <Button
                  onClick={() => openLead('enquiry')}
                  variant="outline"
                  className="w-full rounded-full"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Send enquiry
                </Button>

                <Button
                  onClick={() => openLead('callback')}
                  variant="outline"
                  className="w-full rounded-full"
                >
                  <CalendarCheck className="mr-2 h-4 w-4" />
                  Schedule visit
                </Button>

                <a
                  href={`https://wa.me/919999988888?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full rounded-full border border-green-200 bg-green-50 px-4 py-2.5 text-center text-sm font-semibold text-green-700 hover:bg-green-100"
                >
                  WhatsApp enquiry
                </a>
              </div>

              {societyName && societySlug ? (
                <Button asChild variant="ghost" className="mt-4 w-full rounded-full text-blue-700">
                  <Link to={`/society/${societySlug}`}>
                    View society first <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </aside>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-navy-100 bg-white/95 px-4 py-3 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => openLead('callback')}
            className="rounded-full bg-blue-600 hover:bg-blue-700"
          >
            <Phone className="mr-2 h-4 w-4" />
            Callback
          </Button>
          <Button
            onClick={() => openLead('enquiry')}
            variant="outline"
            className="rounded-full border-navy-200"
          >
            Enquire
          </Button>
        </div>
      </div>

      {leadOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 px-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-navy-900">
                  {leadType === 'callback' ? 'Request a callback' : 'Send enquiry'}
                </h3>
                <p className="mt-1 text-sm text-navy-500">
                  Our team will contact you for {title}.
                </p>
              </div>

              <button
                onClick={() => setLeadOpen(false)}
                className="rounded-full border border-navy-100 p-2 text-navy-500 hover:bg-navy-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {leadSuccess ? (
              <div className="mt-6 rounded-2xl bg-green-50 p-5 text-green-700">
                Lead submitted successfully. We will contact you shortly.
              </div>
            ) : (
              <form onSubmit={submitLead} className="mt-6 space-y-4">
                <input
                  required
                  value={leadForm.name}
                  onChange={(event) => setLeadForm({ ...leadForm, name: event.target.value })}
                  placeholder="Your name"
                  className="w-full rounded-2xl border border-navy-100 px-4 py-3 outline-none focus:border-blue-400"
                />

                <input
                  required
                  value={leadForm.phone}
                  onChange={(event) => setLeadForm({ ...leadForm, phone: event.target.value })}
                  placeholder="Phone number"
                  className="w-full rounded-2xl border border-navy-100 px-4 py-3 outline-none focus:border-blue-400"
                />

                <input
                  type="email"
                  value={leadForm.email}
                  onChange={(event) => setLeadForm({ ...leadForm, email: event.target.value })}
                  placeholder="Email optional"
                  className="w-full rounded-2xl border border-navy-100 px-4 py-3 outline-none focus:border-blue-400"
                />

                <textarea
                  value={leadForm.message}
                  onChange={(event) => setLeadForm({ ...leadForm, message: event.target.value })}
                  placeholder="Message"
                  rows={4}
                  className="w-full rounded-2xl border border-navy-100 px-4 py-3 outline-none focus:border-blue-400"
                />

                {leadError ? (
                  <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">
                    {leadError}
                  </div>
                ) : null}

                <Button disabled={leadSubmitting} className="w-full rounded-full bg-navy-600 hover:bg-navy-700">
                  {leadSubmitting ? 'Submitting...' : 'Submit enquiry'}
                </Button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
