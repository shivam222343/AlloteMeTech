const mongoose = require('mongoose');

const paymentSettingsSchema = new mongoose.Schema({
  originalPrice: {
    type: Number,
    required: true,
    default: 99,
  },
  actualPrice: {
    type: Number,
    required: true,
    default: 49,
  },
}, { timestamps: true });

module.exports = mongoose.model('PaymentSettings', paymentSettingsSchema);
