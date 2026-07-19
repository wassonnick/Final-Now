import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, Building2, Home, KeyRound, Landmark, ShieldCheck, Users } from "lucide-react";

import { BrandMark } from "@/components/BrandMark";
import { setPublicSeo } from "@/lib/seo";

// Role-aware signup entry — the front door the site lacked. Each card routes into the
// existing OTP login with the right role/next; builder & RWA carry a verification badge
// because those accounts are admin-approved after a real check.
type RoleCard = {
  icon: any;
  title: string;
  tag: string;
  verified?: boolean;
  blurb: string;
  gets: string[];
  href: string;
  cta: string;
};

const ROLES: RoleCard[] = [
  {
    icon: KeyRound,
    title: "Buyer or renter",
    tag: "Instant · phone OTP",
    blurb: "Find and shortlist verified Gurgaon societies, then move only when it feels right.",
    gets: ["Shortlist & saved searches with alerts", "Compare societies side by side", "Society Reports & site-visit requests", "Track your enquiries in one place"],
    href: "/login?role=customer&next=%2Fcustomer%2Fdashboard",
    cta: "Continue as buyer/renter",
  },
  {
    icon: Home,
    title: "Owner or seller",
    tag: "Instant · phone OTP",
    blurb: "List your flat for rent or resale on your society's verified page and meet genuine, checked enquiries.",
    gets: ["List & manage your flats free", "See verified enquiries and status", "Confirm availability on your terms", "Keep your number private"],
    href: "/login?role=customer&next=%2Fowner%2Fdashboard",
    cta: "Continue as owner/seller",
  },
  {
    icon: Building2,
    title: "Builder / developer",
    tag: "Admin-verified account",
    verified: true,
    blurb: "Claim your projects, publish official updates and respond to reviews — after we verify you represent the developer.",
    gets: ["Claim your society profiles", "Post verified announcements", "Respond to resident reviews", "Listing & interest analytics"],
    href: "/login?role=customer&next=%2Fbuilder-portal",
    cta: "Request a builder account",
  },
  {
    icon: Landmark,
    title: "RWA / society committee",
    tag: "Admin-verified account",
    verified: true,
    blurb: "Claim your society's RWA page, share announcements and answer residents — after we verify your committee role.",
    gets: ["Claim your society's RWA page", "Post resident announcements", "Moderate the resident Q&A", "Keep updates official & trusted"],
    href: "/login?role=rwa&next=%2Fbuilder-portal",
    cta: "Request an RWA account",
  },
  {
    icon: Users,
    title: "Broker partner",
    tag: "Verified partner",
    verified: true,
    blurb: "Work society-specific Gurgaon enquiries as a verified SocietyFlats broker partner.",
    gets: ["Society-specific enquiry routing", "Partner CRM dashboard", "Verified-partner badge", "Transparent, no fake inventory"],
    href: "/login?role=broker&next=%2Fbroker%2Fdashboard",
    cta: "Apply as broker partner",
  },
];

export function SignupPage() {
  useEffect(() => {
    setPublicSeo("Join SocietyFlats — Accounts for Buyers, Owners, Builders & RWAs", "Create a SocietyFlats account. Buyers and owners get instant access; builders and RWAs are verified by our team before approval.", { canonical: "/signup" });
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-[#F7F4EF] text-[#1D2939]">
      <section className="border-b border-[#E6DDCF] bg-gradient-to-b from-[#FFFCF7] to-[#F7F2EA] px-5 py-14 md:px-10 md:py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="flex items-center gap-2.5">
            <BrandMark size={34} className="rounded-[10px]" />
            <span className="font-display text-2xl font-medium text-[#111827]">Society<span className="text-[#233B6E]">Flats</span></span>
          </div>
          <h1 className="mt-8 max-w-3xl font-display text-[38px] font-medium leading-[1.05] tracking-[-0.02em] text-[#111827] md:text-[56px]">Join SocietyFlats — choose how you'll use it.</h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-8 text-[#667085]">Buyers and owners get in instantly with a phone OTP. Builders and RWAs are verified by our team first, so every official voice on a society page is genuine.</p>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-5 py-12 md:px-10">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((r) => (
            <div key={r.title} className="flex flex-col rounded-[22px] border border-[#E7DCCB] bg-white p-6 shadow-[0_14px_34px_-32px_rgba(17,24,39,.42)]">
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#E9EEF9] text-[#233B6E]"><r.icon className="h-6 w-6" /></span>
                {r.verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FBF3EE] px-2.5 py-1 text-[10.5px] font-black uppercase tracking-wide text-[#C2724E]"><ShieldCheck className="h-3.5 w-3.5" /> Verified</span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F4E9] px-2.5 py-1 text-[10.5px] font-black uppercase tracking-wide text-[#1b6b3a]"><BadgeCheck className="h-3.5 w-3.5" /> Instant</span>
                )}
              </div>
              <h2 className="mt-4 font-display text-2xl font-medium text-[#111827]">{r.title}</h2>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#8A8F89]">{r.tag}</p>
              <p className="mt-2 text-[14px] leading-6 text-[#667085]">{r.blurb}</p>
              <ul className="mt-4 flex-1 space-y-2">
                {r.gets.map((g) => (
                  <li key={g} className="flex gap-2 text-[13.5px] leading-5 text-[#35413B]"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#233B6E]" />{g}</li>
                ))}
              </ul>
              <Link to={r.href} className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-[#233B6E] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1B2E57]">{r.cta} <ArrowRight className="h-4 w-4" /></Link>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-[#667085]">Already have an account? <Link to="/login" className="font-bold text-[#233B6E] underline">Log in</Link></p>
      </section>
    </div>
  );
}

export default SignupPage;
