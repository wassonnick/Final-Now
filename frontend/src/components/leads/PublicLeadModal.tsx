import { useEffect, useState } from "react";
import { X } from "lucide-react";
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

  if (!open) return null;

  const submitLead = async (event: React.FormEvent) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 px-4">
      <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black text-navy-950">{title}</h3>
            {subtitle ? (
              <p className="mt-1 text-sm leading-6 text-navy-500">{subtitle}</p>
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

        {success ? (
          <div className="mt-6 rounded-2xl bg-emerald-50 p-5 text-sm font-semibold leading-6 text-emerald-700">
            {successMessage}
          </div>
        ) : (
          <form onSubmit={submitLead} className="mt-6 space-y-4">
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="Your name"
              className="w-full rounded-2xl border border-navy-100 px-4 py-3 text-sm font-semibold text-navy-800 outline-none focus:border-blue-400"
            />
            <input
              required
              value={form.phone}
              onChange={(event) =>
                setForm({ ...form, phone: event.target.value })
              }
              placeholder="Phone number"
              className="w-full rounded-2xl border border-navy-100 px-4 py-3 text-sm font-semibold text-navy-800 outline-none focus:border-blue-400"
            />
            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              placeholder="Email optional"
              className="w-full rounded-2xl border border-navy-100 px-4 py-3 text-sm font-semibold text-navy-800 outline-none focus:border-blue-400"
            />
            <input
              value={form.budget}
              onChange={(event) =>
                setForm({ ...form, budget: event.target.value })
              }
              placeholder="Budget optional"
              className="w-full rounded-2xl border border-navy-100 px-4 py-3 text-sm font-semibold text-navy-800 outline-none focus:border-blue-400"
            />
            <textarea
              value={form.message}
              onChange={(event) =>
                setForm({ ...form, message: event.target.value })
              }
              placeholder="Tell us what you need"
              rows={4}
              className="w-full rounded-2xl border border-navy-100 px-4 py-3 text-sm font-semibold text-navy-800 outline-none focus:border-blue-400"
            />
            {error ? (
              <div className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            ) : null}
            <Button
              disabled={submitting}
              className="w-full rounded-full bg-blue-700 font-black text-white hover:bg-blue-800"
            >
              {submitting ? "Submitting..." : submitLabel}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
