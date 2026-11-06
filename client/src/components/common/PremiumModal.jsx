import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { paymentApi } from '../../api';
import { X, CheckCircle, ShieldCheck, Calendar, Building2, BarChart3, Zap, FileText, Check, ArrowRight, Sparkles, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const PremiumModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [planType, setPlanType] = useState('1month'); // '1month' or '3months'
  const [config, setConfig] = useState({
    monthlyPrice: 99,
    threeMonthPrice: 249,
    originalMonthlyPrice: 199,
    originalThreeMonthPrice: 499,
    // fallback backward-compat fields
    actualPrice: 99,
    originalPrice: 199,
  });
  const [modalReason, setModalReason] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [activeCoupon, setActiveCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const { user, loading, fetchMe } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [hasShownOnDashboard, setHasShownOnDashboard] = useState(false);

  // Listen to open-premium-modal custom events (can include a custom message / reason)
  useEffect(() => {
    const handleOpen = (e) => {
      if (e?.detail?.message) {
        setModalReason(e.detail.message);
      } else {
        setModalReason('');
      }
      setIsOpen(true);
    };
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

  const currentBasePrice = planType === '3months'
    ? (config.threeMonthPrice || 249)
    : (config.monthlyPrice || 99);

  const currentOriginalPrice = planType === '3months'
    ? (config.originalThreeMonthPrice || 499)
    : (config.originalMonthlyPrice || 199);

  const finalPrice = activeCoupon
    ? Math.round(currentBasePrice * (1 - activeCoupon.discountPercent / 100))
    : currentBasePrice;

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Please log in first to purchase Premium');
      navigate('/login');
      setIsOpen(false);
      return;
    }

    setPaying(true);
    try {
      const { data } = await paymentApi.createOrder({
        couponCode: activeCoupon?.code,
        planType,
      });
      const order = data.data;

      const planTitle = planType === '3months' ? '3 Months' : '1 Month';

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_SbVLw7f5p7qeQN',
        amount: order.amount,
        currency: order.currency,
        name: 'AlloteMe Tech',
        description: `Premium Subscription (${planTitle})`,
        image: isDark ? '/AlloteMe_Logos.png' : '/AlloteMe_Logos _Light.png',
        order_id: order.id,
        handler: async (response) => {
          const verifyToast = toast.loading('Verifying your payment...');
          try {
            await paymentApi.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planType,
            });
            toast.success('Subscription activated! Welcome to Premium 👑', { id: verifyToast });
            setIsOpen(false);
            await fetchMe();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => !paying && setIsOpen(false)}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md md:max-w-4xl bg-bg-card border border-border rounded-3xl shadow-card-hover overflow-hidden animate-slide-up theme-transition p-5 sm:p-7 flex flex-col justify-between my-auto">

        {/* Close Button */}
        <button
          disabled={paying}
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-1.5 rounded-full hover:bg-bg-secondary text-text-muted transition-colors disabled:opacity-50 z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Optional reason message banner */}
        {modalReason && (
          <div className="mb-4 p-3 rounded-xl bg-accent-purple/10 border border-accent-purple/25 flex items-center gap-2.5 text-xs text-text-primary">
            <Sparkles className="w-4 h-4 text-accent-purple flex-shrink-0" />
            <span className="font-semibold">{modalReason}</span>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 flex-1 items-stretch">

          {/* Left Column: Benefits & Features */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              {/* Header: Dynamic Logo & Badges */}
              <div className="flex items-center gap-2 select-none">
                <img
                  src={isDark ? "/AlloteMe_Logos.png" : "/AlloteMe_Logos _Light.png"}
                  alt="AlloteMe Tech"
                  className="h-8 sm:h-9 w-auto object-contain"
                />
                <span className="ml-1.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-accent-purple/10 text-accent-purple border border-accent-purple/20 uppercase tracking-wider">Premium Plan</span>
              </div>

              {/* Title & Description */}
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-text-primary tracking-tight mt-4 sm:mt-5 mb-2 leading-tight">
                AlloteMe Tech + Jobs Premium.
              </h2>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed max-w-md">
                Unlock all latest job applications, verified recruiter direct links, and company interview preparation.
              </p>

              {/* Benefits list */}
              <div className="mt-5 sm:mt-6 space-y-3.5">
                {/* Benefit 1: Unlock All Jobs & Unlimited Applies */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-text-primary">Unlock All Latest Jobs &amp; Unlimited Applies</h3>
                    <p className="text-[11px] text-text-muted mt-0.5">No locked job cards, no 5-job cap. Apply to unlimited newly posted roles every day.</p>
                  </div>
                </div>

                {/* Benefit 2: Direct ATS & Recruiter Portals */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center text-accent-purple flex-shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-text-primary">12,000+ Company Direct ATS Portals</h3>
                    <p className="text-[11px] text-text-muted mt-0.5">Direct application links to Workday, Greenhouse, Lever, Ashby &amp; SmartRecruiters boards.</p>
                  </div>
                </div>

                {/* Benefit 3: Hidden Recruiter Contacts & HR Emails */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-text-primary">Hidden Recruiter Contacts &amp; Verified HR Emails</h3>
                    <p className="text-[11px] text-text-muted mt-0.5">Direct hiring manager emails and WhatsApp contacts to bypass noisy job boards.</p>
                  </div>
                </div>

                {/* Benefit 4: 450+ Company Coding Problems & Prep */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 flex-shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-text-primary">450+ Company Interview &amp; LeetCode Questions</h3>
                    <p className="text-[11px] text-text-muted mt-0.5">Company-wise asked interview questions with frequency tracking, ATS resume matching &amp; auto-apply workflow.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Highlight Box */}
            <div className="bg-accent-purple/5 border border-accent-purple/10 rounded-xl p-3 sm:p-3.5 flex items-start gap-2.5 mt-5">
              <ShieldCheck className="w-4 h-4 text-accent-purple mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-accent-purple">One-time payment • No auto-debit</p>
                <p className="text-2xs text-text-muted mt-0.5">Pay once via Razorpay (UPI, Cards, NetBanking). Never auto-renews.</p>
              </div>
            </div>
          </div>

          {/* Right Column: Pricing Selector & Checkout */}
          <div className="w-full md:w-[360px] bg-bg-secondary/40 border border-border/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between flex-shrink-0">

            <div>
              {/* Plan Duration Selector (1 Month vs 3 Months) */}
              <div className="mb-4">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-2 text-center">
                  Select Subscription Duration
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {/* Option 1: 1 Month */}
                  <button
                    type="button"
                    onClick={() => setPlanType('1month')}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      planType === '1month'
                        ? 'border-accent-purple bg-accent-purple/10 shadow-[0_0_15px_rgba(139,92,246,0.2)]'
                        : 'border-border bg-bg-card hover:border-border-hover'
                    }`}
                  >
                    <div className="text-xs font-bold text-text-primary">1 Month</div>
                    <div className="text-lg font-black text-text-primary mt-0.5">₹{config.monthlyPrice || 99}</div>
                    <div className="text-[10px] text-text-faint line-through">₹{config.originalMonthlyPrice || 199}</div>
                  </button>

                  {/* Option 2: 3 Months (Recommended) */}
                  <button
                    type="button"
                    onClick={() => setPlanType('3months')}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      planType === '3months'
                        ? 'border-accent-purple bg-accent-purple/10 shadow-[0_0_15px_rgba(139,92,246,0.2)]'
                        : 'border-border bg-bg-card hover:border-border-hover'
                    }`}
                  >
                    <span className="absolute -top-2 right-2 px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-sm">
                      Best Value
                    </span>
                    <div className="text-xs font-bold text-text-primary">3 Months</div>
                    <div className="text-lg font-black text-text-primary mt-0.5">₹{config.threeMonthPrice || 249}</div>
                    <div className="text-[10px] text-text-faint line-through">₹{config.originalThreeMonthPrice || 499}</div>
                  </button>
                </div>
              </div>

              {/* Price Display */}
              <div className="text-center pt-1 pb-3">
                <div className="flex items-baseline justify-center gap-1.5">
                  <span className="text-xs text-text-muted line-through">₹{currentOriginalPrice}</span>
                  {activeCoupon && (
                    <span className="text-xs text-text-faint line-through">₹{currentBasePrice}</span>
                  )}
                  <span className="text-4xl font-black text-text-primary tracking-tight">₹{finalPrice}</span>
                  <span className="text-xs text-text-muted">/ {planType === '3months' ? '3 months' : 'month'}</span>
                </div>
              </div>

              {/* Dotted Line */}
              <div className="border-t border-dashed border-border mb-3" />

              {/* Quick Feature Checklist */}
              <ul className="space-y-2 mb-4">
                {[
                  'Unlock All Latest Verified Jobs (No locked roles)',
                  'Direct ATS Applications (12,000+ Companies)',
                  'Access Hidden HR & Recruiter Contacts',
                  'Instant WhatsApp Alerts & Direct Links',
                  '450+ Company Interview & LeetCode Questions',
                  'Resume Review & ATS Match Scoring',
                ].map((feat, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-accent-green flex-shrink-0" />
                    <span className="text-[11px] text-text-secondary font-medium">{feat}</span>
                  </li>
                ))}
              </ul>

              {/* Coupon Code Section */}
              <div className="mb-4 p-2.5 bg-bg-secondary/60 rounded-xl border border-border">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Coupon Code</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="e.g. DISCOUNT10"
                    disabled={validatingCoupon || activeCoupon || paying}
                    className="flex-1 text-xs py-1 px-2.5 rounded-lg border border-border bg-bg-primary focus:outline-none focus:ring-1 focus:ring-accent-purple uppercase font-semibold text-text-primary"
                  />
                  {activeCoupon ? (
                    <button
                      type="button"
                      onClick={() => { setActiveCoupon(null); setCouponInput(''); }}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/5 transition-colors"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!couponInput || validatingCoupon || paying}
                      onClick={handleApplyCoupon}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-accent-purple text-white hover:opacity-90 transition-all disabled:opacity-50"
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
            </div>

            {/* Secure Action Button */}
            <div>
              <button
                onClick={handleCheckout}
                disabled={paying}
                className="relative group flex items-center gap-3 p-2.5 pr-4 rounded-2xl border border-accent-purple/35 bg-bg-card hover:border-accent-purple/65 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all duration-300 active:scale-[0.98] select-none text-left w-full disabled:opacity-50 cursor-pointer"
              >
                {/* Glow Spark */}
                <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_0_10px_#fbbf24] animate-pulse" />

                {/* Crown Icon Container */}
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg border border-white/10">
                  <svg className="w-6 h-6 text-amber-300 drop-shadow-[0_2px_6px_rgba(251,191,36,0.6)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 75 L85 75 L92 35 L70 52 L50 20 L30 52 L8 35 Z" fill="currentColor" />
                    <path d="M50 48 C50 53 53 53 53 53 C53 53 53 53 58 53 C53 53 53 58 50 58 C50 58 47 58 47 53 C47 53 47 53 42 53 C47 53 47 48 50 48 Z" fill="#8B5CF6" />
                  </svg>
                </div>

                {/* Text Column */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-extrabold tracking-tight bg-gradient-to-r from-amber-200 via-amber-300 to-yellow-500 bg-clip-text text-transparent leading-none">
                    {paying ? 'Processing...' : `Pay Now — ₹${finalPrice}`}
                  </h3>
                  <p className="text-[9px] font-bold text-text-muted tracking-widest uppercase mt-1 leading-none">
                    {planType === '3months' ? '3 Months Full Access' : '1 Month Full Access'}
                  </p>
                </div>

                {/* Professional Arrow instead of Lock */}
                <div className="w-8 h-8 rounded-xl bg-accent-purple/10 border border-accent-purple/30 flex items-center justify-center text-accent-purple ml-auto flex-shrink-0 group-hover:bg-accent-purple group-hover:text-white group-hover:translate-x-0.5 transition-all">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>

              {/* Secured Text under button */}
              <div className="text-center mt-2.5 space-y-0.5">
                <p className="text-[10px] text-text-faint flex items-center justify-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-text-faint" /> Secured Razorpay Checkout.
                </p>
                <p className="text-[10px] text-text-faint font-medium">No auto-renewal. 100% money-safe.</p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default PremiumModal;
