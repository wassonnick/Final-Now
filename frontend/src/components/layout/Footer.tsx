import { Link } from "react-router-dom";
import { Home } from "lucide-react";

const desktopColumns = [
  {
    heading: "Discover",
    links: [
      ["Societies by sector", "/gurgaon"],
      ["Societies by builder", "/builder/dlf"],
      ["Popular areas", "/search?tab=societies"],
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
      ["NRI services", "/nri-services"],
      ["Builder & RWA", "/builder-portal"],
      ["Builder floors", "/builder-floors"],
      ["Referral partner", "/referrals"],
    ],
  },
  {
    heading: "Company",
    links: [
      ["How verification works", "/trust"],
      ["Trust & privacy", "/privacy"],
      ["Gurgaon guide", "/gurgaon"],
      ["Help & FAQ", "/help"],
    ],
  },
];

export function Footer() {
  return (
    <>
      <footer className="border-t border-[#1C3A31] bg-[#0B241D] px-5 pb-28 pt-9 text-[#F4EFE4] lg:hidden">
        <Link to="/" className="font-display text-xl font-medium text-[#F4EFE4]">
          Society<span className="text-[#D8B56C]">Flats</span>
        </Link>
        <p className="mt-3 max-w-sm text-sm leading-6 text-[#C9C2AF]">
          Gurgaon&apos;s society-first real estate intelligence platform. Verified data, no fake inventory.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-6">
          {desktopColumns.map((column) => (
            <div key={column.heading}>
              <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[#D8B56C]">
                {column.heading}
              </h3>
              <div className="mt-3 grid gap-2">
                {column.links.map(([label, href]) => (
                  <Link key={href} to={href} className="text-sm text-[#C9C2AF]">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 border-t border-[#1C3A31] pt-5 text-xs text-[#8A9A92]">
          © 2026 SocietyFlats · Verified society data · We never show fake inventory.
        </p>
      </footer>

      <footer className="mt-16 hidden border-t border-[#1C3A31] bg-[#0B241D] lg:block">
        <div className="mx-auto max-w-[1360px] px-10 py-12">
          <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr_1fr] gap-8">
            <div>
              <Link to="/" className="flex items-center gap-2 font-display text-xl font-medium text-[#F4EFE4]">
                <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-[#D8B56C] text-[#0B241D]"><Home className="h-3.5 w-3.5" /></span>
                SocietyFlats
              </Link>
              <p className="mt-2.5 max-w-[260px] text-[13px] leading-[1.5] text-[#C9C2AF]">
                Gurgaon&apos;s society-first real estate intelligence platform. Verified data, no fake inventory.
              </p>
            </div>

            {desktopColumns.map((column) => (
              <div key={column.heading}>
                <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[#D8B56C]">
                  {column.heading}
                </h3>
                <div className="mt-3 grid gap-[9px]">
                  {column.links.map(([label, href]) => (
                    <Link
                      key={`${column.heading}-${href}`}
                      to={href}
                      className="text-[13.5px] text-[#C9C2AF] transition hover:text-[#F4EFE4]"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 border-t border-[#1C3A31] pt-5 text-[12.5px] text-[#8A9A92]">
            © 2026 SocietyFlats · Verified society data · We never show fake inventory.
          </p>
        </div>
      </footer>
    </>
  );
}
