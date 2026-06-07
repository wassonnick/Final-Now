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

const societyRequirementChips = ["Rent", "Buy", "Visit", "Callback"];

function cleanPhoneNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function isValidIndianMobile(value: string) {
  return /^[6-9]\d{9}$/.test(value);
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
  successMessage,
  onClose,
}: PublicLeadModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const isPropertyLead = Boolean(propertyTitle);
  const phoneDigits = useMemo(() => cleanPhoneNumber(form.phone), [form.phone]);

  useEffect(() => {
    if (!open) return;

    setForm({
      ...emptyForm,
      message: defaultMessage,
      requirement: isPropertyLead ? defaultRequirement : defaultRequirement,
      budget,
    });
    setSuccess(false);
    setError("");
    setSubmitting(false);
  }, [open, defaultMessage, defaultRequirement, budget, isPropertyLead]);

  if (!open) return null;

  const displayTitle = success
    ? "Request received"
    : isPropertyLead
      ? "Request property callback"
      : title || "Request society callback";

  const displaySubtitle = success
    ? "Your enquiry has been shared with SocietyFlats."
    : subtitle;

  const finalSuccessMessage =
    successMessage || "Lead submitted successfully. Our team will contact you shortly.";

  const updateRequirement = (requirement: string) => {
    setForm((current) => ({
      ...current,
      requirement,
      message:
        current.message ||
        `I need help with ${requirement.toLowerCase()} options${societyName ? ` in ${societyName}` : ""}.`,
    }));
  };

  const submitLead = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const normalizedPhone = cleanPhoneNumber(form.phone);

    if (!form.name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!isValidIndianMobile(normalizedPhone)) {
      setError("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.");
      return;
    }

    setSubmitting(true);

    try {
      await backendApi.createLead({
        name: form.name.trim(),
        phone: normalizedPhone,
        email: form.email.trim() || null,
        source,
        society_name: societyName || null,
        property_title: propertyTitle || null,
        property_slug: propertySlug || null,
        message: form.message.trim() || defaultMessage || defaultRequirement,
        requirement: form.requirement || defaultRequirement || null,
        budget: form.budget.trim() || budget || null,
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/60 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-navy-100 bg-white px-6 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-600">
                {success ? "Submitted" : "SocietyFlats Callback"}
              </p>
              <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-navy-900">
                {displayTitle}
              </h3>
              {displaySubtitle ? (
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-navy-500">
                  {displaySubtitle}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-navy-100 p-2 text-navy-500 hover:bg-navy-50"
              aria-label="Close lead form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!success && (societyName || propertyTitle) ? (
            <div className="mt-4 space-y-2">
              {societyName ? (
                <div className="flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-navy-800">
                  <Building2 className="h-4 w-4 text-blue-700" />
                  {societyName}
                </div>
              ) : null}
              {propertyTitle ? (
                <div className="flex items-center gap-2 rounded-2xl bg-[#F8FAFC] px-4 py-3 text-sm font-bold text-navy-800">
                  <Home className="h-4 w-4 text-blue-700" />
                  {propertyTitle}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="px-6 py-6 sm:px-7">
          {success ? (
            <div className="space-y-5">
              <div className="rounded-2xl bg-green-50 p-5 text-green-800">
                <CheckCircle2 className="h-7 w-7" />
                <p className="mt-4 text-lg font-bold">{finalSuccessMessage}</p>
                <p className="mt-2 text-sm leading-relaxed text-green-700">
                  We have saved your request with the society/property context.
                </p>
              </div>
              <Button onClick={onClose} className="w-full rounded-full bg-blue-600 hover:bg-blue-700">
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={submitLead} className="space-y-4">
              {!isPropertyLead ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-navy-400">
                    What do you need?
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {societyRequirementChips.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => updateRequirement(chip)}
                        className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                          form.requirement === chip
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-navy-100 bg-white text-navy-600 hover:bg-navy-50"
                        }`}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <input
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Your name"
                className="w-full rounded-2xl border border-navy-100 px-4 py-3 text-sm font-semibold text-navy-800 outline-none focus:border-blue-400"
              />

              <div>
                <input
                  required
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  value={form.phone}
                  onChange={(event) => {
                    setForm({ ...form, phone: cleanPhoneNumber(event.target.value) });
                    if (error) setError("");
                  }}
                  placeholder="10-digit mobile number"
                  className="w-full rounded-2xl border border-blue-200 bg-blue-50/40 px-4 py-3 text-sm font-bold text-navy-900 outline-none focus:border-blue-500 focus:bg-white"
                />
                <p className="mt-1 px-1 text-xs text-navy-400">
                  {phoneDigits.length}/10 digits · India mobile number only
                </p>
              </div>

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

              <textarea
                value={form.message}
                onChange={(event) => setForm({ ...form, message: event.target.value })}
                placeholder="Message optional"
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
                className="w-full rounded-full bg-blue-600 font-bold text-white hover:bg-blue-700"
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
    </div>
  );
}
