import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      setSent(true);
      toast.success('If that email exists, a reset link was sent');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg-primary">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-4">
            <img
              src="/AlloteMe_Logos.png"
              alt="AlloteMe Tech"
              className="h-10 w-auto object-contain mx-auto"
            />
          </Link>
          <h1 className="text-xl font-bold text-text-primary">Reset your password</h1>
          <p className="text-sm text-text-muted mt-1">Enter your email and we'll send a reset link.</p>
        </div>

        <div className="card p-6">
          {sent ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-accent-green/10 border border-accent-green/20 flex items-center justify-center mx-auto">
                <span className="text-accent-green text-xl">✓</span>
              </div>
              <p className="text-sm text-text-primary">Check your email for a reset link.</p>
              <Link to="/login" className="btn btn-primary btn-sm w-full mt-2">Back to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="forgot-email" className="block text-xs font-medium text-text-muted mb-1.5">Email</label>
                <input id="forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="input" placeholder="you@example.com" required />
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary w-full">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-5">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
