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
    details: "",
    expectation: "",
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

    const cleanPhone = form.phone.replace(/[^0-9]/g, "").slice(-10);
    const listingIntent = purpose === "rent" ? "Rent" : "Sale";
    const societyName = form.society.trim();
    const towerName = form.tower.trim();
    const propertyDetails = form.details.trim();
    const expectation = form.expectation.trim();

    const propertyTitle =
      [propertyDetails, societyName].filter(Boolean).join(" · ") ||
      `Owner ${listingIntent} Listing`;

    const ownerMessage = [
      "Owner listing submission from Sell page",
      `Intent: ${listingIntent}`,
      `Owner name: ${form.name.trim() || "Not provided"}`,
      `Phone: ${cleanPhone || form.phone || "Not provided"}`,
      `Society: ${societyName || "Not provided"}`,
      `Tower / Block: ${towerName || "Not provided"}`,
      `Property details: ${propertyDetails || "Not provided"}`,
      `Expected ${purpose === "rent" ? "rent" : "sale price"}: ${expectation || "Not provided"}`,
      "Suggested next action: Call owner, verify property details, ask for photos, confirm availability and expected pricing.",
    ].join("\n");

    try {
      await backendApi.createLead({
        name: form.name.trim(),
        phone: cleanPhone || form.phone,
        source: purpose === "rent" ? "owner_listing_rent" : "owner_listing_sale",
        society_name: societyName || null,
        property_title: propertyTitle,
        message: ownerMessage,
        requirement:
          purpose === "rent"
            ? "Owner listing - Rent"
            : "Owner listing - Sale",
        budget: expectation || null,
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
    <div className="min-h-screen bg-ivory-100">
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1920&q=80')] bg-cover bg-center opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900/95 to-navy-950" />
        <div className="relative container mx-auto px-4 py-20 md:py-28">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <Badge className="mb-5 border-gold-400/50 bg-gold-500/20 text-gold-200 shadow-sm">
                Owner inventory engine
              </Badge>
              <h1 className="max-w-2xl text-4xl md:text-6xl font-display font-bold tracking-tight leading-tight text-white drop-shadow-[0_8px_28px_rgba(0,0,0,0.45)]">
                List your property from the society page.
              </h1>
              <p className="text-lg text-white/85 mt-5 max-w-2xl">
                Rent out or sell your flat with society-first context,
                AI-generated listing content and lead capture built around real
                buyer and tenant intent.
              </p>
              <div className="grid sm:grid-cols-3 gap-4 mt-8">
                {[
                  "Verified society context",
                  "AI listing copy",
                  "Buyer/renter leads",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-sm font-medium text-white/85"
                  >
                    <CheckCircle2 className="w-4 h-4 text-gold-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] bg-white p-5 md:p-7 text-navy-900 shadow-2xl">
              <div className="flex items-center gap-2 mb-5">
                <BadgeIndianRupee className="w-5 h-5 text-gold-600" />
                <h2 className="text-2xl font-display font-bold">
                  Start listing
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-5 rounded-2xl bg-navy-50 p-1">
                <button
                  onClick={() => setPurpose("rent")}
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
                  onClick={() => setPurpose("sell")}
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
                  Listing request submitted. Our team will call you shortly.
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
                    value={form.details}
                    onChange={(event) =>
                      updateForm("details", event.target.value)
                    }
                    className="h-12 rounded-xl"
                    placeholder="BHK and size e.g. 3 BHK, 1983 sq.ft."
                  />
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
                    required
                    value={form.phone}
                    onChange={(event) =>
                      updateForm("phone", event.target.value)
                    }
                    className="h-12 rounded-xl"
                    placeholder="Your phone number"
                  />
                  {error ? (
                    <div className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                      {error}
                    </div>
                  ) : null}
                  <Button
                    disabled={submitting}
                    className="w-full h-12 rounded-xl bg-navy-700 hover:bg-navy-800 text-white font-semibold"
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
