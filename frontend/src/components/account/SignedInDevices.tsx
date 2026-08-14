import { useCallback, useEffect, useState } from "react";
import { Loader2, LogOut, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchAccountSessions, revokeAccountSession } from "@/lib/accountApi";
import { getCustomerAccountSession } from "@/lib/customerAccount";
import { useAccountSignOut } from "@/hooks/useAccountSignOut";

type Device = {
  id: number;
  device: string | null;
  last_used_at: string | null;
  expires_at: string | null;
  is_current: boolean;
};

function when(value: string | null) {
  if (!value) return "not used yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";

  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return date.toLocaleDateString();
}

/**
 * The devices signed in to this account, and a way to end any of them.
 *
 * Until sessions existed there was nothing to show and nothing to revoke: a token lifted
 * from a phone kept working with no trace it had ever been issued.
 */
export function SignedInDevices() {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [busy, setBusy] = useState(false);
  const signOut = useAccountSignOut();
  const token = getCustomerAccountSession()?.accountAccessToken;

  const load = useCallback(async () => {
    setDevices(await fetchAccountSessions(token));
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const revoke = async (device: Device) => {
    // Ending the device you are holding is a sign out, not a list edit.
    if (device.is_current) return signOut();

    setBusy(true);
    try {
      await revokeAccountSession(token, device.id);
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[17px] font-black text-slate-900">
            <Smartphone className="h-4.5 w-4.5 text-blue-700" />Where you are signed in
          </h2>
          <p className="mt-1 text-[13px] text-slate-500">
            End any device you no longer use. Signing out everywhere is the one to reach for if a phone is lost.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          className="rounded-full border-rose-200 text-rose-700"
          onClick={() => void signOut({ everywhere: true })}
        >
          <LogOut className="mr-1.5 h-3.5 w-3.5" />Sign out everywhere
        </Button>
      </div>

      {devices === null ? (
        <p className="mt-4 flex items-center gap-2 text-[13px] text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />Checking your devices…
        </p>
      ) : devices.length === 0 ? (
        <p className="mt-4 text-[13px] text-slate-500">No other devices are signed in.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {devices.map((device) => (
            <li key={device.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-slate-800">
                  {device.device || "Unrecognised device"}
                  {device.is_current ? <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">This device</span> : null}
                </p>
                <p className="text-[12px] text-slate-500">Last used {when(device.last_used_at)}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                className="rounded-full border-slate-200 text-slate-600"
                onClick={() => void revoke(device)}
              >
                {device.is_current ? "Sign out" : "End session"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
