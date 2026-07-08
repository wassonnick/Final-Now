import { useEffect, useState } from "react";
import { PlugZap } from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { AdminSocialNav } from "./AdminSocialNav";
import { fetchSocialAccounts, type SocialAccount } from "@/lib/socialApi";

export function AdminSocialAccountsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchSocialAccounts().then(setAccounts).catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load social accounts."));
  }, []);

  return (
    <AdminLayout title="Social Accounts" subtitle="Future connection foundation. SM1A stores no frontend tokens and does not publish.">
      <AdminSocialNav />
      {message ? <p className="mb-5 rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-700">{message}</p> : null}

      <section className="rounded-[1.5rem] border bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">Connection placeholders</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          These rows prepare Instagram, Facebook, LinkedIn, Google Business and WhatsApp workflows for SM2. Tokens are intentionally hidden from the API response.
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {accounts.map((account) => (
            <article key={account.id} className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-blue-700">{account.platform.replace(/_/g, " ")}</p>
                  <h3 className="mt-1 text-lg font-black">{account.account_name || account.platform}</h3>
                  <p className="mt-1 text-sm font-bold text-slate-500">Status: {account.status.replace(/_/g, " ")}</p>
                </div>
                <PlugZap className="h-5 w-5 text-slate-400" />
              </div>
              <Button disabled variant="outline" className="mt-4 rounded-full bg-white">Connect in SM2</Button>
            </article>
          ))}
        </div>
      </section>
    </AdminLayout>
  );
}
