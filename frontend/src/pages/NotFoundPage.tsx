import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Home, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { setPublicSeo } from "@/lib/seo";

export function NotFoundPage() {
  useEffect(() => {
    setPublicSeo(
      "Page Not Found | SocietyFlats",
      "This SocietyFlats page could not be found. Search verified Gurgaon societies and live homes instead.",
      { noindex: true, canonical: "/404" },
    );
  }, []);

  return (
    <section className="bg-gradient-to-b from-blue-50/70 via-white to-white px-4 py-16 md:py-24">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-700 shadow-sm">
          404
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-navy-900 md:text-5xl">
          This page is not available
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-6 text-navy-500 md:text-base md:leading-7">
          The page may have moved, or the listing may no longer be live. You can continue with verified Gurgaon societies and available homes.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to="/search">
            <Button className="rounded-full bg-blue-700 px-6 text-white hover:bg-blue-800">
              <Search className="mr-2 h-4 w-4" />
              Search SocietyFlats
            </Button>
          </Link>

          <Link to="/gurgaon">
            <Button variant="outline" className="rounded-full border-blue-200 px-6 text-blue-800">
              <Home className="mr-2 h-4 w-4" />
              Gurgaon guide
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
