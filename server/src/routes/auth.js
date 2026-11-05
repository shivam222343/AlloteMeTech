const express = require('express');
const router = express.Router();
const passport = require('passport');
const {
  register,
  login,
  logout,
  getMe,
  refreshToken,
  forgotPassword,
  googleCallback,
  updatePassword,
  resolveClientUrl,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate, registerSchema, loginSchema, forgotPasswordSchema } = require('../middleware/validate');

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/logout', logout);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.put('/update-password', protect, updatePassword);
router.get('/me', protect, getMe);

// Google OAuth (preserves client origin across redirect for local development & production)
router.get('/google', (req, res, next) => {
  let clientOrigin = req.query.origin || req.query.returnTo || req.query.state;
  if (!clientOrigin && req.headers.referer) {
    try {
      clientOrigin = new URL(req.headers.referer).origin;
    } catch {}
  }

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    state: clientOrigin || undefined,
  })(req, res, next);
});

router.get(
  '/google/callback',
  (req, res, next) => {
    const failureTarget = resolveClientUrl ? resolveClientUrl(req) : (process.env.CLIENT_URL || 'http://localhost:5173');
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${failureTarget}/login?error=oauth_failed`,
    })(req, res, next);
  },
  googleCallback
);

module.exports = router;
