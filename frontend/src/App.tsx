import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-ivory-100 flex flex-col">
          <Navbar />
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
              <Route path="/login" element={<LoginPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
