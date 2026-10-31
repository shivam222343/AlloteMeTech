const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
  companyTag: { type: String, default: '' }, // slug of company e.g. "flipkart"
  companyName: { type: String, default: '' }, // fallback if no company match
  companyLogo: { type: String, default: '' }, // fallback logo URL
  description: { type: String, default: '' },
  responsibilities: [{ type: String }],
  requirements: [{ type: String }],
  location: { type: String, default: 'Remote' },
  workMode: { type: String, enum: ['Remote', 'Hybrid', 'On-site'], default: 'Remote' },
  jobType: { type: String, enum: ['Full-time', 'Part-time', 'Internship', 'Contract', 'Freelance'], default: 'Full-time' },
  salary: { type: String, default: '' },
  experience: { type: String, default: '' },
  eligibleBatch: { type: String, default: '' },
  applyLink: { type: String, default: '' },
  applyEmail: { type: String, default: '' },
  contactPhone: { type: String, default: '' },
  deadline: { type: Date, default: null },
  tags: [{ type: String }],
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  source: { type: String, enum: ['manual', 'ai', 'scraped'], default: 'manual' },
  sourceUrl: { type: String, default: '' }, // original URL for scraped jobs
  postedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },
}, { timestamps: true });

jobSchema.index({ title: 'text', companyName: 'text', description: 'text' });
jobSchema.index({ isActive: 1, postedAt: -1 });
jobSchema.index({ companyTag: 1 });

module.exports = mongoose.model('Job', jobSchema);
