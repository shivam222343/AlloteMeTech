import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import { useState } from 'react';
import AuthVisualPanel from '../components/auth/AuthVisualPanel';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const Signup = () => {
  const { register: registerUser } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    try {
      await registerUser({ name: data.name, email: data.email, password: data.password });
      toast.success('Account created! Welcome to AlloteMe Tech.');
      window.scrollTo(0, 0);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
  };

  const handleGoogle = () => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const authUrl = baseUrl.endsWith('/api') ? `${baseUrl}/auth/google` : `${baseUrl}/api/auth/google`;
    const originParam = encodeURIComponent(window.location.origin);
    window.location.href = `${authUrl}?origin=${originParam}`;
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-gradient-to-br from-[#ebf4fd] via-[#f4f8fe] to-[#e6f0fc] dark:from-[#0b0f19] dark:via-[#0f172a] dark:to-[#080c16] transition-colors">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
        
        {/* Left Side: Animated Doodle 2D Video & Career Intelligence Panel */}
        <div className="hidden lg:block lg:col-span-7 h-full">
          <AuthVisualPanel />
        </div>

        {/* Right Side: Clean Modern Sign-up Form */}
        <div className="w-full lg:col-span-5 max-w-md mx-auto">
          <div className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-9 shadow-[0_20px_50px_rgba(28,68,130,0.07)]">
            
            {/* Top Brand Logo */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200/80 dark:border-slate-700 p-1.5 flex items-center justify-center">
                <img
                  src={isDark ? '/AlloteMe_Logos.png' : '/AlloteMe_Logos _Light.png'}
                  alt="AlloteMe Tech"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                  AlloteMe Tech
                </h3>
                <p className="text-[10px] font-bold uppercase tracking-wider text-accent-blue">
                  Career Intelligence
                </p>
              </div>
            </div>

            {/* Header Titles */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Create account
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Start tracking verified tech jobs and practice today
              </p>
            </div>

            {/* Google OAuth Button */}
            <button
              onClick={handleGoogle}
              type="button"
              className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-xs text-slate-700 dark:text-slate-200 shadow-sm flex items-center justify-center gap-2.5 transition-all hover:shadow active:scale-[0.99]"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <span className="relative px-3 bg-white dark:bg-slate-900 text-[11px] text-slate-400 font-medium select-none">
                or sign up with email
              </span>
            </div>

            {/* Signup Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
              <div>
                <label htmlFor="name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="name"
                    type="text"
                    {...register('name')}
                    className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 dark:bg-slate-800/60 border rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all ${
                      errors.name ? 'border-accent-red focus:ring-accent-red/20' : 'border-slate-200 dark:border-slate-700'
                    }`}
                    placeholder="John Doe"
                  />
                </div>
                {errors.name && <p className="text-xs text-accent-red mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    {...register('email')}
                    className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 dark:bg-slate-800/60 border rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all ${
                      errors.email ? 'border-accent-red focus:ring-accent-red/20' : 'border-slate-200 dark:border-slate-700'
                    }`}
                    placeholder="you@example.com"
                  />
                </div>
                {errors.email && <p className="text-xs text-accent-red mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    {...register('password')}
                    className={`w-full pl-10 pr-10 py-2.5 bg-slate-50/70 dark:bg-slate-800/60 border rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all ${
                      errors.password ? 'border-accent-red focus:ring-accent-red/20' : 'border-slate-200 dark:border-slate-700'
                    }`}
                    placeholder="At least 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-accent-red mt-1">{errors.password.message}</p>}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showPw ? 'text' : 'password'}
                    {...register('confirmPassword')}
                    className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 dark:bg-slate-800/60 border rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all ${
                      errors.confirmPassword ? 'border-accent-red focus:ring-accent-red/20' : 'border-slate-200 dark:border-slate-700'
                    }`}
                    placeholder="Repeat password"
                  />
                </div>
                {errors.confirmPassword && <p className="text-xs text-accent-red mt-1">{errors.confirmPassword.message}</p>}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 bg-accent-blue hover:bg-blue-600 active:scale-[0.99] text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-accent-blue/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create account &amp; get started</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Bottom switcher link */}
            <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-accent-blue hover:underline font-bold">
                Sign in
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Signup;
