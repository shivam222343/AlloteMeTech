import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useState } from 'react';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const Signup = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    try {
      await registerUser({ name: data.name, email: data.email, password: data.password });
      toast.success('Account created! Welcome to AlloteMe Tech.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
  };

  const handleGoogle = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/google`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-bg-primary">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-4">
            <img
              src="/AlloteMe_Logos.png"
              alt="AlloteMe Tech"
              className="h-10 w-auto object-contain mx-auto"
            />
          </Link>
          <h1 className="text-xl font-bold text-text-primary">Create your account</h1>
          <p className="text-sm text-text-muted mt-1">Free forever. No credit card required.</p>
        </div>

        <div className="card p-6 space-y-5">
          <button onClick={handleGoogle} type="button" className="btn btn-secondary w-full gap-3">
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
              <label htmlFor="name" className="block text-xs font-medium text-text-muted mb-1.5">Full Name</label>
              <input id="name" {...register('name')} className={`input ${errors.name ? 'input-error' : ''}`} placeholder="John Doe" />
              {errors.name && <p className="text-xs text-accent-red mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-text-muted mb-1.5">Email</label>
              <input id="email" type="email" {...register('email')} className={`input ${errors.email ? 'input-error' : ''}`} placeholder="you@example.com" />
              {errors.email && <p className="text-xs text-accent-red mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-text-muted mb-1.5">Password</label>
              <div className="relative">
                <input id="password" type={showPw ? 'text' : 'password'} {...register('password')} className={`input pr-10 ${errors.password ? 'input-error' : ''}`} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-muted">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-accent-red mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-medium text-text-muted mb-1.5">Confirm Password</label>
              <input id="confirmPassword" type={showPw ? 'text' : 'password'} {...register('confirmPassword')} className={`input ${errors.confirmPassword ? 'input-error' : ''}`} placeholder="••••••••" />
              {errors.confirmPassword && <p className="text-xs text-accent-red mt-1">{errors.confirmPassword.message}</p>}
            </div>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
              {isSubmitting ? 'Creating account...' : (<><UserPlus className="w-4 h-4" /> Create Account</>)}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-text-muted mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-accent-blue hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
