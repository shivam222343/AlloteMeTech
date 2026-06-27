const mongoose = require('mongoose');

const userProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    problem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem',
      required: true,
    },
    status: {
      type: String,
      enum: ['not_started', 'solved', 'revision', 'scheduled', 'favorite'],
      default: 'not_started',
    },
    isFavorite: { type: Boolean, default: false },
    notes: { type: String, default: '', maxlength: 2000 },
    revisionCount: { type: Number, default: 0 },
    completedAt: { type: Date, default: null },
    scheduledFor: { type: Date, default: null },
    timeSpent: { type: Number, default: 0 }, // minutes
  },
  { timestamps: true }
);

userProgressSchema.index({ user: 1, problem: 1 }, { unique: true });
userProgressSchema.index({ user: 1, status: 1 });
userProgressSchema.index({ user: 1, scheduledFor: 1 });
userProgressSchema.index({ user: 1, isFavorite: 1 });

module.exports = mongoose.model('UserProgress', userProgressSchema);
