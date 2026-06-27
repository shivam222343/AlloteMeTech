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
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate, registerSchema, loginSchema, forgotPasswordSchema } = require('../middleware/validate');

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/logout', logout);
router.post('/refresh', refreshToken);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.get('/me', protect, getMe);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth_failed` }),
  googleCallback
);

module.exports = router;
