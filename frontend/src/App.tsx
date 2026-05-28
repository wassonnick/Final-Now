import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HomePage } from '@/pages/HomePage';
import { SearchPage } from '@/pages/SearchPage';
import { SocietyPage } from '@/pages/SocietyPage';
import { PropertyPage } from '@/pages/PropertyPage';
import { ComparePage } from '@/pages/ComparePage';
import { AIAdvisorPage } from '@/pages/AIAdvisorPage';
import { InsightsPage } from '@/pages/InsightsPage';
import { OwnerDashboard } from '@/pages/OwnerDashboard';
import { LoginPage } from '@/pages/LoginPage';
import { SellPage } from '@/pages/SellPage';
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminSocietiesPage } from '@/pages/admin/AdminSocietiesPage';
import { AdminSocietyFormPage } from '@/pages/admin/AdminSocietyFormPage';
import { AdminPropertiesPage } from '@/pages/admin/AdminPropertiesPage';
import { AdminPropertyFormPage } from '@/pages/admin/AdminPropertyFormPage';
import { AdminLeadsPage } from '@/pages/admin/AdminLeadsPage';
import { AdminLeadDetailPage } from '@/pages/admin/AdminLeadDetailPage';
import { AdminReviewsPage } from '@/pages/admin/AdminReviewsPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage';
import { SocietiesPage } from '@/pages/SocietiesPage';
import { PropertiesPage } from '@/pages/PropertiesPage';
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

function AppShell() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-ivory-100 flex flex-col">
      {!isAdmin && <Navbar />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/society/:slug" element={<SocietyPage />} />
          <Route path="/property/:slug" element={<PropertyPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/ai-advisor" element={<AIAdvisorPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/owner/dashboard" element={<OwnerDashboard />} />
          <Route path="/sell" element={<SellPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/societies" element={<AdminSocietiesPage />} />
          <Route path="/admin/societies/new" element={<AdminSocietyFormPage />} />
          <Route path="/admin/societies/:id/edit" element={<AdminSocietyFormPage />} />
          <Route path="/admin/properties" element={<AdminPropertiesPage />} />
          <Route path="/admin/properties/new" element={<AdminPropertyFormPage />} />
          <Route path="/admin/properties/:id/edit" element={<AdminPropertyFormPage />} />
          <Route path="/admin/leads" element={<AdminLeadsPage />} />
          <Route path="/admin/leads/:id" element={<AdminLeadDetailPage />} />
          <Route path="/admin/reviews" element={<AdminReviewsPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
          <Route path="/search/" element={<SearchPage />} />
         <Route path="/admin/properties/new/" element={<AdminPropertyFormPage />} />
         <Route path="/admin/properties/:id/edit/" element={<AdminPropertyFormPage />} />
         <Route path="/societies" element={<SocietiesPage />} />
         <Route path="/societies/" element={<SocietiesPage />} />
        <Route path="/properties" element={<PropertiesPage />} />
        </Routes>
      </main>
      {!isAdmin && <Footer />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
