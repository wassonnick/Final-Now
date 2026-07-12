import { useEffect, useState } from "react";
import { CheckCircle2, Copy, ExternalLink, PlugZap } from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { AdminSocialNav } from "./AdminSocialNav";
import {
  fetchMetaPageAccessDebug,
  fetchMetaPublishReviewUrl,
  fetchSocialAccounts,
  selectMetaPage,
  startSocialOAuth,
  type MetaDebugPage,
  type MetaPageAccessDebug,
  type SocialAccount,
} from "@/lib/socialApi";

type MetaPageOption = {
  id?: string;
  name?: string;
  username?: string;
};

function metaPublishMissing(account: SocialAccount) {
  const scopes = account.scopes || [];
  if (account.platform === "facebook_page") return !scopes.includes("pages_manage_posts");
  if (account.platform === "instagram_business") return !scopes.includes("instagram_content_publish");
  return false;
}

function isMetaAccount(account: SocialAccount) {
  return account.platform === "facebook_page" || account.platform === "instagram_business";
}

function hasPublishScope(account: SocialAccount, scope: string) {
  return Boolean(account.scopes?.includes(scope));
}

function publishEnabled(account: SocialAccount) {
  return Boolean(account.metadata?.publish_enabled);
}

function metaDebugPages(debug: MetaPageAccessDebug | null): MetaDebugPage[] {
  if (!debug) return [];

  return debug.businesses.flatMap((business) => [...business.owned_pages, ...business.client_pages]);
}

function societyFlatsDebugPage(debug: MetaPageAccessDebug | null): MetaDebugPage | undefined {
  return metaDebugPages(debug).find((page) => page.name.trim().toLowerCase() === "society flats");
}

export function AdminSocialAccountsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [message, setMessage] = useState("");
  const [oauthUrl, setOauthUrl] = useState("");
  const [selectedPageId, setSelectedPageId] = useState("");
  const [manualPageId, setManualPageId] = useState("");
  const [manualPageName, setManualPageName] = useState("");
  const [manualInstagramId, setManualInstagramId] = useState("");
  const [manualInstagramHandle, setManualInstagramHandle] = useState("");
  const [metaDebug, setMetaDebug] = useState<MetaPageAccessDebug | null>(null);

  const load = async () => setAccounts(await fetchSocialAccounts());
  useEffect(() => { void load().catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load social accounts.")); }, []);

  async function connect(platform: string, mode: "connect" | "publish" = "connect") {
    try {
      const result = await startSocialOAuth(platform, mode);
      if (result.authorization_url) {
        setOauthUrl(result.authorization_url);
        setMessage(mode === "publish"
          ? "Publish-authorization opened. Approve pages_manage_posts + instagram_content_publish on Meta's screen to enable publishing."
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

  async function requestMetaPublishReview() {
    try {
      const result = await fetchMetaPublishReviewUrl();
      if (result.authorization_url) {
        setOauthUrl(result.authorization_url);
        setMessage("Meta consent opened in a new tab. Approve pages_manage_posts and instagram_content_publish, then return here — the badge flips to Publish enabled once granted.");
        window.open(result.authorization_url, "_blank", "noopener,noreferrer");
      }
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to generate Meta publish review URL.");
    }
  }

  async function chooseMetaPage() {
    if (!selectedPageId) {
      setMessage("Choose a Facebook Page to connect.");
      return;
    }

    try {
      await selectMetaPage(selectedPageId);
      setMessage("Facebook Page selected. Instagram Business account was connected too if Meta returned one.");
      setSelectedPageId("");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to select Facebook Page.");
    }
  }

  async function saveManualMetaPage() {
    if (!manualPageId.trim() || !manualPageName.trim()) {
      setMessage("Enter both Facebook Page ID and Page name before saving the manual fallback.");
      return;
    }
    if ((manualInstagramId.trim() && !manualInstagramHandle.trim()) || (!manualInstagramId.trim() && manualInstagramHandle.trim())) {
      setMessage("Enter both Instagram ID and Instagram handle, or leave both blank.");
      return;
    }

    try {
      await selectMetaPage(manualPageId.trim(), {
        page_name: manualPageName.trim(),
        manual_fallback_confirmed: true,
        instagram_id: manualInstagramId.trim() || undefined,
        instagram_handle: manualInstagramHandle.trim() || undefined,
      });
      setMessage("Facebook Page saved manually. Publishing remains disabled until Meta publish permissions are approved.");
      setManualPageId("");
      setManualPageName("");
      setManualInstagramId("");
      setManualInstagramHandle("");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save manual Facebook Page.");
    }
  }

  async function checkMetaPageAccess() {
    try {
      const result = await fetchMetaPageAccessDebug();
      setMetaDebug(result);
      const fallbackCount = result.businesses.reduce((sum, business) => sum + business.owned_pages_count + business.client_pages_count, 0);
      setMessage(`Meta diagnostic completed. /me/accounts pages: ${result.pages_count_from_me_accounts}. Business asset pages: ${fallbackCount}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to check Meta Page access.");
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
            const publishMissing = ["connected", "connected_manual_page"].includes(account.status) && metaPublishMissing(account);
            const accountPublishEnabled = publishEnabled(account);
            const availablePages = account.platform === "facebook_page" && Array.isArray(account.metadata?.available_pages)
              ? (account.metadata.available_pages as MetaPageOption[])
              : [];
            const fallbackSocietyFlatsPage = societyFlatsDebugPage(metaDebug);
            const canSelectFacebookPage = account.platform === "facebook_page" && ["pending_page_selection", "connected_no_pages"].includes(account.status);

            return (
            <article key={account.id} className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-blue-700">{account.platform.replace(/_/g, " ")}</p>
                  <h3 className="mt-1 text-lg font-black">{account.account_name || account.platform}</h3>
                  <p className="mt-1 text-sm font-bold text-slate-500">Status: {account.status.replace(/_/g, " ")}</p>
                  {["connected", "connected_manual_page"].includes(account.status) ? (
                    <p className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                      Connected
                    </p>
                  ) : null}
                  {publishMissing ? (
                    <p className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                      Connected / Publish not enabled
                    </p>
                  ) : null}
                  {isMetaAccount(account) && account.metadata?.publish_review_requested ? (
                    <p className="mt-2 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-800">
                      Publish review requested
                    </p>
                  ) : null}
                  {account.platform === "facebook_page" && (hasPublishScope(account, "pages_manage_posts") || account.metadata?.facebook_publish_scope_granted) ? (
                    <p className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                      Facebook publish permission granted
                    </p>
                  ) : null}
                  {account.platform === "instagram_business" && (hasPublishScope(account, "instagram_content_publish") || account.metadata?.instagram_publish_scope_granted) ? (
                    <p className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                      Instagram publish permission granted
                    </p>
                  ) : null}
                  {accountPublishEnabled ? (
                    <p className="mt-2 inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
                      Publish enabled
                    </p>
                  ) : null}
                  {publishMissing ? (
                    account.platform === "instagram_business" ? (
                      <p className="mt-2 text-xs font-bold leading-5 text-amber-800">
                        Instagram publishing runs through the connected Facebook Page token. Enable it by adding the <span className="font-black">Instagram</span> product + <span className="font-black">instagram_content_publish</span> to your Meta app, then set <span className="font-black">META_FB_PUBLISH_SCOPES=pages_manage_posts,instagram_content_publish</span> in Render and re-run <span className="font-black">Authorize publishing</span> on the Facebook account.
                      </p>
                    ) : (
                      <p className="mt-2 text-xs font-bold leading-5 text-amber-800">
                        Click <span className="font-black">Authorize publishing</span> below and approve <span className="font-black">pages_manage_posts</span> on Meta&rsquo;s screen. If you are an admin/developer/tester on the Meta app this works immediately — no App Review needed for your own Page.
                      </p>
                    )
                  ) : null}
                  {account.account_handle ? <p className="mt-1 text-xs font-bold text-slate-500">Handle: {account.account_handle}</p> : null}
                  {account.account_id ? <p className="mt-1 text-xs font-bold text-slate-500">Account ID: {account.account_id}</p> : null}
                  {account.last_connected_at ? <p className="mt-1 text-xs font-bold text-emerald-700">Connected: {new Date(account.last_connected_at).toLocaleString("en-IN")}</p> : null}
                  {account.last_error ? <p className="mt-2 text-xs font-bold text-rose-700">{account.last_error}</p> : null}
                  {account.platform === "instagram_business" && account.status !== "connected" && account.metadata?.message ? (
                    <p className="mt-2 text-xs font-bold text-slate-600">{String(account.metadata.message)}</p>
                  ) : null}
                </div>
                {["connected", "connected_manual_page"].includes(account.status) ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <PlugZap className="h-5 w-5 text-slate-400" />}
              </div>
              {canSelectFacebookPage ? (
                <div className="mt-4 rounded-2xl border border-blue-100 bg-white p-3">
                  <p className="text-sm font-black text-slate-900">Select Facebook Page</p>
                  {availablePages.length ? (
                    <>
                      <p className="mt-1 text-xs font-bold leading-5 text-slate-600">
                        Choose one of the Pages Meta returned for this connection.
                      </p>
                      <select
                        className="mt-3 w-full rounded-xl border bg-white px-3 py-2 text-sm font-bold text-slate-700"
                        value={selectedPageId}
                        onChange={(event) => setSelectedPageId(event.target.value)}
                      >
                        <option value="">Select a Page</option>
                        {availablePages.map((page) => (
                          <option key={page.id} value={page.id}>
                            {page.name}{page.id ? ` · ${page.id}` : ""}{page.username ? ` (@${page.username})` : ""}
                          </option>
                        ))}
                      </select>
                      <Button size="sm" className="mt-3 rounded-full" onClick={() => void chooseMetaPage()}>
                        Connect selected Page
                      </Button>
                    </>
                  ) : (
                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-black text-amber-950">Enter Facebook Page ID manually</p>
                      <p className="mt-2 text-xs font-bold leading-5 text-amber-900">
                        Use only a Page you own/admin. Publishing will remain disabled until Meta permissions are approved.
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                          Facebook Page ID
                          <input
                            className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-800"
                            value={manualPageId}
                            onChange={(event) => setManualPageId(event.target.value)}
                            placeholder="Page ID"
                          />
                        </label>
                        <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                          Page name
                          <input
                            className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-800"
                            value={manualPageName}
                            onChange={(event) => setManualPageName(event.target.value)}
                            placeholder="Society Flats"
                          />
                        </label>
                      </div>
                      <div className="mt-4 rounded-xl border border-amber-100 bg-white/70 p-3">
                        <p className="text-xs font-black uppercase tracking-wide text-amber-900">Optional Instagram Business asset</p>
                        <p className="mt-1 text-xs font-bold leading-5 text-amber-800">
                          Add this only when you have verified the Instagram Business ID and handle in Meta.
                        </p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Instagram ID
                            <input
                              className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-800"
                              value={manualInstagramId}
                              onChange={(event) => setManualInstagramId(event.target.value)}
                              placeholder="17841461958211646"
                            />
                          </label>
                          <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Instagram handle
                            <input
                              className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-800"
                              value={manualInstagramHandle}
                              onChange={(event) => setManualInstagramHandle(event.target.value)}
                              placeholder="societyflats"
                            />
                          </label>
                        </div>
                      </div>
                      <Button size="sm" className="mt-3 rounded-full" onClick={() => void saveManualMetaPage()}>
                        Save as connected page
                      </Button>
                    </div>
                  )}
                </div>
              ) : null}
              {account.platform === "facebook_page" && account.status === "connected_no_pages" ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-black text-amber-900">Meta connected, but no Facebook Pages were returned.</p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-xs font-bold leading-5 text-amber-900">
                    <li>Facebook profile must have full access to the Society Flats Page.</li>
                    <li>Facebook profile must have access to the SocietyFlats Meta app.</li>
                    <li>Remove old SocietyFlats app from Facebook Business Integrations.</li>
                    <li>Reconnect and choose Edit settings if shown.</li>
                    <li>Instagram should be connected to the selected Facebook Page.</li>
                  </ul>
                  <Button size="sm" variant="outline" className="mt-3 rounded-full bg-white" onClick={() => void checkMetaPageAccess()}>
                    Check Meta Page Access
                  </Button>
                  {metaDebug ? (
                    <div className="mt-3 rounded-xl bg-white p-3 text-xs font-bold text-slate-700">
                      <p>Granted scopes: {metaDebug.granted_scopes?.join(", ") || "none returned"}</p>
                      {metaDebug.business_management_required ? (
                        <p className="mt-2 rounded-lg bg-amber-100 p-2 text-amber-900">
                          {metaDebug.business_management_message || "Business Portfolio lookup requires Meta business_management permission. Reconnect Meta after adding this scope."}
                        </p>
                      ) : null}
                      <p className="mt-1">Meta profile: {metaDebug.me?.name || "not returned"}</p>
                      <p className="mt-1">/me/accounts pages: {metaDebug.pages_count_from_me_accounts}</p>
                      <p className="mt-1">Business portfolios: {metaDebug.businesses_count}</p>
                      {metaDebug.last_error ? <p className="mt-1 text-rose-700">Last error: {metaDebug.last_error}</p> : null}
                      {fallbackSocietyFlatsPage ? (
                        <Button size="sm" className="mt-3 rounded-full" onClick={() => void selectMetaPage(fallbackSocietyFlatsPage.id).then(load).then(() => setMessage("Society Flats connected from Meta Business assets."))}>
                          Connect Society Flats
                        </Button>
                      ) : null}
                      {metaDebug.businesses.length ? (
                        <div className="mt-3 space-y-3">
                          {metaDebug.businesses.map((business) => (
                            <div key={business.id} className="rounded-lg border p-2">
                              <p className="text-slate-900">{business.name}</p>
                              <p className="text-slate-500">Owned pages: {business.owned_pages_count} · Client pages: {business.client_pages_count}</p>
                              {[...business.owned_pages, ...business.client_pages].map((page) => (
                                <div key={`${business.id}-${page.id}`} className="mt-2 rounded-lg bg-slate-50 p-2">
                                  <p>{page.name}{page.username ? ` (@${page.username})` : ""}</p>
                                  <p className="text-slate-500">Tasks: {page.tasks?.join(", ") || "none returned"}</p>
                                  <p className="text-slate-500">
                                    Instagram: {page.has_instagram_business_account ? page.instagram_username || "connected" : "not connected"}
                                  </p>
                                  <Button size="sm" variant="outline" className="mt-2 rounded-full bg-white" onClick={() => void selectMetaPage(page.id).then(load).then(() => setMessage(`${page.name} connected from Meta Business assets.`))}>
                                    Connect this Page
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <Button variant="outline" className="mt-4 rounded-full bg-white" onClick={() => void connect(account.platform)}>
                {account.platform === "whatsapp_business" ? "Enable manual export" : <><ExternalLink className="mr-2 h-4 w-4" />Connect OAuth</>}
              </Button>
              {isMetaAccount(account) ? (
                <Button
                  variant="outline"
                  className="ml-2 mt-4 rounded-full bg-white text-amber-700"
                  onClick={() => void requestMetaPublishReview()}
                  title="Opens Meta's consent screen requesting pages_manage_posts + instagram_content_publish. Approve both to enable publishing."
                >
                  Authorize publishing
                </Button>
              ) : null}
            </article>
          );})}
        </div>
      </section>
      <MetaAppReviewChecklist accounts={accounts} />
    </AdminLayout>
  );
}

function checklistStatus(ok: boolean) {
  return ok ? "Ready" : "Needs setup";
}

function MetaAppReviewChecklist({ accounts }: { accounts: SocialAccount[] }) {
  const facebook = accounts.find((account) => account.platform === "facebook_page");
  const instagram = accounts.find((account) => account.platform === "instagram_business");
  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.societyflats.com";
  const redirectUri = "https://final-now.onrender.com/api/admin/social/oauth/callback";
  const facebookGrant = Boolean(facebook?.scopes?.includes("pages_manage_posts") || facebook?.metadata?.facebook_publish_scope_granted);
  const instagramGrant = Boolean(instagram?.scopes?.includes("instagram_content_publish") || instagram?.metadata?.instagram_publish_scope_granted);

  const rows = [
    ["App ID present", "Configured in Render META_CLIENT_ID"],
    ["Redirect URI present", redirectUri],
    ["Privacy Policy URL", `${origin}/privacy`],
    ["Terms URL", `${origin}/terms`],
    ["Data Deletion URL", `${origin}/privacy#data-deletion`],
    ["Facebook Page connected", facebook?.account_id ? `${facebook.account_name} · ${facebook.account_id}` : "Needs connection"],
    ["Instagram connected", instagram?.account_id ? `${instagram.account_handle ? `@${instagram.account_handle}` : instagram.account_name} · ${instagram.account_id}` : "Needs connection"],
    ["pages_manage_posts status", checklistStatus(facebookGrant)],
    ["instagram_content_publish status", checklistStatus(instagramGrant)],
  ];

  return (
    <section className="mt-5 rounded-[1.5rem] border bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black">Meta publishing checklist</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        <span className="font-black">Facebook:</span> be an admin/developer/tester on the Meta app, click <span className="font-black">Authorize publishing</span> above, approve pages_manage_posts — works immediately, no App Review for your own Page.
        {" "}<span className="font-black">Instagram:</span> add the Instagram product + instagram_content_publish to the Meta app, then append instagram_content_publish to META_FB_PUBLISH_SCOPES and reauthorize (IG publishes through the Page token).
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-2xl border bg-slate-50 p-3">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 break-words text-sm font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
        <p className="font-black">Test video instructions</p>
        <p className="mt-1">
          Show admin login, Social Accounts, connected Society Flats Facebook Page and @societyflats Instagram account, an approved social post, final publish confirmation, and the safety block when publish permission or approved media is missing.
        </p>
        <p className="mt-3 font-black">Review notes copy</p>
        <p className="mt-1">
          SocietyFlats uses Meta publishing permissions only for admin-approved posts to official Society Flats Facebook and Instagram assets. No user-generated or AI draft content is auto-published. Tokens are stored encrypted and never exposed to the frontend.
        </p>
      </div>
    </section>
  );
}
