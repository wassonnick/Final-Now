import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarCheck,
  ChevronRight,
  Eye,
  Heart,
  Home,
  MessageCircle,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const customerStats = [
  { label: "Viewed", value: "12", helper: "Properties & societies", icon: Eye },
  { label: "Shortlisted", value: "4", helper: "Saved homes", icon: Heart },
  { label: "Enquiries", value: "3", helper: "Callback/detail requests", icon: Phone },
  { label: "My listings", value: "2", helper: "Owner properties", icon: Home },
];

const searchActivity = [
  {
    title: "5 BHK Flat in Tulip",
    meta: "Viewed today · Sector 69, Gurgaon",
    status: "Viewed",
    href: "/search?tab=properties&q=Tulip",
  },
  {
    title: "DLF Crest",
    meta: "Society page viewed · Golf Course Road",
    status: "Society",
    href: "/search?tab=societies&q=DLF%20Crest",
  },
  {
    title: "Golf Course Extension shortlist",
    meta: "AI recommendation started",
    status: "AI",
    href: "/ai-advisor",
  },
];

const enquiries = [
  {
    title: "Requested details for 5 BHK Flat in Tulip",
    meta: "Budget: ₹1L/month · Status: Admin contacted",
    status: "Contacted",
  },
  {
    title: "Callback requested for DLF Crest",
    meta: "Requirement: Family rental shortlist",
    status: "New",
  },
  {
    title: "Site visit interest",
    meta: "Next step: SocietyFlats to confirm availability",
    status: "Visit pending",
  },
];

const listedProperties = [
  {
    title: "5 BHK Flat in Tulip",
    meta: "Rent · 3090 sq.ft. · Sector 69, Gurgaon",
    status: "Live",
    leads: 6,
    views: 128,
    checklist: "Verified · Generic image added",
  },
  {
    title: "3 BHK Flat in DLF Park Place",
    meta: "Rent · Draft property",
    status: "Draft",
    leads: 0,
    views: 0,
    checklist: "Photos pending · Verification pending",
  },
];

const propertyLeads = [
  {
    title: "Family looking for 5 BHK rental",
    meta: "Budget: ₹1L/month · Admin contacted",
    status: "Warm",
  },
  {
    title: "NRI tenant enquiry",
    meta: "Visit timing being confirmed by SocietyFlats",
    status: "Visit",
  },
  {
    title: "Corporate lease enquiry",
    meta: "Lead details controlled by admin",
    status: "New",
  },
];

function StatusBadge({ value }: { value: string }) {
  const tone = value.toLowerCase();

  return (
    <Badge
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-bold",
        tone.includes("live") || tone.includes("contacted") || tone.includes("warm")
          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
          : tone.includes("draft") || tone.includes("pending")
            ? "border-amber-100 bg-amber-50 text-amber-700"
            : tone.includes("ai") || tone.includes("society")
              ? "border-blue-100 bg-blue-50 text-blue-700"
              : "border-slate-200 bg-slate-50 text-slate-600",
      )}
    >
      {value}
    </Badge>
  );
}

function ActivityCard({
  title,
  meta,
  status,
  href,
}: {
  title: string;
  meta: string;
  status: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-start justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-100 hover:shadow-md">
      <div>
        <p className="font-bold text-slate-950">{title}</p>
        <p className="mt-1 text-sm leading-5 text-slate-500">{meta}</p>
      </div>
      <StatusBadge value={status} />
    </div>
  );

  return href ? <Link to={href}>{content}</Link> : content;
}

export function CustomerDashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-[#f7fbff] pb-16">
      <section className="border-b border-blue-100 bg-gradient-to-br from-white via-blue-50/80 to-slate-50">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Badge className="mb-4 rounded-full border-blue-200 bg-white px-4 py-1.5 text-blue-700 shadow-sm">
                Customer account
              </Badge>
              <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-950 md:text-5xl">
                Search, shortlist, list and track everything.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                One SocietyFlats customer account for both journeys: finding the right home and listing your own flat.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-full bg-blue-700 px-5 hover:bg-blue-800">
                <Link to="/sell">
                  <Plus className="mr-2 h-4 w-4" />
                  List property
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-blue-100 bg-white px-5">
                <Link to="/search">
                  <Search className="mr-2 h-4 w-4" />
                  Continue search
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {customerStats.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-[24px] border border-blue-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-3xl font-black text-slate-950">{item.value}</p>
                  </div>
                  <p className="mt-4 text-sm font-bold text-slate-950">{item.label}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.helper}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm md:grid-cols-6">
            {[
              ["overview", "Overview", BarChart3],
              ["shortlist", "Shortlist", Heart],
              ["enquiries", "Enquiries", Phone],
              ["listings", "Listed Properties", Home],
              ["leads", "Property Leads", MessageCircle],
              ["profile", "Profile", UserRound],
            ].map(([value, label, Icon]) => {
              const IconComponent = Icon as typeof BarChart3;
              return (
                <TabsTrigger
                  key={String(value)}
                  value={String(value)}
                  className="rounded-2xl py-3 text-xs font-bold data-[state=active]:bg-blue-700 data-[state=active]:text-white"
                >
                  <IconComponent className="mr-2 h-4 w-4" />
                  {String(label)}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="overview" className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-950">Recent activity</h2>
                  <p className="mt-1 text-sm text-slate-500">Your search and enquiry journey.</p>
                </div>
                <Button asChild variant="ghost" className="rounded-full text-blue-700">
                  <Link to="/search">
                    Search homes <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="mt-5 space-y-3">
                {searchActivity.map((item) => (
                  <ActivityCard key={item.title} {...item} />
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-950">Privacy-safe lead tracking</h2>
                  <p className="mt-1 text-sm text-slate-500">Owner/broker visibility remains controlled by admin.</p>
                </div>
              </div>
              <div className="mt-5 rounded-3xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                Customers can see status, requirement, budget and admin updates on their listed-property leads. Buyer phone/email stays protected until SocietyFlats unlocks the next stage.
              </div>
              <Button asChild className="mt-5 w-full rounded-full bg-blue-700 hover:bg-blue-800">
                <Link to="/sell">List a property</Link>
              </Button>
            </section>
          </TabsContent>

          <TabsContent value="shortlist" className="mt-6 space-y-3">
            {searchActivity.map((item) => (
              <ActivityCard key={item.title} {...item} />
            ))}
          </TabsContent>

          <TabsContent value="enquiries" className="mt-6 space-y-3">
            {enquiries.map((item) => (
              <ActivityCard key={item.title} {...item} />
            ))}
          </TabsContent>

          <TabsContent value="listings" className="mt-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">My listed properties</h2>
                <p className="mt-1 text-sm text-slate-500">Track draft, verification and live listings.</p>
              </div>
              <Button asChild className="rounded-full bg-blue-700 hover:bg-blue-800">
                <Link to="/sell">Add listing</Link>
              </Button>
            </div>

            {listedProperties.map((item) => (
              <div key={item.title} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge value={item.status} />
                      <Badge className="rounded-full border-blue-100 bg-blue-50 text-blue-700">
                        {item.leads} leads
                      </Badge>
                    </div>
                    <h3 className="mt-3 text-xl font-black text-slate-950">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{item.meta}</p>
                    <p className="mt-3 text-sm font-semibold text-slate-600">{item.checklist}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center sm:min-w-48">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-2xl font-black text-slate-950">{item.views}</p>
                      <p className="text-xs font-semibold text-slate-500">views</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-2xl font-black text-slate-950">{item.leads}</p>
                      <p className="text-xs font-semibold text-slate-500">leads</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="leads" className="mt-6 space-y-3">
            {propertyLeads.map((item) => (
              <ActivityCard key={item.title} {...item} />
            ))}
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <UserRound className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-950">Customer profile foundation</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    C43 keeps this as a safe UX shell. C44/C45 will connect real viewed history, enquiries and listed-property leads after account/auth wiring.
                  </p>
                </div>
              </div>
            </section>
          </TabsContent>
        </Tabs>

        <section className="mt-8 rounded-[28px] border border-blue-100 bg-blue-50 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Next account layer</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">Customer can search and list from one account.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Buyer/tenant activity and owner/seller listing activity are combined into one customer dashboard.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-full bg-blue-700 hover:bg-blue-800">
                <Link to="/ai-advisor">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Ask AI
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-blue-200 bg-white">
                <Link to="/sell">
                  <Building2 className="mr-2 h-4 w-4" />
                  List flat
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
