const mongoose = require('mongoose');

const paymentSettingsSchema = new mongoose.Schema({
  monthlyPrice: {
    type: Number,
    required: true,
    default: 99,
  },
  threeMonthPrice: {
    type: Number,
    required: true,
    default: 249,
  },
  originalMonthlyPrice: {
    type: Number,
    default: 199,
  },
  originalThreeMonthPrice: {
    type: Number,
    default: 499,
  },
  // Backwards compatibility
  originalPrice: {
    type: Number,
    default: 199,
  },
  actualPrice: {
    type: Number,
    default: 99,
  },
}, { timestamps: true });

module.exports = mongoose.model('PaymentSettings', paymentSettingsSchema);
