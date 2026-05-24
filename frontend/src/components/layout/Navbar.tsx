import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Menu, X, Heart, Scale, MapPin, ChevronDown, Building2, Sparkles, BarChart3, User } from 'lucide-react';
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
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setIsSearchFocused(false);
    }
  };

  const navLinks = [
    { label: 'Search', href: '/search', icon: Search },
    { label: 'AI Advisor', href: '/ai-advisor', icon: Sparkles },
    { label: 'Insights', href: '/insights', icon: BarChart3 },
    { label: 'Compare', href: '/compare', icon: Scale, badge: compareList.length },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-lg border-b border-navy-100">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 bg-navy-500 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <span className="text-xl font-display font-bold text-navy-900">Society</span>
            <span className="text-xl font-display font-bold text-gold-500">Flats</span>
          </div>
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl relative">
          <div className={cn(
            "relative flex items-center rounded-xl border transition-all duration-200",
            isSearchFocused ? "border-navy-300 shadow-md ring-2 ring-navy-100" : "border-navy-200"
          )}>
            <MapPin className="w-4 h-4 text-navy-400 ml-3 shrink-0" />
            <Input
              type="text"
              placeholder="Search societies, localities, builders..."
              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 pl-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            />
            <Button type="submit" size="sm" className="mr-1 bg-navy-500 hover:bg-navy-600">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </form>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-navy-600 hover:text-navy-900 hover:bg-navy-50 transition-colors"
            >
              <link.icon className="w-4 h-4" />
              <span>{link.label}</span>
              {link.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gold-500 text-white text-xs rounded-full flex items-center justify-center">
                  {link.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link to="/shortlist" className="relative p-2 rounded-lg hover:bg-navy-50 transition-colors">
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
            <Button 
              variant="outline" 
              size="sm" 
              className="hidden sm:flex border-navy-200 text-navy-700 hover:bg-navy-50"
              onClick={() => navigate('/login')}
            >
              Sign In
            </Button>
          )}

          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-navy-50 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-navy-100 bg-white">
          <div className="container mx-auto px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-navy-700 hover:bg-navy-50 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <link.icon className="w-5 h-5" />
                <span className="font-medium">{link.label}</span>
                {link.badge > 0 && (
                  <span className="ml-auto bg-gold-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {link.badge}
                  </span>
                )}
              </Link>
            ))}
            <div className="pt-2 border-t border-navy-100">
              <Button 
                className="w-full bg-navy-500 hover:bg-navy-600"
                onClick={() => { navigate('/login'); setIsMenuOpen(false); }}
              >
                Sign In / Register
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
