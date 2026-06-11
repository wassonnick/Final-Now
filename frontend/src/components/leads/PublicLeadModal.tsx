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

function cleanPhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function isValidIndianMobile(value: string) {
  return /^[6-9]\d{9}$/.test(value);
}

function normalizeRequirement(value?: string) {
  const clean = String(value || "").trim();
  if (!clean) return "";
  if (/requirement|callback|enquiry|visit/i.test(clean)) return clean;
  return `${clean} requirement`;
}

function cleanLeadPhone(value: string) {
  return String(value || "").replace(/\D/g, "").slice(0, 10);
}

function isValidLeadPhone(value: string) {
  return /^[6-9]\d{9}$/.test(cleanLeadPhone(value));
}

export function PublicLeadModal({
  open,
  source,
  defaultMessage = "",
  defaultRequirement = "",
  societyName,
  propertyTitle,
  propertySlug,
  budget = "",
  submitLabel = "Request callback",
  onClose,
}: PublicLeadModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const isPropertyLead = Boolean(propertyTitle);
  const phoneDigits = useMemo(() => cleanPhone(form.phone), [form.phone]);
  const phoneValid = isValidIndianMobile(phoneDigits);

  useEffect(() => {
    if (!open) return;

    setForm({
      ...emptyForm,
      phone: "",
      message: defaultMessage,
      requirement: normalizeRequirement(defaultRequirement),
      budget,
    });
    setSuccess(false);
    setError("");
    setSubmitting(false);
  }, [open, defaultMessage, defaultRequirement, budget]);

  if (!open) return null;

  const displayTitle = success
    ? "Request received"
    : isPropertyLead
      ? "Request property callback"
      : "Request callback";

  const displaySubtitle = success
    ? "Your request has been saved. Our team will contact you shortly."
    : isPropertyLead
      ? "Confirm availability, price and visit timing."
      : "Select your need and share your mobile number.";

  const finalRequirement =
    normalizeRequirement(form.requirement) ||
    normalizeRequirement(defaultRequirement) ||
    (isPropertyLead ? "Property callback" : "Society callback");

  const selectRequirement = (chip: string) => {
    const nextRequirement = normalizeRequirement(chip);
    setForm((current) => ({
      ...current,
      requirement: nextRequirement,
      message:
        current.message ||
        `I need help with ${chip.toLowerCase()} options${societyName ? ` in ${societyName}` : ""}.`,
    }));
  };

  const submitLead = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!isValidIndianMobile(phoneDigits)) {
      setError("Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.");
      return;
    }

    setSubmitting(true);

    try {
      await backendApi.createLead({
        name: form.name.trim(),
        phone: phoneDigits,
        email: form.email.trim() || null,
        source,
        society_name: societyName || null,
        property_title: propertyTitle || null,
        property_slug: propertySlug || null,
        requirement: finalRequirement,
        budget: form.budget.trim() || budget || null,
        message:
          form.message.trim() ||
          defaultMessage ||
          `${finalRequirement}${societyName ? ` for ${societyName}` : ""}`,
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/60 px-3 pb-3 pt-6 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[86vh] w-full max-w-[390px] overflow-y-auto rounded-[1.5rem] bg-white shadow-2xl sm:max-h-[82vh] sm:max-w-[420px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative border-b border-navy-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full border border-navy-100 bg-white p-2 text-navy-400 shadow-sm hover:bg-navy-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-600">
            SocietyFlats callback
          </p>

          <h3 className="mt-2 max-w-[82%] text-2xl font-extrabold leading-tight text-navy-900">
            {displayTitle}
          </h3>

          <p className="mt-1.5 max-w-[88%] text-sm leading-relaxed text-navy-500">
            {displaySubtitle}
          </p>

          {!success ? (
            <div className="mt-3 space-y-2">
              {societyName ? (
                <div className="flex h-9 items-center gap-2 rounded-2xl bg-blue-50 px-4 text-sm font-bold text-navy-800">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  {societyName}
                </div>
              ) : null}

              {propertyTitle ? (
                <div className="flex h-9 items-center gap-2 rounded-2xl bg-[#F8FAFC] px-4 text-sm font-bold text-navy-800">
                  <Home className="h-4 w-4 text-blue-600" />
                  {propertyTitle}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {success ? (
          <div className="px-5 py-5">
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
              className="mt-4 h-11 w-full rounded-full bg-blue-600 font-bold hover:bg-blue-700"
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={submitLead} className="px-5 py-4">
            {isPropertyLead ? (
              <div className="mb-3">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-navy-300">
                  Selected requirement
                </p>
                <div className="inline-flex h-9 items-center rounded-full border border-blue-300 bg-blue-50 px-4 text-sm font-bold text-blue-700">
                  {form.requirement.replace(/ requirement$/i, "") || "Callback"}
                </div>
              </div>
            ) : (
              <div className="mb-3">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-navy-300">
                  What do you need?
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {requirementChips.map((chip) => {
                    const requirement = normalizeRequirement(chip);
                    const active = form.requirement === requirement;

                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => selectRequirement(chip)}
                        className={`h-9 rounded-full border px-3 text-sm font-bold transition ${
                          active
                            ? "border-blue-300 bg-blue-50 text-blue-700"
                            : "border-navy-100 bg-white text-navy-500 hover:bg-navy-50"
                        }`}
                      >
                        {chip}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              <input
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Your name"
                className="h-10 w-full rounded-2xl border border-navy-100 px-4 text-sm font-semibold text-navy-800 outline-none focus:border-blue-400"
              />

              <div>
                <input
                  required
                  inputMode="numeric"
                  pattern="[6-9][0-9]{9}"
                  maxLength={10}
                  value={form.phone}
                  onChange={(event) => {
                    setForm({ ...form, phone: cleanPhone(event.target.value) });
                    if (error) setError("");
                  }}
                  placeholder="10-digit mobile number"
                  className="h-10 w-full rounded-2xl border border-blue-200 bg-blue-50/40 px-4 text-sm font-bold text-navy-900 outline-none focus:border-blue-500 focus:bg-white"
                />
                <p className={`mt-1 text-[11px] ${phoneDigits.length && !phoneValid ? "text-red-600" : "text-navy-300"}`}>
                  {phoneDigits.length}/10 digits · India mobile number only
                </p>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  placeholder="Email optional"
                  className="h-10 w-full rounded-2xl border border-navy-100 px-4 text-sm font-semibold text-navy-800 outline-none focus:border-blue-400"
                />

                <input
                  value={form.budget}
                  onChange={(event) => setForm({ ...form, budget: event.target.value })}
                  placeholder="Budget optional"
                  className="h-10 w-full rounded-2xl border border-navy-100 px-4 text-sm font-semibold text-navy-800 outline-none focus:border-blue-400"
                />
              </div>

              <textarea
                value={form.message}
                onChange={(event) => setForm({ ...form, message: event.target.value })}
                placeholder="Message optional"
                rows={2}
                className="w-full rounded-2xl border border-navy-100 px-4 py-2.5 text-sm font-semibold text-navy-800 outline-none focus:border-blue-400"
              />

              {error ? (
                <div className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              ) : null}

              <Button
                disabled={submitting}
                className="h-10 w-full rounded-full bg-blue-600 font-bold text-white hover:bg-blue-700"
              >
                <Phone className="mr-2 h-4 w-4" />
                {submitting ? "Submitting..." : submitLabel}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
