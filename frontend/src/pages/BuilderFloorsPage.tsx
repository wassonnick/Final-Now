import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Building, CheckCircle2, Home, KeyRound, Layers3 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { fetchPublicProperties, propertyImage, propertyUrl } from '@/lib/publicData';
import { formatPropertyPrice } from '@/lib/propertyDisplay';
import { setPublicSeo } from '@/lib/seo';

type Property = Awaited<ReturnType<typeof fetchPublicProperties>>[number];

const comparison = [
  ['Ownership', 'Apartment plus shared common areas', 'Independent floor within a plotted home'],
  ['Entry', 'Shared lobby and lifts', 'Typically independent or low-sharing access'],
  ['Maintenance', 'Society maintenance and common services', 'Owner-managed; costs vary by plot'],
  ['Amenities', 'Clubhouse, security and shared facilities', 'Fewer shared amenities; more private control'],
  ['Terrace rights', 'Usually common or restricted', 'May be exclusive only when title documents say so'],
  ['Rental yield', 'Often steadier in managed societies', 'Depends heavily on block, parking and condition'],
  ['Appreciation', 'Driven by project and society demand', 'Driven by land share and neighbourhood quality'],
  ['Liquidity', 'More standardized comparison', 'Requires stronger title/building due diligence'],
];

export function BuilderFloorsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setPublicSeo('Builder Floors in Gurgaon — What to Check Before You Buy | SocietyFlats', 'Thinking about a builder floor in Gurgaon? See how they really differ from apartments — land share, entry, parking, terrace rights and title — with verified listings and honest due-diligence guidance.', { canonical: '/builder-floors' });
    void fetchPublicProperties().then(setProperties).catch(() => setProperties([])).finally(() => setLoading(false));
  }, []);
  const floors = useMemo(() => properties.filter((property) => String(property.listingType || '').toLowerCase().includes('builder floor')), [properties]);

  return <main className="min-h-screen bg-ivory-100"><section className="overflow-hidden border-b border-[#E7DCCB] bg-[#F7F4EF]"><div className="container mx-auto grid gap-8 px-4 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#8B6B32]">Builder floors guide</p><h1 className="mt-3 font-display text-4xl font-medium tracking-tight text-[#111827] md:text-6xl">A builder floor isn't an apartment. Here's what actually changes.</h1><p className="mt-4 max-w-3xl text-lg leading-8 text-[#667085]">With a builder floor, independent entry, land share, parking, terrace rights and a clean title matter far more than an amenity checklist — so we help you look at the things that actually decide it.</p><div className="mt-6 flex flex-wrap gap-3"><Button asChild className="rounded-full bg-[#233B6E] text-white hover:bg-[#1B2E57]"><a href="#inventory">Browse builder floors <ArrowRight className="ml-2 h-4 w-4" /></a></Button><Button asChild variant="outline" className="rounded-full border-[#E7DCCB] bg-white text-[#233B6E] hover:bg-[#F8F3EA]"><Link to="/search?tab=buy&q=builder%20floor">Search all floors</Link></Button></div></div><div className="grid grid-cols-2 gap-3">{[[KeyRound,'Independent access'],[Layers3,'Floor and terrace rights'],[Home,'Plot-level diligence'],[Building,'Neighbourhood context']].map(([Icon,label]) => { const ItemIcon = Icon as typeof Home; return <div key={String(label)} className="rounded-3xl border border-[#E7DCCB] bg-white p-5 shadow-sm"><ItemIcon className="h-6 w-6 text-[#3156A3]" /><p className="mt-3 font-bold text-[#25302B]">{String(label)}</p></div>; })}</div></div></section>
    <section className="container mx-auto px-4 py-10"><div className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Compare formats</p><h2 className="mt-2 text-3xl font-black text-navy-950">Apartment vs builder floor</h2><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left text-sm"><thead><tr className="bg-blue-50 text-blue-800"><th className="rounded-l-xl p-3">Dimension</th><th className="p-3">Apartment</th><th className="rounded-r-xl p-3">Builder floor</th></tr></thead><tbody>{comparison.map(([dimension, apartment, floor]) => <tr key={dimension} className="border-b border-navy-100"><th className="p-3 font-black text-navy-900">{dimension}</th><td className="p-3 text-navy-600">{apartment}</td><td className="p-3 text-navy-600">{floor}</td></tr>)}</tbody></table></div></div></section>
    <section id="inventory" className="container mx-auto px-4 pb-10"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Published inventory</p><h2 className="mt-2 text-3xl font-black text-navy-950">Builder floors available now</h2></div><span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">{floors.length} live</span></div>{loading ? <p className="mt-6 text-navy-500">Loading inventory…</p> : floors.length ? <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{floors.map((property) => <Link key={property.id} to={propertyUrl(property)} className="overflow-hidden rounded-[24px] border border-blue-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><img src={propertyImage(property)} alt={property.title} className="h-48 w-full object-cover" /><div className="p-4"><p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">Builder floor</p><h3 className="mt-2 text-xl font-black text-navy-950">{property.title}</h3><p className="mt-2 text-sm text-navy-500">{property.locality || property.society || 'Gurgaon'} · {property.areaSqft || 'Area on request'} sq.ft.</p><p className="mt-3 font-black text-blue-700">{formatPropertyPrice(property, 'Price on request')}</p></div></Link>)}</div> : <div className="mt-6 rounded-[28px] border border-dashed border-blue-200 bg-white p-8 text-center"><Home className="mx-auto h-8 w-8 text-blue-600" /><h3 className="mt-3 text-xl font-black text-navy-950">No published builder floors yet</h3><p className="mt-2 text-sm text-navy-500">Reviewed builder-floor inventory will appear here after it is approved for publishing.</p><Button asChild className="mt-5 rounded-full bg-blue-700"><Link to="/sell">Submit a builder floor</Link></Button></div>}</section>
    <section className="border-t border-blue-100 bg-white"><div className="container mx-auto grid gap-5 px-4 py-10 lg:grid-cols-3">{['Verify title, sanctioned plan and floor-wise ownership.', 'Confirm parking, utilities, access and terrace rights in writing.', 'Compare land share, construction age and resale liquidity.'].map((item) => <div key={item} className="flex gap-3 rounded-2xl bg-ivory-100 p-4"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /><p className="text-sm font-semibold leading-6 text-navy-700">{item}</p></div>)}</div></section></main>;
}
