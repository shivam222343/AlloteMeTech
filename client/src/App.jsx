import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute, AdminRoute, GuestRoute } from './router/ProtectedRoute';
import PremiumModal from './components/common/PremiumModal';
import SolvedConfirmationModal from './components/common/SolvedConfirmationModal';

// Layouts
import MainLayout from './components/layout/MainLayout';
import AdminLayout from './pages/admin/AdminLayout';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import CompanyDetail from './pages/CompanyDetail';
import Topics from './pages/Topics';
import TopicDetail from './pages/TopicDetail';
import Discussion from './pages/Discussion';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCompanies from './pages/admin/AdminCompanies';
import AdminProblems from './pages/admin/AdminProblems';
import AdminTopics from './pages/admin/AdminTopics';
import AdminUsers from './pages/admin/AdminUsers';
import AdminUserDetail from './pages/admin/AdminUserDetail';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminPricing from './pages/admin/AdminPricing';


// 404
const NotFound = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
    <p className="text-6xl font-bold text-text-primary mb-3">404</p>
    <p className="text-text-muted text-sm mb-6">Page not found</p>
    <a href="/" className="btn btn-primary btn-sm">Go Home</a>
  </div>
);

// Helper to reset scroll position to top on navigation changes
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SocketProvider>
            <BrowserRouter>
              <ScrollToTop />
              <PremiumModal />
              <SolvedConfirmationModal />
              <Routes>
                {/* ── Public routes with main layout ── */}
                <Route element={<MainLayout />}>
                  <Route path="/" element={<Landing />} />
                  <Route path="/companies" element={<Companies />} />
                  <Route path="/companies/:slug" element={<CompanyDetail />} />
                  <Route path="/topics" element={<Topics />} />
                  <Route path="/topics/:slug" element={<TopicDetail />} />
                  <Route path="/discussion" element={<Discussion />} />

                  {/* ── Protected routes ── */}
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                </Route>

                {/* ── Auth routes (no layout) ── */}
                <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
                <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
                <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />

                {/* ── Admin routes ── */}
                <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="companies" element={<AdminCompanies />} />
                  <Route path="problems" element={<AdminProblems />} />
                  <Route path="topics" element={<AdminTopics />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="users/:id" element={<AdminUserDetail />} />
                  <Route path="analytics" element={<AdminAnalytics />} />
                  <Route path="pricing" element={<AdminPricing />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>

            <Toaster

              position="top-right"
              toastOptions={{
                style: {
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                  borderRadius: '6px',
                },
                success: { iconTheme: { primary: '#22C55E', secondary: 'var(--bg-card)' } },
                error:   { iconTheme: { primary: '#EF4444', secondary: 'var(--bg-card)' } },
                duration: 3000,
              }}
            />
          </SocketProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
