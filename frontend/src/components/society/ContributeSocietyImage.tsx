import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  contributeSocietyImage,
  fetchRoleStatements,
  ROLE_LABELS,
  type ContributorRole,
  type RoleStatement,
} from "@/lib/imageContributionApi";

/**
 * Lets the people who actually live in or built a society give us a photo of it, along
 * with the permission to publish it.
 *
 * The rights statement is fetched rather than written here on purpose: the backend stores
 * the exact wording each contributor agreed to, and the two must not be able to drift.
 */
export function ContributeSocietyImage({
  societySlug,
  societyName,
  accountToken,
}: {
  societySlug: string;
  societyName: string;
  accountToken?: string;
}) {
  const [open, setOpen] = useState(false);
  const [roles, setRoles] = useState<RoleStatement[]>([]);
  const [role, setRole] = useState<ContributorRole>("resident");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [caption, setCaption] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open || roles.length) return;
    fetchRoleStatements()
      .then(setRoles)
      .catch(() => setError("Could not load the contribution options."));
  }, [open, roles.length]);

  // Revoke the object URL when it changes or the component goes away.
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const statement = roles.find((r) => r.role === role)?.statement || "";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!file) {
      setError("Choose a photo first.");
      return;
    }
    if (!statement) {
      setError("The permission wording could not be loaded, so we cannot record your consent. Please try again shortly.");
      return;
    }
    if (!agreed) {
      setError("Please confirm you have the right to share this photo.");
      return;
    }

    const form = new FormData();
    form.append("image", file);
    form.append("contributor_role", role);
    form.append("contributor_name", name);
    if (email) form.append("contributor_email", email);
    if (caption) form.append("caption", caption);
    form.append("rights_granted", "1");

    setSubmitting(true);
    try {
      const result = await contributeSocietyImage(societySlug, form, accountToken);
      setDone(result.message || "Thank you — your photo is with our team.");
      setFile(null);
      setCaption("");
      setAgreed(false);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your photo could not be uploaded.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-bold text-emerald-900">{done}</p>
            <button type="button" className="mt-2 text-sm font-bold text-emerald-700 underline" onClick={() => setDone("")}>
              Add another photo
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-3xl border border-dashed border-slate-300 p-5 text-sm font-bold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
      >
        <Camera className="h-4 w-4" />
        Live here? Add a photo of {societyName}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-5">
      <h3 className="font-serif text-xl font-black text-slate-950">Add a photo of {societyName}</h3>
      <p className="mt-1 text-sm text-slate-500">
        Photos from residents and developers are the ones we trust most. Nothing appears on the site until our team has
        reviewed it.
      </p>

      {error ? <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}

      <label className="mt-4 block text-sm font-bold text-slate-700">
        Photo
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mt-1 block w-full rounded-2xl border border-slate-200 p-2 text-sm font-normal"
        />
      </label>

      {preview ? <img src={preview} alt="Selected" className="mt-3 h-44 w-full rounded-2xl object-cover" /> : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-bold text-slate-700">
          You are
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as ContributorRole)}
            className="mt-1 block w-full rounded-2xl border border-slate-200 p-2.5 text-sm font-normal"
          >
            {(roles.length ? roles.map((r) => r.role) : (["resident", "owner", "rwa", "builder"] as ContributorRole[])).map(
              (value) => (
                <option key={value} value={value}>
                  {ROLE_LABELS[value]}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="block text-sm font-bold text-slate-700">
          Your name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
            className="mt-1 block w-full rounded-2xl border border-slate-200 p-2.5 text-sm font-normal"
          />
        </label>

        <label className="block text-sm font-bold text-slate-700">
          Email (optional)
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-2xl border border-slate-200 p-2.5 text-sm font-normal"
          />
        </label>

        <label className="block text-sm font-bold text-slate-700">
          Caption (optional)
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={160}
            placeholder="Main entrance"
            className="mt-1 block w-full rounded-2xl border border-slate-200 p-2.5 text-sm font-normal"
          />
        </label>
      </div>

      {/* The grant is the point of this form, and it cannot be given to wording nobody
          can see. If the statement has not loaded, the tick is disabled rather than
          letting someone agree to a blank line. */}
      <label className={`mt-4 flex items-start gap-3 rounded-2xl p-3 ${statement ? "bg-slate-50" : "bg-amber-50"}`}>
        <input
          type="checkbox"
          checked={agreed}
          disabled={!statement}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1"
        />
        <span className={`text-xs leading-5 ${statement ? "text-slate-700" : "font-bold text-amber-800"}`}>
          {statement || "Loading the permission wording — you can send the photo once it appears."}
        </span>
      </label>

      <div className="mt-4 flex gap-2">
        <Button type="submit" className="rounded-full" disabled={submitting || !statement}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Send photo
        </Button>
        <Button type="button" variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
