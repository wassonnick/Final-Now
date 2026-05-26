import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, CheckCircle2, Home, MapPin, School, Shield, Star, Train, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { findPublicSociety, formatPublicLocation, getSocietyProperties, propertyImage, propertyUrl, societyImage } from '@/lib/publicData';

function splitLines(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

export function SocietyPage() {
  const { slug } = useParams();
  const society = findPublicSociety(slug);
  const properties = getSocietyProperties(society?.name);

  if (!society) {
    return (
      <div className="min-h-screen bg-ivory-100 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-navy-900">Society not found</h1>
          <p className="mt-3 text-navy-500">Create or verify this society in the admin panel.</p>
          <Button asChild className="mt-8 rounded-full bg-navy-600 hover:bg-navy-700"><Link to="/search?tab=societies">Back to search</Link></Button>
        </div>
      </div>
    );
  }

  const gallery = [societyImage(society), ...society.galleryImages].filter(Boolean).slice(0, 4);
  const nearby = [
    { title: 'Schools', value: society.nearbySchools, icon: School },
    { title: 'Metro', value: society.nearbyMetro, icon: Train },
    { title: 'Hospitals', value: society.nearbyHospitals, icon: Shield },
    { title: 'Office hubs', value: society.nearbyOfficeHubs, icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-ivory-100">
      <section className="bg-white">
        <div className="container mx-auto px-4 py-6">
          <Button asChild variant="ghost" className="mb-5 rounded-full text-navy-600"><Link to="/search?tab=societies"><ArrowLeft className="mr-2 h-4 w-4" /> Back to societies</Link></Button>
          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
            <div className="overflow-hidden rounded-[2rem] bg-navy-50 h-[420px]"><img src={gallery[0]} alt={society.name} className="h-full w-full object-cover" /></div>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              {gallery.slice(1, 3).map((image) => <div key={image} className="overflow-hidden rounded-[1.5rem] bg-navy-50"><img src={image} alt={society.name} className="h-full min-h-[200px] w-full object-cover" /></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            <div className="rounded-[2rem] border border-navy-100 bg-white p-7 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
                <div>
                  <div className="flex flex-wrap gap-2 mb-4"><Badge className="bg-blue-50 text-blue-700 border-blue-100">{society.status}</Badge>{society.featured ? <Badge className="bg-amber-50 text-amber-700 border-amber-100">Featured</Badge> : null}</div>
                  <h1 className="text-4xl md:text-6xl font-extrabold text-navy-900 tracking-tight">{society.name}</h1>
                  <p className="mt-3 flex items-center gap-2 text-lg text-navy-500"><MapPin className="h-5 w-5" /> {formatPublicLocation(society)}</p>
                </div>
                <div className="rounded-[1.5rem] bg-navy-600 px-6 py-5 text-white text-center min-w-32"><p className="text-sm text-white/70">Society Score</p><p className="mt-1 text-4xl font-bold">{society.score || '8.5'}</p></div>
              </div>
              {society.description ? <p className="mt-7 text-lg leading-relaxed text-navy-600">{society.description}</p> : null}
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {[
                ['Builder', society.builder || 'Not added'],
                ['Total towers', society.totalTowers || 'Not added'],
                ['Total units', society.totalUnits || 'Not added'],
                ['Year built', society.yearBuilt || 'Not added'],
                ['Maintenance', society.maintenanceCharges || 'Not added'],
                ['Rental yield', society.rentalYield || 'Not added'],
              ].map(([label, value]) => <div key={label} className="rounded-[1.5rem] border border-navy-100 bg-white p-5"><p className="text-sm text-navy-400">{label}</p><p className="mt-2 font-semibold text-navy-900">{value}</p></div>)}
            </div>

            <div className="rounded-[2rem] border border-navy-100 bg-white p-7 shadow-sm">
              <h2 className="text-2xl font-bold text-navy-900">Available inventory</h2>
              <div className="mt-6 grid md:grid-cols-2 gap-5">
                {properties.length ? properties.map((property) => (
                  <Link key={property.id} to={propertyUrl(property)} className="overflow-hidden rounded-[1.5rem] border border-navy-100 hover:shadow-soft transition-all">
                    <div className="h-44 bg-navy-50"><img src={propertyImage(property)} alt={property.title} className="h-full w-full object-cover" /></div>
                    <div className="p-5"><p className="text-xs font-semibold text-blue-700">{property.listingType}</p><h3 className="mt-2 font-bold text-navy-900">{property.title}</h3><p className="mt-2 text-sm text-navy-500">{property.bedrooms || '-'} BHK • {property.areaSqft || '-'} sq.ft</p><p className="mt-4 text-lg font-bold text-navy-900">{property.price || 'On request'}</p></div>
                  </Link>
                )) : <p className="text-navy-500">No live inventory yet. Add properties in admin and assign them to this society.</p>}
              </div>
            </div>

            <div className="rounded-[2rem] border border-navy-100 bg-white p-7 shadow-sm">
              <h2 className="text-2xl font-bold text-navy-900">Amenities</h2>
              <div className="mt-5 flex flex-wrap gap-2">{society.amenities.length ? society.amenities.map((item) => <span key={item} className="rounded-full bg-ivory-200 px-4 py-2 text-sm text-navy-700">{item}</span>) : <p className="text-navy-500">No amenities added yet.</p>}</div>
            </div>

            <div className="rounded-[2rem] border border-navy-100 bg-white p-7 shadow-sm">
              <h2 className="text-2xl font-bold text-navy-900">Nearby intelligence</h2>
              <div className="mt-5 grid md:grid-cols-2 gap-4">
                {nearby.map((item) => {
                  const Icon = item.icon;
                  const lines = splitLines(item.value || '');
                  return <div key={item.title} className="rounded-[1.5rem] bg-ivory-200 p-5"><Icon className="h-5 w-5 text-navy-600" /><h3 className="mt-3 font-bold text-navy-900">{item.title}</h3>{lines.length ? <ul className="mt-3 space-y-1 text-sm text-navy-600">{lines.map((line) => <li key={line}>• {line}</li>)}</ul> : <p className="mt-3 text-sm text-navy-500">Not added yet.</p>}</div>;
                })}
              </div>
            </div>

            {society.faq ? <div className="rounded-[2rem] border border-navy-100 bg-white p-7 shadow-sm"><h2 className="text-2xl font-bold text-navy-900">FAQ</h2><div className="mt-4 whitespace-pre-line text-navy-600 leading-relaxed">{society.faq}</div></div> : null}
          </div>

          <aside className="space-y-5">
            <div className="sticky top-24 rounded-[2rem] border border-navy-100 bg-white p-6 shadow-soft">
              <h3 className="text-xl font-bold text-navy-900">Society market snapshot</h3>
              <div className="mt-5 space-y-4">
                {[['Rent range', society.rentRange || 'On request'], ['Buy range', society.buyRange || 'On request'], ['Average rent', society.averageRent || 'Not added'], ['Average sale price', society.averageSalePrice || 'Not added'], ['Price / sq ft', society.pricePerSqft || 'Not added']].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-4 border-b border-navy-100 pb-3 last:border-0"><span className="text-sm text-navy-500">{label}</span><span className="font-semibold text-navy-900 text-right">{value}</span></div>)}
              </div>
              <Button asChild className="mt-6 w-full rounded-full bg-navy-600 hover:bg-navy-700"><Link to={`/search?tab=rent&q=${encodeURIComponent(society.name)}`}>View homes in this society</Link></Button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
