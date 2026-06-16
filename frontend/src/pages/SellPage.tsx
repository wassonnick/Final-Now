import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
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

function cleanOwnerLeadPhone(value: string) {
  return String(value || "").replace(/\D/g, "").slice(0, 10);
}

function isValidOwnerLeadPhone(value: string) {
  return /^[6-9]\d{9}$/.test(cleanOwnerLeadPhone(value));
}

const steps = [
  {
    icon: Building2,
    title: "Choose Society",
    text: "Start with society name, tower and sector.",
  },
  {
    icon: Home,
    title: "Add Property Details",
    text: "Rent, resale, BHK, size and availability.",
  },
  {
    icon: Camera,
    title: "Upload Photos",
    text: "Photos become listing highlights.",
  },
  {
    icon: Sparkles,
    title: "AI Creates Listing",
    text: "Title, description, tags and lead-ready page.",
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
  const [error, setError] = useState("");

  useEffect(() => window.scrollTo(0, 0), []);

  const updateForm = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitOwnerLead = async (event: FormEvent) => {
    event.preventDefault();
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
        <div className="relative container mx-auto px-4 py-14 md:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <Badge className="mb-5 rounded-full border-blue-200 bg-white px-4 py-1.5 text-blue-700 shadow-sm">
                Owner listing engine
              </Badge>
              <h1 className="max-w-2xl text-4xl font-black tracking-[-0.045em] leading-[0.98] text-slate-950 md:text-6xl">
                List your flat with verified society context.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 md:text-lg">
                Share basic property details once. SocietyFlats routes it into
                the lead CRM with rent/sale intent, society name and owner
                follow-up context.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {[
                  "Verified society page",
                  "CRM-ready owner lead",
                  "Tenant/buyer matching",
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

            <div className="rounded-[2rem] border border-blue-100 bg-white p-5 text-navy-900 shadow-xl shadow-blue-100/60 md:p-7">
              <div className="flex items-center gap-2 mb-5">
                <BadgeIndianRupee className="w-5 h-5 text-blue-700" />
                <h2 className="text-2xl font-display font-bold">
                  Start listing
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-5 rounded-2xl bg-navy-50 p-1">
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
                    "rounded-xl px-4 py-3 text-sm font-semibold transition-all",
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
                    "rounded-xl px-4 py-3 text-sm font-semibold transition-all",
                    purpose === "sell"
                      ? "bg-white shadow-sm text-navy-900"
                      : "text-navy-500",
                  )}
                >
                  For Sale
                </button>
              </div>
              {success ? (
                <div className="rounded-2xl bg-emerald-50 p-5 text-sm font-semibold leading-6 text-emerald-700">
                  Listing request received. Our team will call you shortly to verify details and create the right draft.
                </div>
              ) : (
                <form onSubmit={submitOwnerLead} className="space-y-4">
                  <Input
                    required
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    className="h-12 rounded-xl"
                    placeholder="Your name"
                  />
                  <Input
                    required
                    value={form.society}
                    onChange={(event) =>
                      updateForm("society", event.target.value)
                    }
                    className="h-12 rounded-xl"
                    placeholder="Society name e.g. DLF Park Place"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      value={form.tower}
                      onChange={(event) =>
                        updateForm("tower", event.target.value)
                      }
                      className="h-12 rounded-xl"
                      placeholder="Tower / block"
                    />
                    <Input
                      required
                      value={form.bhk}
                      onChange={(event) =>
                        updateForm("bhk", event.target.value)
                      }
                      className="h-12 rounded-xl"
                      placeholder="BHK e.g. 3 BHK"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      value={form.size}
                      onChange={(event) =>
                        updateForm("size", event.target.value)
                      }
                      className="h-12 rounded-xl"
                      placeholder="Size e.g. 1983 sq.ft."
                    />
                    <Input
                      value={form.floor}
                      onChange={(event) =>
                        updateForm("floor", event.target.value)
                      }
                      className="h-12 rounded-xl"
                      placeholder="Floor e.g. 12th"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      value={form.furnishing}
                      onChange={(event) =>
                        updateForm("furnishing", event.target.value)
                      }
                      className="h-12 rounded-xl"
                      placeholder="Furnishing e.g. Semi furnished"
                    />
                    <Input
                      value={form.availability}
                      onChange={(event) =>
                        updateForm("availability", event.target.value)
                      }
                      className="h-12 rounded-xl"
                      placeholder="Availability e.g. Immediate"
                    />
                  </div>

                  <Input
                    value={form.details}
                    onChange={(event) =>
                      updateForm("details", event.target.value)
                    }
                    className="h-12 rounded-xl"
                    placeholder="Extra details optional"
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      value={form.expectation}
                      onChange={(event) =>
                        updateForm("expectation", event.target.value)
                      }
                      className="h-12 rounded-xl"
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
                      className="h-12 rounded-xl"
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
                    className="h-12 rounded-xl"
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
                    disabled={submitting}
                    className="w-full h-12 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold shadow-lg shadow-blue-100"
                  >
                    {submitting ? "Submitting..." : "Continue"}{" "}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              )}
              <p className="text-xs text-navy-400 mt-4 text-center">
                Your request now goes to the SocietyFlats lead CRM with society
                and owner-listing context.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-white text-navy-700 border-navy-200">
              How owner listing works
            </Badge>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-navy-900">
              Designed to create inventory, not just pages.
            </h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="rounded-[2rem] bg-white border border-navy-100 p-6 shadow-sm"
                >
                  <div className="w-12 h-12 rounded-2xl bg-navy-900 text-white flex items-center justify-center mb-5">
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

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="rounded-[2rem] bg-navy-900 p-8 md:p-10 text-white grid md:grid-cols-2 gap-8 items-center">
            <div>
              <UserRound className="w-10 h-10 text-gold-400 mb-4" />
              <h2 className="text-3xl font-display font-bold">
                Broker and owner dashboards come next.
              </h2>
              <p className="text-navy-100 mt-3">
                Bulk upload, verification, lead routing and package monetization
                should be wired after the UI foundation is stable.
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
