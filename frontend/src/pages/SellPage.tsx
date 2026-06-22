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

  useEffect(() => window.scrollTo(0, 0), []);

  const updateForm = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

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
    <div className="min-h-screen bg-[#f7fbff]">
      <section className="relative overflow-hidden border-b border-blue-100 bg-gradient-to-br from-white via-blue-50/80 to-slate-50">
        <div className="absolute left-[-12rem] top-[-10rem] h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="absolute right-[-10rem] top-24 h-96 w-96 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="relative container mx-auto px-4 py-8 md:py-12">
          <div className="grid gap-7 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <Badge className="mb-3 rounded-full border-blue-200 bg-white px-4 py-1.5 text-blue-700 shadow-sm">
                Owner listing
              </Badge>
              <h1 className="max-w-2xl text-3xl font-black tracking-[-0.045em] leading-[0.98] text-slate-950 md:text-5xl">
                List your Gurgaon flat. Get verified buyers. No broker hassle.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 md:text-base md:leading-7">
                Share your society, BHK, price expectation and callback time once. SocietyFlats verifies the owner lead, captures society context and routes serious buyer/tenant enquiries to the CRM.
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
                <h2 className="text-xl font-display font-bold">
                  List your flat
                </h2>
              </div>
              <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-blue-50 p-1">
                <button
                  onClick={() => {
                    trackEvent("owner_listing_purpose_changed", {
                      source: "sell_page",
                      lead_intent: "owner_listing_rent",
                      cta_label: "For Rent",
                    });
                    setPurpose("rent");
                  }}
                  className={cn(
                    "rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
                    purpose === "rent"
                      ? "bg-white shadow-sm text-navy-900"
                      : "text-navy-500",
                  )}
                >
                  For Rent
                </button>
                <button
                  onClick={() => {
                    trackEvent("owner_listing_purpose_changed", {
                      source: "sell_page",
                      lead_intent: "owner_listing_sale",
                      cta_label: "For Sale",
                    });
                    setPurpose("sell");
                  }}
                  className={cn(
                    "rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
                    purpose === "sell"
                      ? "bg-white shadow-sm text-navy-900"
                      : "text-navy-500",
                  )}
                >
                  For Sale
                </button>
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
                        Backend OTP / WhatsApp welcome message will be connected in the next auth phase.
                      </p>
                    </div>
                  ) : null}
                  <Button asChild className="mt-4 rounded-full bg-emerald-600 text-white hover:bg-emerald-700">
                    <Link to="/customer/dashboard">Open Customer Dashboard</Link>
                  </Button>
                </div>
              ) : (
                <form onSubmit={submitOwnerLead} className="space-y-3">
                  <Input
                    required
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    className="h-11 rounded-xl"
                    placeholder="Your name"
                  />
                  <Input
                    required
                    value={form.society}
                    onChange={(event) =>
                      updateForm("society", event.target.value)
                    }
                    className="h-11 rounded-xl"
                    placeholder="Society name e.g. DLF Park Place"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      value={form.tower}
                      onChange={(event) =>
                        updateForm("tower", event.target.value)
                      }
                      className="h-11 rounded-xl"
                      placeholder="Tower / block"
                    />
                    <Input
                      required
                      value={form.bhk}
                      onChange={(event) =>
                        updateForm("bhk", event.target.value)
                      }
                      className="h-11 rounded-xl"
                      placeholder="BHK e.g. 3 BHK"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      value={form.size}
                      onChange={(event) =>
                        updateForm("size", event.target.value)
                      }
                      className="h-11 rounded-xl"
                      placeholder="Size e.g. 1983 sq.ft."
                    />
                    <Input
                      value={form.floor}
                      onChange={(event) =>
                        updateForm("floor", event.target.value)
                      }
                      className="h-11 rounded-xl"
                      placeholder="Floor e.g. 12th"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      value={form.furnishing}
                      onChange={(event) =>
                        updateForm("furnishing", event.target.value)
                      }
                      className="h-11 rounded-xl"
                      placeholder="Furnishing e.g. Semi furnished"
                    />
                    <Input
                      value={form.availability}
                      onChange={(event) =>
                        updateForm("availability", event.target.value)
                      }
                      className="h-11 rounded-xl"
                      placeholder="Availability e.g. Immediate"
                    />
                  </div>

                  <Input
                    value={form.details}
                    onChange={(event) =>
                      updateForm("details", event.target.value)
                    }
                    className="h-11 rounded-xl"
                    placeholder="Extra details optional"
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      value={form.expectation}
                      onChange={(event) =>
                        updateForm("expectation", event.target.value)
                      }
                      className="h-11 rounded-xl"
                      placeholder={
                        purpose === "rent"
                          ? "Expected rent e.g. ₹85,000/month"
                          : "Expected price e.g. ₹5.5 Cr"
                      }
                    />
                    <Input
                      value={form.preferredTime}
                      onChange={(event) =>
                        updateForm("preferredTime", event.target.value)
                      }
                      className="h-11 rounded-xl"
                      placeholder="Best time to call e.g. Today evening"
                    />
                  </div>
                  <Input
                    required
                    value={form.phone}
                    onChange={(event) =>
                      updateForm("phone", cleanOwnerLeadPhone(event.target.value))
                    }
                    inputMode="numeric"
                    pattern="[6-9][0-9]{9}"
                    maxLength={10}
                    className="h-11 rounded-xl"
                    placeholder="10-digit mobile number"
                  />
                  <p className="text-xs text-navy-400">
                    {form.phone.length}/10 digits · India mobile number only
                  </p>
                  {error ? (
                    <div className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                      {error}
                    </div>
                  ) : null}
                  <Button
                    disabled={submitting || success}
                    className="h-11 w-full rounded-xl bg-blue-700 font-semibold text-white shadow-lg shadow-blue-100 hover:bg-blue-800"
                  >
                    {success ? "Request sent" : submitting ? "Sending..." : "Continue"}{" "}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
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
