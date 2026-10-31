const mongoose = require('mongoose');

const jobSettingsSchema = new mongoose.Schema(
  {
    groqApiKey: { type: String, default: '' },
    hiredoorEmail: { type: String, default: '' },
    hiredoorPassword: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('JobSettings', jobSettingsSchema);

