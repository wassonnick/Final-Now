import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Mail, Phone, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState('tenant');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1500);
  };

  return (
    <div className="min-h-screen bg-ivory-100 flex items-center justify-center py-12">
      <div className="w-full max-w-md mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-navy-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold text-navy-900">Welcome to SocietyFlats</h1>
          <p className="text-navy-500 mt-1">Sign in to continue</p>
        </div>

        {/* User Type Selector */}
        <div className="bg-white rounded-xl border border-navy-100 p-1 mb-6 flex">
          {['tenant', 'owner', 'broker'].map(type => (
            <button
              key={type}
              onClick={() => setUserType(type)}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-sm font-medium capitalize transition-all",
                userType === type
                  ? "bg-navy-500 text-white"
                  : "text-navy-600 hover:bg-navy-50"
              )}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl border border-navy-100 p-6 shadow-sm">
          <Tabs defaultValue="phone" className="w-full">
            <TabsList className="w-full bg-navy-50 p-1 rounded-lg mb-6">
              <TabsTrigger value="phone" className="flex-1 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Phone className="w-4 h-4 mr-2" /> Phone
              </TabsTrigger>
              <TabsTrigger value="email" className="flex-1 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Mail className="w-4 h-4 mr-2" /> Email
              </TabsTrigger>
            </TabsList>

            <TabsContent value="phone">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-navy-700 mb-1 block">Phone Number</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500 text-sm">+91</span>
                    <Input 
                      type="tel" 
                      placeholder="99999 88888" 
                      className="pl-12 border-navy-200"
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-navy-500 hover:bg-navy-600 h-12"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending OTP...' : 'Send OTP'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="email">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-navy-700 mb-1 block">Email</label>
                  <Input 
                    type="email" 
                    placeholder="you@example.com" 
                    className="border-navy-200"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-navy-700 mb-1 block">Password</label>
                  <div className="relative">
                    <Input 
                      type={showPassword ? 'text' : 'password'} 
                      placeholder="Enter password" 
                      className="border-navy-200 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-navy-300" />
                    <span className="text-navy-600">Remember me</span>
                  </label>
                  <Link to="/" className="text-navy-600 hover:text-navy-800">Forgot password?</Link>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-navy-500 hover:bg-navy-600 h-12"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 pt-6 border-t border-navy-100">
            <p className="text-center text-sm text-navy-500">
              Don't have an account?{' '}
              <Link to="/" className="text-navy-700 font-medium hover:text-navy-900">Register</Link>
            </p>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-8 flex items-center justify-center gap-6 text-sm text-navy-500">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span>Secure Login</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span>Verified Users</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span>No Spam</span>
          </div>
        </div>
      </div>
    </div>
  );
}
