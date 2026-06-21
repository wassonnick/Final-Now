import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BadgeIndianRupee,
  BarChart3,
  Building2,
  CheckCircle2,
  Home,
  LogOut,
  MessageCircle,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { fetchAccountDashboard, type AccountDashboardLead, type AccountDashboardResponse } from "@/lib/accountApi";
import {
  CUSTOMER_ACCOUNT_EVENT,
  clearCustomerAccountSession,
  getCustomerAccountSession,
  getCustomerLeadsForPhone,
  type CustomerActivityLead,
} from "@/lib/customerAccount";

type OwnerDashboardItem = {
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

function sourceLabel(source?: string) {
  const value = String(source || "").toLowerCase();

  if (value.includes("owner_listing_rent")) return "Owner rental listing";
  if (value.includes("owner_listing_sale")) return "Owner sale listing";
  if (value.includes("owner_listing")) return "Owner listing";
  if (value.includes("sell")) return "Sell page";
  if (value.includes("property")) return "Property enquiry";
  if (value.includes("society")) return "Society enquiry";

  return "Owner submission";
}

function listingMeta(lead: CustomerActivityLead) {
  return [
    sourceLabel(lead.source),
    lead.society ? `Society: ${lead.society}` : "",
    lead.requirement || "",
    lead.budget ? `Expected: ${lead.budget}` : "",
    `Submitted ${formatDate(lead.createdAt)}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function backendLeadTitle(lead: AccountDashboardLead) {
  return lead.property_title || lead.society_name || lead.requirement || `Owner listing #${lead.id}`;
}

function backendLeadMeta(lead: AccountDashboardLead) {
  return [
    sourceLabel(lead.source || ""),
    lead.society_name ? `Society: ${lead.society_name}` : "",
    lead.requirement || "",
    lead.budget ? `Expected: ${lead.budget}` : "",
    `Backend synced ${formatDate(lead.created_at || undefined)}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function backendToDashboardItem(lead: AccountDashboardLead): OwnerDashboardItem {
  return {
    title: backendLeadTitle(lead),
    meta: backendLeadMeta(lead),
    status: lead.status || "Backend synced",
  };
}

function toDashboardItem(lead: CustomerActivityLead): OwnerDashboardItem {
  return {
    title: lead.title,
    meta: listingMeta(lead),
    status: lead.status || "Submitted",
  };
}

function OwnerStatusBadge({ value }: { value: string }) {
  const tone = value.toLowerCase();

  return (
    <Badge
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-bold",
        tone.includes("live") || tone.includes("published") || tone.includes("submitted")
          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
          : tone.includes("pending") || tone.includes("draft") || tone.includes("verification")
            ? "border-amber-100 bg-amber-50 text-amber-700"
            : "border-slate-200 bg-slate-50 text-slate-600",
      )}
    >
      {value}
    </Badge>
  );
}

function OwnerItemCard({
  title,
  meta,
  status,
  value,
}: OwnerDashboardItem) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-100 hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <OwnerStatusBadge value={status} />
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

function OwnerEmptyState({
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

export function OwnerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [activity, setActivity] = useState<CustomerActivityLead[]>([]);
  const [backendDashboard, setBackendDashboard] = useState<AccountDashboardResponse | null>(null);
  const session = getCustomerAccountSession();

  const refreshOwnerData = () => {
    setActivity(getCustomerLeadsForPhone(session?.phone));
  };

  useEffect(() => {
    refreshOwnerData();

    const handleRefresh = () => refreshOwnerData();

    window.addEventListener("focus", handleRefresh);
    window.addEventListener(CUSTOMER_ACCOUNT_EVENT, handleRefresh);

    return () => {
      window.removeEventListener("focus", handleRefresh);
      window.removeEventListener(CUSTOMER_ACCOUNT_EVENT, handleRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const ownerName = session?.name || "Owner";
  const ownerPhone = session?.phone || "";

  const listingSubmissions = useMemo(
    () => activity.filter((lead) => lead.kind === "listing"),
    [activity],
  );

  const enquirySubmissions = useMemo(
    () => activity.filter((lead) => lead.kind === "enquiry"),
    [activity],
  );

  const backendOwnerLeadItems = useMemo(
    () => (backendDashboard?.owner_listing_leads || []).map(backendToDashboardItem),
    [backendDashboard?.owner_listing_leads],
  );

  const listingItems = useMemo(
    () => (backendOwnerLeadItems.length ? backendOwnerLeadItems : listingSubmissions.map(toDashboardItem)),
    [backendOwnerLeadItems, listingSubmissions],
  );

  const recentItems = useMemo(
    () => activity.slice(0, 6).map(toDashboardItem),
    [activity],
  );

  const propertyLeadItems = useMemo(
    () =>
      listingSubmissions.map((lead) => ({
        title: `Lead tracking for ${lead.title}`,
        meta: "Admin will verify, publish and share privacy-safe enquiry updates here. Buyer/tenant phone remains protected until SocietyFlats unlocks the next stage.",
        status: "Admin controlled",
      })),
    [listingSubmissions],
  );

  const backendOwnerLeadCount = backendDashboard?.summary?.owner_listing_leads;
  const backendLinkedPropertyCount = backendDashboard?.summary?.linked_properties;
  const hasBackendDashboard = Boolean(backendDashboard?.scope?.privacy);

  const ownerStats = [
    { label: "Submitted listings", value: String(backendOwnerLeadCount ?? listingSubmissions.length), helper: hasBackendDashboard ? "Backend protected" : "Local fallback", icon: Home },
    { label: "Admin review", value: String(backendLinkedPropertyCount ?? listingSubmissions.length), helper: "Verification pipeline", icon: ShieldCheck },
    { label: "Safe lead updates", value: String(propertyLeadItems.length), helper: "Contact privacy locked", icon: MessageCircle },
    { label: "Other enquiries", value: String(enquirySubmissions.length), helper: "Search/society callbacks", icon: Phone },
  ];

  const logout = () => {
    clearCustomerAccountSession();
    navigate("/login?role=customer", { replace: true });
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#f7fbff] pb-16">
      <section className="border-b border-blue-100 bg-gradient-to-br from-white via-blue-50/80 to-slate-50">
        <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Badge className="mb-4 rounded-full border-blue-200 bg-white px-4 py-1.5 text-blue-700 shadow-sm">
                Owner account
              </Badge>
              <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-950 md:text-5xl">
                Welcome, {ownerName}.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Your owner listing activity is connected to this account phone: {ownerPhone || "login phone"}.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-full bg-blue-700 px-5 hover:bg-blue-800">
                <Link to="/sell">
                  <Plus className="mr-2 h-4 w-4" />
                  Add listing
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-blue-100 bg-white px-5">
                <Link to="/properties">
                  <Building2 className="mr-2 h-4 w-4" />
                  Browse live homes
                </Link>
              </Button>
              <Button variant="outline" onClick={logout} className="rounded-full border-slate-200 bg-white px-5 text-slate-600">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ownerStats.map((item) => {
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
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex h-auto w-full max-w-full flex-wrap items-stretch justify-start gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
            {[
              ["overview", "Overview", BarChart3],
              ["listings", "My Listings", Home],
              ["leads", "Lead Updates", MessageCircle],
              ["profile", "Profile", UserRound],
            ].map(([value, label, Icon]) => {
              const IconComponent = Icon as typeof BarChart3;
              return (
                <TabsTrigger
                  key={String(value)}
                  value={String(value)}
                  className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] whitespace-normal rounded-2xl px-2 py-3 text-center text-xs font-bold leading-tight data-[state=active]:bg-blue-700 data-[state=active]:text-white xl:basis-0"
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
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <Home className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-950">Recent owner activity</h2>
                  <p className="mt-1 text-sm text-slate-500">Listing submissions from this account phone.</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {recentItems.length ? (
                  recentItems.map((item) => <OwnerItemCard key={`${item.title}-${item.meta}`} {...item} />)
                ) : (
                  <OwnerEmptyState
                    title="No owner activity yet"
                    text="Submit a rent or sale listing from the Sell page. It will appear here immediately after submission."
                    actionLabel="List your flat"
                    href="/sell"
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
                  <p className="mt-1 text-sm text-slate-500">C112D-B protected backend dashboard with local fallback.</p>
                </div>
              </div>
              <p className="mt-5 rounded-3xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                Owners can see their own submitted listing requests and privacy-safe lead update placeholders. Buyer/tenant contact details, negotiations and deal status remain controlled by SocietyFlats admin with C112D protected account APIs now connected when OTP token exists.
              </p>
              <div className="mt-5 grid gap-3">
                {[
                  "Owner listings are linked by this login phone",
                  "Admin verifies ownership, photos, pricing and availability",
                  "Public publishing remains admin-approved",
                  "Lead/contact visibility remains locked until a safe backend route exists",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                    <CheckCircle2 className="h-5 w-5 text-blue-700" />
                    {item}
                  </div>
                ))}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="listings" className="mt-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">My owner listings</h2>
                <p className="mt-1 text-sm text-slate-500">Rent/sale listing submissions from this account.</p>
              </div>
              <Button asChild className="rounded-full bg-blue-700 hover:bg-blue-800">
                <Link to="/sell">Add listing</Link>
              </Button>
            </div>

            {listingItems.length ? (
              listingItems.map((item) => <OwnerItemCard key={`${item.title}-${item.meta}`} {...item} />)
            ) : (
              <OwnerEmptyState
                title="No listed properties yet"
                text="List a flat for rent or sale. Once submitted, it appears here as your owner listing request."
                actionLabel="List property"
                href="/sell"
              />
            )}
          </TabsContent>

          <TabsContent value="leads" className="mt-6 space-y-3">
            {propertyLeadItems.length ? (
              propertyLeadItems.map((item) => <OwnerItemCard key={`${item.title}-${item.meta}`} {...item} />)
            ) : (
              <OwnerEmptyState
                title="No property lead updates yet"
                text="After your property is verified and published, privacy-safe lead updates will appear here. Buyer/tenant contact details remain protected."
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
                  <h2 className="text-xl font-black text-slate-950">{ownerName}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Phone: {ownerPhone || "Not available"} · Role: Owner / Customer
                  </p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    C112D-B connects this dashboard to the protected backend account summary when OTP token exists; local activity remains as fallback.
                  </p>
                </div>
              </div>
            </section>
          </TabsContent>
        </Tabs>

        <section className="mt-8 rounded-[28px] border border-blue-100 bg-blue-50 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">C112D-B owner protected dashboard</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">Owner dashboard now supports protected backend sync.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                This page shows owner-safe submitted listings and protected lead update placeholders without exposing buyer or tenant contact data.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-full bg-blue-700 hover:bg-blue-800">
                <Link to="/sell">
                  <BadgeIndianRupee className="mr-2 h-4 w-4" />
                  List flat
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-blue-200 bg-white">
                <Link to="/admin/users">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Admin linkage
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default OwnerDashboard;
