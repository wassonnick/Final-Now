// Campaign definitions — the seed of the Campaigns module. Each entry renders a
// full conversion landing at /go/<slug> (CampaignLandingPage), and Brand Studio
// carries the matching social creatives. Adding a campaign = adding one entry
// here; a later iteration can move this shape behind an admin CRUD unchanged.

export type Campaign = {
  slug: string;
  badge: string;
  titlePlain: string;
  titleGold: string;
  subtitle: string;
  bullets: Array<{ title: string; text: string }>;
  steps: Array<{ title: string; text: string }>;
  faq: Array<{ question: string; answer: string }>;
  primaryCta: { label: string; href: string };
  whatsappText: string;
  leadSource: string;
  seo: { title: string; description: string };
};

export const CAMPAIGNS: Record<string, Campaign> = {
  "list-your-flat": {
    slug: "list-your-flat",
    badge: "For Gurgaon owners · Free listing",
    titlePlain: "Tenants are already searching",
    titleGold: "your society.",
    subtitle:
      "SocietyFlats is where Gurgaon home-seekers choose the society first — then look for a flat inside it. List yours once and it appears on your society's verified page, in front of people who have already picked your address.",
    bullets: [
      { title: "Verified enquiries only", text: "Every seeker request is checked by a real person before it reaches you. No spam calls, no fake leads, no broker flood." },
      { title: "Society-first demand", text: "Your flat shows on your society's own profile and comparisons — seen by people already sold on the address." },
      { title: "Free and five minutes", text: "No listing fee. Basic details to start; photos can follow. We help you complete it on WhatsApp." },
      { title: "You stay in control", text: "Pause, edit or remove anytime. We confirm availability with you before promising it to anyone." },
    ],
    steps: [
      { title: "Tell us about your flat", text: "Society, configuration, expected rent or price — five minutes, from your phone." },
      { title: "We verify it", text: "Your listing is reviewed against the society's verified record before going live. That's why seekers trust it." },
      { title: "Meet serious seekers", text: "We check availability with you first, then connect only genuine, matched tenants or buyers." },
    ],
    faq: [
      { question: "Does listing cost anything?", answer: "No. Listing on SocietyFlats is free for owners right now." },
      { question: "I'm a broker — can I list?", answer: "Yes. Brokers are welcome via our Broker Partner program, with the same verification standard." },
      { question: "How do you verify my flat?", answer: "We match it against the society's admin-reviewed record — tower, configuration, realistic market range — before it goes live." },
      { question: "Will my number be public?", answer: "Never. Seekers reach you only through SocietyFlats after a verified enquiry." },
    ],
    primaryCta: { label: "List your flat — free", href: "/sell" },
    whatsappText: "Hi SocietyFlats, I want to list my flat.",
    leadSource: "campaign_list_your_flat",
    seo: {
      title: "List Your Gurgaon Flat Free — Verified Tenants & Buyers | SocietyFlats",
      description:
        "List your flat on your society's verified SocietyFlats page. Free listing, verified enquiries only, no spam — tenants and buyers who already chose your society.",
    },
  },
};
