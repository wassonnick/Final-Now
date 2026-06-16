import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BadgeIndianRupee,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ClipboardList,
  Home,
  MessageCircle,
  Phone,
  Plus,
  ShieldCheck,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const brokerStats = [
  { label: "Listings", value: "8", helper: "Submitted inventory", icon: Home },
  { label: "Listing leads", value: "21", helper: "Admin-controlled enquiries", icon: Phone },
  { label: "Submitted req.", value: "14", helper: "Buyer/tenant leads", icon: ClipboardList },
  { label: "Commission", value: "₹2.4L", helper: "Pipeline value", icon: BadgeIndianRupee },
];

const listings = [
  {
    title: "4 BHK in M3M Golf Estate",
    meta: "Rent · Admin verification pending",
    status: "Verification",
    leads: 4,
  },
  {
    title: "3 BHK in DLF Crest",
    meta: "Live listing · Golf Course Road",
    status: "Live",
    leads: 9,
  },
  {
    title: "Builder floor in DLF Phase 2",
    meta: "Draft · Photos pending",
    status: "Draft",
    leads: 0,
  },
];

const listingLeads = [
  {
    title: "Tenant enquiry for DLF Crest",
    meta: "Budget: ₹1.6L/month · Admin contacted",
    status: "Warm",
  },
  {
    title: "NRI buyer for Golf Course Road",
    meta: "Requirement shared · Phone hidden by admin",
    status: "New",
  },
  {
    title: "Family visit request",
    meta: "Visit timing under coordination",
    status: "Visit",
  },
];

const submittedRequirements = [
  {
    title: "Buyer looking for 3 BHK on Golf Course Road",
    meta: "Budget: ₹4Cr · Submitted to admin",
    status: "Qualified",
  },
  {
    title: "Tenant looking for pet-friendly 4 BHK",
    meta: "Budget: ₹1.4L/month · Matching required",
    status: "Matching",
  },
  {
    title: "Owner wants resale valuation",
    meta: "Sector 65 · Admin review pending",
    status: "Pending",
  },
];

const commissions = [
  {
    title: "DLF Crest rental closure",
    meta: "Stage: Site visit done · Commission eligible",
    status: "Pipeline",
    value: "₹45,000",
  },
  {
    title: "M3M resale buyer",
    meta: "Stage: Negotiation · Admin verification required",
    status: "Negotiation",
    value: "₹1.5L",
  },
  {
    title: "Partner onboarding",
    meta: "Commission terms pending admin approval",
    status: "Pending",
    value: "TBD",
  },
];

function BrokerStatusBadge({ value }: { value: string }) {
  const tone = value.toLowerCase();

  return (
    <Badge
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-bold",
        tone.includes("live") || tone.includes("qualified")
          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
          : tone.includes("pending") || tone.includes("draft") || tone.includes("verification")
            ? "border-amber-100 bg-amber-50 text-amber-700"
            : tone.includes("pipeline") || tone.includes("negotiation") || tone.includes("warm")
              ? "border-blue-100 bg-blue-50 text-blue-700"
              : "border-slate-200 bg-slate-50 text-slate-600",
      )}
    >
      {value}
    </Badge>
  );
}

function BrokerItemCard({
  title,
  meta,
  status,
  value,
}: {
  title: string;
  meta: string;
  status: string;
  value?: string | number;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-orange-100 hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <BrokerStatusBadge value={status} />
          <h3 className="mt-3 text-lg font-black text-slate-950">{title}</h3>
          <p className="mt-1 text-sm leading-5 text-slate-500">{meta}</p>
        </div>
        {value !== undefined ? (
          <p className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-black text-slate-950">{value}</p>
        ) : null}
      </div>
    </div>
  );
}

export function BrokerDashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fffaf4] pb-16">
      <section className="border-b border-orange-100 bg-gradient-to-br from-white via-orange-50/70 to-slate-50">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Badge className="mb-4 rounded-full border-orange-200 bg-white px-4 py-1.5 text-orange-700 shadow-sm">
                Broker / partner account
              </Badge>
              <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-950 md:text-5xl">
                Manage listings, leads and commission pipeline.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                A partner dashboard for verified brokers to submit inventory, send buyer requirements and track deal stages with SocietyFlats.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-full bg-orange-600 px-5 hover:bg-orange-700">
                <Link to="/broker-crm">
                  <Plus className="mr-2 h-4 w-4" />
                  Submit partner lead
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-orange-100 bg-white px-5">
                <Link to="/sell">
                  <Building2 className="mr-2 h-4 w-4" />
                  Add listing
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {brokerStats.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-[24px] border border-orange-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-700">
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
          <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[
              ["overview", "Overview", BarChart3],
              ["listings", "My Listings", Home],
              ["leads", "Listing Leads", Phone],
              ["requirements", "Requirements", ClipboardList],
              ["commissions", "Commission", BadgeIndianRupee],
              ["profile", "Profile", UserCheck],
            ].map(([value, label, Icon]) => {
              const IconComponent = Icon as typeof BarChart3;
              return (
                <TabsTrigger
                  key={String(value)}
                  value={String(value)}
                  className="min-w-0 rounded-2xl px-2 py-3 text-xs font-bold data-[state=active]:bg-orange-600 data-[state=active]:text-white"
                >
                  <IconComponent className="mr-2 h-4 w-4" />
                  {String(label)}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="overview" className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-700">
                  <BriefcaseBusiness className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-950">Partner workflow</h2>
                  <p className="mt-1 text-sm text-slate-500">Inventory, requirements and commission are tracked separately.</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {[
                  "Submit inventory or buyer requirements",
                  "Admin verifies listing and lead quality",
                  "SocietyFlats controls customer contact visibility",
                  "Commission stage updates after verified deal progress",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                    <CheckCircle2 className="h-5 w-5 text-orange-600" />
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-950">Admin-controlled visibility</h2>
                  <p className="mt-1 text-sm text-slate-500">Protects the SocietyFlats conversion layer.</p>
                </div>
              </div>
              <p className="mt-5 rounded-3xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                Brokers can see lead stage, requirement, budget and admin comments. Buyer phone/email is unlocked only by admin when the deal stage requires it.
              </p>
              <Button asChild className="mt-5 w-full rounded-full bg-orange-600 hover:bg-orange-700">
                <Link to="/broker-crm">Open partner intake</Link>
              </Button>
            </section>
          </TabsContent>

          <TabsContent value="listings" className="mt-6 space-y-3">
            {listings.map((item) => (
              <BrokerItemCard key={item.title} {...item} value={`${item.leads} leads`} />
            ))}
          </TabsContent>

          <TabsContent value="leads" className="mt-6 space-y-3">
            {listingLeads.map((item) => (
              <BrokerItemCard key={item.title} {...item} />
            ))}
          </TabsContent>

          <TabsContent value="requirements" className="mt-6 space-y-3">
            {submittedRequirements.map((item) => (
              <BrokerItemCard key={item.title} {...item} />
            ))}
          </TabsContent>

          <TabsContent value="commissions" className="mt-6 space-y-3">
            {commissions.map((item) => (
              <BrokerItemCard key={item.title} {...item} value={item.value} />
            ))}
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-700">
                  <UserCheck className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-950">Broker profile foundation</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    C43 keeps this as a safe UX shell. C46 will connect real partner leads, inventory and commission stages after backend role wiring.
                  </p>
                </div>
              </div>
            </section>
          </TabsContent>
        </Tabs>

        <section className="mt-8 rounded-[28px] border border-orange-100 bg-orange-50 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Partner growth</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">Broker account stays separate from customer account.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Brokers can list, submit leads and track commission, while admin controls verification and buyer contact visibility.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-full bg-orange-600 hover:bg-orange-700">
                <Link to="/broker-crm">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Partner enquiry
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-orange-200 bg-white">
                <Link to="/insights">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Market insights
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
