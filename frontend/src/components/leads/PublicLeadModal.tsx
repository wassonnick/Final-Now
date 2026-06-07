import { useEffect, useMemo, useState } from "react";
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

  const compactTitle = useMemo(() => {
    if (propertyTitle) return "Request property callback";
    if (societyName) return "Request society callback";
    return title || "Request callback";
  }, [propertyTitle, societyName, title]);

  if (!open) return null;

  const toggleRequirementChip = (chip: string) => {
    const current = form.requirement || defaultRequirement || "";
    const hasChip = current.toLowerCase().includes(chip.toLowerCase());

    if (hasChip) return;

    setForm({
      ...form,
      requirement: current ? `${current} | ${chip}` : chip,
      message: form.message || defaultMessage || `I need help with ${chip.toLowerCase()}.`,
    });
  };

  const submitLead = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await backendApi.createLead({
        name: form.name,
        phone: form.phone,
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/60 px-3 pb-3 pt-8 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6">
      <div className="w-full max-w-lg overflow-hidden rounded-[1.75rem] bg-white shadow-2xl sm:rounded-[2rem]">
        <div className="border-b border-navy-100 px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                SocietyFlats callback
              </p>
              <h3 className="mt-1 text-xl font-bold leading-tight text-navy-900 sm:text-2xl">
                {compactTitle}
              </h3>
              {subtitle ? (
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-navy-500 sm:line-clamp-none">
                  {subtitle}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full border border-navy-100 p-2 text-navy-500 hover:bg-navy-50"
              aria-label="Close lead form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {(societyName || propertyTitle) ? (
            <div className="mt-4 grid gap-2">
              {societyName ? (
                <div className="flex items-center gap-2 rounded-2xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
                  <Building2 className="h-4 w-4" />
                  <span className="line-clamp-1">{societyName}</span>
                </div>
              ) : null}
              {propertyTitle ? (
                <div className="flex items-center gap-2 rounded-2xl bg-[#F8FAFC] px-3 py-2 text-sm font-semibold text-navy-800">
                  <Home className="h-4 w-4 text-blue-600" />
                  <span className="line-clamp-1">{propertyTitle}</span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {success ? (
          <div className="px-5 py-6 sm:px-6">
            <div className="rounded-2xl bg-green-50 p-5 text-green-700">
              <CheckCircle2 className="h-6 w-6" />
              <p className="mt-3 font-bold">Lead submitted successfully</p>
              <p className="mt-1 text-sm leading-relaxed">{successMessage}</p>
            </div>
            <Button onClick={onClose} className="mt-5 w-full rounded-full bg-blue-600 hover:bg-blue-700">
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={submitLead} className="space-y-4 px-5 py-5 sm:px-6">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-navy-400">
                What do you need?
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {requirementChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => toggleRequirementChip(chip)}
                    className="rounded-full border border-navy-100 bg-[#F8FAFC] px-3 py-1.5 text-xs font-semibold text-navy-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Your name"
                className="w-full rounded-2xl border border-navy-100 px-4 py-3 text-sm font-semibold text-navy-800 outline-none focus:border-blue-400"
              />
              <input
                required
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                placeholder="Phone number"
                className="w-full rounded-2xl border-2 border-blue-200 bg-blue-50/50 px-4 py-3 text-sm font-semibold text-navy-900 outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="Email optional"
                className="w-full rounded-2xl border border-navy-100 px-4 py-3 text-sm font-semibold text-navy-800 outline-none focus:border-blue-400"
              />
              <input
                value={form.budget}
                onChange={(event) => setForm({ ...form, budget: event.target.value })}
                placeholder="Budget optional"
                className="w-full rounded-2xl border border-navy-100 px-4 py-3 text-sm font-semibold text-navy-800 outline-none focus:border-blue-400"
              />
            </div>

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
              className="w-full rounded-full bg-blue-600 py-6 font-bold text-white hover:bg-blue-700"
            >
              <Phone className="mr-2 h-4 w-4" />
              {submitting ? "Submitting..." : submitLabel}
            </Button>

            <p className="text-center text-xs leading-relaxed text-navy-400">
              We use your details only to respond to this property/society request.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
