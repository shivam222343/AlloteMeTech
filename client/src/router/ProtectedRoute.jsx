import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/common/Spinner';

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-bg-primary"><Spinner size="lg" /></div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
};

export const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-bg-primary"><Spinner size="lg" /></div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};

export const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-bg-primary"><Spinner size="lg" /></div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};
