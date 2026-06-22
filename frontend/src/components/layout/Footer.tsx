import { PublicLeadModal } from "@/components/leads/PublicLeadModal";
import { Button } from "@/components/ui/button";
import { useState } from "react";
// C85 public footer polish: cleaner SocietyFlats trust copy, tighter spacing and stronger internal links.
// C70C footer copy: society-first trust, owner/broker paths and updated copyright.
import { Link } from "react-router-dom";
import { Building2, Mail, MapPin, Phone } from "lucide-react";

const quickLinks = [
  { label: "Societies", href: "/search?tab=societies" },
  { label: "Rent", href: "/search?tab=rent" },
  { label: "Buy", href: "/search?tab=buy" },
  { label: "AI Advisor", href: "/ai-advisor" },
  { label: "Gurgaon Guide", href: "/gurgaon" },
  { label: "Investment Calculator", href: "/investment-calculator" },
];

const ownerLinks = [
  { label: "List Your Flat", href: "/sell" },
  { label: "Broker Partner", href: "/broker-crm" },
  { label: "Compare Societies", href: "/compare" },
  { label: "Market Insights", href: "/insights" },
  { label: "Map Intelligence", href: "/maps" },
  { label: "Builder Floors", href: "/builder-floors" },
];

export function Footer() {
  const [callbackOpen, setCallbackOpen] = useState(false);
  return (
    <footer className="border-t border-navy-900 bg-navy-950 text-white">
      <div className="container mx-auto px-4 pb-28 pt-8 md:pb-8 md:pt-12">
        <div className="grid gap-6 md:grid-cols-[1.15fr_0.8fr_0.8fr_1fr] md:gap-8">
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

            <p className="mt-3 max-w-sm text-sm leading-6 text-navy-200 md:text-[15px] md:leading-7">
              Gurgaon-first society intelligence for verified rentals, resale homes, owner listings and AI-assisted shortlisting.
            </p>

            <div className="mt-4 grid gap-2 text-sm text-navy-200">
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
            <div className="mt-3 grid gap-2.5">
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
            <div className="mt-3 grid gap-2.5">
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

          <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
            <h3 className="font-display text-base font-bold text-white md:text-lg">
              Need help shortlisting?
            </h3>
            <p className="mt-2 text-sm leading-6 text-navy-200">
              Share your requirement and get society-wise verified options.
            </p>
            <Button
                type="button"
                onClick={() => setCallbackOpen(true)}
                className="w-full rounded-full bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2"
              >
                Request Callback
              </Button>
          </div>
        </div>

        <div className="mt-6 border-t border-white/10 pt-4 md:mt-8 md:pt-5">
          <div className="flex flex-col gap-3 text-xs text-navy-300 md:flex-row md:items-center md:justify-between">
            <p>© 2026 SocietyFlats. All rights reserved.</p>

            <div className="flex flex-wrap gap-3">
              <Link to="/privacy" className="transition hover:text-white">
                Privacy Policy
              </Link>
              <Link to="/terms" className="transition hover:text-white">
                Terms
              </Link>
              <Link to="/contact" className="transition hover:text-white">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </div>
          
      <PublicLeadModal
        open={callbackOpen}
        onClose={() => setCallbackOpen(false)}
        title="Request SocietyFlats callback"
        source="footer_callback"
        ctaLabel="Footer request callback"
        leadIntent="general"
        defaultMessage="I need help shortlisting verified Gurgaon societies or homes."
        submitLabel="Request callback"
        successMessage="Request received. SocietyFlats will call you shortly with matching options."
      />
    </footer>
  );
}
