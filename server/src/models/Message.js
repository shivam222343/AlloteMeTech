const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  emoji: { type: String, required: true },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { _id: false });

const messageSchema = new mongoose.Schema(
  {
    content: { type: String, required: true, maxlength: 2000 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reactions: [reactionSchema],
    isDeleted: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  },
  { timestamps: true }
);

messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
