import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { setPublicSeo } from "@/lib/seo";
import { SocietyAssistant } from "@/components/ai/SocietyAssistant";

export function AIAdvisorPage() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || searchParams.get("society") || "";

  useEffect(() => {
    setPublicSeo(
      "SocietyFlats AI Advisor — Your Gurgaon Home Search, Made Simple",
      "Just tell our AI advisor what matters — your commute, budget, schools, the feel you're after — and it'll gently shortlist the Gurgaon societies and homes that genuinely fit.",
    );
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="ncr-skin min-h-screen bg-[#F8F3EA]">
      <main className="mx-auto max-w-[900px] px-4 pb-14 pt-6 md:px-6">
        <h1 className="font-display text-[26px] font-medium leading-tight text-[#10251F] md:text-[32px]">
          SocietyFlats AI Advisor
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#6E756E]">
          Continue your Gurgaon society shortlist.{" "}
          Tell me what you're after in plain words — I reason over every verified society, show you why each one fits,
          and I'll say so honestly when nothing does.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to={initialQuery ? `/search?q=${encodeURIComponent(initialQuery)}&tab=societies` : "/search?tab=societies"}
            className="inline-flex items-center rounded-full bg-[#0F7B63] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0C6853]"
          >
            Browse all verified societies
          </Link>
          <Link
            to="/compare"
            className="inline-flex items-center rounded-full border border-[#E4E4E9] bg-white px-5 py-2.5 text-sm font-semibold text-[#1D1D1F] transition hover:bg-[#F5F5F7]"
          >
            Compare side by side
          </Link>
        </div>
        <div className="mt-4">
          <SocietyAssistant initialQuery={initialQuery} />
        </div>
      </main>
    </div>
  );
}
