import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Menu, X, Heart, Scale, MapPin, Building2, Sparkles, BarChart3, User, Home, KeyRound, BadgeIndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { compareList, shortlist, isAuthenticated, user } = useAppStore();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?tab=societies&q=${encodeURIComponent(searchQuery)}`);
      setIsSearchFocused(false);
      setIsMenuOpen(false);
    }
  };

  const navLinks = [
    { label: 'Societies', href: '/search?tab=societies', icon: Building2 },
    { label: 'Rent', href: '/search?tab=rent', icon: KeyRound },
    { label: 'Buy', href: '/search?tab=buy', icon: Home },
    { label: 'Sell', href: '/sell', icon: BadgeIndianRupee },
    { label: 'Insights', href: '/insights', icon: BarChart3 },
    { label: 'AI Advisor', href: '/ai-advisor', icon: Sparkles },
    { label: 'Compare', href: '/compare', icon: Scale, badge: compareList.length },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white/92 backdrop-blur-xl border-b border-navy-100">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 bg-navy-600 rounded-xl flex items-center justify-center shadow-sm">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block leading-tight">
            <span className="text-xl font-display font-bold text-navy-900">Society</span>
            <span className="text-xl font-display font-bold text-gold-500">Flats</span>
            <p className="text-[10px] uppercase tracking-[0.18em] text-navy-400 -mt-1">Intelligence first</p>
          </div>
        </Link>

        <form onSubmit={handleSearch} className="hidden md:block flex-1 max-w-md relative">
          <div className={cn(
            'relative flex items-center rounded-full border bg-white transition-all duration-200',
            isSearchFocused ? 'border-navy-300 shadow-md ring-2 ring-navy-100' : 'border-navy-200'
          )}>
            <MapPin className="w-4 h-4 text-navy-400 ml-4 shrink-0" />
            <Input
              type="text"
              placeholder="Search society, sector, builder..."
              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 pl-2 h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            />
            <Button type="submit" size="sm" className="mr-1 rounded-full bg-navy-600 hover:bg-navy-700">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </form>

        <nav className="hidden xl:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium text-navy-600 hover:text-navy-900 hover:bg-navy-50 transition-colors"
            >
              <link.icon className="w-4 h-4" />
              <span>{link.label}</span>
              {link.badge && link.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gold-500 text-white text-xs rounded-full flex items-center justify-center">
                  {link.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/shortlist" className="relative p-2 rounded-full hover:bg-navy-50 transition-colors">
            <Heart className="w-5 h-5 text-navy-600" />
            {shortlist.length > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {shortlist.length}
              </span>
            )}
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-navy-700 hidden md:block">{user?.first_name}</span>
              <div className="w-8 h-8 bg-navy-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-navy-600" />
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="hidden sm:flex rounded-full border-navy-200 text-navy-700 hover:bg-navy-50" onClick={() => navigate('/login')}>
              Sign In
            </Button>
          )}

          <Link to="/sell" className="hidden lg:block">
            <Button size="sm" className="rounded-full bg-gold-500 hover:bg-gold-600 text-navy-950 font-semibold">
              List Property
            </Button>
          </Link>

          <button className="xl:hidden p-2 rounded-lg hover:bg-navy-50 transition-colors" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="xl:hidden border-t border-navy-100 bg-white">
          <div className="container mx-auto px-4 py-4 space-y-2">
            <form onSubmit={handleSearch} className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
                <Input className="pl-9" placeholder="Search SocietyFlats" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </form>
            {navLinks.map((link) => (
              <Link key={link.href} to={link.href} className="flex items-center gap-3 px-4 py-3 rounded-lg text-navy-700 hover:bg-navy-50 transition-colors" onClick={() => setIsMenuOpen(false)}>
                <link.icon className="w-5 h-5" />
                <span className="font-medium">{link.label}</span>
              </Link>
            ))}
            <Button className="w-full bg-gold-500 hover:bg-gold-600 text-navy-950 font-semibold" onClick={() => { navigate('/sell'); setIsMenuOpen(false); }}>
              List Property
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
