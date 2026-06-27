const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    githubFolder: { type: String, unique: true, sparse: true },
    logo: { type: String, default: null }, // URL from Cloudinary
    description: { type: String, default: '' },
    totalQuestions: { type: Number, default: 0 },
    isEnabled: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
    hasWhiteBg: { type: Boolean, default: false },
    website: { type: String, default: '' },
    industry: { type: String, default: '' },
  },
  { timestamps: true }
);


companySchema.index({ name: 'text' });

module.exports = mongoose.model('Company', companySchema);
