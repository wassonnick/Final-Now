import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Play, RefreshCw, Sparkles } from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { AdminSocialNav } from "./AdminSocialNav";
import {
  fetchSocialAutomation, fetchSocialPosts, runSocialAutopilot, updateSocialAutomation,
  type SocialAutomationSettings, type SocialPost,
} from "@/lib/socialApi";

export function AdminSocialCalendarPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [automation, setAutomation] = useState<SocialAutomationSettings | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const load = () => {
    fetchSocialPosts("per_page=100").then(setPosts).catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load social drafts."));
    fetchSocialAutomation().then(setAutomation).catch(() => undefined);
  };
  useEffect(load, []);

  const toggle = async (key: "enabled" | "auto_publish_low_risk" | "generate_images") => {
    if (!automation) return;
    setBusy(key);
    try {
      await updateSocialAutomation({ [key]: !automation[key] });
      setAutomation({ ...automation, [key]: !automation[key] });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update autopilot policy.");
    } finally {
      setBusy("");
    }
  };

  const runNow = async () => {
    setBusy("run");
    setMessage("");
    try {
      const result = await runSocialAutopilot();
      setMessage(result?.message || "Autopilot cycle completed.");
      load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Autopilot run failed.");
    } finally {
      setBusy("");
    }
  };

  const grouped = useMemo(() => {
    return posts.reduce<Record<string, SocialPost[]>>((carry, post) => {
      const key = post.scheduled_at ? new Date(post.scheduled_at).toLocaleDateString("en-IN") : "Unscheduled drafts";
      carry[key] = carry[key] || [];
      carry[key].push(post);
      return carry;
    }, {});
  }, [posts]);

  const summary = automation?.last_run_summary;

  return (
    <AdminLayout title="Content Calendar" subtitle="The autopilot plans, writes and schedules daily. Low-risk posts publish themselves; everything else waits here for you.">
      <AdminSocialNav />
      {message ? <p className="mb-5 rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-700">{message}</p> : null}

      <section className="mb-6 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-emerald-700" /><h2 className="text-xl font-black text-slate-950">Social Autopilot</h2></div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-emerald-900">
              Daily at 08:30 IST: plans from the weekday content calendar, rotates through published societies and sectors,
              writes grounded drafts, auto-approves <span className="font-black">low-risk</span> posts and publishes them on schedule.
              Medium/high-risk drafts always queue for your review.
            </p>
            {automation?.last_run_at ? (
              <p className="mt-2 text-xs font-bold text-emerald-800">
                Last run {new Date(automation.last_run_at).toLocaleString("en-IN")}
                {summary ? ` — ${summary.generated ?? 0} generated · ${summary.auto_approved ?? 0} auto-approved · ${summary.scheduled ?? 0} scheduled · ${summary.queued_for_review ?? 0} for review${summary.skipped ? ` (skipped: ${summary.skipped})` : ""}` : ""}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button onClick={() => void runNow()} disabled={Boolean(busy)} className="rounded-full bg-emerald-700 hover:bg-emerald-800">
              {busy === "run" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}Run cycle now
            </Button>
            {automation ? (
              <div className="flex flex-wrap justify-end gap-2">
                {([["enabled", "Autopilot"], ["auto_publish_low_risk", "Auto-publish"], ["generate_images", "Images"]] as const).map(([key, label]) => (
                  <button key={key} onClick={() => void toggle(key)} disabled={Boolean(busy)}
                    className={`rounded-full px-3 py-1.5 text-xs font-black ${automation[key] ? "bg-emerald-700 text-white" : "border border-emerald-300 bg-white text-emerald-800"}`}>
                    {label}: {automation[key] ? "ON" : "OFF"}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">Schedule & review queue</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Scheduled low-risk posts publish automatically at their slot. Anything marked medium or high risk stays here until you approve it on AI Drafts.
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
        {!posts.length ? <div className="mt-5 rounded-2xl bg-slate-50 p-8 text-center font-black text-slate-500">Nothing scheduled yet — run an autopilot cycle to fill the calendar.</div> : null}
      </section>
    </AdminLayout>
  );
}
