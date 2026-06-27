const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  cookieOptions,
} = require('../utils/jwt');

const crypto = require('crypto');

const sendTokens = async (res, user, statusCode = 200, message = 'Success') => {
  const sessionToken = crypto.randomBytes(16).toString('hex');
  user.currentSessionToken = sessionToken;
  await user.save();

  const accessToken = generateAccessToken(user._id, user.role, sessionToken);
  const isPremium = !!(user.isPremium && user.premiumExpiresAt && new Date(user.premiumExpiresAt) > new Date());
  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
    streak: user.streak,
    totalSolved: user.totalSolved,
    isPremium,
    premiumExpiresAt: user.premiumExpiresAt,
  };

  return ApiResponse.success(res, { user: userData, accessToken }, message, statusCode);
};

// ─── Register ─────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    return ApiResponse.badRequest(res, 'Email is already registered');
  }

  const user = await User.create({ name, email, password, isVerified: true });
  return sendTokens(res, user, 201, 'Account created successfully');
};

// ─── Login ────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !user.password) {
    return ApiResponse.unauthorized(res, 'Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return ApiResponse.unauthorized(res, 'Invalid email or password');
  }

  if (!user.isActive) {
    return ApiResponse.forbidden(res, 'Your account has been suspended');
  }

  return sendTokens(res, user, 200, 'Login successful');
};

// ─── Google OAuth Callback ────────────────────────────────────────────────────
exports.googleCallback = async (req, res) => {
  try {
    const user = req.user;
    const crypto = require('crypto');
    const sessionToken = crypto.randomBytes(16).toString('hex');
    user.currentSessionToken = sessionToken;
    await user.save();

    const accessToken = generateAccessToken(user._id, user.role, sessionToken);

    res.redirect(`${process.env.CLIENT_URL}/dashboard?token=${accessToken}`);
  } catch {
    res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
  }
};

// ─── Refresh Token ────────────────────────────────────────────────────────────
exports.refreshToken = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return ApiResponse.unauthorized(res, 'No refresh token');

  const decoded = verifyRefreshToken(token);
  const user = await User.findById(decoded.id).select('+refreshToken');

  if (!user || user.refreshToken !== token) {
    return ApiResponse.unauthorized(res, 'Invalid refresh token');
  }

  const newAccessToken = generateAccessToken(user._id, user.role, user.currentSessionToken);
  res.cookie('accessToken', newAccessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  return ApiResponse.success(res, { accessToken: newAccessToken }, 'Token refreshed');
};

// ─── Logout ───────────────────────────────────────────────────────────────────
exports.logout = async (req, res) => {
  // Since we're using JWTs in LocalStorage, logout is primarily a frontend action.
  return ApiResponse.success(res, null, 'Logged out successfully');
};

// ─── Get Me ───────────────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  return ApiResponse.success(res, { user: req.user }, 'User fetched');
};

// ─── Forgot Password (stub — wire email in future) ────────────────────────────
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal if email exists
    return ApiResponse.success(res, null, 'If that email exists, a reset link was sent');
  }
  // TODO: Send email with token
  return ApiResponse.success(res, null, 'Password reset link sent to your email');
};
