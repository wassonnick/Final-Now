import { Link } from "react-router-dom";
import { Building2, Mail, MapPin, Phone } from "lucide-react";

const quickLinks = [
  { label: "Societies", href: "/search?tab=societies" },
  { label: "Rent", href: "/search?tab=rent" },
  { label: "Buy", href: "/search?tab=buy" },
  { label: "AI Advisor", href: "/ai-advisor" },
];

const ownerLinks = [
  { label: "List Property", href: "/sell" },
  { label: "Compare", href: "/compare" },
  { label: "Insights", href: "/insights" },
  { label: "Map", href: "/map" },
];

export function Footer() {
  return (
    <footer className="bg-navy-950 text-white">
      <div className="container mx-auto px-4 pb-28 pt-8 md:pb-8 md:pt-14">
        <div className="grid gap-7 md:grid-cols-[1.2fr_0.8fr_0.8fr_1fr] md:gap-10">
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600">
                <Building2 className="h-5 w-5 text-white" />
              </span>
              <span>
                <span className="block font-display text-lg font-bold text-white">
                  SocietyFlats
                </span>
                <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-blue-200">
                  Intelligence First
                </span>
              </span>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-6 text-navy-200 md:text-base md:leading-7">
              Gurgaon-first society intelligence platform for verified rentals,
              resale homes and smarter shortlisting.
            </p>

            <div className="mt-4 grid gap-2 text-sm text-navy-200 md:mt-6">
              <a
                href="tel:+919911886222"
                className="inline-flex items-center gap-2 hover:text-white"
              >
                <Phone className="h-4 w-4 text-blue-300" />
                +91 99118 86222
              </a>
              <a
                href="mailto:hello@societyflats.com"
                className="inline-flex items-center gap-2 hover:text-white"
              >
                <Mail className="h-4 w-4 text-blue-300" />
                hello@societyflats.com
              </a>
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-300" />
                Gurgaon, India
              </span>
            </div>
          </div>

          <div className="hidden md:block">
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-blue-200">
              Quick Links
            </h3>
            <div className="mt-4 grid gap-3">
              {quickLinks.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="text-sm text-navy-200 transition hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden md:block">
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-blue-200">
              For owners
            </h3>
            <div className="mt-4 grid gap-3">
              {ownerLinks.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="text-sm text-navy-200 transition hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 md:p-5">
            <h3 className="font-display text-lg font-bold text-white">
              Need help shortlisting?
            </h3>
            <p className="mt-2 text-sm leading-6 text-navy-200">
              Share your requirement and get society-wise options.
            </p>
            <Link
              to="/chat"
              className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500"
            >
              Request Callback
            </Link>
          </div>
        </div>

        <div className="mt-7 border-t border-white/10 pt-4 md:mt-10 md:pt-6">
          <div className="flex flex-col gap-3 text-xs text-navy-300 md:flex-row md:items-center md:justify-between">
            <p>© 2025 SocietyFlats. All rights reserved.</p>

            <div className="flex flex-wrap gap-3">
              <Link to="/" className="transition hover:text-white">
                Privacy Policy
              </Link>
              <Link to="/" className="transition hover:text-white">
                Terms
              </Link>
              <Link to="/contact" className="transition hover:text-white">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </div>
          </footer>
  );
}
