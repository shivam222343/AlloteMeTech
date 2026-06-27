const Message = require('../models/Message');
const Company = require('../models/Company');
const Problem = require('../models/Problem');
const ApiResponse = require('../utils/apiResponse');

const POPULATE_AUTHOR = { path: 'author', select: 'name avatar role' };
const POPULATE_REPLY = {
  path: 'replyTo',
  select: 'content author isDeleted',
  populate: { path: 'author', select: 'name avatar' },
};

// ─── Get Messages (public) ────────────────────────────────────────────────────
exports.getMessages = async (req, res) => {
  const { page = 1, limit = 40, before } = req.query;
  const query = { isDeleted: { $ne: true } };
  if (before) query.createdAt = { $lt: new Date(before) };

  const skip = (page - 1) * limit;
  const [messages, total] = await Promise.all([
    Message.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate(POPULATE_AUTHOR)
      .populate(POPULATE_REPLY)
      .lean(),
    Message.countDocuments({}),
  ]);

  // Return oldest-first for display
  return ApiResponse.paginated(
    res,
    messages.reverse(),
    { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    'Messages fetched'
  );
};

// ─── Create Message (auth required) ───────────────────────────────────────────
exports.createMessage = async (req, res) => {
  const { content, replyTo } = req.body;
  if (!content?.trim()) return ApiResponse.badRequest(res, 'Content is required');

  const message = await Message.create({
    content: content.trim(),
    author: req.user._id,
    replyTo: replyTo || null,
  });

  const populated = await Message.findById(message._id)
    .populate(POPULATE_AUTHOR)
    .populate(POPULATE_REPLY)
    .lean();

  // Broadcast via Socket.IO (attached to app)
  const io = req.app.get('io');
  if (io) io.emit('discussion:message:new', populated);

  return ApiResponse.created(res, { message: populated }, 'Message sent');
};

// ─── Edit Message (own only) ──────────────────────────────────────────────────
exports.editMessage = async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return ApiResponse.badRequest(res, 'Content is required');

  const message = await Message.findById(req.params.id);
  if (!message) return ApiResponse.notFound(res, 'Message not found');
  if (message.isDeleted) return ApiResponse.badRequest(res, 'Cannot edit deleted message');
  if (message.author.toString() !== req.user._id.toString()) {
    return ApiResponse.forbidden(res, 'Not your message');
  }

  message.content = content.trim();
  message.editedAt = new Date();
  await message.save();

  const populated = await Message.findById(message._id)
    .populate(POPULATE_AUTHOR)
    .populate(POPULATE_REPLY)
    .lean();

  const io = req.app.get('io');
  if (io) io.emit('discussion:message:edit', populated);

  return ApiResponse.success(res, { message: populated }, 'Message updated');
};

// ─── Delete Message (own or admin) ───────────────────────────────────────────
exports.deleteMessage = async (req, res) => {
  const message = await Message.findById(req.params.id);
  if (!message) return ApiResponse.notFound(res, 'Message not found');

  const isOwner = message.author.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) return ApiResponse.forbidden(res, 'Not authorized');

  // Soft delete
  message.isDeleted = true;
  message.content = '[deleted]';
  await message.save();

  const io = req.app.get('io');
  if (io) io.emit('discussion:message:delete', { _id: message._id, isDeleted: true, content: '[deleted]' });

  return ApiResponse.success(res, null, 'Message deleted');
};

// ─── Toggle Reaction ──────────────────────────────────────────────────────────
exports.reactMessage = async (req, res) => {
  const { emoji } = req.body;
  if (!emoji) return ApiResponse.badRequest(res, 'Emoji required');

  const message = await Message.findById(req.params.id);
  if (!message) return ApiResponse.notFound(res, 'Message not found');
  if (message.isDeleted) return ApiResponse.badRequest(res, 'Cannot react to deleted message');

  const userId = req.user._id.toString();

  // Find if this user has already reacted with any emoji
  let previousEmoji = null;
  for (const r of message.reactions) {
    if (r.users.some((u) => u.toString() === userId)) {
      previousEmoji = r.emoji;
      break;
    }
  }

  if (previousEmoji === emoji) {
    // Clicked same emoji: toggle off
    message.reactions.forEach((r) => {
      if (r.emoji === emoji) {
        r.users = r.users.filter((u) => u.toString() !== userId);
      }
    });
  } else {
    // Clicked different emoji: remove from old reaction
    if (previousEmoji) {
      message.reactions.forEach((r) => {
        if (r.emoji === previousEmoji) {
          r.users = r.users.filter((u) => u.toString() !== userId);
        }
      });
    }

    // Add to new reaction
    const target = message.reactions.find((r) => r.emoji === emoji);
    if (target) {
      if (!target.users.some((u) => u.toString() === userId)) {
        target.users.push(userId);
      }
    } else {
      message.reactions.push({ emoji, users: [userId] });
    }
  }

  // Remove empty reaction objects
  message.reactions = message.reactions.filter((r) => r.users.length > 0);

  await message.save();

  const io = req.app.get('io');
  if (io) io.emit('discussion:message:react', { _id: message._id, reactions: message.reactions });

  return ApiResponse.success(res, { reactions: message.reactions }, 'Reaction updated');
};

// ─── Mention Search (public) ──────────────────────────────────────────────────
exports.searchMentions = async (req, res) => {
  const { q = '' } = req.query;
  if (!q.trim()) return ApiResponse.success(res, { results: [] });

  const regex = new RegExp(q.trim(), 'i');
  const [companies, problems] = await Promise.all([
    Company.find({ name: regex }).select('name slug logo').limit(5).lean(),
    Problem.find({ title: regex, isActive: true }).select('title slug difficulty').limit(5).lean(),
  ]);

  const results = [
    ...companies.map((c) => ({ type: 'company', label: c.name, slug: c.slug, logo: c.logo })),
    ...problems.map((p) => ({ type: 'problem', label: p.title, slug: p.slug, difficulty: p.difficulty })),
  ];

  return ApiResponse.success(res, { results });
};
