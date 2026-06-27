const mongoose = require('mongoose');

const companyProblemSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    problem: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
    timeRange: {
      type: String,
      enum: ['30_DAYS', '3_MONTHS', '6_MONTHS', 'MORE_THAN_6_MONTHS', 'ALL'],
      required: true,
    },
    frequency: { type: Number, default: 0 },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Ensure a problem is not mapped to the same company for the same timeRange multiple times
companyProblemSchema.index({ company: 1, problem: 1, timeRange: 1 }, { unique: true });

module.exports = mongoose.model('CompanyProblem', companyProblemSchema);
