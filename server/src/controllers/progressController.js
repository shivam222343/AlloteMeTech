const UserProgress = require('../models/UserProgress');
const User = require('../models/User');
const Problem = require('../models/Problem');
const ApiResponse = require('../utils/apiResponse');

// ─── Upsert Progress ──────────────────────────────────────────────────────────
exports.upsertProgress = async (req, res) => {
  const userId = req.user._id;
  const { problemId, slug, status, isFavorite, notes, scheduledFor, timeSpent } = req.body;

  let targetProblemId = problemId;
  if (!targetProblemId && slug) {
    const problemDoc = await Problem.findOne({ slug });
    if (problemDoc) {
      targetProblemId = problemDoc._id;
    }
  }

  if (!targetProblemId) {
    return ApiResponse.badRequest(res, 'Problem ID or Slug is required and must match a valid problem');
  }

  const update = {};
  if (status !== undefined) update.status = status;
  if (isFavorite !== undefined) update.isFavorite = isFavorite;
  if (notes !== undefined) update.notes = notes;
  if (scheduledFor !== undefined) update.scheduledFor = scheduledFor ? new Date(scheduledFor) : null;
  if (timeSpent !== undefined) update.timeSpent = timeSpent;

  if (status === 'solved') {
    update.completedAt = new Date();
    update.revisionCount = 0;
  }

  const progress = await UserProgress.findOneAndUpdate(
    { user: userId, problem: targetProblemId },
    { $set: update },
    { new: true, upsert: true }
  );

  // Update user totalSolved count
  if (status === 'solved') {
    const solvedCount = await UserProgress.countDocuments({
      user: userId,
      status: 'solved',
    });
    await User.findByIdAndUpdate(userId, { totalSolved: solvedCount });
  }

  // Emit real-time progress update event
  const io = req.app.get('io');
  if (io) {
    io.to(userId.toString()).emit('progressUpdated');
  }

  return ApiResponse.success(res, { progress }, 'Progress updated');
};

// ─── Get All User Progress ────────────────────────────────────────────────────
exports.getUserProgress = async (req, res) => {
  const userId = req.user._id;
  const { status } = req.query;

  const query = { user: userId };
  if (status) query.status = status;

  const progress = await UserProgress.find(query)
    .populate('problem', 'title slug difficulty frequency acceptance')
    .lean();

  return ApiResponse.success(res, { progress }, 'Progress fetched');
};

// ─── Get Scheduled Problems ───────────────────────────────────────────────────
exports.getScheduled = async (req, res) => {
  const userId = req.user._id;
  const now = new Date();
  const weekFromNow = new Date(now);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const scheduled = await UserProgress.find({
    user: userId,
    scheduledFor: { $gte: now, $lte: weekFromNow },
  })
    .populate('problem', 'title slug difficulty')
    .sort({ scheduledFor: 1 })
    .lean();

  return ApiResponse.success(res, { scheduled }, 'Scheduled problems fetched');
};

// ─── Get Dashboard Stats ──────────────────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  const userId = req.user._id;

  const [scheduled, favorites, revision, solvedAggr, totalAggr] = await Promise.all([
    UserProgress.countDocuments({ user: userId, status: 'scheduled', scheduledFor: { $gte: new Date() } }),
    UserProgress.countDocuments({ user: userId, isFavorite: true }),
    UserProgress.countDocuments({ user: userId, status: 'revision' }),
    UserProgress.aggregate([
      { $match: { user: userId, status: 'solved' } },
      { $lookup: { from: 'problems', localField: 'problem', foreignField: '_id', as: 'problemDoc' } },
      { $unwind: '$problemDoc' },
      { $group: { _id: '$problemDoc.difficulty', count: { $sum: 1 } } }
    ]),
    Problem.aggregate([
      { $group: { _id: '$difficulty', count: { $sum: 1 } } }
    ])
  ]);

  const difficultyStats = {
    easy: { solved: 0, total: 0 },
    medium: { solved: 0, total: 0 },
    hard: { solved: 0, total: 0 }
  };
  let totalSolved = 0;
  let totalProblems = 0;

  totalAggr.forEach(item => {
    if (!item._id) return;
    const diff = item._id.toLowerCase();
    if (difficultyStats[diff]) {
      difficultyStats[diff].total = item.count;
      totalProblems += item.count;
    }
  });

  solvedAggr.forEach(item => {
    if (!item._id) return;
    const diff = item._id.toLowerCase();
    if (difficultyStats[diff]) {
      difficultyStats[diff].solved = item.count;
      totalSolved += item.count;
    }
  });

  // Heatmap data - exactly 12 months or specific year
  const { year } = req.query;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let startDate, endDate;

  if (year && year !== 'Current') {
    const selectedYear = parseInt(year);
    startDate = new Date(selectedYear, 0, 1);
    endDate = new Date(selectedYear, 11, 31);
  } else {
    startDate = new Date(today.getFullYear(), today.getMonth() - 11, 1);
    endDate = today;
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  const heatmapAggr = await UserProgress.aggregate([
    {
      $match: {
        user: userId,
        status: 'solved',
        completedAt: { $gte: startDate, $lte: new Date(endDate.getTime() + 86400000) }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
        count: { $sum: 1 }
      }
    }
  ]);

  const heatmapMap = {};
  heatmapAggr.forEach(item => { heatmapMap[item._id] = item.count; });

  const heatmapData = [];
  const weekDays = [];
  
  let curr = new Date(startDate);
  const tzOffset = curr.getTimezoneOffset() * 60000;

  while (curr <= endDate) {
    const localISOTime = (new Date(curr - tzOffset)).toISOString().split('T')[0];
    const count = heatmapMap[localISOTime] || 0;
    
    heatmapData.push({ date: localISOTime, count });
    curr.setDate(curr.getDate() + 1);
  }
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const localISO = (new Date(d - d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    weekDays.push({
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      count: heatmapMap[localISO] || 0,
    });
  }

  // Recent activity
  const recentActivity = await UserProgress.find({ user: userId, status: 'solved' })
    .populate('problem', 'title slug difficulty')
    .sort({ completedAt: -1 })
    .limit(20)
    .lean();

  return ApiResponse.success(res, {
    solved: totalSolved,
    totalProblems,
    difficultyStats,
    scheduled,
    favorites,
    revision,
    weeklyProgress: weekDays,
    heatmapData,
    recentActivity,
  }, 'Dashboard stats fetched');
};
