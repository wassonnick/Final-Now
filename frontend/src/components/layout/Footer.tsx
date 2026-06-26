import { Link } from "react-router-dom";

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
      ["Compare societies", "/compare"],
      ["List your flat", "/sell"],
      ["Broker partner", "/broker-crm"],
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
      <footer className="border-t border-[#E7DCCB] bg-[#F8F3EA] px-5 pb-28 pt-9 text-[#25302B] lg:hidden">
        <Link to="/" className="font-display text-xl font-medium text-[#123C32]">
          SocietyFlats
        </Link>
        <p className="mt-3 max-w-sm text-sm leading-6 text-[#6E756E]">
          Gurgaon&apos;s society-first real estate intelligence platform. Verified data, no fake inventory.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-6">
          {desktopColumns.slice(0, 2).map((column) => (
            <div key={column.heading}>
              <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[#405049]">
                {column.heading}
              </h3>
              <div className="mt-3 grid gap-2">
                {column.links.map(([label, href]) => (
                  <Link key={href} to={href} className="text-sm text-[#6E756E]">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 border-t border-[#E7DCCB] pt-5 text-xs text-[#8A8F89]">
          © 2026 SocietyFlats · Verified society data · We never show fake inventory.
        </p>
      </footer>

      <footer className="mt-16 hidden border-t border-[#E7DCCB] bg-[#F8F3EA] lg:block">
        <div className="mx-auto max-w-[1360px] px-10 py-10">
          <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-8">
            <div>
              <Link to="/" className="font-display text-xl font-medium text-[#123C32]">
                SocietyFlats
              </Link>
              <p className="mt-2.5 max-w-[260px] text-[13px] leading-[1.5] text-[#6E756E]">
                Gurgaon&apos;s society-first real estate intelligence platform. Verified data, no fake inventory.
              </p>
            </div>

            {desktopColumns.map((column) => (
              <div key={column.heading}>
                <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[#405049]">
                  {column.heading}
                </h3>
                <div className="mt-3 grid gap-[9px]">
                  {column.links.map(([label, href]) => (
                    <Link
                      key={`${column.heading}-${href}`}
                      to={href}
                      className="text-[13.5px] text-[#6E756E] transition hover:text-[#123C32]"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 border-t border-[#E7DCCB] pt-5 text-[12.5px] text-[#8A8F89]">
            © 2026 SocietyFlats · Verified society data · We never show fake inventory.
          </p>
        </div>
      </footer>
    </>
  );
}
