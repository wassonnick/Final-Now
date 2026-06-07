from pathlib import Path

root = Path(".")
modal_path = root / "frontend/src/components/leads/PublicLeadModal.tsx"
society_path = root / "frontend/src/pages/SocietyPage.tsx"
property_path = root / "frontend/src/pages/PropertyPage.tsx"

modal_path.write_text(r'''import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Building2, CheckCircle2, Home, Phone, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { backendApi } from "@/services/backendApi";

type PublicLeadModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  source: string;
  defaultMessage?: string;
  defaultRequirement?: string;
  societyName?: string;
  propertyTitle?: string;
  propertySlug?: string;
  budget?: string;
  submitLabel?: string;
  successMessage?: string;
  onClose: () => void;
};

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  message: "",
  requirement: "",
  budget: "",
};

const requirementChips = ["Rent", "Buy", "Visit", "Callback"];

function isValidIndianMobile(phone: string) {
  return /^[6-9]\d{9}$/.test(phone);
}

export function PublicLeadModal({
  open,
  title,
  subtitle,
  source,
  defaultMessage = "",
  defaultRequirement = "",
  societyName,
  propertyTitle,
  propertySlug,
  budget = "",
  submitLabel = "Request callback",
  successMessage = "Thanks. Our team will contact you shortly.",
  onClose,
}: PublicLeadModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const isPropertyLead = Boolean(propertyTitle);
  const phoneDigits = form.phone.replace(/\D/g, "");
  const phoneIsValid = isValidIndianMobile(phoneDigits);

  const compactTitle = useMemo(() => {
    if (success) return "Request received";
    if (isPropertyLead) return "Request property callback";
    return "Request society callback";
  }, [isPropertyLead, success]);

  const compactSubtitle = useMemo(() => {
    if (success) {
      return "Your request has been saved. Our team will contact you shortly.";
    }

    if (isPropertyLead) {
      return "Confirm availability, pricing and visit timing for this home.";
    }

    return "Tell us your requirement and we will help with availability and visit planning.";
  }, [isPropertyLead, success]);

  useEffect(() => {
    if (!open) return;

    setForm({
      ...emptyForm,
      message: defaultMessage,
      requirement: defaultRequirement,
      budget,
    });
    setSuccess(false);
    setError("");
    setSubmitting(false);
  }, [open, defaultMessage, defaultRequirement, budget]);

  if (!open) return null;

  const selectRequirement = (chip: string) => {
    if (isPropertyLead) return;

    const nextRequirement = `${chip} requirement`;
    setForm((current) => ({
      ...current,
      requirement: nextRequirement,
      message:
        current.message || defaultMessage || `I need help with ${chip.toLowerCase()} options.`,
    }));
  };

  const updatePhone = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
    setForm((current) => ({ ...current, phone: digitsOnly }));
  };

  const submitLead = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!phoneIsValid) {
      setError("Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await backendApi.createLead({
        name: form.name.trim(),
        phone: phoneDigits,
        email: form.email || null,
        source,
        society_name: societyName || null,
        property_title: propertyTitle || null,
        property_slug: propertySlug || null,
        message: form.message || defaultMessage || defaultRequirement,
        requirement: form.requirement || defaultRequirement || null,
        budget: form.budget || budget || null,
      });

      setSuccess(true);
    } catch (leadError) {
      console.error("Lead submission failed:", leadError);
      setError("Unable to submit right now. Please try again or use WhatsApp.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/60 px-3 pb-4 pt-8 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[1.75rem] bg-white shadow-2xl sm:rounded-[2rem]">
        <div className="relative border-b border-navy-100 px-5 py-5 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full border border-navy-100 bg-white p-2 text-navy-400 shadow-sm hover:bg-navy-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">
            SocietyFlats callback
          </p>

          <h3 className="mt-2 max-w-[84%] text-2xl font-extrabold leading-tight text-navy-900 sm:text-3xl">
            {compactTitle}
          </h3>

          <p className="mt-2 max-w-[88%] text-sm leading-relaxed text-navy-500 sm:text-base">
            {compactSubtitle}
          </p>

          {!success ? (
            <div className="mt-4 space-y-2">
              {societyName ? (
                <div className="flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-navy-800">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  {societyName}
                </div>
              ) : null}

              {propertyTitle ? (
                <div className="flex items-center gap-2 rounded-2xl bg-[#F8FAFC] px-4 py-3 text-sm font-bold text-navy-800">
                  <Home className="h-4 w-4 text-blue-600" />
                  {propertyTitle}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {success ? (
          <div className="px-5 py-6 sm:px-6">
            <div className="rounded-2xl bg-green-50 p-5 text-green-700">
              <CheckCircle2 className="h-7 w-7" />
              <h4 className="mt-3 text-lg font-bold">Lead submitted successfully</h4>
              <p className="mt-2 text-sm leading-relaxed">
                We have received your request. Our team will contact you shortly.
              </p>
            </div>

            <Button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-full bg-blue-600 font-bold hover:bg-blue-700"
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={submitLead} className="px-5 py-5 sm:px-6">
            {!isPropertyLead ? (
              <div className="mb-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-navy-300">
                  What do you need?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {requirementChips.map((chip) => {
                    const active = form.requirement
                      .toLowerCase()
                      .includes(chip.toLowerCase());

                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => selectRequirement(chip)}
                        className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                          active
                            ? "border-blue-200 bg-blue-50 text-blue-700"
                            : "border-navy-100 bg-white text-navy-500 hover:bg-navy-50"
                        }`}
                      >
                        {chip}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              <input
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Your name"
                className="h-12 w-full rounded-2xl border border-navy-100 px-4 text-sm font-semibold text-navy-800 outline-none focus:border-blue-400"
              />

              <div>
                <input
                  required
                  inputMode="numeric"
                  pattern="[6-9][0-9]{9}"
                  maxLength={10}
                  value={form.phone}
                  onChange={(event) => updatePhone(event.target.value)}
                  placeholder="10-digit mobile number"
                  className="h-12 w-full rounded-2xl border border-navy-100 px-4 text-sm font-semibold text-navy-800 outline-none focus:border-blue-400"
                />
                <p className={`mt-1 text-xs ${phoneDigits.length && !phoneIsValid ? "text-red-600" : "text-navy-300"}`}>
                  {phoneDigits.length}/10 digits · India mobile number only
                </p>
              </div>

              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="Email optional"
                className="h-12 w-full rounded-2xl border border-navy-100 px-4 text-sm font-semibold text-navy-800 outline-none focus:border-blue-400"
              />

              <input
                value={form.budget}
                onChange={(event) => setForm({ ...form, budget: event.target.value })}
                placeholder="Budget optional"
                className="h-12 w-full rounded-2xl border border-navy-100 px-4 text-sm font-semibold text-navy-800 outline-none focus:border-blue-400"
              />

              <textarea
                value={form.message}
                onChange={(event) => setForm({ ...form, message: event.target.value })}
                placeholder="Tell us what you need"
                rows={3}
                className="w-full rounded-2xl border border-navy-100 px-4 py-3 text-sm font-semibold text-navy-800 outline-none focus:border-blue-400"
              />

              {error ? (
                <div className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              ) : null}

              <Button
                disabled={submitting}
                className="h-12 w-full rounded-full bg-blue-600 font-bold text-white hover:bg-blue-700"
              >
                <Phone className="mr-2 h-4 w-4" />
                {submitting ? "Submitting..." : submitLabel}
              </Button>

              <p className="text-center text-xs leading-relaxed text-navy-300">
                We use your details only to respond to this property/society request.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
''', encoding="utf-8")

society_text = society_path.read_text(encoding="utf-8")

old_society_requirement = '''        defaultRequirement={
          selectedLeadProperty
            ? `Interested in ${selectedLeadProperty.title}. Please confirm availability, price and visit timing.`
            : `Looking for homes or society guidance in ${society.name}, ${societyLocation || "Gurgaon"}.`
        }'''

new_society_requirement = '''        defaultRequirement={
          selectedLeadProperty
            ? `${field(selectedLeadProperty, "listingType", "listing_type", "Property")} requirement for ${selectedLeadProperty.title}. Please confirm availability, price and visit timing.`
            : `Looking for homes or society guidance in ${society.name}, ${societyLocation || "Gurgaon"}.`
        }'''

if old_society_requirement in society_text:
    society_text = society_text.replace(old_society_requirement, new_society_requirement)
else:
    print("WARNING: SocietyPage defaultRequirement block not found. Modal still updated.")

society_path.write_text(society_text, encoding="utf-8")

property_text = property_path.read_text(encoding="utf-8")

old_property_source = '''          source: leadType === "callback" ? "property_callback" : "property_enquiry",'''
new_property_source = '''          source: leadType === "callback" ? "property_callback" : "property_enquiry",
          requirement: `${listingType || "Property"} ${leadType === "callback" ? "callback" : "enquiry"}`,'''

if old_property_source in property_text and "requirement: `${listingType || \"Property\"}" not in property_text:
    property_text = property_text.replace(old_property_source, new_property_source)
else:
    print("WARNING: PropertyPage lead requirement may already be patched or source block not found.")

property_path.write_text(property_text, encoding="utf-8")

print("C4C fix applied:")
print("- PublicLeadModal compacted")
print("- SocietyPage property callback requirement patched if matching block existed")
print("- PropertyPage lead requirement patched if matching block existed")
