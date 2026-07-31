import { Link } from "react-router-dom";
import { Phone } from "lucide-react";

import { BrandMark } from "@/components/BrandMark";
import { BRAND_PHONE_DISPLAY, BRAND_PHONE_HREF } from "@/config/contact";

const ACCENT = "#0F7B63";

const desktopColumns = [
  {
    heading: "Discover",
    links: [
      ["Societies by sector", "/gurgaon"],
      ["Societies by builder", "/builder/dlf"],
      ["Flats under ₹2 Cr", "/gurgaon-flats/under-2-cr"],
      ["Luxury flats", "/gurgaon-flats/luxury"],
      ["Ultra-luxury flats", "/gurgaon-flats/ultra-luxury"],
      ["New launches", "/search?tab=societies&q=Under%20Construction"],
    ],
  },
  {
    heading: "Platform",
    links: [
      ["AI Advisor", "/ai-advisor"],
      ["AI chat", "/chat"],
      ["Compare societies", "/compare"],
      ["Map intelligence", "/maps"],
    ],
  },
  {
    heading: "Services",
    links: [
      ["NRI management & sales", "/nri-services"],
      ["Builder & RWA", "/builder-portal"],
      ["Builder floors", "/builder-floors"],
      ["Referral partner", "/referrals"],
    ],
  },
  {
    heading: "Company",
    links: [
      ["How verification works", "/trust"],
      ["Methodology", "/methodology"],
      ["Data sources", "/data-sources"],
      ["Score explained", "/score-explained"],
      ["Corrections", "/corrections"],
      ["Editorial independence", "/editorial-independence"],
      ["Trust & privacy", "/privacy"],
      ["Gurgaon guide", "/gurgaon"],
      ["Help & FAQ", "/help"],
    ],
  },
];

const Wordmark = () => (
  <span className="font-display text-[21px] font-semibold tracking-[-0.02em] text-white">
    Society<span style={{ color: "#3BAE93" }}>Flats</span>
  </span>
);

const PhoneButton = () => (
  <a
    href={BRAND_PHONE_HREF}
    className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#2E2E33] bg-[#252528] px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-[#2E2E33]"
  >
    <Phone className="h-4 w-4" style={{ color: "#3BAE93" }} />
    {BRAND_PHONE_DISPLAY}
  </a>
);

const Tagline = ({ className = "" }: { className?: string }) => (
  <p className={`text-[13px] leading-[1.55] text-[#9A9AA0] ${className}`}>
    Delhi NCR&apos;s society-first real estate platform. Verified data, real scores, no fake inventory.
  </p>
);

export function Footer() {
  return (
    <>
      {/* Mobile */}
      <footer className="border-t border-[#2A2A2E] bg-[#1D1D1F] px-5 pb-28 pt-9 lg:hidden">
        <Link to="/" onClick={() => window.scrollTo(0, 0)} className="inline-flex items-center gap-2.5">
          <BrandMark size={28} className="rounded-[8px]" />
          <Wordmark />
        </Link>
        <Tagline className="mt-3 max-w-sm" />
        <PhoneButton />
        <div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-7">
          {desktopColumns.map((column) => (
            <div key={column.heading}>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6E6E73]">{column.heading}</h3>
              <div className="mt-3 grid gap-2.5">
                {column.links.map(([label, href]) => (
                  <Link key={href} to={href} className="w-fit text-[13.5px] text-[#C7C7CD]">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 border-t border-[#2A2A2E] pt-5 text-[12px] leading-5 text-[#6E6E73]">
          © 2026 SocietyFlats · Verified society data · We never show fake inventory.
        </p>
      </footer>

      {/* Desktop */}
      <footer className="mt-16 hidden border-t border-[#2A2A2E] bg-[#1D1D1F] lg:block">
        <div className="mx-auto max-w-[1360px] px-10 py-14">
          <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr_1fr] gap-8">
            <div>
              <Link to="/" onClick={() => window.scrollTo(0, 0)} className="flex items-center gap-2.5">
                <BrandMark size={26} className="rounded-[7px]" />
                <Wordmark />
              </Link>
              <Tagline className="mt-3 max-w-[260px]" />
              <PhoneButton />
              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#252528] px-3 py-1.5 text-[11.5px] font-semibold text-[#C7C7CD]">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: ACCENT }} />
                Now across Delhi NCR
              </div>
            </div>

            {desktopColumns.map((column) => (
              <div key={column.heading}>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6E6E73]">{column.heading}</h3>
                <div className="mt-3.5 grid gap-[10px]">
                  {column.links.map(([label, href]) => (
                    <Link
                      key={`${column.heading}-${href}`}
                      to={href}
                      className="w-fit text-[13.5px] text-[#C7C7CD] transition hover:text-white"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-10 border-t border-[#2A2A2E] pt-5 text-[12.5px] text-[#6E6E73]">
            © 2026 SocietyFlats · Verified society data · We never show fake inventory.
          </p>
        </div>
      </footer>
    </>
  );
}
