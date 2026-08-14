import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignedInDevices } from "@/components/account/SignedInDevices";
import { getCustomerAccountSession } from "@/lib/customerAccount";
import { setPublicSeo } from "@/lib/seo";

/**
 * One page for the parts of an account that are about the account itself rather than about
 * property — which, for now, means the devices it is signed in on. Every dashboard links
 * here so it is the same page whichever role you hold.
 */
export function AccountSecurityPage() {
  const session = getCustomerAccountSession();

  useEffect(() => {
    setPublicSeo("Your account security | SocietyFlats", "Manage the devices signed in to your SocietyFlats account.");
  }, []);

  const home = session?.role === "broker" ? "/broker/dashboard" : session?.role === "rwa" ? "/rwa/dashboard" : "/customer/dashboard";

  return (
    <main className="ncr-skin min-h-screen bg-[#F8F3EA] px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <Button asChild variant="outline" size="sm" className="rounded-full bg-white">
          <Link to={home}><ArrowLeft className="mr-1.5 h-3.5 w-3.5" />Back to dashboard</Link>
        </Button>

        <h1 className="mt-6 flex items-center gap-2 text-3xl font-black tracking-[-0.03em] text-slate-950">
          <ShieldCheck className="h-6 w-6 text-blue-700" />Account security
        </h1>
        <p className="mt-2 text-slate-600">
          Signed in as {session?.name || session?.phone || "your account"}.
        </p>

        <div className="mt-6">
          <SignedInDevices />
        </div>
      </div>
    </main>
  );
}
