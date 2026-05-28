import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bath,
  Bed,
  CheckCircle2,
  Heart,
  Home,
  Mail,
  MapPin,
  Maximize,
  Phone,
  Share2,
  Shield,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'https://final-now.onrender.com/api';

interface Property {
  id: number;
  title: string;
  slug?: string;
  description?: string;
  listing_type?: string;
  property_type?: string;
  status?: string;
  price?: string;
  rent?: string;
  area_sqft?: number;
  bedrooms?: number;
  bathrooms?: number;
  furnished_status?: string;
  maintenance?: string;
  security_deposit?: string;
  floor?: string;
  facing?: string;
  locality?: string;
  featured?: boolean;
  verified?: boolean;
  amenities?: string[];
  cover_image?: string;
  gallery_images?: string[];

  society?:
    | string
    | {
        name?: string;
        slug?: string;
        locality?: string;
        sector?: string;
      };
}

export function PropertyPage() {
  const { slug } = useParams();

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [isShortlisted, setIsShortlisted] = useState(false);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const response = await fetch(`${API_BASE}/properties/${slug}`);
        const data = await response.json();

        if (data?.data) {
          setProperty(data.data);
        }
      } catch (error) {
        console.error('Property fetch failed:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory-100">
        <p className="text-navy-600 text-lg">Loading property...</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-ivory-100 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-navy-900">
            Property not found
          </h1>

          <Button
            asChild
            className="mt-8 rounded-full bg-navy-600 hover:bg-navy-700"
          >
            <Link to="/properties">Back to properties</Link>
          </Button>
        </div>
      </div>
    );
  }

  const societyName =
    typeof property.society === 'object'
      ? property.society?.name
      : property.society;

  const societySlug =
    typeof property.society === 'object'
      ? property.society?.slug
      : '';

  const photos =
    property.gallery_images?.length
      ? property.gallery_images
      : property.cover_image
      ? [property.cover_image]
      : ['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85'];

  return (
    <div className="min-h-screen bg-ivory-100">
      <div className="bg-white">
        <div className="container mx-auto px-4 py-6">
          <Button
            asChild
            variant="ghost"
            className="mb-5 rounded-full text-navy-600"
          >
            <Link to="/properties">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to properties
            </Link>
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3 relative aspect-[16/9] rounded-2xl overflow-hidden bg-navy-50">
              <img
                src={photos[activeImage]}
                alt={property.title}
                className="w-full h-full object-cover"
              />

              <div className="absolute top-4 left-4 flex gap-2">
                {property.verified && (
                  <Badge className="bg-green-500 text-white border-0">
                    <Shield className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}

                {property.featured && (
                  <Badge className="bg-gold-500 text-navy-900 border-0">
                    Featured
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
              {photos.slice(0, 3).map((photo, i) => (
                <button
                  key={photo + i}
                  onClick={() => setActiveImage(i)}
                  className={cn(
                    'relative aspect-[4/3] rounded-xl overflow-hidden border-2',
                    activeImage === i
                      ? 'border-navy-500'
                      : 'border-transparent'
                  )}
                >
                  <img
                    src={photo}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-[2rem] border border-navy-100 bg-white p-7 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className="bg-blue-50 text-blue-700 border-blue-100">
                      {property.listing_type || 'Property'}
                    </Badge>
                  </div>

                  <h1 className="text-3xl md:text-5xl font-extrabold text-navy-900 tracking-tight">
                    {property.title}
                  </h1>

                  <div className="mt-3 flex items-center gap-2 text-navy-500">
                    <MapPin className="w-4 h-4" />

                    <span>
                      {societyName} • {property.locality}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      isShortlisted &&
                        'bg-red-50 border-red-200 text-red-600'
                    )}
                    onClick={() => setIsShortlisted(!isShortlisted)}
                  >
                    <Heart
                      className={cn(
                        'w-4 h-4 mr-1.5',
                        isShortlisted && 'fill-current'
                      )}
                    />

                    {isShortlisted ? 'Saved' : 'Save'}
                  </Button>

                  <Button variant="outline" size="sm">
                    <Share2 className="w-4 h-4 mr-1.5" />
                    Share
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-6">
                <Badge variant="outline">
                  <Home className="w-3 h-3 mr-1" />
                  {property.property_type || 'Apartment'}
                </Badge>

                <Badge variant="outline">
                  <Bed className="w-3 h-3 mr-1" />
                  {property.bedrooms || '-'} BHK
                </Badge>

                <Badge variant="outline">
                  <Bath className="w-3 h-3 mr-1" />
                  {property.bathrooms || '-'} Baths
                </Badge>

                <Badge variant="outline">
                  <Maximize className="w-3 h-3 mr-1" />
                  {property.area_sqft || '-'} sq.ft
                </Badge>

                {property.verified && (
                  <Badge className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-navy-100 bg-white p-7 shadow-sm">
              <h3 className="text-2xl font-bold text-navy-900 mb-5">
                Property Details
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {[
                  {
                    label: 'Listing Type',
                    value: property.listing_type,
                  },
                  {
                    label: 'Price',
                    value: property.price || property.rent,
                  },
                  {
                    label: 'Bedrooms',
                    value: property.bedrooms,
                  },
                  {
                    label: 'Bathrooms',
                    value: property.bathrooms,
                  },
                  {
                    label: 'Furnished',
                    value: property.furnished_status,
                  },
                  {
                    label: 'Facing',
                    value: property.facing,
                  },
                ].map((detail) => (
                  <div key={detail.label}>
                    <p className="text-sm text-navy-500 mb-1">
                      {detail.label}
                    </p>

                    <p className="font-medium text-navy-900 capitalize">
                      {detail.value || '-'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-navy-100 bg-white p-7 shadow-sm">
              <h3 className="text-2xl font-bold text-navy-900 mb-4">
                Description
              </h3>

              <p className="text-navy-600 leading-relaxed whitespace-pre-line">
                {property.description || 'No description available.'}
              </p>
            </div>

            <div className="rounded-[2rem] border border-navy-100 bg-white p-7 shadow-sm">
              <h3 className="text-2xl font-bold text-navy-900 mb-4">
                Amenities
              </h3>

              <div className="flex flex-wrap gap-2">
                {property.amenities?.length ? (
                  property.amenities.map((item) => (
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

            {societyName && (
              <div className="rounded-[2rem] border border-navy-100 bg-white p-7 shadow-sm">
                <h3 className="text-2xl font-bold text-navy-900">
                  About {societyName}
                </h3>

                <Button
                  asChild
                  variant="outline"
                  className="mt-5 rounded-full"
                >
                  <Link to={`/society/${societySlug || ''}`}>
                    View society profile
                  </Link>
                </Button>
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="sticky top-24 rounded-[2rem] border border-navy-100 bg-white p-6 shadow-soft">
              <p className="text-sm text-navy-500 mb-1">Price</p>

              <p className="text-3xl font-bold text-navy-900">
                {property.price || property.rent || 'On request'}
              </p>

              <div className="mt-6 space-y-3">
                <Button className="w-full rounded-full bg-navy-600 hover:bg-navy-700">
                  <Phone className="w-4 h-4 mr-2" />
                  Request Call Back
                </Button>

                <Button variant="outline" className="w-full rounded-full">
                  <Mail className="w-4 h-4 mr-2" />
                  Send Enquiry
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}