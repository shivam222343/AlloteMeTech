const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const PaymentSettings = require('../models/PaymentSettings');
const ApiResponse = require('../utils/apiResponse');

// Check that environment variables exist
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error('[RAZORPAY] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in env variables!');
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'dummy_id',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
});

// ─── Helpers: Lazy Seed Pricing & Coupon ──────────────────────────────────────
const getSettings = async () => {
  let settings = await PaymentSettings.findOne();
  if (!settings) {
    settings = await PaymentSettings.create({ originalPrice: 99, actualPrice: 49 });
  }
  return settings;
};

const findValidCoupon = async (code) => {
  if (!code) return null;
  const upperCode = code.trim().toUpperCase();

  // Lazy seed the required LUNCH10 coupon if it does not exist
  if (upperCode === 'LUNCH10') {
    let lunchCoupon = await Coupon.findOne({ code: 'LUNCH10' });
    if (!lunchCoupon) {
      await Coupon.create({ code: 'LUNCH10', discountPercent: 10 });
    }
  }

  const coupon = await Coupon.findOne({ code: upperCode, isActive: true });
  if (coupon && (!coupon.expiresAt || new Date(coupon.expiresAt) > new Date())) {
    return coupon;
  }
  return null;
};

// ─── Get Payment Config (Public/User) ─────────────────────────────────────────
exports.getPaymentConfig = async (req, res) => {
  try {
    const settings = await getSettings();
    return ApiResponse.success(res, settings, 'Payment config fetched');
  } catch (error) {
    return ApiResponse.serverError(res, 'Error fetching payment configuration');
  }
};

// ─── Validate Coupon (User) ───────────────────────────────────────────────────
exports.validateCoupon = async (req, res) => {
  const { code } = req.body;
  if (!code) return ApiResponse.badRequest(res, 'Coupon code is required');

  try {
    const coupon = await findValidCoupon(code);
    if (!coupon) {
      return ApiResponse.badRequest(res, 'Invalid or expired coupon code');
    }
    return ApiResponse.success(res, {
      code: coupon.code,
      discountPercent: coupon.discountPercent,
    }, 'Coupon code validated successfully');
  } catch (error) {
    return ApiResponse.serverError(res, 'Error validating coupon code');
  }
};

// ─── Create Razorpay Order with optional Coupon Discount ──────────────────────
exports.createOrder = async (req, res) => {
  const { couponCode } = req.body;

  try {
    const settings = await getSettings();
    let finalPrice = settings.actualPrice;

    if (couponCode) {
      const coupon = await findValidCoupon(couponCode);
      if (coupon) {
        finalPrice = settings.actualPrice * (1 - coupon.discountPercent / 100);
      }
    }

    const amountInPaise = Math.round(finalPrice * 100);

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${req.user._id.toString().slice(-8)}_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    if (!order) {
      return ApiResponse.badRequest(res, 'Razorpay order creation failed');
    }
    
    return ApiResponse.success(res, {
      ...order,
      actualPrice: settings.actualPrice,
      discountedPrice: finalPrice
    }, 'Razorpay order created successfully');
  } catch (error) {
    console.error('[RAZORPAY] Create Order Error:', error);
    return ApiResponse.badRequest(res, `Failed to initiate payment: ${error.message}`);
  }
};

// ─── Verify Razorpay Signature and Activate Subscription ──────────────────────
exports.verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return ApiResponse.badRequest(res, 'Missing required payment verification parameters');
  }

  try {
    // SHA256 Signature verification
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    const isVerified = generatedSignature === razorpay_signature;

    if (!isVerified) {
      return ApiResponse.badRequest(res, 'Payment verification failed. Invalid signature.');
    }

    // Activate premium status
    const user = await User.findById(req.user._id);
    if (!user) {
      return ApiResponse.notFound(res, 'User account not found');
    }

    user.isPremium = true;
    user.premiumExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 Year Expiry
    user.premiumOrderId = razorpay_order_id;
    user.premiumPaymentId = razorpay_payment_id;
    await user.save();

    console.log(`[SUBSCRIPTION] Premium activated for user ${user.email} until ${user.premiumExpiresAt}`);

    return ApiResponse.success(
      res,
      {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isPremium: true,
          premiumExpiresAt: user.premiumExpiresAt,
        },
      },
      'Subscription successfully activated for 1 year!'
    );
  } catch (error) {
    console.error('[RAZORPAY] Verify Payment Error:', error);
    return ApiResponse.serverError(res, 'Error verifying payment details');
  }
};

// ─── ADMIN: Update Payment Pricing settings ───────────────────────────────────
exports.updatePaymentConfig = async (req, res) => {
  const { originalPrice, actualPrice } = req.body;
  if (!originalPrice || !actualPrice) {
    return ApiResponse.badRequest(res, 'Both originalPrice and actualPrice are required');
  }

  try {
    let settings = await PaymentSettings.findOne();
    if (!settings) {
      settings = new PaymentSettings();
    }
    settings.originalPrice = Number(originalPrice);
    settings.actualPrice = Number(actualPrice);
    await settings.save();

    return ApiResponse.success(res, settings, 'Payment pricing updated successfully');
  } catch (error) {
    return ApiResponse.serverError(res, 'Failed to update pricing settings');
  }
};

// ─── ADMIN: Manage Coupon Codes ───────────────────────────────────────────────
exports.getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    return ApiResponse.success(res, coupons, 'Coupons fetched');
  } catch (error) {
    return ApiResponse.serverError(res, 'Failed to fetch coupons');
  }
};

exports.createCoupon = async (req, res) => {
  const { code, discountPercent, expiresAt } = req.body;
  if (!code || discountPercent === undefined) {
    return ApiResponse.badRequest(res, 'Code and discountPercent are required');
  }

  try {
    const existing = await Coupon.findOne({ code: code.toUpperCase() });
    if (existing) {
      return ApiResponse.badRequest(res, 'Coupon code already exists');
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discountPercent: Number(discountPercent),
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    return ApiResponse.success(res, coupon, 'Coupon code created successfully');
  } catch (error) {
    return ApiResponse.serverError(res, 'Failed to create coupon code');
  }
};

exports.deleteCoupon = async (req, res) => {
  const { id } = req.params;

  try {
    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) {
      return ApiResponse.notFound(res, 'Coupon not found');
    }
    return ApiResponse.success(res, null, 'Coupon code deleted successfully');
  } catch (error) {
    return ApiResponse.serverError(res, 'Failed to delete coupon code');
  }
};
