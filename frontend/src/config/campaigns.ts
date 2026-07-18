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
    titlePlain: "Tenants and buyers are already searching",
    titleGold: "your society.",
    subtitle:
      "SocietyFlats is where Gurgaon home-seekers choose the society first — then look for a flat inside it. List yours once — for rent or for sale — and it appears on your society's verified page, in front of people who have already picked your address.",
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
      { question: "Can I list for sale, not just rent?", answer: "Yes — the same free listing works for resale. Serious buyers browse society pages and comparisons with verified price context." },
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
  "sell-your-flat": {
    slug: "sell-your-flat",
    badge: "For Gurgaon sellers · Free resale listing",
    titlePlain: "Buyers are comparing",
    titleGold: "your society right now.",
    subtitle:
      "Resale buyers on SocietyFlats research the society before the flat — verified scores, real price ranges, side-by-side comparisons. Put your flat on the page they're already studying, with honest market context that helps serious buyers say yes.",
    bullets: [
      { title: "Serious buyers, not window-shoppers", text: "Every buyer enquiry is verified by a real person before it reaches you. No casual pings, no broker flood." },
      { title: "Your society sells your flat", text: "Your listing sits on your society's verified profile and its comparisons — where buyers are already convinced about the address." },
      { title: "Honest price context works for you", text: "Verified resale ranges beside your listing build buyer confidence — priced right, your flat stands out immediately." },
      { title: "Free and under your control", text: "No listing fee, no exclusivity. Pause or remove anytime; we confirm with you before sharing availability." },
    ],
    steps: [
      { title: "Tell us about your flat", text: "Society, configuration, expected price — five minutes, from your phone." },
      { title: "We verify it", text: "Your listing is checked against the society's verified record and market range before going live." },
      { title: "Meet verified buyers", text: "We confirm availability with you first, then connect only genuine, matched buyers." },
    ],
    faq: [
      { question: "What does it cost to sell through SocietyFlats?", answer: "Listing is free. No exclusivity, no lock-in." },
      { question: "How do you price my flat?", answer: "You set the price. We show the society's verified resale range alongside — realistic pricing gets dramatically more buyer interest." },
      { question: "Do you handle site visits?", answer: "We coordinate visits with verified buyers at times you approve — you're never surprised." },
      { question: "Will my number be public?", answer: "Never. Buyers reach you only through SocietyFlats after a verified enquiry." },
    ],
    primaryCta: { label: "List your flat for sale — free", href: "/sell" },
    whatsappText: "Hi SocietyFlats, I want to sell my flat.",
    leadSource: "campaign_sell_your_flat",
    seo: {
      title: "Sell Your Gurgaon Flat — Verified Buyers, Free Listing | SocietyFlats",
      description:
        "Sell your flat where buyers already research your society: verified scores, honest resale ranges, serious enquiries only. Free listing on SocietyFlats.",
    },
  },
};
