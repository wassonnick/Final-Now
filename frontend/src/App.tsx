import { useEffect, type ReactNode } from 'react';
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
import { FeatureExperiencePage } from '@/pages/FeatureExperiencePage';
import { OwnerDashboard } from '@/pages/OwnerDashboard';
import { LoginPage } from '@/pages/LoginPage';
import { SellPage } from '@/pages/SellPage';

import { SocietiesPage } from '@/pages/SocietiesPage';
import { PropertiesPage } from '@/pages/PropertiesPage';
import { SeoLandingPage } from '@/pages/SeoLandingPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

import { AdminLoginPage } from '@/pages/admin/AdminLoginPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminSocietiesPage } from '@/pages/admin/AdminSocietiesPage';
import { AdminSocietyFormPage } from '@/pages/admin/AdminSocietyFormPage';
import { AdminSocietyUrlCreatePage } from '@/pages/admin/AdminSocietyUrlCreatePage';
import { AdminPropertiesPage } from '@/pages/admin/AdminPropertiesPage';
import { AdminPropertyFormPage } from '@/pages/admin/AdminPropertyFormPage';
import { AdminLeadsPage } from '@/pages/admin/AdminLeadsPage';
import { AdminLeadDetailPage } from '@/pages/admin/AdminLeadDetailPage';
import { AdminReviewsPage } from '@/pages/admin/AdminReviewsPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage';
import { AdminFeatureHubPage } from '@/pages/admin/AdminFeatureHubPage';
import { getAdminSession } from '@/hooks/useAdminAuth';
import { setPublicSeo } from "@/lib/seo";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

function ProtectedAdminRoute({ children }: { children: ReactNode }) {
  const location = useLocation();

  if (!getAdminSession()) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

function AppShell() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  useEffect(() => {
    if (isAdmin) {
      setPublicSeo(
        "Admin | SocietyFlats",
        "Private SocietyFlats admin area.",
        { noindex: true, canonical: "/admin" },
      );
    }
  }, [isAdmin, location.pathname]);

  return (
    <div className="min-h-screen bg-ivory-100 flex flex-col">
      {!isAdmin && <Navbar />}

      <main className="flex-1">
        <Routes>

          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/search/" element={<SearchPage />} />

          <Route path="/societies" element={<SocietiesPage />} />
          <Route path="/societies/" element={<SocietiesPage />} />

          <Route path="/properties" element={<PropertiesPage />} />
          <Route path="/properties/" element={<PropertiesPage />} />

          <Route path="/society/:slug" element={<SocietyPage />} />
          <Route path="/property/:slug" element={<PropertyPage />} />

          <Route path="/gurgaon" element={<SeoLandingPage variant="gurgaon" />} />
          <Route path="/gurgaon/societies" element={<SeoLandingPage variant="gurgaon-societies" />} />
          <Route path="/gurgaon/properties" element={<SeoLandingPage variant="gurgaon-properties" />} />
          <Route path="/gurgaon/:locality" element={<SeoLandingPage variant="locality" />} />
          <Route path="/builder/:builderSlug" element={<SeoLandingPage variant="builder" />} />

          <Route path="/compare" element={<ComparePage />} />
          <Route path="/ai-advisor" element={<AIAdvisorPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/maps" element={<FeatureExperiencePage feature="maps" />} />
          <Route path="/broker-crm" element={<FeatureExperiencePage feature="broker-crm" />} />
          <Route path="/chat" element={<FeatureExperiencePage feature="chat" />} />
          <Route path="/recommendations" element={<FeatureExperiencePage feature="recommendations" />} />

          <Route path="/owner/dashboard" element={<OwnerDashboard />} />
          <Route path="/sell" element={<SellPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Admin */}
          <Route
            path="/admin"
            element={<Navigate to={getAdminSession() ? "/admin/dashboard" : "/admin/login"} replace />}
          />

          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/dashboard" element={<ProtectedAdminRoute><AdminDashboardPage /></ProtectedAdminRoute>} />

          <Route path="/admin/societies" element={<ProtectedAdminRoute><AdminSocietiesPage /></ProtectedAdminRoute>} />
          <Route path="/admin/societies/new-from-url" element={<ProtectedAdminRoute><AdminSocietyUrlCreatePage /></ProtectedAdminRoute>} />
          <Route path="/admin/societies/new" element={<ProtectedAdminRoute><AdminSocietyFormPage /></ProtectedAdminRoute>} />
          <Route path="/admin/societies/:id/edit" element={<ProtectedAdminRoute><AdminSocietyFormPage /></ProtectedAdminRoute>} />

          <Route path="/admin/properties" element={<ProtectedAdminRoute><AdminPropertiesPage /></ProtectedAdminRoute>} />

          <Route
            path="/admin/properties/new"
            element={<ProtectedAdminRoute><AdminPropertyFormPage /></ProtectedAdminRoute>}
          />

          <Route
            path="/admin/properties/new/"
            element={<ProtectedAdminRoute><AdminPropertyFormPage /></ProtectedAdminRoute>}
          />

          <Route
            path="/admin/properties/:id/edit"
            element={<ProtectedAdminRoute><AdminPropertyFormPage /></ProtectedAdminRoute>}
          />

          <Route
            path="/admin/properties/:id/edit/"
            element={<ProtectedAdminRoute><AdminPropertyFormPage /></ProtectedAdminRoute>}
          />

          <Route path="/admin/leads" element={<ProtectedAdminRoute><AdminLeadsPage /></ProtectedAdminRoute>} />
          <Route path="/admin/leads/:id" element={<ProtectedAdminRoute><AdminLeadDetailPage /></ProtectedAdminRoute>} />

          <Route path="/admin/reviews" element={<ProtectedAdminRoute><AdminReviewsPage /></ProtectedAdminRoute>} />
          <Route path="/admin/users" element={<ProtectedAdminRoute><AdminUsersPage /></ProtectedAdminRoute>} />
          <Route path="/admin/ai" element={<ProtectedAdminRoute><AdminFeatureHubPage feature="ai" /></ProtectedAdminRoute>} />
          <Route path="/admin/maps" element={<ProtectedAdminRoute><AdminFeatureHubPage feature="maps" /></ProtectedAdminRoute>} />
          <Route path="/admin/broker-crm" element={<ProtectedAdminRoute><AdminFeatureHubPage feature="broker-crm" /></ProtectedAdminRoute>} />
          <Route path="/admin/owner-crm" element={<ProtectedAdminRoute><AdminFeatureHubPage feature="owner-crm" /></ProtectedAdminRoute>} />
          <Route path="/admin/chat" element={<ProtectedAdminRoute><AdminFeatureHubPage feature="chat" /></ProtectedAdminRoute>} />
          <Route path="/admin/analytics" element={<ProtectedAdminRoute><AdminFeatureHubPage feature="analytics" /></ProtectedAdminRoute>} />
          <Route path="/admin/advanced-search" element={<ProtectedAdminRoute><AdminFeatureHubPage feature="advanced-search" /></ProtectedAdminRoute>} />
          <Route path="/admin/recommendations" element={<ProtectedAdminRoute><AdminFeatureHubPage feature="recommendations" /></ProtectedAdminRoute>} />
          <Route path="/admin/settings" element={<ProtectedAdminRoute><AdminSettingsPage /></ProtectedAdminRoute>} />

          <Route path="*" element={<NotFoundPage />} />

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
