const mongoose = require('mongoose');

const paymentSettingsSchema = new mongoose.Schema({
  originalPrice: {
    type: Number,
    required: true,
    default: 299,
  },
  actualPrice: {
    type: Number,
    required: true,
    default: 59,
  },
}, { timestamps: true });

module.exports = mongoose.model('PaymentSettings', paymentSettingsSchema);
