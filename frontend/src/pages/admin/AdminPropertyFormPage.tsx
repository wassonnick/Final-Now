import { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImagePlus, Save, Sparkles, UploadCloud, X } from 'lucide-react';

import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://final-now.onrender.com/api';

const societies = [
  'DLF Crest',
  'DLF Park Place',
  'M3M Golf Estate',
  'Tata Primanti',
  'Ireo Victory Valley',
  'Aralias',
];

const localities = [
  'Sector 54, Gurgaon',
  'Golf Course Road, Gurgaon',
  'Sector 65, Gurgaon',
  'Sector 72, Gurgaon',
  'DLF Phase 5, Gurgaon',
  'Sohna Road, Gurgaon',
];

const amenities = [
  'Power Backup',
  'Clubhouse',
  'Swimming Pool',
  'Gym',
  'Security',
  'Pet Friendly',
  'Park View',
  'Servant Room',
];

const emptyProperty = {
  title: '',
  listingType: 'Rent',
  status: 'Draft',
  society: '',
  locality: '',
  price: '',
  securityDeposit: '',
  maintenance: '',
  bedrooms: '',
  bathrooms: '',
  areaSqft: '',
  floor: '',
  facing: 'North-East',
  furnishedStatus: 'Semi Furnished',
  description: '',
  amenities: [],
  images: [],
  featured: false,
  verified: false,
};

export function AdminPropertyFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const isEdit = Boolean(id);

  const [property, setProperty] = useState<any>(emptyProperty);

  const [loading, setLoading] = useState(isEdit);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');

  const [success, setSuccess] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function loadProperty() {
      if (!id) return;

      try {
        setLoading(true);

        const response = await fetch(
          `${API_BASE_URL}/admin/properties/${id}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch property');
        }

        const json = await response.json();

        const data = json.data || {};

        setProperty({
          title: data.title || '',
          listingType: data.listing_type || 'Rent',
          status: data.status || 'Draft',
          society: data.society_name || '',
          locality: data.locality || '',
          price: data.price || '',
          securityDeposit: data.security_deposit || '',
          maintenance: data.maintenance || '',
          bedrooms: data.bedrooms || '',
          bathrooms: data.bathrooms || '',
          areaSqft: data.area_sqft || '',
          floor: data.floor || '',
          facing: data.facing || 'North-East',
          furnishedStatus:
            data.furnished_status || 'Semi Furnished',
          description: data.description || '',
          amenities: data.amenities || [],
          images: data.images || [],
          featured: Boolean(data.featured),
          verified: Boolean(data.verified),
        });
      } catch (err) {
        console.error(err);
        setError('Unable to load property');
      } finally {
        setLoading(false);
      }
    }

    loadProperty();
  }, [id]);

  const updateField = (key: string, value: any) => {
    setProperty((current: any) => ({
      ...current,
      [key]: value,
    }));
  };

  const toggleAmenity = (
    amenity: string,
    checked: boolean | 'indeterminate'
  ) => {
    setProperty((current: any) => {
      const enabled = checked === true;

      return {
        ...current,
        amenities: enabled
          ? [...new Set([...current.amenities, amenity])]
          : current.amenities.filter(
              (item: string) => item !== amenity
            ),
      };
    });
  };

  const handleSave = async (status: string) => {
    try {
      setSaving(true);

      const payload = {
        title: property.title,
        listing_type: property.listingType,
        status,
        society_name: property.society,
        locality: property.locality,
        price: property.price,
        security_deposit: property.securityDeposit,
        maintenance: property.maintenance,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        area_sqft: property.areaSqft,
        floor: property.floor,
        facing: property.facing,
        furnished_status: property.furnishedStatus,
        description: property.description,
        amenities: property.amenities,
        images: property.images,
        featured: property.featured,
        verified: property.verified,
      };

      const response = await fetch(
        `${API_BASE_URL}/admin/properties/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error('Save failed');
      }

      setSuccess('Property updated successfully');

      setTimeout(() => {
        navigate('/admin/properties');
      }, 800);
    } catch (err) {
      console.error(err);
      setError('Unable to save property');
    } finally {
      setSaving(false);
    }
  };

  const generateDescription = () => {
    updateField(
      'description',
      `${property.bedrooms || 'Spacious'} BHK ${
        property.listingType
      } property in ${property.society}, ${
        property.locality
      }.`
    );
  };

  if (loading) {
    return (
      <AdminLayout
        title="Loading..."
        subtitle="Fetching property"
      >
        <div className="p-10 text-lg">Loading property...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={isEdit ? 'Edit Property' : 'Add Property'}
      subtitle="Manage live property inventory"
    >
      {/* KEEP YOUR EXISTING UI BELOW */}

      {/* ONLY CHANGE BUTTON ACTIONS */}

      {/* Replace save draft button */}

      <Button
        type="button"
        onClick={() => handleSave('Draft')}
      >
        Save Draft
      </Button>

      {/* Replace publish button */}

      <Button
        type="button"
        onClick={() => handleSave('Live')}
      >
        Publish Listing
      </Button>
    </AdminLayout>
  );
}