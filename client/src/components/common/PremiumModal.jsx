import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { paymentApi } from '../../api';
import { X, CheckCircle, ShieldCheck, Calendar, Building2, BarChart3, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const PremiumModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [config, setConfig] = useState({ originalPrice: 299, actualPrice: 59 });
  const [couponInput, setCouponInput] = useState('');
  const [activeCoupon, setActiveCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const { user, loading, fetchMe } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [hasShownOnDashboard, setHasShownOnDashboard] = useState(false);

  // Listen to open-premium-modal custom events
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-premium-modal', handleOpen);
    return () => window.removeEventListener('open-premium-modal', handleOpen);
  }, []);

  // Show popup automatically at starting of dashboard page for logged-in non-premium users
  useEffect(() => {
    if (!loading && user && !user.isPremium && location.pathname === '/dashboard' && !hasShownOnDashboard) {
      setIsOpen(true);
      setHasShownOnDashboard(true);
    }
  }, [user, loading, location.pathname, hasShownOnDashboard]);

  // Fetch prices from backend settings when modal is opened
  useEffect(() => {
    if (isOpen) {
      paymentApi.getConfig()
        .then((res) => {
          if (res?.data?.data) {
            setConfig(res.data.data);
          }
        })
        .catch((err) => {
          console.error('[CONFIG FETCH] Failed to fetch payment config settings:', err);
        });
    }
  }, [isOpen]);

  // Dynamically load Razorpay SDK on mount
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  if (!isOpen) return null;

  const handleApplyCoupon = async () => {
    if (!couponInput) return;
    setValidatingCoupon(true);
    try {
      const { data } = await paymentApi.validateCoupon(couponInput);
      setActiveCoupon(data.data);
      toast.success(`Coupon code ${data.data.code.toUpperCase()} applied! Save ${data.data.discountPercent}%`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired coupon code');
      setActiveCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Please log in first to purchase Premium');
      navigate('/login');
      setIsOpen(false);
      return;
    }

    setPaying(true);
    try {
      // Securely create order on backend using coupon code if active
      const { data } = await paymentApi.createOrder(activeCoupon?.code);
      const order = data.data;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_SbVLw7f5p7qeQN',
        amount: order.amount,
        currency: order.currency,
        name: 'AlloteMe Tech',
        description: 'Premium Subscription (1 Year)',
        image: isDark ? '/AlloteMe_Logos.png' : '/AlloteMe_Logos _Light.png',
        order_id: order.id,
        handler: async (response) => {
          const verifyToast = toast.loading('Verifying your payment...');
          try {
            await paymentApi.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success('Subscription activated! Welcome to Premium 👑', { id: verifyToast });
            setIsOpen(false);
            await fetchMe(); // Refresh state context
          } catch (err) {
            toast.error(err.response?.data?.message || 'Verification failed. Contact support.', { id: verifyToast });
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: '#8B5CF6',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        toast.error(`Payment failed: ${response.error.description}`);
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start payment checkout');
    } finally {
      setPaying(false);
    }
  };

  const finalPrice = activeCoupon
    ? Math.round(config.actualPrice * (1 - activeCoupon.discountPercent / 100))
    : config.actualPrice;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => !paying && setIsOpen(false)}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md md:max-w-4xl bg-bg-card border border-border rounded-3xl shadow-card-hover overflow-hidden animate-slide-up theme-transition p-6 sm:p-8 flex flex-col justify-between">

        {/* Close Button */}
        <button
          disabled={paying}
          onClick={() => setIsOpen(false)}
          className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-bg-secondary text-text-muted transition-colors disabled:opacity-50 z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Two Column Layout */}
        <div className="flex flex-col md:flex-row gap-8 flex-1 items-stretch">

          {/* Left Column: Benefits */}
          <div className="hidden md:flex flex-1 flex-col justify-between">
            <div>
              {/* Header: Dynamic Logo & Badges */}
              <div className="flex items-center gap-2 select-none">
                <img
                  src={isDark ? "/AlloteMe_Logos.png" : "/AlloteMe_Logos _Light.png"}
                  alt="AlloteMe Tech"
                  className="h-9 w-auto object-contain"
                />
                <span className="ml-1.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-accent-purple/10 text-accent-purple border border-accent-purple/20 uppercase tracking-wider">Premium</span>
              </div>

              {/* Title & Description */}
              <h2 className="text-3xl sm:text-4xl font-black text-text-primary tracking-tight mt-6 mb-2 leading-tight">
                Upgrade Your<br />Preparation.
              </h2>
              <p className="text-sm text-text-muted leading-relaxed max-w-md">
                Get instant access to full analytics, recent questions, and targeted company metrics.
              </p>

              {/* Benefits list with custom SVG badges */}
              <div className="mt-8 space-y-5">
                {/* Benefit 1 */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center text-accent-purple flex-shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">450+ company wise recently asked questions access</h3>
                    <p className="text-xs text-text-muted mt-0.5">Direct access to recent 30-day and 90-day questions.</p>
                  </div>
                </div>

                {/* Benefit 2 */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-500 flex-shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">Detailed company-wise interview frequency tracking</h3>
                    <p className="text-xs text-text-muted mt-0.5">Know which companies are hiring and how often.</p>
                  </div>
                </div>

                {/* Benefit 3 */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue flex-shrink-0">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">Advanced analytics, schedules & progress pipelines</h3>
                    <p className="text-xs text-text-muted mt-0.5">Track performance, plan smarter and improve faster.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Highlight Box */}
            <div className="bg-accent-purple/5 border border-accent-purple/10 rounded-xl p-4 flex items-start gap-3 mt-6">
              <ShieldCheck className="w-5 h-5 text-accent-purple mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-accent-purple">One-time Payment. No Auto-renewal.</p>
                <p className="text-2xs text-text-muted mt-0.5">Pay once and enjoy 1 year of premium access without any recurring charges.</p>
              </div>
            </div>

          </div>

          {/* Right Column: Pricing & Payment Box */}
          <div className="w-full md:w-[350px] md:bg-bg-secondary/40 md:border md:border-border/80 md:rounded-2xl p-2 md:p-6 flex flex-col justify-between flex-shrink-0">

            <div className="text-center pt-2">
              <div className="flex items-center justify-center gap-2">
                <span className="h-px w-6 bg-border" />
                <span className="text-2xs text-text-faint uppercase font-bold tracking-widest">Pricing Plan</span>
                <span className="h-px w-6 bg-border" />
              </div>
              <div className="flex items-baseline justify-center gap-1.5 mt-4 mb-2 flex-wrap">
                {activeCoupon ? (
                  <>
                    <span className="text-xs text-text-faint line-through">₹{config.originalPrice}</span>
                    <span className="text-sm text-text-muted line-through">₹{config.actualPrice}</span>
                    <span className="text-5xl font-black text-text-primary tracking-tight">₹{finalPrice}</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-text-muted line-through">₹{config.originalPrice}</span>
                    <span className="text-5xl font-black text-text-primary tracking-tight">₹{config.actualPrice}</span>
                  </>
                )}
                <span className="text-xs text-text-muted">/ year</span>
              </div>
            </div>

            {/* Dotted Line */}
            <div className="border-t border-dashed border-border my-4" />

            {/* Features checkmark list */}
            <ul className="space-y-3.5 mb-4">
              {[
                'All Premium Features',
                '450+ Company-wise Recent Questions',
                'Recent 30 & 90-day Questions',
                'Performance & Progress Tracking',
                'Smart Schedules & Pipelines',
                'Email Support'
              ].map((feat, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-accent-green flex-shrink-0" />
                  <span className="text-xs text-text-secondary font-semibold">{feat}</span>
                </li>
              ))}
            </ul>

            {/* Coupon Code Section */}
            <div className="mb-6 p-3 bg-bg-secondary/60 rounded-xl border border-border">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">Have a coupon code?</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="e.g. LUNCH10"
                  disabled={validatingCoupon || activeCoupon || paying}
                  className="flex-1 text-xs py-1.5 px-2.5 rounded-lg border border-border bg-bg-primary focus:outline-none focus:ring-1 focus:ring-accent-purple uppercase font-semibold text-text-primary"
                />
                {activeCoupon ? (
                  <button
                    type="button"
                    onClick={() => { setActiveCoupon(null); setCouponInput(''); }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/5 transition-colors"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!couponInput || validatingCoupon || paying}
                    onClick={handleApplyCoupon}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-accent-purple text-white hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {validatingCoupon ? '...' : 'Apply'}
                  </button>
                )}
              </div>
              {activeCoupon && (
                <p className="text-[10px] text-accent-green font-bold mt-1 animate-pulse">
                  ✓ Code {activeCoupon.code} applied! Saved {activeCoupon.discountPercent}%
                </p>
              )}
            </div>

            {/* Secure Action Button (styled exactly like custom PremiumButton) */}
            <div>
              <button
                onClick={handleCheckout}
                disabled={paying}
                className="relative flex items-center gap-4 p-2.5 pr-5 rounded-2xl border border-accent-purple/35 bg-bg-card/50 hover:border-accent-purple/65 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all duration-300 active:scale-[0.98] select-none text-left w-full disabled:opacity-50"
              >
                {/* Glow Spark */}
                <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_0_10px_#fbbf24] animate-pulse" />

                {/* Crown Icon Container */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg border border-white/10">
                  <svg className="w-7 h-7 text-amber-300 drop-shadow-[0_2px_6px_rgba(251,191,36,0.6)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 75 L85 75 L92 35 L70 52 L50 20 L30 52 L8 35 Z" fill="currentColor" />
                    <path d="M50 48 C50 53 53 53 53 53 C53 53 53 53 58 53 C53 53 53 58 50 58 C50 58 47 58 47 53 C47 53 47 53 42 53 C47 53 47 48 50 48 Z" fill="#8B5CF6" />
                  </svg>
                </div>

                {/* Text Column */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-amber-200 via-amber-300 to-yellow-500 bg-clip-text text-transparent leading-none">
                    {paying ? 'Processing...' : `Pay ₹${finalPrice} Securely`}
                  </h3>
                  <p className="text-[9px] font-bold text-text-muted tracking-widest uppercase mt-1 leading-none">
                    Start Your Membership
                  </p>
                </div>

                {/* Lock Icon */}
                <Lock className="w-4 h-4 text-accent-purple ml-auto flex-shrink-0 animate-pulse" />
              </button>

              {/* Secured Text under button */}
              <div className="text-center mt-3 space-y-0.5">
                <p className="text-[10px] text-text-faint flex items-center justify-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-text-faint" /> Secured Payment by Razorpay.
                </p>
                <p className="text-[10px] text-text-faint font-medium">Subscription will not auto-renew.</p>
              </div>
            </div>

          </div>

        </div>

        {/* Global Security Footer */}
        <div className="hidden md:flex border-t border-border mt-8 pt-4 items-center justify-center gap-2 text-[11px] text-text-faint text-center w-full font-medium">
          <ShieldCheck className="w-4 h-4 text-text-faint" />
          <span>Your payment is 100% secure. We use industry-standard encryption to protect your data.</span>
        </div>

      </div>
    </div>
  );
};

export default PremiumModal;
