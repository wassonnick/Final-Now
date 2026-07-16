// C86 internal SEO links polish: clearer Gurgaon locality/builder discovery blocks.
import { Link } from "react-router-dom";
import { ArrowRight, Building2, GitCompareArrows, Home, MapPin, Sparkles } from "lucide-react";

const primaryLinks = [
  {
    label: "Gurgaon society guide",
    href: "/gurgaon",
    description: "Start with society-first Gurgaon discovery and shortlisting.",
    icon: Sparkles,
  },
  {
    label: "Verified Gurgaon societies",
    href: "/gurgaon/societies",
    description: "Compare society scores, location context and live inventory.",
    icon: Building2,
  },
  {
    label: "Verified Gurgaon properties",
    href: "/gurgaon/properties",
    description: "Browse live homes inside verified Gurgaon societies.",
    icon: Home,
  },
  {
    label: "Society comparisons",
    href: "/compare",
    description: "Review published 3-way society comparison pages.",
    icon: GitCompareArrows,
  },
];

const localityLinks = [
  { label: "Sector 65", href: "/gurgaon/sector-65" },
  { label: "Sector 56", href: "/gurgaon/sector-56" },
  { label: "Sector 66", href: "/gurgaon/sector-66" },
  { label: "Sector 67", href: "/gurgaon/sector-67" },
  { label: "Sector 70", href: "/gurgaon/sector-70" },
  { label: "Sector 102", href: "/gurgaon/sector-102" },
  { label: "Golf Course Road", href: "/gurgaon/golf-course-road" },
  { label: "Golf Course Extension Road", href: "/gurgaon/golf-course-extension-road" },
  { label: "Dwarka Expressway", href: "/gurgaon/dwarka-expressway" },
  { label: "Sohna Road", href: "/gurgaon/sohna-road" },
];

const builderLinks = [
  { label: "DLF", href: "/builder/dlf" },
  { label: "M3M", href: "/builder/m3m" },
  { label: "Emaar", href: "/builder/emaar" },
  { label: "ATS", href: "/builder/ats" },
  { label: "Godrej", href: "/builder/godrej" },
  { label: "Adani Realty", href: "/builder/adani" },
  { label: "Tulip", href: "/builder/tulip" },
  { label: "Alpha Corp", href: "/builder/alpha-corp" },
];

type InternalSeoLinksProps = {
  variant?: "home" | "landing" | "footer";
  title?: string;
  description?: string;
};

export function InternalSeoLinks({
  variant = "home",
  title,
  description,
}: InternalSeoLinksProps) {
  const isFooter = variant === "footer";
  const isLanding = variant === "landing";

  if (isFooter) {
    return (
      <div className="mt-8 border-t border-white/10 pt-6">
        <div className="grid gap-6 md:grid-cols-3">
          <FooterColumn title="Gurgaon" links={primaryLinks.map(({ label, href }) => ({ label, href }))} />
          <FooterColumn title="Popular localities" links={localityLinks.slice(0, 6)} />
          <FooterColumn title="Builder pages" links={builderLinks.slice(0, 6)} />
        </div>
      </div>
    );
  }

  return (
    <section className={isLanding ? "bg-white px-4 py-6 md:py-8" : "bg-blue-50/30 px-4 py-8 md:py-10"}>
      <div className="container mx-auto">
        <div className="rounded-[1.25rem] border border-blue-100 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                Popular Gurgaon society searches
              </p>
              <h2 className="font-display text-2xl font-black leading-tight tracking-tight text-navy-950 md:text-3xl">
                {title || "Explore Gurgaon by locality, builder and live inventory"}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-navy-500">
                {description ||
                  "Use these quick links to compare verified Gurgaon societies, priority sectors, builder collections and available homes faster."}
              </p>
            </div>

            <Link
              to="/search?tab=societies"
              className="inline-flex items-center text-sm font-black text-blue-700 hover:text-blue-800"
            >
              Search Gurgaon societies
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {primaryLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className="group rounded-[1rem] border border-blue-100 bg-blue-50/45 p-3.5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-3 text-base font-black text-navy-950 group-hover:text-blue-700">
                    {item.label}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-navy-500">
                    {item.description}
                  </p>
                </Link>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <LinkGroup
              icon={<MapPin className="h-4 w-4" />}
              title="Search by Gurgaon locality"
              links={localityLinks}
            />
            <LinkGroup
              icon={<Building2 className="h-4 w-4" />}
              title="Search by builder"
              links={builderLinks}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function LinkGroup({
  icon,
  title,
  links,
}: {
  icon: React.ReactNode;
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="rounded-[1rem] border border-navy-100 bg-white p-3.5">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-navy-950">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          {icon}
        </span>
        {title}
      </div>

      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            to={link.href}
            className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-black text-blue-700 transition hover:border-blue-200 hover:bg-blue-50"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">
        {title}
      </h3>
      <div className="mt-3 grid gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            to={link.href}
            className="text-sm font-semibold text-white/70 transition hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
