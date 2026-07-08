import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { AdminSocialNav } from "./AdminSocialNav";
import { fetchSocialPosts, type SocialPost } from "@/lib/socialApi";

export function AdminSocialCalendarPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchSocialPosts("per_page=100").then(setPosts).catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load social drafts."));
  }, []);

  const grouped = useMemo(() => {
    return posts.reduce<Record<string, SocialPost[]>>((carry, post) => {
      const key = post.scheduled_at ? new Date(post.scheduled_at).toLocaleDateString("en-IN") : "Unscheduled drafts";
      carry[key] = carry[key] || [];
      carry[key].push(post);
      return carry;
    }, {});
  }, [posts]);

  return (
    <AdminLayout title="Content Calendar" subtitle="Plan approved posts for future scheduling. SM1A does not post to social networks.">
      <AdminSocialNav />
      {message ? <p className="mb-5 rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-700">{message}</p> : null}

      <section className="rounded-[1.5rem] border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">Review queue calendar</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Use the edit flow on AI Drafts to set scheduled dates. Publishing connections and true auto-scheduling belong to SM2 after approval guardrails.
        </p>
        <div className="mt-5 space-y-4">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date} className="rounded-2xl bg-slate-50 p-4">
              <h3 className="font-black">{date}</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {items.map((post) => (
                  <article key={post.id} className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-xs font-black uppercase text-blue-700">{post.platform.replace("_", " ")} · {post.status.replace("_", " ")} · {post.risk_level} risk</p>
                    <h4 className="mt-2 font-black">{post.title || post.hook || "Untitled draft"}</h4>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{post.caption}</p>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
        {!posts.length ? <div className="mt-5 rounded-2xl bg-slate-50 p-8 text-center font-black text-slate-500">No social drafts scheduled yet.</div> : null}
      </section>
    </AdminLayout>
  );
}
