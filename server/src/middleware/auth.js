const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');

const protect = async (req, res, next) => {
  try {
    let token;

    // Check Authorization header first
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return ApiResponse.unauthorized(res, 'Please login to access this resource');
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id).select('-password -refreshToken');

    if (!user) {
      return ApiResponse.unauthorized(res, 'User no longer exists');
    }

    // Session token check for single device login validation
    if (decoded.sessionToken && user.currentSessionToken && decoded.sessionToken !== user.currentSessionToken) {
      return ApiResponse.unauthorized(res, 'Your account was logged in on another device. Please log in again.');
    }

    if (!user.isActive) {
      return ApiResponse.forbidden(res, 'Your account has been suspended');
    }

    req.user = user;
    next();
  } catch (err) {
    return ApiResponse.unauthorized(res, 'Invalid or expired token');
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return ApiResponse.forbidden(res, 'Admin access required');
  }
  next();
};

const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }
    if (token) {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.id).select('-password -refreshToken');
      if (user && user.isActive) {
        // Only set req.user if session token matches
        if (!decoded.sessionToken || !user.currentSessionToken || decoded.sessionToken === user.currentSessionToken) {
          req.user = user;
        }
      }
    }
  } catch (err) {}
  next();
};

module.exports = { protect, adminOnly, optionalAuth };
