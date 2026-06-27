const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, minlength: 6, select: false },
    googleId: { type: String, unique: true, sparse: true },
    avatar: { type: String, default: null },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    refreshToken: { type: String, select: false },
    streak: { type: Number, default: 0 },
    lastActivityDate: { type: Date, default: null },
    totalSolved: { type: Number, default: 0 },
    totalPracticeTime: { type: Number, default: 0 }, // in minutes
    badges: [{ name: String, earnedAt: Date }],
    forgotPasswordToken: { type: String, select: false },
    forgotPasswordExpire: { type: Date, select: false },
    isPremium: { type: Boolean, default: false },
    premiumExpiresAt: { type: Date, default: null },
    premiumOrderId: { type: String, default: null },
    premiumPaymentId: { type: String, default: null },
    currentSessionToken: { type: String, default: null },


  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
