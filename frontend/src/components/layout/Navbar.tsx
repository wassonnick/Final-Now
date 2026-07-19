// Premium light chrome: calm neutral navigation with contextual module groups,
// an app-like bottom tab bar and a complete Services directory on mobile.
// directory sheet on mobile. All routes unchanged; every public module is reachable
// from every page in at most two taps.
// C85/C71/C70C history: owner CTA remains List Your Flat; broker labels unchanged.
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Search, Menu, X, Heart, Scale, MapPin, Building2, Sparkles, BarChart3, User, Home,
  KeyRound, BadgeIndianRupee, Globe2, LayoutGrid, MessageCircle, Calculator, Landmark,
  ShieldCheck, LifeBuoy, Gift, Briefcase, Layers, ChevronDown, Phone,
} from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/button';
import { BRAND_PHONE_DISPLAY, BRAND_PHONE_HREF } from '@/config/contact';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { CUSTOMER_ACCOUNT_EVENT } from "@/lib/customerAccount";
import { fetchPublicSocieties, formatPublicLocation, suggestSocieties } from '@/lib/publicData';

type ModuleLink = { label: string; href: string; icon: any; hint?: string; badge?: number };
type ModuleGroup = { key: string; label: string; links: ModuleLink[] };

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [accountDashboardPath, setAccountDashboardPath] = useState("");
  const [headerQuery, setHeaderQuery] = useState("");

  useEffect(() => {
    const syncAccountPath = () => {
      try {
        const raw = window.localStorage.getItem("sf_account_session");
        const parsed = raw ? JSON.parse(raw) : null;
        const role = String(parsed?.role || "");
        setAccountDashboardPath(
          role === "broker" ? "/broker/dashboard" : role === "customer" ? "/customer/dashboard" : "",
        );
      } catch {
        setAccountDashboardPath("");
      }
    };

    syncAccountPath();
    window.addEventListener("focus", syncAccountPath);
    window.addEventListener("storage", syncAccountPath);
    window.addEventListener(CUSTOMER_ACCOUNT_EVENT, syncAccountPath);

    return () => {
      window.removeEventListener("focus", syncAccountPath);
      window.removeEventListener("storage", syncAccountPath);
      window.removeEventListener(CUSTOMER_ACCOUNT_EVENT, syncAccountPath);
    };
  }, [location.pathname]);

  useEffect(() => {
    setIsMenuOpen(false);
    setServicesOpen(false);
    setOpenGroup(null);
  }, [location.pathname, location.search]);

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [headerSocieties, setHeaderSocieties] = useState<any[]>([]);
  const [showHeaderSuggestions, setShowHeaderSuggestions] = useState(false);
  const { compareList, shortlist, isAuthenticated, user } = useAppStore();

  useEffect(() => {
    let active = true;
    fetchPublicSocieties()
      .then((items) => active && setHeaderSocieties(items))
      .catch(() => active && setHeaderSocieties([]));
    return () => {
      active = false;
    };
  }, []);

  const headerSuggestions = useMemo(
    () => suggestSocieties(headerSocieties, headerQuery),
    [headerSocieties, headerQuery],
  );

  const moduleGroups: ModuleGroup[] = [
    {
      key: 'find', label: 'Find', links: [
        { label: 'Societies', href: '/search?tab=societies', icon: Building2, hint: 'Verified profiles' },
        { label: 'Rent', href: '/search?tab=rent', icon: KeyRound, hint: 'Verified homes' },
        { label: 'Buy', href: '/search?tab=buy', icon: Home, hint: 'Resale options' },
        { label: 'Builder floors', href: '/builder-floors', icon: Layers, hint: 'Independent living' },
        { label: 'Live map', href: '/maps', icon: MapPin, hint: '43 verified pins' },
      ],
    },
    {
      key: 'tools', label: 'Tools', links: [
        { label: 'AI Advisor', href: '/ai-advisor', icon: Sparkles, hint: 'Grounded shortlists' },
        { label: 'Compare', href: '/compare', icon: Scale, hint: 'Side by side', badge: compareList.length },
        { label: 'Investment calculator', href: '/investment-calculator', icon: Calculator, hint: 'Yield and EMI' },
        { label: 'Market insights', href: '/insights', icon: BarChart3, hint: 'Rent trends' },
        { label: 'Live chat', href: '/chat', icon: MessageCircle, hint: 'Human help' },
      ],
    },
    {
      key: 'services', label: 'Services', links: [
        { label: 'NRI management & sales', href: '/nri-services', icon: Globe2, hint: 'Buy, sell, rent out from abroad' },
        { label: 'RWA and builder portal', href: '/builder-portal', icon: Landmark, hint: 'Claim your society' },
        { label: 'Trust and safety', href: '/trust', icon: ShieldCheck, hint: 'How we verify' },
        { label: 'Help center', href: '/help', icon: LifeBuoy, hint: 'FAQs and contact' },
      ],
    },
    {
      key: 'partner', label: 'Partner', links: [
        { label: 'Refer and earn', href: '/referrals', icon: Gift, hint: 'Reward on conversion' },
        { label: 'Broker CRM', href: '/broker-crm', icon: Briefcase, hint: 'Verified inventory' },
        { label: 'List your flat', href: '/sell', icon: BadgeIndianRupee, hint: 'Owner listing' },
      ],
    },
  ];

  return (
    <>
    <header className="sticky top-0 z-50 w-full border-b border-[#DDD7CC] bg-[#FBFAF7]/95 shadow-[0_8px_30px_-28px_rgba(17,24,39,.35)] backdrop-blur-xl">
      <div className="mx-auto flex h-[64px] max-w-[1360px] items-center justify-between gap-3 px-4 sm:gap-5 lg:h-[68px] lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2 rounded-lg focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3156A3] focus-visible:ring-offset-2 lg:gap-[9px]" aria-label="SocietyFlats home">
          <BrandMark size={30} className="rounded-[9px]" />
          <span className="font-display text-[19px] font-medium tracking-[-0.01em] text-[#111827] lg:text-[21px]">
            SocietyFlats
          </span>
        </Link>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            setShowHeaderSuggestions(false);
            navigate(`/search?tab=societies&q=${encodeURIComponent(headerQuery.trim())}`);
          }}
          className="relative hidden min-w-[240px] max-w-[420px] flex-1 items-center gap-[9px] rounded-full border border-[#D8DFEC] bg-white px-[14px] py-[8px] lg:flex"
        >
          <Search className="h-4 w-4 text-[#3156A3]" />
          <input
            value={headerQuery}
            onChange={(event) => {
              setHeaderQuery(event.target.value);
              setShowHeaderSuggestions(true);
            }}
            onFocus={() => { setIsSearchFocused(true); setShowHeaderSuggestions(true); }}
            onBlur={() => { setIsSearchFocused(false); setTimeout(() => setShowHeaderSuggestions(false), 120); }}
            onKeyDown={(event) => { if (event.key === "Escape") setShowHeaderSuggestions(false); }}
            placeholder="Search society, sector or builder"
            className="search-bare-input min-w-0 flex-1 bg-transparent text-sm font-normal text-[#25302B] outline-none placeholder:text-[#8A8478]"
          />
          <span className={cn("h-2 w-2 rounded-full transition", isSearchFocused ? "bg-[#B4975A]" : "bg-transparent")} />
          {showHeaderSuggestions && headerQuery.trim() && headerSuggestions.length > 0 ? (
            <ul className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-72 overflow-y-auto rounded-2xl border border-[#E7DCCB] bg-white p-1.5 shadow-lg">
              {headerSuggestions.map((society) => (
                <li key={society.id}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setShowHeaderSuggestions(false);
                      setHeaderQuery("");
                      navigate(`/search?tab=societies&q=${encodeURIComponent(society.name)}`);
                    }}
                    className="flex w-full flex-col rounded-xl px-3 py-2 text-left hover:bg-[#F8F3EA]"
                  >
                    <span className="text-sm font-semibold text-[#25302B]">{society.name}</span>
                    <span className="text-xs text-[#6E756E]">{formatPublicLocation(society)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </form>

        <nav className="hidden items-center gap-1 xl:flex" aria-label="Modules">
          {moduleGroups.map((group) => (
            <div key={group.key} className="relative" onMouseEnter={() => setOpenGroup(group.key)} onMouseLeave={() => setOpenGroup((current) => (current === group.key ? null : current))}>
              <button
                type="button"
                onClick={() => setOpenGroup(openGroup === group.key ? null : group.key)}
                aria-expanded={openGroup === group.key}
                className={cn(
                  "flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold transition-colors",
                  openGroup === group.key ? "bg-[#EEF2FA] text-[#233B6E]" : "text-[#475467] hover:bg-white hover:text-[#111827]",
                )}
              >
                {group.label}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {openGroup === group.key ? (
                <div className="absolute right-0 top-[calc(100%+6px)] z-40 w-[264px] rounded-2xl border border-[#E7DCCB] bg-white p-1.5 shadow-xl">
                  {group.links.map((link) => (
                    <Link key={link.href} to={link.href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[#F8F3EA]">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[#EEF2FA] text-[#3156A3]"><link.icon className="h-4 w-4" /></span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 text-sm font-semibold text-[#25302B]">
                          {link.label}
                          {link.badge && link.badge > 0 ? <span className="rounded-full bg-[#233B6E] px-1.5 py-0.5 text-[10px] font-bold text-white">{link.badge}</span> : null}
                        </span>
                        {link.hint ? <span className="block text-xs text-[#8A8478]">{link.hint}</span> : null}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/shortlist" className="relative rounded-full p-2.5 transition-colors hover:bg-[#EEF2FA] lg:hidden">
            <Heart className="h-5 w-5 text-[#233B6E]" />
            {shortlist.length > 0 && <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-[#B4975A] text-[10px] font-bold text-white">{shortlist.length}</span>}
          </Link>

          {/* Helpline is shown on every page: tappable icon on mobile, full number on desktop. */}
          <a
            href={BRAND_PHONE_HREF}
            className="inline-flex items-center gap-1.5 rounded-full p-2.5 text-[#233B6E] transition-colors hover:bg-[#EEF2FA] lg:h-auto lg:border lg:border-[#D8DFEC] lg:px-3 lg:py-[9px] lg:text-[13.5px] lg:font-bold"
            aria-label={`Call SocietyFlats on ${BRAND_PHONE_DISPLAY}`}
          >
            <Phone className="h-5 w-5 lg:h-3.5 lg:w-3.5" />
            <span className="hidden lg:inline">{BRAND_PHONE_DISPLAY}</span>
          </a>

          <Link to="/sell" className="hidden lg:block"><Button size="sm" className="h-auto rounded-full bg-[#233B6E] px-4 py-[9px] text-[13.5px] font-bold text-white shadow-none hover:bg-[#1B2E57]">List Your Flat</Button></Link>
          <button
            type="button"
            onClick={() => navigate(accountDashboardPath || '/signup')}
            className="hidden h-9 w-9 items-center justify-center rounded-full bg-[#EEF2FA] text-[13px] font-bold text-[#233B6E] lg:flex"
            aria-label={accountDashboardPath ? "Open dashboard" : "Open account"}
          >
            {isAuthenticated && user?.first_name ? String(user.first_name).slice(0, 2).toUpperCase() : <User className="h-4 w-4" />}
          </button>
          <button className="rounded-full p-2 text-[#233B6E] transition-colors hover:bg-[#EEF2FA] xl:hidden" aria-label="Open menu" onClick={() => setIsMenuOpen(!isMenuOpen)}>{isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="border-t border-[#DDD7CC] bg-[#FBFAF7] xl:hidden">
          <div className="container mx-auto space-y-4 px-4 py-4">
            {moduleGroups.map((group) => (
              <div key={group.key}>
                <p className="px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8B6B32]">{group.label}</p>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  {group.links.map((link) => (
                    <Link key={link.href} to={link.href} className="flex items-center gap-2.5 rounded-xl border border-[#E7E2D9] bg-white px-3 py-2.5 text-[#1D2939]" onClick={() => setIsMenuOpen(false)}>
                      <link.icon className="h-4 w-4 shrink-0 text-[#3156A3]" />
                      <span className="truncate text-[13px] font-semibold">{link.label}</span>
                      {link.badge && link.badge > 0 ? <span className="ml-auto rounded-full bg-[#233B6E] px-1.5 text-[10px] font-bold text-white">{link.badge}</span> : null}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full rounded-full border-[#D8DFEC] bg-white text-[#233B6E] hover:bg-[#EEF2FA]" onClick={() => { navigate(accountDashboardPath || '/signup'); setIsMenuOpen(false); }}>
              {accountDashboardPath ? "Dashboard" : "Login"}
            </Button>
          </div>
        </div>
      )}
    </header>

    <nav className="fixed bottom-[calc(0.65rem+env(safe-area-inset-bottom))] left-3 right-3 z-50 rounded-[1.25rem] border border-[#D8DFEC] bg-white/95 p-2 shadow-[0_20px_50px_-20px_rgba(17,24,39,.32)] backdrop-blur-xl xl:hidden" aria-label="Primary">
      <div className="grid grid-cols-5 gap-1">
        {[
          { label: 'Home', href: '/', icon: Home },
          { label: 'Explore', href: '/search?tab=societies', icon: Search },
          { label: 'Assistant', href: '/ai-advisor', icon: Sparkles },
          { label: 'Services', href: '#services', icon: LayoutGrid, badge: compareList.length },
          { label: 'Account', href: accountDashboardPath || '/signup', icon: User },
        ].map((action) => {
          const Icon = action.icon;
          const isServices = action.label === 'Services';
          const isSignature = action.label === 'Assistant';
          const isActive = !isServices && location.pathname === action.href.split('?')[0];
          const className = cn(
            'relative flex w-full flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-semibold transition',
            isSignature ? 'bg-[#233B6E] text-white' : isActive ? 'bg-[#EEF2FA] text-[#233B6E]' : 'text-[#667085]',
          );
          const inner = (
            <>
              <Icon className="mb-1 h-4 w-4" />
              {action.label}
              {action.badge && action.badge > 0 ? (
                <span className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#B4975A] px-1 text-[9px] font-bold text-white">{action.badge}</span>
              ) : null}
            </>
          );
          return isServices ? (
            <button key={action.label} type="button" className={className} onClick={() => setServicesOpen(true)}>{inner}</button>
          ) : (
            <Link key={action.label} to={action.href} className={className}>{inner}</Link>
          );
        })}
      </div>
    </nav>

    {servicesOpen ? (
      <div className="fixed inset-0 z-[95] flex flex-col justify-end bg-black/50 xl:hidden" role="dialog" aria-modal="true" aria-label="All services">
        <button type="button" className="flex-1" aria-label="Close services" onClick={() => setServicesOpen(false)} />
        <div className="max-h-[80vh] overflow-y-auto rounded-t-[20px] bg-[#FAF8F2] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-[19px] font-medium text-[#111827]">Everything SocietyFlats does</p>
            <button type="button" onClick={() => setServicesOpen(false)} aria-label="Close" className="rounded-full border border-[#E7DCCB] bg-white p-2 text-[#25302B]"><X className="h-4 w-4" /></button>
          </div>
          {moduleGroups.map((group) => (
            <div key={group.key} className="mb-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7A5E1E]">{group.label}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {group.links.map((link) => (
                  <Link key={link.href} to={link.href} onClick={() => setServicesOpen(false)} className="flex items-start gap-2.5 rounded-2xl border border-[#E7DCCB] bg-white p-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#EEF2FA] text-[#3156A3]"><link.icon className="h-4 w-4" /></span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-[13px] font-bold text-[#25302B]">
                        {link.label}
                        {link.badge && link.badge > 0 ? <span className="rounded-full bg-[#233B6E] px-1.5 text-[10px] font-bold text-white">{link.badge}</span> : null}
                      </span>
                      {link.hint ? <span className="block text-[11px] leading-4 text-[#8A8478]">{link.hint}</span> : null}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : null}
    </>
  );
}
