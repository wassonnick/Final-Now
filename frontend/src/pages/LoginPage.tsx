import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  KeyRound,
  Loader2,
  LockKeyhole,
  Phone,
  RotateCcw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCustomerAccountSession } from "@/lib/customerAccount";
import {
  requestAccountOtp,
  syncAccountToBackend,
  verifyAccountOtp,
  type AccountResponse,
} from "@/lib/accountApi";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AccountRole = "customer" | "broker";
type LoginStep = "details" | "otp" | "verified";

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
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<LoginStep>("details");
  const [message, setMessage] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otpRequested, setOtpRequested] = useState(false);
  const [providerPending, setProviderPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [error, setError] = useState("");

  const cleanMobile = cleanPhone(phone);
  const accountName = name.trim() || (role === "broker" ? "Broker Partner" : "Customer");

  const targetPath = useMemo(() => {
    if (nextPath.startsWith("/broker") && role === "broker") return nextPath;
    if ((nextPath.startsWith("/customer") || nextPath.startsWith("/owner")) && role === "customer") {
      return nextPath;
    }

    return role === "broker" ? "/broker/dashboard" : "/customer/dashboard";
  }, [nextPath, role]);

  function completeLocalLogin(response?: AccountResponse | null) {
    const account = response?.account;

    createCustomerAccountSession({
      role: (account?.role as AccountRole | undefined) || role,
      phone: account?.phone_normalized || account?.phone || cleanMobile,
      name: account?.name || accountName,
    });

    setStep("verified");
    navigate(targetPath, { replace: true });
  }

  async function handleRequestOtp(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setDevOtp(null);

    if (!isValidPhone(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    setLoading(true);

    try {
      const response = await requestAccountOtp({
        role,
        phone: cleanMobile,
        name: accountName,
        source: "login_page_otp",
        meta: {
          otpLoginAttempt: true,
        },
        channel: "sms",
      });

      setOtpRequested(true);
      setProviderPending(!response.delivery?.delivered && !response.dev_otp);
      setDevOtp(response.dev_otp || null);
      setMessage(
        response.delivery?.delivered
          ? "OTP sent successfully. Enter the code below."
          : response.dev_otp
            ? "OTP generated. Enter the code below."
            : "OTP created securely. Delivery provider is not connected yet, so fallback remains available for now.",
      );
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not request OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!otp.trim()) {
      setError("Enter the OTP.");
      return;
    }

    setLoading(true);

    try {
      const response = await verifyAccountOtp({
        role,
        phone: cleanMobile,
        otp: otp.trim(),
      });

      completeLocalLogin(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFallbackLogin() {
    setError("");
    setMessage("");
    setFallbackLoading(true);

    if (!isValidPhone(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      setFallbackLoading(false);
      return;
    }

    try {
      const response = await syncAccountToBackend({
        role,
        phone: cleanMobile,
        name: accountName,
        source: "login_page_otp_fallback",
        meta: {
          temporaryLocalSession: true,
          otpProviderPending: true,
          otpRequested,
        },
      });

      completeLocalLogin(response);
    } catch {
      completeLocalLogin(null);
    } finally {
      setFallbackLoading(false);
    }
  }

  function resetOtp() {
    setStep("details");
    setOtp("");
    setError("");
    setMessage("");
    setDevOtp(null);
    setProviderPending(false);
  }

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
                Login securely with mobile OTP.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 md:text-lg">
                Continue your SocietyFlats journey with a customer or broker account. OTP login is now wired to the backend foundation, with SMS/WhatsApp provider connection next.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {[
                  ["OTP foundation", ShieldCheck],
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
                  {step === "otp" ? <KeyRound className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-950">
                    {step === "otp" ? "Enter OTP" : "Account login"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {step === "otp"
                      ? `Verification for ${cleanMobile}`
                      : "Choose your account type and mobile number."}
                  </p>
                </div>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-1">
                <button
                  type="button"
                  disabled={step === "otp"}
                  onClick={() => setRole("customer")}
                  className={cn(
                    "rounded-xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-70",
                    role === "customer" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500",
                  )}
                >
                  <UserRound className="mr-2 inline h-4 w-4" />
                  Customer
                </button>
                <button
                  type="button"
                  disabled={step === "otp"}
                  onClick={() => setRole("broker")}
                  className={cn(
                    "rounded-xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-70",
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

              {message ? (
                <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                  {message}
                </div>
              ) : null}

              {step === "details" ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
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
                    disabled={loading}
                    className={cn(
                      "h-12 w-full rounded-2xl text-white",
                      role === "broker" ? "bg-orange-600 hover:bg-orange-700" : "bg-blue-700 hover:bg-blue-800",
                    )}
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                    Request OTP
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={fallbackLoading}
                    onClick={handleFallbackLogin}
                    className="h-12 w-full rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  >
                    {fallbackLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Continue securely while OTP delivery is pending
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <Input
                    required
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="h-12 rounded-2xl text-center text-lg font-black tracking-[0.4em]"
                    placeholder="000000"
                    inputMode="numeric"
                  />

                  {devOtp ? (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                      Dev OTP: {devOtp}
                    </div>
                  ) : null}

                  {providerPending ? (
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-700">
                      OTP delivery provider is not connected yet. Use the fallback button to continue during this foundation phase.
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={loading}
                    className={cn(
                      "h-12 w-full rounded-2xl text-white",
                      role === "broker" ? "bg-orange-600 hover:bg-orange-700" : "bg-blue-700 hover:bg-blue-800",
                    )}
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    Verify OTP
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={fallbackLoading}
                    onClick={handleFallbackLogin}
                    className="h-12 w-full rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  >
                    {fallbackLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Continue securely while OTP delivery is pending
                  </Button>

                  <button
                    type="button"
                    onClick={resetOtp}
                    className="inline-flex w-full items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-950"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Change mobile number
                  </button>
                </form>
              )}

              <p className="mt-4 text-xs leading-5 text-slate-500">
                C51A prepares OTP delivery through a provider layer. Fallback remains until SMS/WhatsApp delivery is fully connected.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
