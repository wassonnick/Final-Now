import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  LockKeyhole,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCustomerAccountSession } from "@/lib/customerAccount";
import { syncAccountToBackend } from "@/lib/accountApi";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AccountRole = "customer" | "broker";

function cleanPhone(value: string) {
  return String(value || "").replace(/\D/g, "").slice(0, 10);
}

function isValidPhone(value: string) {
  return /^[6-9]\d{9}$/.test(cleanPhone(value));
}

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const requestedRole = params.get("role") === "broker" ? "broker" : "customer";
  const nextPath = params.get("next") || "";

  const [role, setRole] = useState<AccountRole>(requestedRole);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const targetPath = useMemo(() => {
    if (nextPath.startsWith("/broker") && role === "broker") return nextPath;
    if ((nextPath.startsWith("/customer") || nextPath.startsWith("/owner")) && role === "customer") {
      return nextPath;
    }

    return role === "broker" ? "/broker/dashboard" : "/customer/dashboard";
  }, [nextPath, role]);

  const submitLogin = (event: FormEvent) => {
    event.preventDefault();

    if (!isValidPhone(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    const cleanMobile = cleanPhone(phone);
    const accountName = name.trim() || (role === "broker" ? "Broker Partner" : "Customer");

    createCustomerAccountSession({
      role,
      phone: cleanMobile,
      name: accountName,
    });

    void syncAccountToBackend({
      role,
      phone: cleanMobile,
      name: accountName,
      source: "login_page",
      meta: {
        temporaryLocalSession: true,
      },
    });

    navigate(targetPath, { replace: true });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7fbff]">
      <section className="border-b border-blue-100 bg-gradient-to-br from-white via-blue-50/80 to-slate-50">
        <div className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
          <Button asChild variant="ghost" className="mb-6 rounded-full text-slate-600">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to SocietyFlats
            </Link>
          </Button>

          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <Badge className="mb-4 rounded-full border-blue-200 bg-white px-4 py-1.5 text-blue-700 shadow-sm">
                Secure account access
              </Badge>
              <h1 className="max-w-2xl text-4xl font-black tracking-[-0.045em] leading-[0.98] text-slate-950 md:text-6xl">
                Login to continue your property journey.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 md:text-lg">
                Customer accounts can search, shortlist, list properties and track leads. Broker accounts can manage partner listings, requirements and commission pipeline.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {[
                  ["Private account", ShieldCheck],
                  ["Lead tracking", Phone],
                  ["Listing history", Building2],
                ].map(([label, Icon]) => {
                  const IconComponent = Icon as typeof ShieldCheck;
                  return (
                    <div key={String(label)} className="flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">
                      <IconComponent className="h-4 w-4 text-blue-600" />
                      {String(label)}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="w-full rounded-[2rem] border border-blue-100 bg-white p-5 shadow-xl shadow-blue-100/60 md:p-7">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <LockKeyhole className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-950">Account login</h2>
                  <p className="text-sm text-slate-500">Temporary login synced to backend account foundation.</p>
                </div>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setRole("customer")}
                  className={cn(
                    "rounded-xl px-4 py-3 text-sm font-bold transition",
                    role === "customer" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500",
                  )}
                >
                  <UserRound className="mr-2 inline h-4 w-4" />
                  Customer
                </button>
                <button
                  type="button"
                  onClick={() => setRole("broker")}
                  className={cn(
                    "rounded-xl px-4 py-3 text-sm font-bold transition",
                    role === "broker" ? "bg-white text-orange-700 shadow-sm" : "text-slate-500",
                  )}
                >
                  <BriefcaseBusiness className="mr-2 inline h-4 w-4" />
                  Broker
                </button>
              </div>

              {error ? (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                  {error}
                </div>
              ) : null}

              <form onSubmit={submitLogin} className="space-y-4">
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-12 rounded-2xl"
                  placeholder="Your name"
                />

                <Input
                  required
                  value={phone}
                  onChange={(event) => setPhone(cleanPhone(event.target.value))}
                  className="h-12 rounded-2xl"
                  placeholder="10-digit mobile number"
                  inputMode="numeric"
                />

                <Button
                  type="submit"
                  className={cn(
                    "h-12 w-full rounded-2xl text-white",
                    role === "broker" ? "bg-orange-600 hover:bg-orange-700" : "bg-blue-700 hover:bg-blue-800",
                  )}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Continue to {role === "broker" ? "Broker Dashboard" : "Customer Dashboard"}
                </Button>
              </form>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                C47 syncs this account to the backend. Full OTP/SMS verification will be enabled after provider wiring.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
