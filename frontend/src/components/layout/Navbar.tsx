import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Menu, X, Heart, Scale, MapPin, Building2, Sparkles, BarChart3, User, Home, KeyRound, BadgeIndianRupee, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { CUSTOMER_ACCOUNT_EVENT } from "@/lib/customerAccount";

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [accountDashboardPath, setAccountDashboardPath] = useState("");

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
  const { compareList, shortlist, isAuthenticated, user } = useAppStore();
  const isHomePage = location.pathname === '/';
  const isPropertyOrSocietyPage = location.pathname.startsWith('/property/') || location.pathname.startsWith('/society/');

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
    { label: 'Societies', href: '/search?tab=societies' },
    { label: 'Rent', href: '/search?tab=rent' },
    { label: 'Buy', href: '/search?tab=buy' },
    { label: 'Insights', href: '/insights' },
    { label: 'Map', href: '/maps' },
    { label: 'AI Advisor', href: '/ai-advisor', ai: true },
  ];
  const bottomActions = [
    { label: 'Search', href: '/search?tab=societies', icon: Search },
    { label: 'Compare', href: '/compare', icon: Scale, badge: compareList.length },
    { label: 'AI Match', href: '/ai-advisor', icon: Sparkles },
    { label: 'Chat', href: '/chat', icon: MessageCircle },
  ];

  return (
    <>
    <header className="sticky top-0 z-50 w-full bg-white/86 backdrop-blur-2xl border-b border-navy-100/80">
      <div className="container mx-auto px-4 h-[72px] flex items-center justify-between gap-3 sm:h-20 sm:gap-5">
        <Link to="/" className="flex items-center gap-2 shrink-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-4 sm:gap-3">
          <div className="w-9 h-9 rounded-2xl bg-blue-700 flex items-center justify-center shadow-sm shadow-blue-700/20 sm:w-10 sm:h-10">
            <Building2 className="w-4 h-4 text-white sm:w-5 sm:h-5" />
          </div>
          <div className="block leading-tight">
            <span className="text-base font-extrabold tracking-tight text-navy-900 sm:text-2xl">Society</span>
            <span className="text-base font-extrabold tracking-tight text-navy-600 sm:text-2xl">Flats</span>
            <p className="-mt-1 hidden text-[10px] uppercase tracking-[0.2em] text-navy-400 sm:block">Intelligence first</p>
          </div>
        </Link>

        <nav className="hidden xl:flex items-center gap-1 rounded-full bg-ivory-200/70 border border-navy-100 px-2 py-1.5">
          {desktopLinks.map((link) => (
            <Link key={link.href} to={link.href} className={cn("relative flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-bold transition-colors", link.ai ? "text-blue-700 hover:bg-white" : "text-navy-600 hover:text-navy-900 hover:bg-white")}>
              {link.ai ? <Sparkles className="w-4 h-4" /> : null}
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        

        <div className="flex items-center gap-2">
          <Link to="/shortlist" className="relative p-2.5 rounded-full hover:bg-navy-50 transition-colors">
            <Heart className="w-5 h-5 text-navy-700" />
            {shortlist.length > 0 && <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{shortlist.length}</span>}
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-navy-700 hidden md:block">{user?.first_name}</span>
              <div className="w-9 h-9 bg-navy-100 rounded-full flex items-center justify-center"><User className="w-4 h-4 text-navy-600" /></div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex rounded-full text-navy-700 hover:bg-navy-50"
              onClick={() => navigate(accountDashboardPath || "/login")}
            >
              {accountDashboardPath ? "Dashboard" : "Sign In"}
            </Button>
          )}

          <Link to="/broker-crm" className="hidden lg:block">
            <Button size="sm" variant="outline" className="rounded-full border-orange-100 bg-white px-4 text-orange-700 shadow-sm hover:bg-orange-50">
              For Brokers
            </Button>
          </Link>
          <Link to="/sell" className="hidden lg:block"><Button size="sm" className="rounded-full bg-blue-700 hover:bg-blue-800 text-white px-5 shadow-sm">List Property</Button></Link>
          <button className="xl:hidden p-2 rounded-full hover:bg-navy-50 transition-colors" onClick={() => setIsMenuOpen(!isMenuOpen)}>{isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="xl:hidden border-t border-navy-100 bg-white">
          <div className="container mx-auto px-4 py-4 space-y-2">
{navLinks.map((link) => <Link key={link.href} to={link.href} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-navy-700 hover:bg-navy-50 transition-colors" onClick={() => setIsMenuOpen(false)}><link.icon className="w-5 h-5" /><span className="font-medium">{link.label}</span>{link.badge && link.badge > 0 ? <span className="ml-auto text-xs bg-navy-100 rounded-full px-2 py-0.5">{link.badge}</span> : null}</Link>)}
            <Button variant="outline" className="w-full rounded-full border-blue-100 bg-white text-blue-700" onClick={() => { navigate(accountDashboardPath || '/login'); setIsMenuOpen(false); }}>
              {accountDashboardPath ? "Dashboard" : "Login"}
            </Button>
            <Button variant="outline" className="w-full rounded-full border-orange-100 bg-white text-orange-700" onClick={() => { navigate('/broker-crm'); setIsMenuOpen(false); }}>Join as Broker</Button>
            <Button className="w-full rounded-full bg-navy-600 hover:bg-navy-700 text-white" onClick={() => { navigate('/sell'); setIsMenuOpen(false); }}>List Property</Button>
          </div>
        </div>
      )}

    </header>
    <nav className={cn(
      "fixed bottom-3 left-3 right-3 z-50 rounded-[1.25rem] border border-navy-100 bg-white/95 p-2 shadow-apple backdrop-blur-xl xl:hidden",
      (isHomePage || isPropertyOrSocietyPage) && "hidden",
    )}>
      <div className="grid grid-cols-4 gap-1">
        {bottomActions.map((action) => {
          const Icon = action.icon;
          const isActive = location.pathname === action.href.split('?')[0];
          return (
            <Link
              key={action.href}
              to={action.href}
              className={cn(
                'relative flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-semibold transition',
                isActive ? 'bg-navy-600 text-white' : 'text-navy-600 hover:bg-navy-50'
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
