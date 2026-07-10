import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  BadgeIndianRupee,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ClipboardList,
  Home,
  LogOut,
  MessageCircle,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { fetchAccountDashboard, type AccountDashboardLead, type AccountDashboardResponse } from "@/lib/accountApi";
import { setPublicSeo } from "@/lib/seo";
import {
  CUSTOMER_ACCOUNT_EVENT,
  clearCustomerAccountSession,
  getBrokerActivityForPhone,
  getCustomerAccountSession,
  type BrokerActivityItem,
} from "@/lib/customerAccount";

type BrokerDashboardItem = {
  title: string;
  meta: string;
  status: string;
  value?: string | number;
};

function formatDate(value?: string) {
  if (!value) return "Recently";

  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Recently";
  }
}

function brokerSourceLabel(source?: string) {
  const value = String(source || "").toLowerCase();

  if (value.includes("public_broker_crm")) return "Public Broker CRM";
  if (value.includes("broker")) return "Broker partner";
  if (value.includes("chat")) return "Chat request";

  return "Broker submission";
}

function brokerItemMeta(item: BrokerActivityItem) {
  return [
    brokerSourceLabel(item.source),
    item.role ? `Role: ${item.role}` : "",
    item.society ? `Area/Society: ${item.society}` : "",
    `Submitted ${formatDate(item.createdAt)}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function backendBrokerLeadTitle(lead: AccountDashboardLead) {
  return lead.property_title || lead.society_name || lead.requirement || `Broker submission #${lead.id}`;
}

function backendBrokerLeadMeta(lead: AccountDashboardLead) {
  return [
    brokerSourceLabel(lead.source || ""),
    lead.society_name ? `Area/Society: ${lead.society_name}` : "",
    lead.requirement || "",
    `Updated ${formatDate(lead.created_at || undefined)}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function backendBrokerToDashboardItem(lead: AccountDashboardLead): BrokerDashboardItem {
  return {
    title: backendBrokerLeadTitle(lead),
    meta: backendBrokerLeadMeta(lead),
    status: lead.status || "In review",
  };
}

function toDashboardItem(item: BrokerActivityItem): BrokerDashboardItem {
  return {
    title: item.title,
    meta: brokerItemMeta(item),
    status: item.status || "Submitted",
  };
}

function BrokerStatusBadge({ value }: { value: string }) {
  const tone = value.toLowerCase();

  return (
    <Badge
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-bold",
        tone.includes("live") || tone.includes("qualified") || tone.includes("submitted")
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
}: BrokerDashboardItem) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-orange-100 hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <BrokerStatusBadge value={status} />
          <h3 className="mt-3 break-words text-lg font-black text-slate-950">{title}</h3>
          <p className="mt-1 break-words text-sm leading-5 text-slate-500">{meta}</p>
        </div>
        {value !== undefined ? (
          <p className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-black text-slate-950">{value}</p>
        ) : null}
      </div>
    </div>
  );
}

function BrokerEmptyState({
  title,
  text,
  actionLabel,
  href,
}: {
  title: string;
  text: string;
  actionLabel: string;
  href: string;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-orange-200 bg-white p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-700">
        <Sparkles className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-black text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{text}</p>
      <Button asChild className="mt-5 rounded-full bg-orange-600 hover:bg-orange-700">
        <Link to={href}>{actionLabel}</Link>
      </Button>
    </div>
  );
}

export function BrokerDashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [showSignupWelcome, setShowSignupWelcome] = useState(searchParams.get("signup") === "success");
  const [activity, setActivity] = useState<BrokerActivityItem[]>([]);
  const [backendDashboard, setBackendDashboard] = useState<AccountDashboardResponse | null>(null);
  const session = getCustomerAccountSession();

  useEffect(() => {
    setPublicSeo("Private Broker Dashboard | SocietyFlats", "Private SocietyFlats broker activity and enquiry dashboard.", { canonical: "/broker/dashboard", noindex: true });
  }, []);

  const refreshBrokerData = () => {
    setActivity(getBrokerActivityForPhone(session?.phone));
  };

  useEffect(() => {
    refreshBrokerData();

    const handleRefresh = () => refreshBrokerData();

    window.addEventListener("focus", handleRefresh);
    window.addEventListener(CUSTOMER_ACCOUNT_EVENT, handleRefresh);

    return () => {
      window.removeEventListener("focus", handleRefresh);
      window.removeEventListener(CUSTOMER_ACCOUNT_EVENT, handleRefresh);
    };
  }, [session?.phone]);

  useEffect(() => {
    let active = true;

    if (!session?.accountAccessToken) {
      setBackendDashboard(null);
      return () => {
        active = false;
      };
    }

    fetchAccountDashboard(session.accountAccessToken).then((dashboard) => {
      if (active) setBackendDashboard(dashboard);
    });

    return () => {
      active = false;
    };
  }, [session?.accountAccessToken]);

  const brokerName = session?.name || "Broker Partner";
  const brokerPhone = session?.phone || "";

  const partnerSubmissions = useMemo(
    () => activity.filter((item) => item.kind === "partner"),
    [activity],
  );

  const listingSubmissions = useMemo(
    () => activity.filter((item) => item.kind === "listing"),
    [activity],
  );

  const requirementSubmissions = useMemo(
    () => activity.filter((item) => item.kind === "requirement"),
    [activity],
  );

  const recentItems = useMemo(
    () => activity.slice(0, 6).map(toDashboardItem),
    [activity],
  );

  const listingItems = useMemo(
    () => listingSubmissions.map(toDashboardItem),
    [listingSubmissions],
  );

  const requirementItems = useMemo(
    () => requirementSubmissions.map(toDashboardItem),
    [requirementSubmissions],
  );

  const backendBrokerItems = useMemo(
    () => (backendDashboard?.broker_submissions || []).map(backendBrokerToDashboardItem),
    [backendDashboard?.broker_submissions],
  );

  const backendBrokerSubmissionCount = backendDashboard?.summary?.broker_submissions;
  const hasBackendDashboard = Boolean(backendDashboard?.scope?.privacy);

  const privacySafeLeadItems = useMemo(
    () =>
      listingSubmissions.map((item) => ({
        title: `Lead update tracker for ${item.title}`,
        meta: "Admin will verify inventory, publish only approved listings and share privacy-safe enquiry updates here. Buyer/tenant phone and deal details remain locked.",
        status: "Admin controlled",
      })),
    [listingSubmissions],
  );

  const brokerLeadUpdateItems = backendBrokerItems.length ? backendBrokerItems : privacySafeLeadItems;

  const brokerStats = [
    { label: "Submissions", value: String(backendBrokerSubmissionCount ?? activity.length), helper: hasBackendDashboard ? "Account verified" : "Saved to this account", icon: ClipboardList },
    { label: "Partner profile", value: String(partnerSubmissions.length), helper: "Broker onboarding", icon: BriefcaseBusiness },
    { label: "Listings", value: String(listingSubmissions.length), helper: "Inventory submitted", icon: Home },
    { label: "Safe lead updates", value: String(brokerLeadUpdateItems.length), helper: "Contact privacy locked", icon: Phone },
  ];

  const closeSignupWelcome = () => {
    setShowSignupWelcome(false);
    searchParams.delete("signup");
    setSearchParams(searchParams, { replace: true });
  };

  const logout = () => {
    clearCustomerAccountSession();
    navigate("/login?role=broker", { replace: true });
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#fffaf4] pb-16">
      {showSignupWelcome ? (
        <div className="fixed inset-x-4 top-24 z-50 mx-auto max-w-xl rounded-[28px] border border-emerald-100 bg-white p-5 shadow-2xl">
          {/* C46B broker signup welcome popup */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge className="rounded-full border-emerald-100 bg-emerald-50 text-emerald-700">
                Broker signup received
              </Badge>
              <h2 className="mt-3 text-2xl font-black text-slate-950">Welcome to SocietyFlats Broker Partner Program.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Your broker account has been created. SocietyFlats admin will verify your profile, working areas, inventory quality and commission understanding before marking you active.
              </p>
            </div>
            <button
              type="button"
              onClick={closeSignupWelcome}
              className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <Button onClick={closeSignupWelcome} className="mt-4 w-full rounded-full bg-orange-600 hover:bg-orange-700">
            Continue to Broker Dashboard
          </Button>
        </div>
      ) : null}
      <section className="border-b border-[#E7DCCB] bg-[#FFFBF3]">
        <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Badge className="mb-4 rounded-full border-orange-200 bg-white px-4 py-1.5 text-orange-700 shadow-sm">
                Broker / partner account
              </Badge>
              <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-950 md:text-5xl">
                Welcome, {brokerName}.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Broker activity is linked to this account phone: {brokerPhone || "login phone"}.
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
                  Add inventory with photos
                </Link>
              </Button>
              <Button variant="outline" onClick={logout} className="rounded-full border-slate-200 bg-white px-5 text-slate-600">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
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

      <main className="container mx-auto max-w-7xl px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="lg:grid lg:grid-cols-[230px_minmax(0,1fr)] lg:items-start lg:gap-6">
          <TabsList className="flex h-auto w-full max-w-full flex-wrap items-stretch justify-start gap-2 rounded-3xl border border-[#E7DCCB] bg-[#FFFBF3] p-2 shadow-sm lg:sticky lg:top-24 lg:flex-col lg:rounded-[20px] lg:p-3">
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
                  className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] justify-start whitespace-normal rounded-xl px-3 py-3 text-left text-xs font-bold leading-tight data-[state=active]:bg-[#123C32] data-[state=active]:text-white sm:basis-[calc(33.333%-0.35rem)] lg:w-full lg:flex-none"
                >
                  <IconComponent className="mr-2 h-4 w-4" />
                  {String(label)}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="overview" className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <section className="max-w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-700">
                  <BriefcaseBusiness className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-950">Recent broker activity</h2>
                  <p className="mt-1 text-sm text-slate-500">Partner submissions and inventory activity from this account.</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {recentItems.length ? (
                  recentItems.map((item) => <BrokerItemCard key={`${item.title}-${item.meta}`} {...item} />)
                ) : (
                  <BrokerEmptyState
                    title="No broker activity yet"
                    text="Submit a partner enquiry or inventory requirement from Broker CRM. It will appear here immediately."
                    actionLabel="Open Broker CRM"
                    href="/broker-crm"
                  />
                )}
              </div>
            </section>

            <section className="max-w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-950">Admin-controlled visibility</h2>
                  <p className="mt-1 text-sm text-slate-500">Keeps customer and owner contact details private.</p>
                </div>
              </div>
              <p className="mt-5 rounded-3xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                Brokers can see their own submissions and privacy-safe lead updates. Buyer phone, email and deal details are shared only after SocietyFlats reviews the enquiry stage.
              </p>
              <div className="mt-5 grid gap-3">
                {[
                  "Submit inventory or buyer requirements",
                  "Admin verifies broker profile and area coverage",
                  "SocietyFlats controls customer contact visibility",
                  "Contact details are shared only after the enquiry is reviewed",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                    <CheckCircle2 className="h-5 w-5 text-orange-600" />
                    {item}
                  </div>
                ))}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="listings" className="mt-6 space-y-3">
            {listingItems.length ? (
              listingItems.map((item) => <BrokerItemCard key={`${item.title}-${item.meta}`} {...item} />)
            ) : (
              <BrokerEmptyState
                title="No inventory submissions yet"
                text="Use Broker CRM to submit owner inventory, areas and property details for admin verification."
                actionLabel="Submit inventory"
                href="/broker-crm"
              />
            )}
          </TabsContent>

          <TabsContent value="leads" className="mt-6 space-y-3">
            {brokerLeadUpdateItems.length ? (
              brokerLeadUpdateItems.map((item) => <BrokerItemCard key={`${item.title}-${item.meta}`} {...item} />)
            ) : (
              <BrokerEmptyState
                title="Listing leads are admin-controlled"
                text="Once your inventory is verified and SocietyFlats routes matching enquiries, privacy-safe lead updates will appear here. Buyer/tenant contact details remain protected."
                actionLabel="Submit more inventory"
                href="/broker-crm"
              />
            )}
          </TabsContent>

          <TabsContent value="requirements" className="mt-6 space-y-3">
            {requirementItems.length ? (
              requirementItems.map((item) => <BrokerItemCard key={`${item.title}-${item.meta}`} {...item} />)
            ) : (
              <BrokerEmptyState
                title="No buyer/tenant requirements yet"
                text="Submit buyer, tenant or society requirements from Broker CRM to start a requirement pipeline."
                actionLabel="Submit requirement"
                href="/broker-crm"
              />
            )}
          </TabsContent>

          <TabsContent value="commissions" className="mt-6">
            <BrokerEmptyState
              title="Commission tracker comes after admin verification"
              text="Commission stages will remain admin-controlled until a verified deal moves into site visit, negotiation or closure stage. This dashboard will not expose buyer/tenant contact details."
              actionLabel="Open partner intake"
              href="/broker-crm"
            />
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <section className="max-w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-700">
                  <UserCheck className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-950">{brokerName}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Phone: {brokerPhone || "Not available"} · Role: Broker Partner
                  </p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Profile verification, working areas and commission preferences are reviewed before partner activation.
                  </p>
                </div>
              </div>
            </section>
          </TabsContent>
        </Tabs>

        <section className="mt-8 rounded-[28px] border border-orange-100 bg-orange-50 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Broker partner dashboard</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">Manage partner submissions without compromising customer privacy.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Inventory and requirement submissions stay linked to this account. SocietyFlats reviews profiles, listings and matched enquiries before sharing sensitive contact details.
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
