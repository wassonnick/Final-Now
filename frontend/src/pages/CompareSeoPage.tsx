import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, Home, MessageCircle, Search, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PublicLeadModal } from "@/components/leads/PublicLeadModal";
import { backendApi } from "@/services/backendApi";
import { setPublicSeo } from "@/lib/seo";

type ComparePageRecord = {
  id: number;
  slug: string;
  title: string;
  meta_title?: string;
  meta_description?: string;
  h1?: string;
  intro?: string;
  comparison_summary?: string;
  recommendation_copy?: string;
  status: string;
  city?: string;
  sector_cluster?: string;
  score?: string | number;
  content_quality_score?: string | number;
  best_for_json?: Array<{ society: string; label: string }>;
  comparison_table_json?: {
    columns?: Array<{ id: number; name: string; slug: string }>;
    rows?: Array<{ label: string; values: string[] }>;
  };
  society_summaries_json?: Array<{
    id: number;
    name: string;
    slug: string;
    sector?: string;
    locality?: string;
    builder?: string;
    score?: number;
    rent_range?: string;
    buy_range?: string;
    profile_url?: string;
    blurb?: string;
  }>;
  faq_json?: Array<{ question: string; answer: string }>;
  published_at?: string;
  societies?: Array<{
    id: number;
    name: string;
    slug: string;
    sector?: string;
    builder?: string;
    live_property_count?: number;
    live_properties?: Array<{
      id: number;
      slug: string;
      title?: string;
      listing_type?: string;
      price?: string;
      bedrooms?: number | string;
      area_sqft?: number | string;
      furnished_status?: string;
    }>;
  }>;
};

function extractRows(payload: any): ComparePageRecord[] {
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function faqJsonLd(page: ComparePageRecord) {
  const faqs = page.faq_json || [];

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://www.societyflats.com" },
          { "@type": "ListItem", position: 2, name: "Compare", item: "https://www.societyflats.com/compare" },
          { "@type": "ListItem", position: 3, name: page.title, item: `https://www.societyflats.com/compare/${page.slug}` },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };
}

function CompareIndex() {
  const [pages, setPages] = useState<ComparePageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setPublicSeo(
      "Compare Gurgaon Societies | SocietyFlats",
      "Browse published SocietyFlats 3-way society comparison pages for Gurgaon societies.",
      { canonical: "/compare" },
    );

    backendApi
      .request("/compare-pages?per_page=48")
      .then((payload) => setPages(extractRows(payload)))
      .catch((err) => setError(err?.message || "Unable to load comparison pages."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-[#F8F3EA] text-[#1f271f]">
      <section className="mx-auto max-w-[1180px] px-5 py-12 md:px-8 md:py-16">
        <div className="max-w-3xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#dbe4d6] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#1b4732]">
            <ShieldCheck className="h-4 w-4" />
            Published comparison pages
          </p>
          <h1 className="font-serif text-4xl leading-tight text-[#19231c] md:text-6xl">
            Compare Gurgaon societies before choosing the home.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#667064]">
            Each page compares three published SocietyFlats society profiles using admin-reviewed data. No draft societies, private fields or unverified promises are shown.
          </p>
        </div>

        {loading ? (
          <div className="mt-10 rounded-[2rem] border border-[#dfded6] bg-white p-8 text-[#667064]">Loading comparison pages…</div>
        ) : error ? (
          <div className="mt-10 rounded-[2rem] border border-red-100 bg-white p-8 text-red-700">{error}</div>
        ) : pages.length === 0 ? (
          <div className="mt-10 rounded-[2rem] border border-[#dfded6] bg-white p-8">
            <h2 className="text-2xl font-bold text-[#19231c]">No published comparison pages yet.</h2>
            <p className="mt-3 text-[#667064]">Generated comparison pages stay in admin review until approved and published.</p>
            <Button asChild className="mt-6 rounded-full bg-[#153f2b] px-6 text-white hover:bg-[#0e2f20]">
              <Link to="/search">Browse published societies</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {pages.map((page) => (
              <Link
                key={page.id}
                to={`/compare/${page.slug}`}
                className="group rounded-[2rem] border border-[#dfded6] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c8793f]">{page.sector_cluster || page.city || "Gurgaon"}</p>
                <h2 className="mt-3 font-serif text-3xl leading-tight text-[#19231c]">{page.title}</h2>
                <p className="mt-4 line-clamp-3 text-[#667064]">{page.comparison_summary || page.meta_description}</p>
                <div className="mt-6 flex items-center justify-between">
                  <span className="rounded-full bg-[#e6f4e9] px-3 py-1 text-sm font-semibold text-[#1b6b3a]">Published</span>
                  <span className="inline-flex items-center gap-2 font-semibold text-[#153f2b]">
                    Open comparison <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CompareDetail({ slug }: { slug: string }) {
  const [page, setPage] = useState<ComparePageRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Which society the availability lead modal is open for ("" = closed, "__page__" = whole comparison).
  const [leadSociety, setLeadSociety] = useState("");

  useEffect(() => {
    setLoading(true);
    backendApi
      .request(`/compare-pages/${encodeURIComponent(slug)}`)
      .then((payload) => {
        const record = payload?.data as ComparePageRecord;
        setPage(record);
        setPublicSeo(
          record.meta_title || `${record.title} | SocietyFlats`,
          record.meta_description || record.comparison_summary || "Compare published Gurgaon society profiles on SocietyFlats.",
          { canonical: `/compare/${record.slug}`, jsonLd: faqJsonLd(record) },
        );
      })
      .catch((err) => setError(err?.message || "Comparison page not found."))
      .finally(() => setLoading(false));
  }, [slug]);

  const rows = page?.comparison_table_json?.rows || [];
  const summaries = page?.society_summaries_json || [];
  const columns = page?.comparison_table_json?.columns || summaries.map((summary) => ({ id: summary.id, name: summary.name, slug: summary.slug }));
  const whatsappMessage = encodeURIComponent(`Hi SocietyFlats, I need help with this comparison: ${page?.title || "Gurgaon societies"}.`);

  if (loading) {
    return <div className="min-h-[60vh] bg-[#F8F3EA] px-5 py-16 text-[#667064]">Loading comparison…</div>;
  }

  if (error || !page) {
    return (
      <div className="min-h-[60vh] bg-[#F8F3EA] px-5 py-16">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-[#dfded6] bg-white p-8">
          <h1 className="font-serif text-4xl text-[#19231c]">Comparison not available</h1>
          <p className="mt-4 text-[#667064]">{error || "This page may still be in admin review."}</p>
          <Button asChild className="mt-6 rounded-full bg-[#153f2b] px-6 text-white hover:bg-[#0e2f20]">
            <Link to="/compare">View published comparisons</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F8F3EA] text-[#1f271f]">
      <section className="mx-auto grid max-w-[1180px] gap-8 px-5 py-10 md:px-8 lg:grid-cols-[1fr_330px]">
        <div>
          <Link to="/compare" className="inline-flex items-center gap-2 text-sm font-semibold text-[#667064] hover:text-[#153f2b]">
            Compare pages <ArrowRight className="h-4 w-4" />
          </Link>
          <h1 className="mt-6 font-serif text-4xl leading-tight text-[#19231c] md:text-6xl">{page.h1 || page.title}</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-[#667064]">{page.intro}</p>
          {page.comparison_summary ? (
            <p className="mt-3 max-w-3xl leading-7 text-[#4e574e]">{page.comparison_summary}</p>
          ) : null}

          <div className="mt-8 rounded-[1.5rem] bg-[#143f2b] px-6 py-5 text-white">
            <div className="flex flex-wrap gap-4">
              <span className="text-sm font-bold uppercase tracking-[0.18em] text-[#a8d8b3]">AI summary</span>
              {(page.best_for_json || []).map((item) => (
                <span key={`${item.society}-${item.label}`}>
                  <strong>{item.label}:</strong> {item.society}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {summaries.map((society) => (
              <div key={society.id} className="rounded-[1.75rem] border border-[#dfded6] bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-full bg-[#e6f4e9] px-3 py-1 text-sm font-semibold text-[#1b6b3a]">
                    <CheckCircle2 className="mr-1 inline h-4 w-4" />
                    Published
                  </span>
                  <span className="text-sm font-bold text-[#153f2b]">{society.score ? `${society.score}` : "Review"}</span>
                </div>
                <h2 className="font-serif text-2xl text-[#19231c]">{society.name}</h2>
                <p className="mt-2 text-[#667064]">{society.sector || society.locality || "Gurgaon"} {society.builder ? `· ${society.builder}` : ""}</p>
                {society.blurb ? <p className="mt-3 text-sm leading-6 text-[#4e574e]">{society.blurb}</p> : null}
                <p className="mt-4 text-sm text-[#667064]">Rent: {society.rent_range || "Not enough verified data"}</p>
                <p className="mt-1 text-sm text-[#667064]">Resale: {society.buy_range || "Not enough verified data"}</p>
                <Button asChild variant="outline" className="mt-5 w-full rounded-full border-[#cfd8cc] bg-white">
                  <Link to={`/society/${society.slug}`}>Open society</Link>
                </Button>
              </div>
            ))}
          </div>

          <section className="mt-10">
            <h2 className="font-serif text-3xl text-[#19231c]">Verified homes available right now</h2>
            <p className="mt-2 text-[#667064]">Live, admin-verified listings inside these societies — shown from current inventory, never cached.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {(page.societies || []).map((society) => (
                <div key={society.slug} className="flex flex-col rounded-[1.75rem] border border-[#dfded6] bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-serif text-xl text-[#19231c]">{society.name}</h3>
                    <span className="whitespace-nowrap rounded-full bg-[#e6f4e9] px-3 py-1 text-xs font-bold text-[#1b6b3a]">
                      {society.live_property_count || 0} live
                    </span>
                  </div>
                  <div className="mt-4 flex-1 space-y-3">
                    {(society.live_properties || []).length ? (
                      (society.live_properties || []).map((property) => (
                        <Link
                          key={property.id}
                          to={`/property/${property.slug}`}
                          className="block rounded-[1.1rem] border border-[#ece6dc] p-3.5 transition hover:border-[#153f2b]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-[#19231c]">{property.title || "Verified home"}</span>
                            <span className="whitespace-nowrap font-bold text-[#153f2b]">{property.price || "On request"}</span>
                          </div>
                          <p className="mt-1 text-sm text-[#667064]">
                            {[
                              property.bedrooms ? `${property.bedrooms} BHK` : null,
                              property.area_sqft ? `${property.area_sqft} sq.ft` : null,
                              property.furnished_status || null,
                              property.listing_type || null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </Link>
                      ))
                    ) : (
                      <p className="rounded-[1.1rem] border border-dashed border-[#d8d4ca] p-3.5 text-sm leading-6 text-[#667064]">
                        No verified homes listed right now. Request availability and SocietyFlats will check owner and broker options for you.
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => setLeadSociety(society.name)}
                    className="mt-4 w-full rounded-full bg-[#153f2b] text-white hover:bg-[#0e2f20]"
                  >
                    Check availability in {society.name.split(" ")[0]}
                  </Button>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-10 overflow-hidden rounded-[1.75rem] border border-[#dfded6] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="border-b border-[#e6e1d6]">
                    <th className="bg-[#f4f0e7] p-5 text-sm font-bold text-[#4e574e]">Comparison point</th>
                    {columns.map((column) => (
                      <th key={column.id} className="p-5 text-lg font-bold text-[#19231c]">{column.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label} className="border-b border-[#e6e1d6] last:border-b-0">
                      <td className="bg-[#f4f0e7] p-5 font-semibold text-[#4e574e]">{row.label}</td>
                      {row.values.map((value, index) => (
                        <td key={`${row.label}-${index}`} className="p-5 text-[#273127]">{String(value)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <section className="mt-10 rounded-[2rem] border border-[#dfded6] bg-white p-6">
            <h2 className="font-serif text-3xl text-[#19231c]">Frequently asked questions</h2>
            <div className="mt-5 divide-y divide-[#ece6dc]">
              {(page.faq_json || []).map((faq) => (
                <details key={faq.question} className="group py-4 first:pt-0" open>
                  <summary className="cursor-pointer list-none font-semibold text-[#19231c]">{faq.question}</summary>
                  <p className="mt-3 leading-7 text-[#667064]">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-[2rem] border border-[#dfded6] bg-white p-6 shadow-xl shadow-[#2c2417]/10">
            <p className="text-sm text-[#667064]">Need current availability?</p>
            <h2 className="mt-2 font-serif text-3xl text-[#153f2b]">Use this comparison as a shortlist.</h2>
            <div className="mt-6 grid gap-3">
              <Button asChild className="rounded-full bg-[#153f2b] text-white hover:bg-[#0e2f20]">
                <Link to="/ai-advisor"><Sparkles className="mr-2 h-4 w-4" /> Ask AI Advisor</Link>
              </Button>
              <Button
                variant="outline"
                className="rounded-full border-[#153f2b] bg-white text-[#153f2b]"
                onClick={() => setLeadSociety("__page__")}
              >
                <Search className="mr-2 h-4 w-4" /> Request available homes
              </Button>
              <Button asChild className="rounded-full bg-[#45a049] text-white hover:bg-[#3c8d40]">
                <a href={`https://wa.me/919911886222?text=${whatsappMessage}`} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp SocietyFlats
                </a>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-[#c8793f] bg-white text-[#9a552e]">
                <Link to="/sell"><Home className="mr-2 h-4 w-4" /> List your flat</Link>
              </Button>
            </div>
            <p className="mt-6 border-t border-[#ece6dc] pt-5 text-sm leading-6 text-[#667064]">
              {page.recommendation_copy || "Request current verified availability before planning visits."}
            </p>
          </div>
        </aside>
      </section>

      <PublicLeadModal
        open={leadSociety !== ""}
        title={leadSociety === "__page__" ? "Request current availability" : `Check availability in ${leadSociety}`}
        subtitle={
          leadSociety === "__page__"
            ? `SocietyFlats will check current verified options across ${page.title}.`
            : `SocietyFlats will confirm current verified homes and owner/broker options in ${leadSociety}.`
        }
        source={leadSociety === "__page__" ? "compare_page_sidebar" : "compare_page_availability"}
        leadIntent="availability"
        societyName={leadSociety === "__page__" ? undefined : leadSociety}
        defaultMessage={`Interested via comparison: ${page.title}`}
        onClose={() => setLeadSociety("")}
      />
    </div>
  );
}

export function CompareSeoPage() {
  const { slug } = useParams();

  return slug ? <CompareDetail slug={slug} /> : <CompareIndex />;
}

export default CompareSeoPage;
