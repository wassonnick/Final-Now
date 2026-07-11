import { useEffect, useState } from "react";
import { CheckCircle2, Copy, ExternalLink, PlugZap } from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { AdminSocialNav } from "./AdminSocialNav";
import { fetchSocialAccounts, startSocialOAuth, type SocialAccount } from "@/lib/socialApi";

function metaPublishMissing(account: SocialAccount) {
  const scopes = account.scopes || [];
  if (account.platform === "facebook_page") return !scopes.includes("pages_manage_posts");
  if (account.platform === "instagram_business") return !scopes.includes("instagram_content_publish");
  return false;
}

function isMetaAccount(account: SocialAccount) {
  return account.platform === "facebook_page" || account.platform === "instagram_business";
}

export function AdminSocialAccountsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [message, setMessage] = useState("");
  const [oauthUrl, setOauthUrl] = useState("");

  const load = async () => setAccounts(await fetchSocialAccounts());
  useEffect(() => { void load().catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load social accounts.")); }, []);

  async function connect(platform: string, mode: "connect" | "publish" = "connect") {
    try {
      const result = await startSocialOAuth(platform, mode);
      if (result.authorization_url) {
        setOauthUrl(result.authorization_url);
        setMessage(mode === "publish"
          ? "Publish-permission OAuth URL generated. Use only after Meta App Review approves publishing permissions."
          : "Connect-only OAuth URL generated. Open it to connect the account without requesting Meta publishing permissions.");
        window.open(result.authorization_url, "_blank", "noopener,noreferrer");
      } else {
        setMessage(result.message || "Manual export mode enabled.");
      }
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start OAuth.");
    }
  }

  return (
    <AdminLayout title="Social Accounts" subtitle="SM2 connects official accounts for approved, manual publishing only. Tokens never reach the frontend.">
      <AdminSocialNav />
      {message ? <p className="mb-5 rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-700">{message}</p> : null}
      {oauthUrl ? (
        <section className="mb-5 rounded-[1.5rem] border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">OAuth URL</h2>
          <p className="mt-2 break-all rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-600">{oauthUrl}</p>
          <Button size="sm" variant="outline" className="mt-3 rounded-full bg-white" onClick={() => void navigator.clipboard?.writeText(oauthUrl)}>
            <Copy className="mr-2 h-4 w-4" />Copy URL
          </Button>
        </section>
      ) : null}

      <section className="rounded-[1.5rem] border bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">Official account connections</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Connect Instagram Business, Facebook Page, LinkedIn and Google Business Profile through OAuth. WhatsApp remains manual export only because the Business API does not publish normal Status updates.
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {accounts.map((account) => {
            const publishMissing = account.status === "connected" && metaPublishMissing(account);

            return (
            <article key={account.id} className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-blue-700">{account.platform.replace(/_/g, " ")}</p>
                  <h3 className="mt-1 text-lg font-black">{account.account_name || account.platform}</h3>
                  <p className="mt-1 text-sm font-bold text-slate-500">Status: {account.status.replace(/_/g, " ")}</p>
                  {publishMissing ? (
                    <p className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                      Connected / Publish not enabled
                    </p>
                  ) : null}
                  {publishMissing ? (
                    <p className="mt-2 text-xs font-bold leading-5 text-amber-800">
                      Meta publish permission is not approved yet. Connect works, publishing requires Meta App Review.
                    </p>
                  ) : null}
                  {account.account_handle ? <p className="mt-1 text-xs font-bold text-slate-500">Handle: {account.account_handle}</p> : null}
                  {account.last_connected_at ? <p className="mt-1 text-xs font-bold text-emerald-700">Connected: {new Date(account.last_connected_at).toLocaleString("en-IN")}</p> : null}
                  {account.last_error ? <p className="mt-2 text-xs font-bold text-rose-700">{account.last_error}</p> : null}
                </div>
                {account.status === "connected" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <PlugZap className="h-5 w-5 text-slate-400" />}
              </div>
              <Button variant="outline" className="mt-4 rounded-full bg-white" onClick={() => void connect(account.platform)}>
                {account.platform === "whatsapp_business" ? "Enable manual export" : <><ExternalLink className="mr-2 h-4 w-4" />Connect OAuth</>}
              </Button>
              {isMetaAccount(account) ? (
                <Button
                  variant="outline"
                  className="ml-2 mt-4 rounded-full bg-white text-amber-700"
                  onClick={() => void connect(account.platform, "publish")}
                  title="Use only after Meta App Review approves publishing permissions."
                >
                  Request publish mode
                </Button>
              ) : null}
            </article>
          );})}
        </div>
      </section>
    </AdminLayout>
  );
}
