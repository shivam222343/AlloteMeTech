const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    leetcodeUrl: { type: String, required: true },
    leetcodeId: { type: Number, default: null },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      required: true,
    },
    acceptanceRate: { type: Number, default: 0 }, // percentage
    frequency: { type: Number, default: 0 }, // 0–100 score
    topics: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Topic' }],
    isActive: { type: Boolean, default: true },
    isPremium: { type: Boolean, default: false },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);


problemSchema.index({ difficulty: 1 });
problemSchema.index({ frequency: -1 });
problemSchema.index({ title: 'text' });

module.exports = mongoose.model('Problem', problemSchema);
