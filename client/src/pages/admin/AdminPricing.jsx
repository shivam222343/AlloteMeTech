import { useState, useEffect } from 'react';
import { paymentApi } from '../../api';
import { CreditCard, Percent, Tag, Plus, Trash2, Save, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminPricing = () => {
  const [config, setConfig] = useState({ originalPrice: 299, actualPrice: 59 });
  const [saveLoading, setSaveLoading] = useState(false);

  const [coupons, setCoupons] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState('');
  const [couponExpiry, setCouponExpiry] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Fetch active settings and existing coupons on mount
  useEffect(() => {
    fetchConfig();
    fetchCoupons();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data } = await paymentApi.getConfig();
      if (data?.data) {
        setConfig({
          originalPrice: data.data.originalPrice,
          actualPrice: data.data.actualPrice,
        });
      }
    } catch (err) {
      toast.error('Failed to load pricing config');
    }
  };

  const fetchCoupons = async () => {
    try {
      const { data } = await paymentApi.getCoupons();
      setCoupons(data.data || []);
    } catch (err) {
      toast.error('Failed to load coupons list');
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      await paymentApi.updateConfig({
        originalPrice: Number(config.originalPrice),
        actualPrice: Number(config.actualPrice),
      });
      toast.success('Pricing configuration updated successfully!');
      fetchConfig();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update pricing');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode || !couponDiscount) {
      toast.error('Code and discount percent are required');
      return;
    }

    setCreateLoading(true);
    try {
      await paymentApi.createCoupon({
        code: couponCode.trim().toUpperCase(),
        discountPercent: Number(couponDiscount),
        expiresAt: couponExpiry ? new Date(couponExpiry) : undefined,
      });
      toast.success(`Coupon code ${couponCode.toUpperCase()} created successfully!`);
      setCouponCode('');
      setCouponDiscount('');
      setCouponExpiry('');
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create coupon');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteCoupon = async (id, code) => {
    if (!window.confirm(`Are you sure you want to delete coupon code ${code}?`)) {
      return;
    }

    try {
      await paymentApi.deleteCoupon(id);
      toast.success(`Coupon code ${code} deleted successfully.`);
      fetchCoupons();
    } catch (err) {
      toast.error('Failed to delete coupon');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">Pricing & Coupons</h1>
        <p className="text-xs text-text-muted mt-1">Adjust premium pricing options and configure discount campaigns.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Pricing Plan settings */}
        <div className="card p-5 space-y-4 h-fit">
          <div className="flex items-center gap-2 border-b border-border pb-3 mb-2">
            <CreditCard className="w-4 h-4 text-accent-blue" />
            <h2 className="text-sm font-bold text-text-primary">Package Pricing Settings</h2>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div>
              <label className="text-xs text-text-muted font-semibold block mb-1">Original Price (₹)</label>
              <input
                type="number"
                min="0"
                value={config.originalPrice}
                onChange={(e) => setConfig({ ...config, originalPrice: e.target.value })}
                className="w-full input text-sm"
                required
              />
              <p className="text-3xs text-text-faint mt-1">Shown cutted out (e.g. <s>₹99</s>) to display value discount.</p>
            </div>

            <div>
              <label className="text-xs text-text-muted font-semibold block mb-1">Actual Selling Price (₹)</label>
              <input
                type="number"
                min="0"
                value={config.actualPrice}
                onChange={(e) => setConfig({ ...config, actualPrice: e.target.value })}
                className="w-full input text-sm"
                required
              />
              <p className="text-3xs text-text-faint mt-1">The base checkout price that users pay before coupons.</p>
            </div>

            <button
              type="submit"
              disabled={saveLoading}
              className="w-full btn btn-primary flex items-center justify-center gap-1.5 py-2"
            >
              <Save className="w-4 h-4" />
              {saveLoading ? 'Saving...' : 'Save Pricing'}
            </button>
          </form>
        </div>

        {/* Center Column: Create Coupon Form */}
        <div className="card p-5 space-y-4 h-fit">
          <div className="flex items-center gap-2 border-b border-border pb-3 mb-2">
            <Plus className="w-4 h-4 text-accent-purple" />
            <h2 className="text-sm font-bold text-text-primary">Create Discount Coupon</h2>
          </div>

          <form onSubmit={handleCreateCoupon} className="space-y-4">
            <div>
              <label className="text-xs text-text-muted font-semibold block mb-1">Coupon Code</label>
              <input
                type="text"
                placeholder="LUNCH10"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="w-full input text-sm uppercase font-mono"
                required
              />
              <p className="text-3xs text-text-faint mt-1">Unique alphanumeric string (e.g. PROMO20).</p>
            </div>

            <div>
              <label className="text-xs text-text-muted font-semibold block mb-1">Discount Percent (%)</label>
              <input
                type="number"
                min="1"
                max="100"
                placeholder="10"
                value={couponDiscount}
                onChange={(e) => setCouponDiscount(e.target.value)}
                className="w-full input text-sm"
                required
              />
              <p className="text-3xs text-text-faint mt-1">Percentage value subtracted from the actual price.</p>
            </div>

            <div>
              <label className="text-xs text-text-muted font-semibold block mb-1">Expiry Date (Optional)</label>
              <div className="relative">
                <input
                  type="date"
                  value={couponExpiry}
                  onChange={(e) => setCouponExpiry(e.target.value)}
                  className="w-full input text-sm pl-9"
                />
                <Calendar className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={createLoading}
              className="w-full btn btn-primary flex items-center justify-center gap-1.5 py-2"
            >
              <Percent className="w-4 h-4" />
              {createLoading ? 'Creating...' : 'Create Coupon'}
            </button>
          </form>
        </div>

        {/* Right Column: Existing Coupons List */}
        <div className="card p-5 space-y-4 lg:col-span-1">
          <div className="flex items-center gap-2 border-b border-border pb-3 mb-2">
            <Tag className="w-4 h-4 text-accent-green" />
            <h2 className="text-sm font-bold text-text-primary">Active Coupon Campaigns</h2>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto admin-scroll pr-1">
            {coupons.length === 0 ? (
              <div className="text-center py-10 text-text-faint text-xs">
                No active coupon codes found
              </div>
            ) : (
              coupons.map((c) => (
                <div key={c._id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-bg-secondary/40">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider">{c.code}</span>
                      <span className="badge badge-green text-3xs">{c.discountPercent}% Off</span>
                    </div>
                    {c.expiresAt ? (
                      <p className="text-3xs text-text-faint mt-1">
                        Expires {new Date(c.expiresAt).toLocaleDateString()}
                      </p>
                    ) : (
                      <p className="text-3xs text-text-faint mt-1">Never expires</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteCoupon(c._id, c.code)}
                    className="p-1 rounded text-text-faint hover:text-accent-red hover:bg-accent-red/10 transition-colors"
                    title="Delete Coupon"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminPricing;
