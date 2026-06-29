// C85 public navbar polish: cleaner desktop/mobile nav spacing and CTA hierarchy, routes unchanged.
// C71 nav copy: owner CTA now uses List Your Flat and broker label remains clean.
// C70C nav copy: clearer public CTAs for broker partnership and dashboard access.
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Menu, X, Heart, Scale, MapPin, Building2, Sparkles, BarChart3, User, Home, KeyRound, BadgeIndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { CUSTOMER_ACCOUNT_EVENT } from "@/lib/customerAccount";
import { fetchPublicSocieties, formatPublicLocation, suggestSocieties } from '@/lib/publicData';

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [accountDashboardPath, setAccountDashboardPath] = useState("");
  const [headerQuery, setHeaderQuery] = useState("");

  useEffect(() => {
    const syncAccountPath = () => {
      try {
        const raw = window.localStorage.getItem("sf_account_session");
        const parsed = raw ? JSON.parse(raw) : null;
        const role = String(parsed?.role || "");
        setAccountDashboardPath(
          role === "broker"
            ? "/broker/dashboard"
            : role === "customer"
              ? "/customer/dashboard"
              : "",
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

  const navLinks = [
    { label: 'Societies', href: '/search?tab=societies', icon: Building2 },
    { label: 'Rent', href: '/search?tab=rent', icon: KeyRound },
    { label: 'Buy', href: '/search?tab=buy', icon: Home },
    { label: 'Sell', href: '/sell', icon: BadgeIndianRupee },
    { label: 'Maps', href: '/maps', icon: MapPin },
    { label: 'Insights', href: '/insights', icon: BarChart3 },
    { label: 'AI Advisor', href: '/ai-advisor', icon: Sparkles },
    { label: 'Compare', href: '/compare', icon: Scale, badge: compareList.length },
  ];
  const desktopLinks = [
    { label: 'Explore', href: '/search?tab=societies' },
    { label: 'Compare', href: '/compare' },
    { label: 'AI Advisor', href: '/ai-advisor' },
    { label: 'Broker', href: '/broker-crm' },
  ];
  const bottomActions = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Explore', href: '/search?tab=societies', icon: Search },
    { label: 'Assistant', href: '/ai-advisor', icon: Sparkles },
    { label: 'Compare', href: '/compare', icon: Scale, badge: compareList.length },
    { label: 'Account', href: accountDashboardPath || '/login', icon: User },
  ];

  return (
    <>
    <header className="sticky top-0 z-50 w-full border-b border-[#E7DCCB] bg-[#F8F3EA]">
      <div className="mx-auto flex h-[72px] max-w-[1360px] items-center justify-between gap-3 px-4 sm:h-20 sm:gap-5 lg:h-[74px] lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2 rounded-lg focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-500 focus-visible:ring-offset-4 lg:gap-[9px]" aria-label="SocietyFlats home">
          <img
            src="/brand/societyflats-icon-512.png"
            alt="SocietyFlats"
            className="h-9 w-9 object-contain sm:h-10 sm:w-10 lg:hidden"
            width={512}
            height={512}
          />
          <span className="hidden h-[30px] w-[30px] items-center justify-center rounded-[8px] bg-[#123C32] text-[#C2724E] lg:flex">
            <Home className="h-4 w-4" />
          </span>
          <span className="text-lg font-black uppercase tracking-tight text-forest-950 sm:text-xl lg:hidden">
            Society<span className="text-pine-700">Flats</span>
          </span>
          <span className="hidden font-display text-[21px] font-medium tracking-[-0.01em] text-[#123C32] lg:inline">
            SocietyFlats
          </span>
        </Link>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            setShowHeaderSuggestions(false);
            navigate(`/search?tab=societies&q=${encodeURIComponent(headerQuery.trim())}`);
          }}
          className="relative hidden min-w-[280px] max-w-[470px] flex-1 items-center gap-[9px] rounded-[11px] border border-[#E7DCCB] bg-white px-[14px] py-[9px] lg:flex"
        >
          <Search className="h-4 w-4 text-[#2A6147]" />
          <input
            value={headerQuery}
            onChange={(event) => {
              setHeaderQuery(event.target.value);
              setShowHeaderSuggestions(true);
            }}
            onFocus={() => {
              setIsSearchFocused(true);
              setShowHeaderSuggestions(true);
            }}
            onBlur={() => {
              setIsSearchFocused(false);
              setTimeout(() => setShowHeaderSuggestions(false), 120);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setShowHeaderSuggestions(false);
            }}
            placeholder="Search society, sector or builder"
            className="search-bare-input min-w-0 flex-1 bg-transparent text-sm font-normal text-[#25302B] outline-none placeholder:text-[#6E756E]"
          />
          <span className={cn("h-2 w-2 rounded-full transition", isSearchFocused ? "bg-[#C2724E]" : "bg-transparent")} />
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

        <nav className="hidden items-center gap-5 xl:flex">
          {desktopLinks.map((link) => (
            <Link key={link.href} to={link.href} className="whitespace-nowrap text-sm font-semibold text-[#405049] transition-colors hover:text-[#123C32]">
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        

        <div className="flex items-center gap-2">
          <Link to="/shortlist" className="relative rounded-full p-2.5 transition-colors hover:bg-forest-50 lg:hidden">
            <Heart className="w-5 h-5 text-forest-700" />
            {shortlist.length > 0 && <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{shortlist.length}</span>}
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-2 lg:hidden">
              <span className="text-sm font-medium text-forest-700 hidden md:block">{user?.first_name}</span>
              <div className="w-9 h-9 bg-forest-100 rounded-full flex items-center justify-center"><User className="w-4 h-4 text-forest-600" /></div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="hidden rounded-full text-forest-700 hover:bg-forest-50 sm:flex lg:hidden"
              onClick={() => navigate(accountDashboardPath || "/login")}
            >
              {accountDashboardPath ? "Dashboard" : "Sign In"}
            </Button>
          )}

          <Link to="/sell" className="hidden lg:block"><Button size="sm" className="h-auto rounded-[10px] bg-[#C2724E] px-4 py-[9px] text-[13.5px] font-bold text-white shadow-none hover:bg-[#B86F4B]">List Your Flat</Button></Link>
          <button
            type="button"
            onClick={() => navigate(accountDashboardPath || "/login")}
            className="hidden h-9 w-9 items-center justify-center rounded-full bg-[#E4F0E6] text-[13px] font-bold text-[#405049] lg:flex"
            aria-label={accountDashboardPath ? "Open dashboard" : "Open account"}
          >
            {isAuthenticated && user?.first_name ? String(user.first_name).slice(0, 2).toUpperCase() : "AR"}
          </button>
          <button className="xl:hidden p-2 rounded-full hover:bg-forest-50 transition-colors" onClick={() => setIsMenuOpen(!isMenuOpen)}>{isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="xl:hidden border-t border-forest-100 bg-white">
          <div className="container mx-auto px-4 py-4 space-y-2">
{navLinks.map((link) => <Link key={link.href} to={link.href} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-forest-700 hover:bg-forest-50 transition-colors" onClick={() => setIsMenuOpen(false)}><link.icon className="w-5 h-5" /><span className="font-medium">{link.label}</span>{link.badge && link.badge > 0 ? <span className="ml-auto text-xs bg-forest-100 rounded-full px-2 py-0.5">{link.badge}</span> : null}</Link>)}
            <Button variant="outline" className="w-full rounded-full border-pine-100 bg-white text-pine-700" onClick={() => { navigate(accountDashboardPath || '/login'); setIsMenuOpen(false); }}>
              {accountDashboardPath ? "Dashboard" : "Login"}
            </Button>
            <Button variant="outline" className="w-full rounded-full border-clay-100 bg-white text-sm font-bold text-clay-700" onClick={() => { navigate('/broker-crm'); setIsMenuOpen(false); }}>Join as Broker Partner</Button>
            <Button className="w-full rounded-full bg-forest-600 text-sm font-bold text-white hover:bg-forest-700" onClick={() => { navigate('/sell'); setIsMenuOpen(false); }}>List Your Flat</Button>
          </div>
        </div>
      )}

    </header>
    <nav className="fixed bottom-[calc(0.65rem+env(safe-area-inset-bottom))] left-3 right-3 z-50 rounded-[1.25rem] border border-paper-300 bg-paper-50/95 p-2 shadow-editorial backdrop-blur-xl xl:hidden">
      <div className="grid grid-cols-5 gap-1">
        {bottomActions.map((action) => {
          const Icon = action.icon;
          const isActive = location.pathname === action.href.split('?')[0];
          return (
            <Link
              key={action.href}
              to={action.href}
              className={cn(
                'relative flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-semibold transition',
                isActive ? 'bg-pine-800 text-white' : 'text-forest-600 hover:bg-sage-50'
              )}
            >
              <Icon className="mb-1 h-4 w-4" />
              {action.label}
              {action.badge && action.badge > 0 ? (
                <span className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] text-white">
                  {action.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
    </>
  );
}
