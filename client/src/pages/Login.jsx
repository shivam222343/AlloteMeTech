import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

const Login = () => {
  const { login } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'another_device') {
      toast.error('You were logged out because your account was logged in on another device.', {
        id: 'session-conflict-toast',
        duration: 4000,
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    try {
      await login(data);
      toast.success('Welcome back!');
      window.scrollTo(0, 0);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    }
  };

  const handleGoogle = () => {
    // If VITE_API_URL ends in /api (e.g. https://domain.com/api), just append /auth/google
    // If not, append /api/auth/google
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const authUrl = baseUrl.endsWith('/api') ? `${baseUrl}/auth/google` : `${baseUrl}/api/auth/google`;
    window.location.href = authUrl;
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-bg-primary">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-4">
            <img
              src={isDark ? "/AlloteMe_Logos.png" : "/AlloteMe_Logos _Light.png"}
              alt="AlloteMe Tech"
              className="h-20 w-auto object-contain mx-auto"
            />
          </Link>
          <h1 className="text-xl font-bold text-text-primary">Sign in to AlloteMe Tech</h1>
          <p className="text-sm text-text-muted mt-1">Welcome back. Track your progress.</p>
        </div>

        <div className="card p-6 space-y-5">
          {/* Google OAuth */}
          <button
            onClick={handleGoogle}
            type="button"
            className="btn btn-secondary w-full gap-3"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-text-faint">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-text-muted mb-1.5">Email</label>
              <input id="email" type="email" {...register('email')} className={`input ${errors.email ? 'input-error' : ''}`} placeholder="you@example.com" />
              {errors.email && <p className="text-xs text-accent-red mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-medium text-text-muted">Password</label>
                <Link to="/forgot-password" className="text-xs text-accent-blue hover:underline">Forgot?</Link>
              </div>
              <div className="relative">
                <input id="password" type={showPw ? 'text' : 'password'} {...register('password')} className={`input pr-10 ${errors.password ? 'input-error' : ''}`} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-muted">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-accent-red mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
              {isSubmitting ? 'Signing in...' : (<><LogIn className="w-4 h-4" /> Sign In</>)}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-text-muted mt-5">
          No account?{' '}
          <Link to="/signup" className="text-accent-blue hover:underline font-medium">Create one free</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
