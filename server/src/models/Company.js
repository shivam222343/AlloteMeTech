const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    githubFolder: { type: String, unique: true, sparse: true },
    logo: { type: String, default: null }, // URL from Cloudinary or external CDN
    description: { type: String, default: '' },
    totalQuestions: { type: Number, default: 0 },
    isEnabled: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
    hasWhiteBg: { type: Boolean, default: false },
    website: { type: String, default: '' },
    industry: { type: String, default: '' },

    // ── ATS Job Board Fields (from Directory CSV & Live Sync) ─────────────────
    platform: {
      type: String,
      default: null,
      index: true,
      lowercase: true,
      trim: true,
    },
    token: { type: String, default: '', trim: true },
    boardUrl: { type: String, default: '', trim: true },
    apiUrl: { type: String, default: '', trim: true },
    openRoles: { type: Number, default: 0 },
    region: { type: String, default: '', trim: true },

    // Live Sync & Scrape Tracking
    lastSyncAt: { type: Date, default: null },
    syncStatus: {
      type: String,
      enum: ['idle', 'syncing', 'success', 'failed'],
      default: 'idle',
    },
    syncError: { type: String, default: '' },
    isAutoSync: { type: Boolean, default: false, index: true },
    jobCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

companySchema.index({ name: 'text', slug: 'text', token: 'text' });
companySchema.index({ platform: 1, openRoles: -1 });

module.exports = mongoose.model('Company', companySchema);
