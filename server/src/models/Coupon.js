const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  discountPercent: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  expiresAt: {
    type: Date,
  },
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
