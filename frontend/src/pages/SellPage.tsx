// C78 owner listing UX polish: compact first fold, tighter form and clearer conversion sections.
// C71 owner listing copy: stronger verified buyer, no broker hassle and verification flow language.
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeIndianRupee,
  Building2,
  Camera,
  CheckCircle2,
  Home,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { backendApi } from "@/services/backendApi";
import { trackEvent, trackLeadIntent, trackLeadSubmitted } from "@/lib/analytics";
import { cleanLeadTrackingPayload } from "@/lib/leadTracking";
import { createCustomerAccountSession } from "@/lib/customerAccount";
import { fetchAccountByPhone, syncAccountToBackend } from "@/lib/accountApi";
import { setPublicSeo } from "@/lib/seo";

function cleanOwnerLeadPhone(value: string) {
  return String(value || "").replace(/\D/g, "").slice(0, 10);
}

function isValidOwnerLeadPhone(value: string) {
  return /^[6-9]\d{9}$/.test(cleanOwnerLeadPhone(value));
}

const steps = [
  {
    icon: Building2,
    title: "Submit your details",
    text: "Share society, tower, BHK, size, price/rent expectation and best callback time.",
  },
  {
    icon: Home,
    title: "We verify and create draft",
    text: "Our team verifies ownership context, asks for photos and prepares a CRM-ready property draft.",
  },
  {
    icon: Camera,
    title: "Get matched enquiries",
    text: "Receive serious buyer or tenant enquiries with clear society, budget and visit context.",
  },
  {
    icon: Sparkles,
    title: "Publish after verification",
    text: "The listing goes live only after details, pricing and availability are verified.",
  },
];

export function SellPage() {
  const [searchParams] = useSearchParams();
  const [purpose, setPurpose] = useState<"rent" | "sell">("rent");
  const [listingStep, setListingStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    society: searchParams.get("society") || "",
    tower: "",
    bhk: "",
    size: "",
    floor: "",
    furnishing: "",
    availability: "",
    details: "",
    expectation: "",
    preferredTime: "",
    phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setPublicSeo(
      "List Your Gurgaon Flat | Connect with Verified Buyers & Tenants Directly",
      "Skip endless phone calls from unverified brokers. List your premium property directly on SocietyFlats to reach high-intent clients looking specifically inside your residential community.",
      { canonical: "/sell" },
    );
    window.scrollTo(0, 0);
  }, []);

  const updateForm = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const stepReady =
    listingStep === 1 ? isValidOwnerLeadPhone(form.phone) :
    listingStep === 2 ? Boolean(form.name.trim()) :
    listingStep === 3 ? Boolean(form.society.trim()) :
    listingStep === 5 ? Boolean(form.bhk.trim()) :
    true;

  const submitOwnerLead = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting || success) return;
    setSubmitting(true);
    setError("");

    const cleanPhone = cleanOwnerLeadPhone(form.phone);

    if (!isValidOwnerLeadPhone(cleanPhone)) {
      setError("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.");
      setSubmitting(false);
      return;
    }

    const listingIntent = purpose === "rent" ? "Rent" : "Sale";
    const societyName = form.society.trim();
    const towerName = form.tower.trim();
    const bhk = form.bhk.trim();
    const size = form.size.trim();
    const floor = form.floor.trim();
    const furnishing = form.furnishing.trim();
    const availability = form.availability.trim();
    const propertyDetails = form.details.trim();
    const expectation = form.expectation.trim();
    const preferredTime = form.preferredTime.trim();

    const formattedBhk = bhk
      ? bhk.toLowerCase().includes("bhk")
        ? bhk
        : `${bhk} BHK`
      : "";

    const formattedSize = size
      ? /sq|ft|yard|yd|acre/i.test(size)
        ? size
        : `${size} sq.ft.`
      : "";

    const propertySummary = [formattedBhk, formattedSize].filter(Boolean).join(", ");
    const propertyTitle =
      [propertySummary || propertyDetails, societyName].filter(Boolean).join(" · ") ||
      `Owner ${listingIntent} Listing`;

    const ownerTrackingPayload = cleanLeadTrackingPayload({
      cta_label: purpose === "rent" ? "Owner listing rent form" : "Owner listing sale form",
      lead_intent: purpose === "rent" ? "owner_listing_rent" : "owner_listing_sale",
      entity_type: "owner_listing",
      entity_slug: societyName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    });

    trackLeadIntent({
      ...ownerTrackingPayload,
      source: purpose === "rent" ? "owner_listing_rent" : "owner_listing_sale",
      society_name: societyName,
    });

    try {
      const existingAccount = await fetchAccountByPhone(cleanPhone);
      if (existingAccount?.account?.id) {
        setError("This phone number is already registered. Please login or continue with OTP before submitting another owner listing.");
        setSubmitting(false);
        return;
      }
    } catch {
      setError("Could not validate this phone number. Please try again before submitting.");
      setSubmitting(false);
      return;
    }

    const ownerMessage = [
      "Owner listing submission from Sell page",
      `Intent: ${listingIntent}`,
      `Owner name: ${form.name.trim() || "Not provided"}`,
      `Phone: ${cleanPhone || form.phone || "Not provided"}`,
      `Society: ${societyName || "Not provided"}`,
      `Tower / Block: ${towerName || "Not provided"}`,
      `BHK: ${bhk || "Not provided"}`,
      `Size: ${size || "Not provided"}`,
      `Floor: ${floor || "Not provided"}`,
      `Furnishing: ${furnishing || "Not provided"}`,
      `Availability: ${availability || "Not provided"}`,
      `Property details: ${propertyDetails || "Not provided"}`,
      `Expected ${purpose === "rent" ? "rent" : "sale price"}: ${expectation || "Not provided"}`,
      `Preferred callback time: ${preferredTime || "Not provided"}`,
      "Suggested next action: Call owner, verify property details, ask for photos, confirm availability and expected pricing.",
    ].join("\n");

    try {
      await backendApi.createLead({
        name: form.name.trim(),
        phone: cleanPhone,
        source: purpose === "rent" ? "owner_listing_rent" : "owner_listing_sale",
        society_name: societyName || null,
        property_title: propertyTitle,
        message: ownerMessage,
        requirement:
          purpose === "rent"
            ? `Owner listing - Rent${preferredTime ? ` · Preferred time: ${preferredTime}` : ""}`
            : `Owner listing - Sale${preferredTime ? ` · Preferred time: ${preferredTime}` : ""}`,
        budget: expectation || null,
        ...ownerTrackingPayload,
      });
      trackLeadSubmitted({
        ...ownerTrackingPayload,
        source: purpose === "rent" ? "owner_listing_rent" : "owner_listing_sale",
        society_name: societyName,
      });

      const createdSession = createCustomerAccountSession({
        name: form.name.trim(),
        phone: cleanPhone,
        role: "customer",
      });

      void syncAccountToBackend({
        role: "customer",
        phone: cleanPhone,
        name: form.name.trim(),
        source: "sell_page_owner_listing",
        meta: {
          ownerListingSignup: true,
          society: form.society,
          bhk: form.bhk,
          size: form.size,
          floor: form.floor,
          furnishing: form.furnishing,
          availability: form.availability,
          expectation: form.expectation,
        },
      });

      setAccountCreated(Boolean(createdSession));
      setSuccess(true);
    } catch (leadError) {
      console.error("Owner lead submission failed:", leadError);
      setError("Unable to submit listing request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F3EA]">
      <section className="relative overflow-hidden border-b border-[#E7DCCB] bg-gradient-to-br from-[#FFFBF3] via-[#F8F3EA] to-[#EEF5F1]">
        <div className="absolute left-[-12rem] top-[-10rem] h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="absolute right-[-10rem] top-24 h-96 w-96 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="relative container mx-auto px-4 py-8 md:py-12">
          <div className="grid gap-7 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <Badge className="mb-3 rounded-full border-blue-200 bg-white px-4 py-1.5 text-blue-700 shadow-sm">
                Owner listing
              </Badge>
              <h1 className="max-w-2xl text-3xl font-black tracking-[-0.045em] leading-[0.98] text-slate-950 md:text-5xl">
                Own a premium apartment in Gurgaon? List your property directly.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 md:text-base md:leading-7">
                We match your home with pre-qualified buyers and tenants who are already researching your specific society. Skip endless broker calls and listing spam.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {[
                  "Verified enquiries",
                  "No listing fee",
                  "Buyer/tenant matching",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm"
                  >
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-blue-100 bg-white p-4 text-navy-900 shadow-xl shadow-blue-100/60 md:p-5">
              <div className="mb-4 flex items-center gap-2">
                <BadgeIndianRupee className="w-5 h-5 text-blue-700" />
                <div>
                  <h2 className="text-xl font-display font-bold">List your flat</h2>
                  <p className="text-xs text-[#6E756E]">Step {listingStep} of 8</p>
                </div>
              </div>
              <div className="mb-5 grid grid-cols-8 gap-1.5">
                {Array.from({ length: 8 }).map((_, index) => (
                  <span
                    key={index}
                    className={cn(
                      "h-1.5 rounded-full",
                      index + 1 <= listingStep ? "bg-[#123C32]" : "bg-[#DDE7DC]",
                    )}
                  />
                ))}
              </div>
              {success ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm font-semibold leading-6 text-emerald-700">
                  <p>Listing submitted successfully. Our team will call to verify ownership, photos, pricing and availability before creating the right draft.</p>
                  {accountCreated ? (
                    <div className="mt-4 rounded-2xl bg-white/80 p-4 text-emerald-800">
                      <p className="font-black">Customer account created automatically.</p>
                      <p className="mt-1 text-sm font-semibold">
                        Your phone number is now linked to this listing. You can track it from your Customer Dashboard.
                      </p>
                      <p className="mt-2 text-xs font-semibold text-emerald-700">
                        Use the dashboard to track verification and listing updates.
                      </p>
                    </div>
                  ) : null}
                  <Button asChild className="mt-4 rounded-full bg-emerald-600 text-white hover:bg-emerald-700">
                    <Link to="/customer/dashboard">Open Customer Dashboard</Link>
                  </Button>
                </div>
              ) : (
                <form onSubmit={submitOwnerLead} className="space-y-4">
                  {listingStep === 1 ? (
                    <div>
                      <p className="mb-3 text-sm font-bold text-[#25302B]">Start with your mobile number</p>
                      <Input required value={form.phone} onChange={(event) => updateForm("phone", cleanOwnerLeadPhone(event.target.value))} inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} className="h-12 rounded-xl" placeholder="10-digit mobile number" />
                      <p className="mt-2 text-xs leading-5 text-[#6E756E]">No spam. Your number is used only for listing verification and enquiries.</p>
                    </div>
                  ) : null}
                  {listingStep === 2 ? (
                    <div><p className="mb-3 text-sm font-bold">What should we call you?</p><Input required value={form.name} onChange={(event) => updateForm("name", event.target.value)} className="h-12 rounded-xl" placeholder="Your name" /></div>
                  ) : null}
                  {listingStep === 3 ? (
                    <div><p className="mb-3 text-sm font-bold">Which society is the flat in?</p><Input required value={form.society} onChange={(event) => updateForm("society", event.target.value)} className="h-12 rounded-xl" placeholder="Society name e.g. DLF Park Place" /></div>
                  ) : null}
                  {listingStep === 4 ? (
                    <div>
                      <p className="mb-3 text-sm font-bold">How would you like to list it?</p>
                      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-blue-50 p-1">
                        {(["rent", "sell"] as const).map((item) => (
                          <button key={item} type="button" onClick={() => { setPurpose(item); trackEvent("owner_listing_purpose_changed", { source: "sell_page", lead_intent: `owner_listing_${item}`, cta_label: item === "rent" ? "For Rent" : "For Sale" }); }} className={cn("rounded-xl px-4 py-3 text-sm font-semibold", purpose === item ? "bg-white shadow-sm text-navy-900" : "text-navy-500")}>{item === "rent" ? "For Rent" : "For Sale"}</button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {listingStep === 5 ? (
                    <div className="space-y-3">
                      <p className="text-sm font-bold">Tell us about the flat</p>
                      <div className="grid gap-3 sm:grid-cols-2"><Input required value={form.bhk} onChange={(event) => updateForm("bhk", event.target.value)} className="h-11 rounded-xl" placeholder="BHK e.g. 3 BHK" /><Input value={form.size} onChange={(event) => updateForm("size", event.target.value)} className="h-11 rounded-xl" placeholder="Size e.g. 1983 sq.ft." /></div>
                      <div className="grid gap-3 sm:grid-cols-2"><Input value={form.tower} onChange={(event) => updateForm("tower", event.target.value)} className="h-11 rounded-xl" placeholder="Tower / block" /><Input value={form.floor} onChange={(event) => updateForm("floor", event.target.value)} className="h-11 rounded-xl" placeholder="Floor e.g. 12th" /></div>
                      <div className="grid gap-3 sm:grid-cols-2"><Input value={form.furnishing} onChange={(event) => updateForm("furnishing", event.target.value)} className="h-11 rounded-xl" placeholder="Furnishing" /><Input value={form.expectation} onChange={(event) => updateForm("expectation", event.target.value)} className="h-11 rounded-xl" placeholder={purpose === "rent" ? "Expected monthly rent" : "Expected sale price"} /></div>
                    </div>
                  ) : null}
                  {listingStep === 6 ? (
                    <div className="rounded-[18px] border border-dashed border-[#C6DACE] bg-[#EEF5F1] p-6 text-center">
                      <Camera className="mx-auto h-8 w-8 text-[#2A6147]" /><p className="mt-3 font-bold">Photos are optional at this stage</p><p className="mt-1 text-xs leading-5 text-[#6E756E]">Our team can collect and review images before anything is published.</p>
                    </div>
                  ) : null}
                  {listingStep === 7 ? (
                    <div className="space-y-3"><p className="text-sm font-bold">When is the flat available?</p><Input value={form.availability} onChange={(event) => updateForm("availability", event.target.value)} className="h-11 rounded-xl" placeholder="Availability e.g. Immediate" /><Input value={form.preferredTime} onChange={(event) => updateForm("preferredTime", event.target.value)} className="h-11 rounded-xl" placeholder="Best time to call" /><Input value={form.details} onChange={(event) => updateForm("details", event.target.value)} className="h-11 rounded-xl" placeholder="Extra details optional" /></div>
                  ) : null}
                  {listingStep === 8 ? (
                    <div>
                      <p className="mb-3 text-sm font-bold">Review your listing request</p>
                      <div className="grid gap-2 rounded-[16px] bg-[#EEF5F1] p-4 text-sm">
                        {[["Owner", form.name], ["Phone", form.phone], ["Society", form.society], ["Intent", purpose === "rent" ? "Rent" : "Sale"], ["Flat", [form.bhk, form.size, form.furnishing].filter(Boolean).join(" · ") || "Details on request"], ["Expectation", form.expectation || "Discuss on call"], ["Availability", form.availability || "Discuss on call"]].map(([label, value]) => <div key={label} className="flex justify-between gap-4 border-b border-[#DDE7DC] pb-2 last:border-0 last:pb-0"><span className="text-[#6E756E]">{label}</span><strong className="text-right text-[#25302B]">{value}</strong></div>)}
                      </div>
                    </div>
                  ) : null}
                  {error ? (
                    <div className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                      {error}
                    </div>
                  ) : null}
                  <div className="grid grid-cols-[auto_1fr] gap-2">
                    {listingStep > 1 ? <Button type="button" variant="outline" className="h-11 rounded-xl px-5" onClick={() => setListingStep((step) => Math.max(1, step - 1))}>Back</Button> : <span />}
                    {listingStep < 8 ? (
                      <Button type="button" disabled={!stepReady} className="h-11 rounded-xl bg-blue-700 font-semibold text-white" onClick={() => setListingStep((step) => Math.min(8, step + 1))}>Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
                    ) : (
                      <Button disabled={submitting || success} className="h-11 rounded-xl bg-blue-700 font-semibold text-white">{submitting ? "Sending..." : "Submit for verification"} <ArrowRight className="ml-2 h-4 w-4" /></Button>
                    )}
                  </div>
                </form>
              )}
              <p className="mt-3 text-center text-xs text-navy-400">
                By submitting, you agree to be contacted once by SocietyFlats for verification, pricing guidance and matching buyer/tenant enquiries.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8 text-center">
            <Badge className="mb-4 bg-white text-navy-700 border-navy-200">
              How listing with SocietyFlats works
            </Badge>
            <h2 className="text-2xl md:text-4xl font-display font-bold text-navy-900">
              Three simple steps to turn your flat into verified inventory.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="rounded-[1.35rem] border border-blue-100 bg-white p-4 shadow-sm"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-navy-900 text-white">
                    <Icon className="w-6 h-6" />
                  </div>
                  <p className="text-sm text-gold-600 font-bold mb-2">
                    Step {index + 1}
                  </p>
                  <h3 className="text-xl font-display font-bold text-navy-900">
                    {step.title}
                  </h3>
                  <p className="text-sm text-navy-500 mt-2">{step.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-6 rounded-[1.5rem] bg-navy-900 p-6 text-white md:grid-cols-2 md:items-center md:p-8">
            <div>
              <UserRound className="w-10 h-10 text-gold-400 mb-4" />
              <h2 className="text-3xl font-display font-bold">
                Owner dashboard and verified listing tools are next.
              </h2>
              <p className="text-navy-100 mt-3">
                Track listing requests, verification status and buyer/tenant enquiries as the owner dashboard expands.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                "Lead capture",
                "Photo verification",
                "Featured listing",
                "Society matching",
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-white/10 p-4 text-sm">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
