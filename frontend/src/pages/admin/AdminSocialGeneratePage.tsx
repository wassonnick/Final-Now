import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { AdminSocialNav } from "./AdminSocialNav";
import { fetchSocialContext, generateSocialPosts, type SocialPost } from "@/lib/socialApi";

const platformOptions = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "google_business", label: "Google Business" },
];

const imageStyles = [
  "premium_real_estate",
  "clean_corporate",
  "instagram_carousel",
  "whatsapp_status",
  "google_business",
  "minimal_vector",
  "local_area_guide",
];

type ContextSociety = { id: number; name: string; sector?: string | null; locality?: string | null };
type ContextProperty = { id: number; title: string; society_name?: string | null; sector?: string | null };

export function AdminSocialGeneratePage() {
  const [context, setContext] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [platforms, setPlatforms] = useState(["instagram", "linkedin"]);
  const [form, setForm] = useState({
    content_pillar: "society-first education",
    objective: "Generate trust and callback enquiries without claiming availability.",
    target_audience: "Gurgaon tenants, buyers, owners and RWA/builders evaluating society-first discovery.",
    society_id: "",
    property_id: "",
    sector: "",
    number_of_variations: 3,
    generate_images: false,
    image_style: "premium_real_estate",
  });

  useEffect(() => {
    fetchSocialContext().then(setContext).catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load social context."));
  }, []);

  const societies: ContextSociety[] = useMemo(() => context?.data?.published_societies_summary || [], [context]);
  const properties: ContextProperty[] = useMemo(() => context?.data?.published_properties_summary || [], [context]);

  function togglePlatform(value: string) {
    setPlatforms((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  async function submit(autoPlan = false) {
    setLoading(true);
    setMessage("");
    try {
      const body = await generateSocialPosts(autoPlan ? {
        // Auto-plan: the backend fills pillar/objective/audience/subject from the autopilot's
        // weekday content calendar + least-recently-featured rotation.
        auto_plan: true,
        platforms,
        content_pillar: null,
        objective: null,
        target_audience: null,
        number_of_variations: Number(form.number_of_variations),
        generate_images: form.generate_images,
      } : {
        ...form,
        platforms,
        society_id: form.society_id ? Number(form.society_id) : null,
        property_id: form.property_id ? Number(form.property_id) : null,
        number_of_variations: Number(form.number_of_variations),
      });
      setPosts(body?.data?.posts || []);
      setMessage(body?.message || "Drafts generated for review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout title="Generate Social Posts" subtitle="AI creates review-only drafts from safe SocietyFlats context. Nothing is posted automatically.">
      <AdminSocialNav />
      {message ? <p className="mb-5 rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-700">{message}</p> : null}

      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[1.5rem] border bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">Draft brief</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-black text-slate-700">Platforms</span>
              <div className="flex flex-wrap gap-2">
                {platformOptions.map((option) => (
                  <button key={option.value} type="button" onClick={() => togglePlatform(option.value)} className={`rounded-full border px-4 py-2 text-sm font-black ${platforms.includes(option.value) ? "border-blue-700 bg-blue-50 text-blue-700" : "bg-white text-slate-600"}`}>
                    {option.label}
                  </button>
                ))}
              </div>
            </label>

            {[
              ["content_pillar", "Content pillar"],
              ["objective", "Objective"],
              ["target_audience", "Target audience"],
              ["sector", "Optional sector/locality focus"],
            ].map(([key, label]) => (
              <label key={key} className={`space-y-2 ${key === "target_audience" ? "md:col-span-2" : ""}`}>
                <span className="text-sm font-black text-slate-700">{label}</span>
                <input className="w-full rounded-2xl border px-4 py-3 text-sm" value={(form as any)[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
              </label>
            ))}

            <label className="space-y-2">
              <span className="text-sm font-black text-slate-700">Published society source</span>
              <select className="w-full rounded-2xl border px-4 py-3 text-sm" value={form.society_id} onChange={(event) => setForm({ ...form, society_id: event.target.value, property_id: "" })}>
                <option value="">Brand / sector post</option>
                {societies.map((society) => <option key={society.id} value={society.id}>{society.name} {society.sector ? `— ${society.sector}` : ""}</option>)}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-black text-slate-700">Published property source</span>
              <select className="w-full rounded-2xl border px-4 py-3 text-sm" value={form.property_id} onChange={(event) => setForm({ ...form, property_id: event.target.value, society_id: "" })}>
                <option value="">No property source</option>
                {properties.map((property) => <option key={property.id} value={property.id}>{property.title} {property.society_name ? `— ${property.society_name}` : ""}</option>)}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-black text-slate-700">Variations</span>
              <input type="number" min={1} max={10} className="w-full rounded-2xl border px-4 py-3 text-sm" value={form.number_of_variations} onChange={(event) => setForm({ ...form, number_of_variations: Number(event.target.value) })} />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-black text-slate-700">Image style</span>
              <select className="w-full rounded-2xl border px-4 py-3 text-sm" value={form.image_style} onChange={(event) => setForm({ ...form, image_style: event.target.value })}>
                {imageStyles.map((style) => <option key={style} value={style}>{style.replace(/_/g, " ")}</option>)}
              </select>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 md:col-span-2">
              <input className="mt-1" type="checkbox" checked={form.generate_images} onChange={(event) => setForm({ ...form, generate_images: event.target.checked })} />
              <span className="text-sm font-bold text-slate-800">
                Generate real images for each draft
                <span className="mt-1 block text-xs font-semibold text-slate-600">
                  Leave this OFF and you only get a text creative brief — this is why drafts show &ldquo;no image file generated yet&rdquo;. Ticking it renders a branded visual per draft (uses image credits). You can also generate one image at a time from any draft later.
                </span>
              </span>
            </label>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button disabled={loading || platforms.length === 0} onClick={() => void submit(true)} className="rounded-full bg-emerald-700 hover:bg-emerald-800">
              <Sparkles className="mr-2 h-4 w-4" /> {loading ? "Generating..." : "Auto-plan today's drafts"}
            </Button>
            <Button disabled={loading || platforms.length === 0} onClick={() => void submit()} variant="outline" className="rounded-full">
              {loading ? "Generating..." : "Generate from this brief"}
            </Button>
            <span className="text-xs text-slate-500">Auto-plan picks today's pillar, subject and angle rotation for you.</span>
          </div>
        </div>

        <aside className="rounded-[1.5rem] border bg-slate-950 p-5 text-white shadow-sm">
          <h2 className="text-xl font-black">SM1A safety rules</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
            <li>• Uses only published SocietyFlats context.</li>
            <li>• No private lead, owner or account data leaves the API.</li>
            <li>• Price, RERA, availability, ranking and investment claims are high-risk.</li>
            <li>• Every draft and asset is saved as needs approval.</li>
            <li>• Social account connection is foundation-only in this phase.</li>
          </ul>
        </aside>
      </section>

      {posts.length ? (
        <section className="mt-6 rounded-[1.5rem] border bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">Generated drafts</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {posts.map((post) => (
              <article key={post.id} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase text-blue-700">{post.platform.replace("_", " ")} · {post.risk_level} risk · {post.status.replace("_", " ")}</p>
                <h3 className="mt-2 font-black">{post.title || post.hook}</h3>
                <p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-600">{post.caption}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </AdminLayout>
  );
}
