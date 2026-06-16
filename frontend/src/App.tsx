import { Suspense, lazy, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Toaster } from '@/components/ui/toaster';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

import { HomePage } from '@/pages/HomePage';

import { getAdminSession } from '@/hooks/useAdminAuth';
import { setPublicSeo } from "@/lib/seo";

const SearchPage = lazy(() => import('@/pages/SearchPage').then((module) => ({ default: module.SearchPage })));
const SocietyPage = lazy(() => import('@/pages/SocietyPage').then((module) => ({ default: module.SocietyPage })));
const PropertyPage = lazy(() => import('@/pages/PropertyPage').then((module) => ({ default: module.PropertyPage })));
const ComparePage = lazy(() => import('@/pages/ComparePage').then((module) => ({ default: module.ComparePage })));
const AIAdvisorPage = lazy(() => import('@/pages/AIAdvisorPage').then((module) => ({ default: module.AIAdvisorPage })));
const InsightsPage = lazy(() => import('@/pages/InsightsPage').then((module) => ({ default: module.InsightsPage })));
const FeatureExperiencePage = lazy(() => import('@/pages/FeatureExperiencePage').then((module) => ({ default: module.FeatureExperiencePage })));
const OwnerDashboard = lazy(() => import('@/pages/OwnerDashboard').then((module) => ({ default: module.OwnerDashboard })));
const CustomerDashboardPage = lazy(() => import('@/pages/CustomerDashboardPage').then((module) => ({ default: module.CustomerDashboardPage })));
const BrokerDashboardPage = lazy(() => import('@/pages/BrokerDashboardPage').then((module) => ({ default: module.BrokerDashboardPage })));
const LoginPage = lazy(() => import('@/pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const SellPage = lazy(() => import('@/pages/SellPage').then((module) => ({ default: module.SellPage })));
const SocietiesPage = lazy(() => import('@/pages/SocietiesPage').then((module) => ({ default: module.SocietiesPage })));
const PropertiesPage = lazy(() => import('@/pages/PropertiesPage').then((module) => ({ default: module.PropertiesPage })));
const SeoLandingPage = lazy(() => import('@/pages/SeoLandingPage').then((module) => ({ default: module.SeoLandingPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));

const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage').then((module) => ({ default: module.AdminLoginPage })));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })));
const AdminSocietiesPage = lazy(() => import('@/pages/admin/AdminSocietiesPage').then((module) => ({ default: module.AdminSocietiesPage })));
const AdminSocietyFormPage = lazy(() => import('@/pages/admin/AdminSocietyFormPage').then((module) => ({ default: module.AdminSocietyFormPage })));
const AdminSocietyUrlCreatePage = lazy(() => import('@/pages/admin/AdminSocietyUrlCreatePage').then((module) => ({ default: module.AdminSocietyUrlCreatePage })));
const AdminPropertiesPage = lazy(() => import('@/pages/admin/AdminPropertiesPage').then((module) => ({ default: module.AdminPropertiesPage })));
const AdminPropertyFormPage = lazy(() => import('@/pages/admin/AdminPropertyFormPage').then((module) => ({ default: module.AdminPropertyFormPage })));
const AdminLeadsPage = lazy(() => import('@/pages/admin/AdminLeadsPage').then((module) => ({ default: module.AdminLeadsPage })));
const AdminLeadDetailPage = lazy(() => import('@/pages/admin/AdminLeadDetailPage').then((module) => ({ default: module.AdminLeadDetailPage })));
const AdminReviewsPage = lazy(() => import('@/pages/admin/AdminReviewsPage').then((module) => ({ default: module.AdminReviewsPage })));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage').then((module) => ({ default: module.AdminUsersPage })));
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage').then((module) => ({ default: module.AdminSettingsPage })));
const AdminFeatureHubPage = lazy(() => import('@/pages/admin/AdminFeatureHubPage').then((module) => ({ default: module.AdminFeatureHubPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

function RouteLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center bg-ivory-100 px-4">
      <div className="rounded-[1.25rem] border border-blue-100 bg-white px-5 py-4 text-center shadow-sm">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-100 border-t-blue-700" />
        <p className="mt-3 text-sm font-semibold text-navy-500">Loading SocietyFlats...</p>
      </div>
    </div>
  );
}

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
        <Suspense fallback={<RouteLoader />}>
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

            <Route path="/customer/dashboard" element={<CustomerDashboardPage />} />
            <Route path="/customer" element={<CustomerDashboardPage />} />
            <Route path="/owner/dashboard" element={<OwnerDashboard />} />
            <Route path="/broker/dashboard" element={<BrokerDashboardPage />} />
            <Route path="/broker" element={<BrokerDashboardPage />} />
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
        </Suspense>
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
