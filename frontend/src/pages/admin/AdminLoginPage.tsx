import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { setAdminSession } from '@/hooks/useAdminAuth';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@societyflats.com');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!email || password.length < 6) {
      setError('Enter admin email and password.');
      return;
    }

    setAdminSession(email);
    navigate('/admin/dashboard');
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col justify-center px-6 py-12 md:px-12">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-600/20">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-tight text-slate-950">SocietyFlats</p>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Admin</p>
            </div>
          </div>

          <div className="max-w-md">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
              <ShieldCheck className="h-4 w-4" /> Admin Foundation v1
            </div>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">Manage societies, properties and leads.</h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-500">A clean control room for Gurgaon-first inventory, reviews, users and lead operations.</p>

            <form onSubmit={handleSubmit} className="mt-10 space-y-4 rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} className="h-13 rounded-2xl pl-11" placeholder="admin@societyflats.com" />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-13 rounded-2xl pl-11" placeholder="Password" />
                </div>
              </label>

              {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p> : null}

              <Button type="submit" className="h-12 w-full rounded-2xl bg-blue-600 text-white hover:bg-blue-700">Enter Admin Dashboard</Button>
              <p className="text-center text-xs text-slate-400">Temporary local login for Phase 1. Connect to Sanctum API in Phase 2.</p>
            </form>
          </div>
        </div>

        <div className="hidden items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 p-10 lg:flex">
          <div className="w-full max-w-xl rounded-[40px] border border-white bg-white/70 p-6 shadow-2xl shadow-blue-100/60 backdrop-blur">
            <div className="overflow-hidden rounded-[32px]">
              <img src="https://images.unsplash.com/photo-1494526585095-c41746248156?w=1400&q=85" alt="Premium society management" className="h-[520px] w-full object-cover" />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {['Societies', 'Listings', 'Leads'].map((item) => (
                <div key={item} className="rounded-3xl bg-white p-4 text-center shadow-sm">
                  <p className="text-sm font-medium text-slate-500">{item}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">Live</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
