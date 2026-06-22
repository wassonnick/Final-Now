import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Calculator, IndianRupee, LineChart, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchPublicSocieties } from '@/lib/publicData';
import { setPublicSeo } from '@/lib/seo';

type Society = Awaited<ReturnType<typeof fetchPublicSocieties>>[number];

function money(value: unknown): number {
  const text = String(value || '').toLowerCase();
  const number = Number(text.replace(/[^0-9.]/g, '')) || 0;
  if (text.includes('cr')) return number * 10_000_000;
  if (text.includes('lakh') || /\bl\b/.test(text)) return number * 100_000;
  if (text.includes('k')) return number * 1_000;
  return number;
}

function formatCurrency(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

const benchmarks = [
  ['Golf Course Road', '2.2–3.0%', '5–8%'], ['Golf Course Extension', '2.5–3.4%', '6–9%'],
  ['Dwarka Expressway', '2.6–3.6%', '7–11%'], ['New Gurgaon', '2.8–3.8%', '6–10%'], ['Sohna Road', '2.7–3.7%', '5–9%'],
];

export function InvestmentCalculatorPage() {
  const [purchasePrice, setPurchasePrice] = useState(20_000_000);
  const [stampDuty, setStampDuty] = useState(7);
  const [registration, setRegistration] = useState(100_000);
  const [monthlyRent, setMonthlyRent] = useState(65_000);
  const [monthlyMaintenance, setMonthlyMaintenance] = useState(8_000);
  const [annualTax, setAnnualTax] = useState(20_000);
  const [appreciation, setAppreciation] = useState(7);
  const [years, setYears] = useState(10);
  const [societies, setSocieties] = useState<Society[]>([]);

  useEffect(() => {
    setPublicSeo('Rental Yield Calculator | SocietyFlats', 'Calculate gross yield, net yield, payback, projected value and CAGR for a Gurgaon property.', { canonical: '/investment-calculator' });
    void fetchPublicSocieties().then(setSocieties).catch(() => setSocieties([]));
  }, []);

  const metrics = useMemo(() => {
    const acquisition = purchasePrice + purchasePrice * stampDuty / 100 + registration;
    const annualRent = monthlyRent * 12;
    const annualCosts = monthlyMaintenance * 12 + annualTax;
    const netIncome = Math.max(0, annualRent - annualCosts);
    const grossYield = purchasePrice ? annualRent / purchasePrice * 100 : 0;
    const netYield = acquisition ? netIncome / acquisition * 100 : 0;
    const projectedValue = purchasePrice * Math.pow(1 + appreciation / 100, years);
    const cumulativeNetRent = netIncome * years;
    const totalProfit = projectedValue - acquisition + cumulativeNetRent;
    const totalRoi = acquisition ? totalProfit / acquisition * 100 : 0;
    const cagr = acquisition && years ? (Math.pow((projectedValue + cumulativeNetRent) / acquisition, 1 / years) - 1) * 100 : 0;
    const payback = netIncome ? acquisition / netIncome : 0;
    return { acquisition, annualRent, annualCosts, netIncome, grossYield, netYield, projectedValue, cumulativeNetRent, totalProfit, totalRoi, cagr, payback };
  }, [purchasePrice, stampDuty, registration, monthlyRent, monthlyMaintenance, annualTax, appreciation, years]);

  const projection = useMemo(() => Array.from({ length: years + 1 }, (_, year) => ({ year, value: purchasePrice * Math.pow(1 + appreciation / 100, year), rent: metrics.netIncome * year })), [years, purchasePrice, appreciation, metrics.netIncome]);
  const ranked = useMemo(() => societies.map((society) => {
    const price = money(society.averageSalePrice || society.buyRange);
    const rent = money(society.averageRent || society.rentRange);
    return { society, yield: price && rent ? rent * 12 / price * 100 : 0 };
  }).filter((item) => item.yield > 0).sort((a, b) => b.yield - a.yield).slice(0, 6), [societies]);

  const field = (label: string, value: number, setter: (value: number) => void, suffix = '') => <label className="text-sm font-bold text-navy-700">{label}<div className="relative mt-2"><Input type="number" min="0" value={value} onChange={(event) => setter(Number(event.target.value))} className="h-12 rounded-xl pr-12" /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-navy-400">{suffix}</span></div></label>;

  return <main className="min-h-screen bg-ivory-100"><section className="border-b border-blue-100 bg-white"><div className="container mx-auto px-4 py-12"><p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Investment intelligence</p><h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-navy-950 md:text-6xl">Rental yield and multi-year ROI calculator</h1><p className="mt-4 max-w-3xl text-lg text-navy-500">Model acquisition costs, operating expenses, rent and appreciation without hiding the assumptions.</p></div></section>
    <div className="container mx-auto grid gap-6 px-4 py-8 xl:grid-cols-[420px_1fr]"><section className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><Calculator className="h-6 w-6 text-blue-700" /><h2 className="text-xl font-black text-navy-950">Your assumptions</h2></div><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">{field('Purchase price', purchasePrice, setPurchasePrice, '₹')}{field('Stamp duty', stampDuty, setStampDuty, '%')}{field('Registration and legal', registration, setRegistration, '₹')}{field('Monthly rent', monthlyRent, setMonthlyRent, '₹')}{field('Monthly maintenance', monthlyMaintenance, setMonthlyMaintenance, '₹')}{field('Annual property tax', annualTax, setAnnualTax, '₹')}{field('Annual appreciation', appreciation, setAppreciation, '%')}{field('Holding period', years, setYears, 'years')}</div></section>
      <div className="space-y-6"><section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
        ['Gross yield', `${metrics.grossYield.toFixed(2)}%`], ['Net yield', `${metrics.netYield.toFixed(2)}%`], ['Payback', metrics.payback ? `${metrics.payback.toFixed(1)} years` : '—'], ['Projected CAGR', `${metrics.cagr.toFixed(2)}%`],
      ].map(([label, value]) => <div key={label} className="rounded-[22px] border border-blue-100 bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">{label}</p><p className="mt-2 text-2xl font-black text-navy-950">{value}</p></div>)}</section>
        <section className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">{years}-year projection</p><h2 className="mt-1 text-2xl font-black text-navy-950">Value plus rental income</h2></div><LineChart className="h-7 w-7 text-blue-700" /></div><div className="mt-6 flex h-64 items-end gap-1 overflow-hidden">{projection.map((point) => { const max = metrics.projectedValue + metrics.cumulativeNetRent; const height = max ? (point.value + point.rent) / max * 100 : 0; return <div key={point.year} className="group flex min-w-0 flex-1 flex-col items-center justify-end"><div title={`Year ${point.year}: ${formatCurrency(point.value + point.rent)}`} className="w-full rounded-t bg-gradient-to-t from-blue-700 to-blue-400" style={{ height: `${Math.max(3, height)}%` }} /><span className="mt-2 hidden text-[10px] text-navy-400 sm:block">{point.year}</span></div>; })}</div><div className="mt-5 grid gap-3 sm:grid-cols-3">{[['Acquisition cost', metrics.acquisition], ['Projected value', metrics.projectedValue], ['Total ROI', metrics.totalRoi]].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-blue-50 p-3"><p className="text-xs text-blue-700">{label}</p><p className="mt-1 font-black text-navy-950">{label === 'Total ROI' ? `${Number(value).toFixed(1)}%` : formatCurrency(Number(value))}</p></div>)}</div></section>
        <section className="grid gap-6 lg:grid-cols-2"><div className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-navy-950">Top live society yields</h2><p className="mt-1 text-sm text-navy-500">Calculated only where published profiles contain both rent and sale values.</p><div className="mt-4 space-y-2">{ranked.length ? ranked.map(({ society, yield: value }) => <Link key={society.id} to={`/society/${society.slug}`} className="flex items-center justify-between rounded-2xl bg-ivory-100 p-3 hover:bg-blue-50"><span className="font-bold text-navy-900">{society.name}</span><span className="font-black text-emerald-700">{value.toFixed(2)}%</span></Link>) : <p className="rounded-2xl bg-ivory-100 p-4 text-sm text-navy-500">Yield ranking will populate after verified society pricing is published.</p>}</div></div><div className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-navy-950">Locality reference ranges</h2><p className="mt-1 text-sm text-navy-500">Guide ranges—not investment advice or guaranteed returns.</p><div className="mt-4 space-y-2">{benchmarks.map(([name, yieldRange, appreciationRange]) => <div key={name} className="grid grid-cols-[1fr_auto_auto] gap-3 rounded-2xl bg-ivory-100 p-3 text-sm"><span className="font-bold text-navy-900">{name}</span><span className="text-emerald-700">{yieldRange}</span><span className="text-blue-700">{appreciationRange}</span></div>)}</div></div></section>
        <section className="rounded-[28px] bg-navy-950 p-6 text-white"><div className="flex items-center gap-3"><TrendingUp className="h-6 w-6 text-gold-300" /><h2 className="text-2xl font-black">Turn the estimate into a shortlist</h2></div><p className="mt-3 max-w-2xl text-navy-200">Compare verified society pricing, rental demand and available homes before making a decision.</p><div className="mt-5 flex flex-wrap gap-3"><Button asChild className="rounded-full bg-white text-navy-950 hover:bg-blue-50"><Link to="/search?tab=buy">Browse investment homes <ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button><Button asChild variant="outline" className="rounded-full border-white/30 text-white hover:bg-white/10"><Link to="/ai-advisor"><IndianRupee className="mr-2 h-4 w-4" /> Ask AI advisor</Link></Button></div></section>
      </div></div></main>;
}
