const express = require('express');
const router = express.Router();
const { 
  createOrder, 
  verifyPayment, 
  validateCoupon, 
  getPaymentConfig, 
  updatePaymentConfig, 
  getCoupons, 
  createCoupon, 
  deleteCoupon 
} = require('../controllers/paymentController');
const { protect, adminOnly } = require('../middleware/auth');

// Protect all payment routes - auth is strictly required
router.use(protect);

// Public / User routes
router.get('/config', getPaymentConfig);
router.post('/validate-coupon', validateCoupon);
router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);

// Admin routes
router.put('/config', adminOnly, updatePaymentConfig);
router.get('/coupons', adminOnly, getCoupons);
router.post('/coupons', adminOnly, createCoupon);
router.delete('/coupons/:id', adminOnly, deleteCoupon);

module.exports = router;
