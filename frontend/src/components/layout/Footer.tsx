import { Link } from 'react-router-dom';
import { Building2, Mail, Phone, MapPin, Instagram, Youtube, Linkedin, Twitter } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-navy-900 text-navy-100">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gold-500 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-navy-900" />
              </div>
              <span className="text-lg font-display font-bold text-white">SocietyFlats</span>
            </div>
            <p className="text-sm text-navy-300 leading-relaxed">
              India's First Society Intelligence Platform. Making finding a home as transparent as booking a hotel.
            </p>
            <div className="flex items-center gap-3">
              <a href="#" className="p-2 rounded-lg bg-navy-800 hover:bg-navy-700 transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-navy-800 hover:bg-navy-700 transition-colors">
                <Youtube className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-navy-800 hover:bg-navy-700 transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-navy-800 hover:bg-navy-700 transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {['Search Societies', 'AI Advisor', 'Compare', 'Insights', 'Owner Dashboard', 'Broker CRM'].map((item) => (
                <li key={item}>
                  <Link to="/" className="text-sm text-navy-300 hover:text-gold-400 transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Top Localities */}
          <div>
            <h4 className="text-white font-semibold mb-4">Top Localities</h4>
            <ul className="space-y-2">
              {['DLF Phase 1-5', 'Golf Course Road', 'Golf Course Extension', 'Sohna Road', 'Sector 57', 'Sushant Lok'].map((item) => (
                <li key={item}>
                  <Link to={`/search?locality=${encodeURIComponent(item)}`} className="text-sm text-navy-300 hover:text-gold-400 transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-navy-300">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-gold-500" />
                <span>DLF Cyber City, Gurgaon, Haryana 122002</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-navy-300">
                <Phone className="w-4 h-4 shrink-0 text-gold-500" />
                <span>+91 99999 88888</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-navy-300">
                <Mail className="w-4 h-4 shrink-0 text-gold-500" />
                <span>hello@societyflats.in</span>
              </li>
            </ul>
            <div className="mt-4 p-3 bg-navy-800 rounded-lg">
              <p className="text-xs text-navy-300">Bangalore Launch - Coming Soon</p>
              <p className="text-sm font-medium text-gold-400 mt-1">Join the Waitlist</p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-navy-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-navy-400">
            © 2025 SocietyFlats. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-navy-400">
            <Link to="/" className="hover:text-navy-200 transition-colors">Privacy Policy</Link>
            <Link to="/" className="hover:text-navy-200 transition-colors">Terms of Service</Link>
            <Link to="/" className="hover:text-navy-200 transition-colors">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
