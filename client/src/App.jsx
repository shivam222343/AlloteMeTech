import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ProtectedRoute, AdminRoute, GuestRoute } from './router/ProtectedRoute';

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
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCompanies from './pages/admin/AdminCompanies';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAnalytics from './pages/admin/AdminAnalytics';

// 404
const NotFound = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
    <p className="text-6xl font-bold text-text-primary mb-3">404</p>
    <p className="text-text-muted text-sm mb-6">Page not found</p>
    <a href="/" className="btn btn-primary btn-sm">Go Home</a>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min
      cacheTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <Routes>
            {/* ── Public routes with main layout ── */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<Landing />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/companies/:slug" element={<CompanyDetail />} />
              <Route path="/topics" element={<Topics />} />
              <Route path="/topics/:slug" element={<TopicDetail />} />

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
              <Route path="users" element={<AdminUsers />} />
              <Route path="analytics" element={<AdminAnalytics />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#111827',
              color: '#F9FAFB',
              border: '1px solid #2D3748',
              fontSize: '13px',
              borderRadius: '6px',
            },
            success: { iconTheme: { primary: '#22C55E', secondary: '#111827' } },
            error: { iconTheme: { primary: '#EF4444', secondary: '#111827' } },
            duration: 3000,
          }}
        />
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
