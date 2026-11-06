const mongoose = require('mongoose');

const jobSettingsSchema = new mongoose.Schema(
  {
    groqApiKey: { type: String, default: '' },
    hiredoorEmail: { type: String, default: '' },
    hiredoorPassword: { type: String, default: '' },

    // ── ATS Daily Auto-Sync Settings ──────────────────────────────────────────
    autoSyncScheduleTime: { type: String, default: '02:00' }, // HH:mm format in 24h (e.g. 02:00)
    autoSyncEnabled: { type: Boolean, default: true },
    autoSyncFilterPostedWithinDays: { type: Number, default: 2 }, // default: last 2 days
    autoSyncFilterExperience: { type: String, default: 'all' },
    autoSyncFilterCategory: { type: String, default: 'all' },
    lastAutoSyncAt: { type: Date, default: null },
    lastAutoSyncResult: {
      companiesProcessed: { type: Number, default: 0 },
      jobsAdded: { type: Number, default: 0 },
      duplicatesSkipped: { type: Number, default: 0 },
      errorsCount: { type: Number, default: 0 },
      completedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('JobSettings', jobSettingsSchema);
