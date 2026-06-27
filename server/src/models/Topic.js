const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    icon: { type: String, default: null },
    problemCount: { type: Number, default: 0 },
    color: { type: String, default: '#3B82F6' },
  },
  { timestamps: true }
);


topicSchema.index({ name: 'text' });

module.exports = mongoose.model('Topic', topicSchema);
