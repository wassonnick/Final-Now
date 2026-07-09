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
    <div className="min-h-screen bg-[#F8F3EA]">
      <main className="mx-auto max-w-[900px] px-4 pb-14 pt-6 md:px-6">
        <h1 className="font-display text-[26px] font-medium leading-tight text-[#10251F] md:text-[32px]">
          SocietyFlats AI Advisor
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#6E756E]">
          Continue your Gurgaon society shortlist.{" "}
          Tell me what you're after in plain words — I reason over 66 verified societies, show you why each one fits,
          and I'll say so honestly when nothing does.
        </p>
        <Link
          to={initialQuery ? `/search?q=${encodeURIComponent(initialQuery)}&tab=societies` : "/search?tab=societies"}
          className="mt-3 inline-flex rounded-full border border-[#E1D4C1] bg-white px-4 py-2 text-sm font-semibold text-[#10251F] shadow-sm transition hover:border-[#BFAE95] hover:bg-[#FFFDF8]"
        >
          Open full search
        </Link>
        <div className="mt-4">
          <SocietyAssistant initialQuery={initialQuery} />
        </div>
      </main>
    </div>
  );
}
