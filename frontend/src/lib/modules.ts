import { Calculator, Compass, Globe2, LineChart, Map, Scale, Sparkles, type LucideIcon } from "lucide-react";

// Single source of truth for the product's modules — powers the homepage Toolkit,
// the command-launcher search and the nav. Grouped by the user's intent (journey stage).
export type ModuleIntent = "decide" | "discover" | "services";

export type ProductModule = {
  key: string;
  name: string;
  href: string;
  icon: LucideIcon;
  desc: string;
  example: string;
  keywords: string[];
  intent: ModuleIntent;
};

export const MODULES: ProductModule[] = [
  {
    key: "advisor", name: "AI Advisor", href: "/ai-advisor", icon: Sparkles, intent: "decide",
    desc: "Describe what matters — get a grounded shortlist in seconds.",
    example: "“Family-friendly under ₹2.5 Cr near Golf Course Ext”",
    keywords: ["ai", "advisor", "assistant", "shortlist", "recommend", "suggest", "help", "chat"],
  },
  {
    key: "compare", name: "Compare societies", href: "/compare", icon: Scale, intent: "decide",
    desc: "Put societies side by side on score, budget and location.",
    example: "DLF The Crest vs M3M Golfestate",
    keywords: ["compare", "vs", "versus", "side by side", "difference"],
  },
  {
    key: "calculator", name: "Investment Calculator", href: "/investment-calculator", icon: Calculator, intent: "decide",
    desc: "Estimate rent, rental yield and the investment math.",
    example: "What yield will a 3 BHK give me?",
    keywords: ["calculator", "yield", "invest", "investment", "rent yield", "roi", "returns"],
  },
  {
    key: "maps", name: "Explore on map", href: "/maps", icon: Map, intent: "discover",
    desc: "See sectors, zones and nearby context on a live map.",
    example: "Sectors near Cyber City",
    keywords: ["map", "maps", "location", "nearby", "explore", "area"],
  },
  {
    key: "insights", name: "Insights", href: "/insights", icon: LineChart, intent: "discover",
    desc: "Decision guides and honest market context for Delhi NCR.",
    example: "New Gurgaon vs Golf Course Extension",
    keywords: ["insights", "guide", "guides", "market", "trends", "advice"],
  },
  {
    key: "nri", name: "NRI Desk", href: "/nri-services", icon: Globe2, intent: "services",
    desc: "Buy, sell, rent-out and manage your home from abroad.",
    example: "Manage my Gurgaon flat from Dubai",
    keywords: ["nri", "abroad", "overseas", "remote", "manage", "management", "dubai", "usa"],
  },
];

export const MODULE_INTENTS: Record<ModuleIntent, string> = {
  decide: "Decide with confidence",
  discover: "Discover the market",
  services: "Human-backed services",
};

export function searchModules(query: string): ProductModule[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return MODULES.filter(
    (m) => m.name.toLowerCase().includes(q) || m.keywords.some((k) => k.includes(q) || q.includes(k)),
  ).slice(0, 3);
}
