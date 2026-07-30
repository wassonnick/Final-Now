// A month of post ideas, written in the SocietyFlats voice: plain, specific,
// honest about what's checked and what isn't. Each entry carries the artwork
// choice and a caption, so a day's posting is pick → download → paste.
import type { SceneKey } from "./socialPostArt";

export type PostTheme = "trust" | "market" | "educate" | "owner" | "nri" | "tools";

export const THEMES: Record<PostTheme, { label: string; blurb: string }> = {
  trust: { label: "Trust & verification", blurb: "Why our data is different." },
  market: { label: "Market & areas", blurb: "Micro-market context people can use." },
  educate: { label: "Buyer / tenant help", blurb: "Teach one useful thing." },
  owner: { label: "Owners & sellers", blurb: "Listing, pricing, matching." },
  nri: { label: "NRI desk", blurb: "Buying and managing from abroad." },
  tools: { label: "Product & tools", blurb: "What the platform actually does." },
};

export type PostIdea = {
  id: string;
  theme: PostTheme;
  scene: SceneKey;
  kicker: string;
  line1: string;
  line2: string;
  cta: string;
  caption: string;
};

// Captions end with a question or a clear next step — that's what earns replies.
export const POST_IDEAS: PostIdea[] = [
  // ——— Trust & verification ———
  { id: "t1", theme: "trust", scene: "facade", kicker: "No fake listings", line1: "Every home here", line2: "is a real one.",
    cta: "Check availability →",
    caption: "If a flat isn't actually available, it shouldn't be on your screen.\n\nWe check listings before they go live, and pull them when they go. No bait, no \"just sold, but I have something similar.\"\n\nLooking in a specific society? Tell us which one and we'll tell you what's genuinely open." },
  { id: "t2", theme: "trust", scene: "checklist", kicker: "Buyer's truth", line1: "What we check", line2: "before you visit.", cta: "See how we verify →",
    caption: "Before a society profile goes public we confirm: RERA registration, possession status, real photos (not stock), and whether the quoted price is sane for that micro-market.\n\nWhere we can't confirm something, we label it \"to be verified\" instead of guessing.\n\nWhat would you want checked before a site visit?" },
  { id: "t3", theme: "trust", scene: "scores", kicker: "Real, checkable scores", line1: "We score what", line2: "actually matters.", cta: "Compare societies →",
    caption: "Safety, commute, lifestyle, upkeep — scored from things you can check, not vibes.\n\nEvery score shows its sources and how confident we are. Thin data means a lower confidence score, never a quietly inflated one.\n\nWhich of the four matters most to you?" },
  { id: "t4", theme: "trust", scene: "interior", kicker: "No paid ranking", line1: "Nobody can buy", line2: "their way up.", cta: "Browse societies →",
    caption: "Builders and brokers can't pay to rank higher here. There's no \"featured\" tier for sale.\n\nWhat you see at the top is what scored well on the things residents actually care about.\n\nSeen a portal where the top result felt bought? You're not imagining it." },
  { id: "t5", theme: "trust", scene: "checklist", kicker: "Photos", line1: "If we don't have", line2: "real photos, we say so.", cta: "See a profile →",
    caption: "A placeholder that says \"photos under verification\" is more honest than a stock image of a building that isn't the one you'd move into.\n\nSo that's what we show until we have the real thing.\n\nHow many listings have you seen with photos that clearly weren't the flat?" },
  { id: "t6", theme: "trust", scene: "facade", kicker: "Corrections welcome", line1: "Spotted something", line2: "wrong? Tell us.", cta: "Report a correction →",
    caption: "Data goes stale. Amenities change, possession slips, prices move.\n\nEvery society page has a \"report outdated info\" link. A real person reviews it, and the public page only changes after we've checked.\n\nIf you live in a society we cover, we'd genuinely like your corrections." },

  // ——— Market & areas ———
  { id: "m1", theme: "market", scene: "facade", kicker: "Micro-markets", line1: "Two sectors apart,", line2: "two different markets.", cta: "See the ranges →",
    caption: "Rent and resale can shift meaningfully between neighbouring sectors — different connectivity, different age of stock, different demand.\n\nWe group ranges by micro-market and show where each number came from.\n\nWhich areas are you weighing up right now?" },
  { id: "m2", theme: "market", scene: "scores", kicker: "Rent guide", line1: "What should", line2: "this actually cost?", cta: "Open Insights →",
    caption: "Rent ranges by micro-market, with the source and confidence on every row.\n\nTreat it as a starting point — the final number still depends on tower, floor, view, furnishing and how urgently the owner wants to close.\n\nGetting quoted something that feels off? Send us the society and the ask." },
  { id: "m3", theme: "market", scene: "interiorDusk", kicker: "Timing", line1: "The best month", line2: "to move is yours.", cta: "Search rentals →",
    caption: "There's no universal \"best time to rent.\" There's the time your lease ends, your school term, your notice period.\n\nWhat changes is supply in your specific micro-market — and that we can actually show you.\n\nWhen are you planning to move?" },
  { id: "m4", theme: "market", scene: "facade", kicker: "New launches", line1: "Under construction", line2: "isn't a price cut.", cta: "Compare formats →",
    caption: "An under-construction flat can be cheaper per sq ft — but you're also carrying possession risk, rent in the meantime, and a longer wait for the society to actually feel finished.\n\nWe label possession status plainly so it's a decision, not a surprise.\n\nReady-to-move or under-construction — which way are you leaning?" },
  { id: "m5", theme: "market", scene: "scores", kicker: "Rental yield", line1: "Good rent doesn't", line2: "mean good yield.", cta: "Open the calculator →",
    caption: "A higher rent on a much higher purchase price can mean a worse yield than the quieter society down the road.\n\nOur calculator shows gross yield, net yield, payback and CAGR — with the assumptions visible, not hidden.\n\nWhat yield are you targeting?" },
  { id: "m6", theme: "market", scene: "interior", kicker: "Delhi NCR", line1: "We open a city", line2: "only when it's checked.", cta: "See coverage →",
    caption: "Gurgaon is live. Noida and Greater Noida are being verified. Delhi, Faridabad and Ghaziabad are planned.\n\nWe'd rather open a market late with real data than early with scraped listings.\n\nWhich city should we prioritise?" },

  // ——— Buyer / tenant education ———
  { id: "e1", theme: "educate", scene: "interior", kicker: "Society first", line1: "See the society", line2: "before the sofa.", cta: "Browse societies →",
    caption: "A beautiful flat in a badly-run society is still a bad decision. Lifts that fail, security that's casual, maintenance nobody chases — you live with all of it daily.\n\nStart with the society. Then pick the home inside it.\n\nWhat's your dealbreaker in a society?" },
  { id: "e2", theme: "educate", scene: "checklist", kicker: "Before you pay", line1: "Five things to", line2: "confirm yourself.", cta: "See the checklist →",
    caption: "Even with everything we verify, confirm these with your own eyes and your own professionals:\n\n1. Exact unit and tower\n2. Title and dues\n3. RERA status\n4. Actual possession date\n5. What maintenance really costs\n\nWe'll tell you what we know. The signature is still yours." },
  { id: "e3", theme: "educate", scene: "interiorDusk", kicker: "Site visits", line1: "Visit twice.", line2: "Once after dark.", cta: "Arrange a visit →",
    caption: "A society at 11am and the same society at 9pm are different places. Parking, lighting, noise, who's around, whether security is actually checking.\n\nIf you only visit once, you're seeing the version they're ready for.\n\nWhat do you always check on a site visit?" },
  { id: "e4", theme: "educate", scene: "scores", kicker: "Commute", line1: "Measure the commute,", line2: "don't guess it.", cta: "Explore the map →",
    caption: "\"15 minutes from the office\" usually means 15 minutes on a Sunday.\n\nWe measure real distances to metro, arterial roads and office hubs — and score connectivity off that, not off a brochure claim.\n\nWhere do you commute to?" },
  { id: "e5", theme: "educate", scene: "interior", kicker: "Maintenance", line1: "Ask what upkeep", line2: "actually costs.", cta: "See society profiles →",
    caption: "Monthly maintenance is the cost people forget to model. Over a few years it can shift the maths more than a small difference in rent.\n\nWe surface it on the society profile so it's part of the decision from day one.\n\nWhat's the highest maintenance you've been quoted?" },
  { id: "e6", theme: "educate", scene: "checklist", kicker: "Builder floors", line1: "A builder floor", line2: "isn't an apartment.", cta: "Read the guide →",
    caption: "Independent entry, land share, parking rights, terrace rights, clean title — these matter far more on a builder floor than any amenity list.\n\nDifferent format, different diligence.\n\nConsidering a builder floor? Ask us what to check first." },

  // ——— Owners & sellers ———
  { id: "o1", theme: "owner", scene: "interior", kicker: "For owners", line1: "List it once.", line2: "Meet real people.", cta: "List your flat →",
    caption: "List your home once and meet buyers and tenants already searching your exact society — not fifty brokers calling about \"a similar requirement.\"\n\nFree to list. Your number is shared only when a genuine enquiry matches.\n\nOwn a flat you're thinking of renting out?" },
  { id: "o2", theme: "owner", scene: "scores", kicker: "Pricing", line1: "Priced right rents", line2: "faster than priced high.", cta: "Get a price view →",
    caption: "An over-priced listing sits, goes stale, then gets discounted anyway — usually below what it would have fetched in week one.\n\nWe'll show you what comparable homes in your society are actually asking.\n\nWant a read on your flat? Send us the society and configuration." },
  { id: "o3", theme: "owner", scene: "checklist", kicker: "No spam", line1: "Your number isn't", line2: "a lead to resell.", cta: "List your flat →",
    caption: "Owner contact details stay inside our workflow. We don't sell them, bulk-share them, or hand them to every broker in the area.\n\nYou hear from us when a verified enquiry actually matches your home.\n\nHow many calls did you get last time you listed somewhere else?" },
  { id: "o4", theme: "owner", scene: "interiorDusk", kicker: "Photos", line1: "Good photos rent", line2: "the flat, not the ad.", cta: "List your flat →",
    caption: "Daylight, tidy rooms, wide angles, every room covered — including the ones people worry about. Bathrooms and kitchens sell honesty.\n\nWe'll tell you which shots are missing before your listing goes live.\n\nNeed a shot list? Ask and we'll send ours." },

  // ——— NRI desk ———
  { id: "n1", theme: "nri", scene: "interiorDusk", kicker: "NRI desk", line1: "Buying from abroad,", line2: "verified on the ground.", cta: "Start an NRI case →",
    caption: "You can't fly down for every shortlist. So we visit the actual unit and send a dated video walkthrough — so \"ready to move\" isn't taken on trust.\n\nSociety report, Buyer's Truth checklist and market ranges you can review across timezones.\n\nManaging a Delhi NCR home from overseas? Tell us the city you're in." },
  { id: "n2", theme: "nri", scene: "checklist", kicker: "Remote diligence", line1: "Verify before", line2: "you wire anything.", cta: "How we verify →",
    caption: "RERA registration, possession reality, title and dues checklist — documented before payment, not after.\n\nWe verify what we can see and check. Legal, tax and FEMA questions stay with your own professionals, and we'll say so plainly.\n\nWhat's held up your last remote purchase?" },
  { id: "n3", theme: "nri", scene: "interior", kicker: "Rent-out", line1: "Rent it out without", line2: "the 2am phone calls.", cta: "Talk to the desk →",
    caption: "Tenant qualification, viewing coordination, follow-up and status — tracked in one place, so nothing depends on you being awake in the right timezone.\n\nPrivate by design: your details never become public listing content.\n\nOwn a flat sitting empty? Let's talk." },

  // ——— Product & tools ———
  { id: "p1", theme: "tools", scene: "scores", kicker: "Compare", line1: "Put three societies", line2: "head to head.", cta: "Open Compare →",
    caption: "Score, budget, Buyer's Truth, location, amenities — lined up side by side so the trade-off is visible instead of remembered.\n\nNo spin, no sponsored placement.\n\nWhich three are on your shortlist?" },
  { id: "p2", theme: "tools", scene: "interior", kicker: "AI advisor", line1: "Describe the life,", line2: "not the filters.", cta: "Ask the advisor →",
    caption: "\"Family-friendly, under ₹2.5 Cr, short commute to Cyber City, needs a real park\" — that's a better brief than six dropdown filters.\n\nThe advisor reasons over verified societies and shows why each one fits. If nothing fits, it says so.\n\nTry it with your actual requirement." },
  { id: "p3", theme: "tools", scene: "facade", kicker: "Map", line1: "See where it sits,", line2: "not just what it costs.", cta: "Open the map →",
    caption: "Sectors, corridors, office hubs, metro — on a live map, with a link straight into each verified profile.\n\nLocation is the one thing you can never renovate.\n\nWhich corridor are you searching?" },
  { id: "p4", theme: "tools", scene: "scores", kicker: "Investment", line1: "Model it before", line2: "you commit to it.", cta: "Open the calculator →",
    caption: "Purchase price, stamp duty, registration, rent, maintenance, tax, appreciation, holding period — and out comes gross yield, net yield, payback and CAGR.\n\nEvery assumption is visible and editable. No black box.\n\nWhat holding period are you modelling?" },
  { id: "p5", theme: "tools", scene: "checklist", kicker: "Society reports", line1: "One page to share", line2: "with the family.", cta: "See a report →",
    caption: "Score breakdown, Buyer's Truth checklist, market ranges — in one page you can send to whoever else is deciding with you.\n\nBecause a home decision is rarely made by one person alone.\n\nWho's the second opinion in your house?" },
];

// Deterministic pick so "today's post" is stable through the day and rotates daily.
export function ideaForDate(date = new Date()): PostIdea {
  const days = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
  return POST_IDEAS[days % POST_IDEAS.length];
}
