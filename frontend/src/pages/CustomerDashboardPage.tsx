import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Building2,
  ChevronRight,
  Eye,
  Heart,
  Home,
  LogOut,
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
import {
  CUSTOMER_ACCOUNT_EVENT,
  clearCustomerAccountSession,
  getCustomerAccountSession,
  getCustomerLeadsForPhone,
  getCustomerSavedItemsForPhone,
  type CustomerActivityLead,
  type CustomerSavedItem,
} from "@/lib/customerAccount";
import { SavedSearchesPanel } from "@/components/search/SavedSearchesPanel";
import { setPublicSeo } from "@/lib/seo";

type DashboardItem = {
  title: string;
  meta: string;
  status: string;
  href?: string;
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

function sourceLabel(source?: string) {
  const value = String(source || "").toLowerCase();

  if (value.includes("owner_listing_rent")) return "Owner rental listing";
  if (value.includes("owner_listing_sale")) return "Owner sale listing";
  if (value.includes("property")) return "Property enquiry";
  if (value.includes("society")) return "Society enquiry";
  if (value.includes("search")) return "Search enquiry";
  if (value.includes("ai")) return "AI shortlist";
  if (value.includes("chat")) return "Chat request";

  return "SocietyFlats enquiry";
}

function mapSavedItemToDashboardItem(item: CustomerSavedItem): DashboardItem {
  const label = item.type === "property" ? "Property" : "Society";
  const action = item.action === "shortlist" ? "Shortlisted" : "Viewed";

  return {
    title: item.title,
    meta: [label, item.meta || "", `${action} ${formatDate(item.updatedAt)}`].filter(Boolean).join(" · "),
    status: action,
    href: item.href,
  };
}

function mapLeadToDashboardItem(lead: CustomerActivityLead): DashboardItem {
  const metaParts = [
    sourceLabel(lead.source),
    lead.society ? `Society: ${lead.society}` : "",
    lead.requirement || "",
    lead.budget ? `Budget: ${lead.budget}` : "",
    `Submitted ${formatDate(lead.createdAt)}`,
  ].filter(Boolean);

  return {
    title: lead.title,
    meta: metaParts.join(" · "),
    status: lead.status || "Submitted",
    href: lead.kind === "listing" ? "/customer/dashboard" : "/search",
  };
}

function listingMeta(lead: CustomerActivityLead) {
  return [
    sourceLabel(lead.source),
    lead.society ? `Society: ${lead.society}` : "",
    lead.budget ? `Expected: ${lead.budget}` : "",
    `Submitted ${formatDate(lead.createdAt)}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function StatusBadge({ value }: { value: string }) {
  const tone = value.toLowerCase();

  return (
    <Badge
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-bold",
        tone.includes("live") || tone.includes("contacted") || tone.includes("warm") || tone.includes("submitted")
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
}: DashboardItem) {
  const content = (
    <div className="flex max-w-full flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-100 hover:shadow-md sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="break-words font-bold text-slate-950">{title}</p>
        <p className="mt-1 break-words text-sm leading-5 text-slate-500">{meta}</p>
      </div>
      <StatusBadge value={status} />
    </div>
  );

  return href ? <Link to={href}>{content}</Link> : content;
}

function EmptyState({
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
    <div className="rounded-[28px] border border-dashed border-blue-200 bg-white p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        <Sparkles className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-black text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{text}</p>
      <Button asChild className="mt-5 rounded-full bg-blue-700 hover:bg-blue-800">
        <Link to={href}>{actionLabel}</Link>
      </Button>
    </div>
  );
}

export function CustomerDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.pathname === "/shortlist" ? "shortlist" : "overview");
  const [activity, setActivity] = useState<CustomerActivityLead[]>([]);
  const [viewedItems, setViewedItems] = useState<CustomerSavedItem[]>([]);
  const [shortlistedItems, setShortlistedItems] = useState<CustomerSavedItem[]>([]);
  const session = getCustomerAccountSession();

  useEffect(() => {
    setPublicSeo("Private Customer Dashboard | SocietyFlats", "Private SocietyFlats shortlist, saved-search and enquiry dashboard.", { canonical: "/customer/dashboard", noindex: true });
  }, []);

  useEffect(() => {
    setActivity(getCustomerLeadsForPhone(session?.phone));
    setViewedItems(getCustomerSavedItemsForPhone(session?.phone, "view"));
    setShortlistedItems(getCustomerSavedItemsForPhone(session?.phone, "shortlist"));
  }, [session?.phone]);

  const customerName = session?.name || "Customer";
  const customerPhone = session?.phone || "";

  const listingLeads = useMemo(
    () => activity.filter((lead) => lead.kind === "listing"),
    [activity],
  );

  const enquiryLeads = useMemo(
    () => activity.filter((lead) => lead.kind === "enquiry"),
    [activity],
  );

  const recentViews = useMemo(
    () => viewedItems.slice(0, 5).map(mapSavedItemToDashboardItem),
    [viewedItems],
  );

  const shortlistItems = useMemo(
    () => shortlistedItems.map(mapSavedItemToDashboardItem),
    [shortlistedItems],
  );

  const recentActivity = useMemo(
    () =>
      [
        ...activity.slice(0, 5).map(mapLeadToDashboardItem),
        ...viewedItems.slice(0, 5).map(mapSavedItemToDashboardItem),
      ].slice(0, 6),
    [activity, viewedItems],
  );

  const enquiryItems = useMemo(
    () => enquiryLeads.map(mapLeadToDashboardItem),
    [enquiryLeads],
  );

  const propertyLeadItems = useMemo(
    () =>
      listingLeads.map((lead) => ({
        title: `Lead tracking for ${lead.title}`,
        meta: "Admin will verify, publish and share privacy-safe enquiry updates here.",
        status: "Admin controlled",
      })),
    [listingLeads],
  );

  const customerStats = [
    { label: "Viewed", value: String(viewedItems.length), helper: "Properties & societies", icon: Eye },
    { label: "Shortlisted", value: String(shortlistedItems.length), helper: "Saved homes/societies", icon: Heart },
    { label: "Enquiries", value: String(enquiryLeads.length), helper: "Callback/detail requests", icon: Phone },
    { label: "My listings", value: String(listingLeads.length), helper: "Owner properties", icon: Home },
  ];

  const logout = () => {
    clearCustomerAccountSession();
    navigate("/login?role=customer", { replace: true });
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#F8F3EA] pb-16">
      <section className="border-b border-blue-100 bg-gradient-to-br from-white via-blue-50/80 to-slate-50">
        <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Badge className="mb-4 rounded-full border-blue-200 bg-white px-4 py-1.5 text-blue-700 shadow-sm">
                Customer account
              </Badge>
              <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-950 md:text-5xl">
                Welcome, {customerName}.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Your SocietyFlats activity is now connected to this account phone: {customerPhone || "login phone"}.
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
              <Button variant="outline" onClick={logout} className="rounded-full border-slate-200 bg-white px-5 text-slate-600">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
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

      <main className="container mx-auto max-w-7xl px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="lg:grid lg:grid-cols-[230px_minmax(0,1fr)] lg:items-start lg:gap-6">
          <TabsList className="flex h-auto w-full max-w-full flex-wrap items-stretch justify-start gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm lg:sticky lg:top-24 lg:flex-col lg:rounded-[20px] lg:p-3">
            {[
              ["overview", "Overview", BarChart3],
              ["shortlist", "Shortlist", Heart],
              ["saved-searches", "Saved Searches", Search],
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
                  className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] whitespace-normal rounded-2xl px-2 py-3 text-center text-xs font-bold leading-tight data-[state=active]:bg-blue-700 data-[state=active]:text-white sm:basis-[calc(33.333%-0.35rem)] lg:w-full lg:flex-none lg:justify-start lg:px-4 lg:text-left xl:basis-auto"
                >
                  <IconComponent className="mr-2 h-4 w-4" />
                  {String(label)}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="overview" className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="max-w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-950">Recent activity</h2>
                  <p className="mt-1 text-sm text-slate-500">Real submissions made from this browser/account.</p>
                </div>
                <Button asChild variant="ghost" className="rounded-full text-blue-700">
                  <Link to="/search">
                    Search homes <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="mt-5 space-y-3">
                {recentActivity.length ? (
                  recentActivity.map((item) => <ActivityCard key={`${item.title}-${item.meta}`} {...item} />)
                ) : (
                  <EmptyState
                    title="No customer activity yet"
                    text="Submit a property enquiry or list your flat. It will appear here immediately after backend submission."
                    actionLabel="Start search"
                    href="/search"
                  />
                )}
              </div>
            </section>

            <section className="max-w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">Recently viewed</h2>
              <p className="mt-1 text-sm text-slate-500">Properties and societies opened from this account.</p>
              <div className="mt-5 space-y-3">
                {recentViews.length ? (
                  recentViews.map((item) => <ActivityCard key={`${item.title}-${item.meta}`} {...item} />)
                ) : (
                  <EmptyState
                    title="No viewed history yet"
                    text="Open a property or society page after login. It will appear here."
                    actionLabel="Browse properties"
                    href="/properties"
                  />
                )}
              </div>
            </section>

            <section className="max-w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-950">Privacy-safe lead tracking</h2>
                  <p className="mt-1 text-sm text-slate-500">Admin remains the control layer.</p>
                </div>
              </div>
              <div className="mt-5 rounded-3xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                Customers see their own submissions, listing history and privacy-safe lead status. Buyer phone/email stays protected until SocietyFlats unlocks the next stage.
              </div>
              <Button asChild className="mt-5 w-full rounded-full bg-blue-700 hover:bg-blue-800">
                <Link to="/sell">List a property</Link>
              </Button>
            </section>
          </TabsContent>

          <TabsContent value="shortlist" className="mt-6 space-y-3">
            {shortlistItems.length ? (
              shortlistItems.map((item) => <ActivityCard key={`${item.title}-${item.meta}`} {...item} />)
            ) : (
              <EmptyState
                title="No shortlist yet"
                text="Save a property or society from its detail page. Your saved items will appear here."
                actionLabel="Browse societies"
                href="/search?tab=societies"
              />
            )}
          </TabsContent>

          <TabsContent value="saved-searches" className="mt-6">
            <SavedSearchesPanel />
          </TabsContent>

          <TabsContent value="enquiries" className="mt-6 space-y-3">
            {enquiryItems.length ? (
              enquiryItems.map((item) => <ActivityCard key={`${item.title}-${item.meta}`} {...item} />)
            ) : (
              <EmptyState
                title="No enquiries yet"
                text="Property, society, AI and callback enquiries created after login will appear here."
                actionLabel="Find homes"
                href="/search"
              />
            )}
          </TabsContent>

          <TabsContent value="listings" className="mt-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">My listed properties</h2>
                <p className="mt-1 text-sm text-slate-500">Owner listing submissions from this account.</p>
              </div>
              <Button asChild className="rounded-full bg-blue-700 hover:bg-blue-800">
                <Link to="/sell">Add listing</Link>
              </Button>
            </div>

            {listingLeads.length ? (
              listingLeads.map((lead) => (
                <div key={lead.id} className="max-w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge value={lead.status || "Submitted"} />
                        <Badge className="rounded-full border-blue-100 bg-blue-50 text-blue-700">
                          Admin verification
                        </Badge>
                      </div>
                      <h3 className="mt-3 break-words text-xl font-black text-slate-950">{lead.title}</h3>
                      <p className="mt-1 break-words text-sm text-slate-500">{listingMeta(lead)}</p>
                      <p className="mt-3 text-sm font-semibold text-slate-600">
                        SocietyFlats admin will verify details, ask for photos and publish when ready.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-center sm:min-w-48">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-2xl font-black text-slate-950">0</p>
                        <p className="text-xs font-semibold text-slate-500">views</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-2xl font-black text-slate-950">0</p>
                        <p className="text-xs font-semibold text-slate-500">leads</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No listed properties yet"
                text="List a flat for rent or sale. Once submitted, it will appear here as your owner listing request."
                actionLabel="List property"
                href="/sell"
              />
            )}
          </TabsContent>

          <TabsContent value="leads" className="mt-6 space-y-3">
            {propertyLeadItems.length ? (
              propertyLeadItems.map((item) => <ActivityCard key={`${item.title}-${item.meta}`} {...item} />)
            ) : (
              <EmptyState
                title="No property lead updates yet"
                text="After your property is verified and published, privacy-safe lead updates will appear here."
                actionLabel="List property"
                href="/sell"
              />
            )}
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <section className="max-w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <UserRound className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-950">{customerName}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Phone: {customerPhone || "Not available"} · Role: Customer
                  </p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Full backend OTP/auth and cross-device history will come after this local account foundation.
                  </p>
                </div>
              </div>
            </section>
          </TabsContent>
        </Tabs>

        <section className="mt-8 rounded-[28px] border border-blue-100 bg-blue-50 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Shortlist and view history</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">Customer dashboard now tracks views, shortlist and submissions.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Viewed properties, society shortlists and enquiry activity stay linked to this private customer account.
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
