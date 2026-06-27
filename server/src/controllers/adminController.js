const User = require('../models/User');
const Company = require('../models/Company');
const Problem = require('../models/Problem');
const Topic = require('../models/Topic');
const UserProgress = require('../models/UserProgress');
const ApiResponse = require('../utils/apiResponse');

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  const [users, companies, problems, topics, activeUsers] = await Promise.all([
    User.countDocuments(),
    Company.countDocuments(),
    Problem.countDocuments({ isActive: true }),
    Topic.countDocuments(),
    User.countDocuments({ lastActivityDate: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
  ]);
  return ApiResponse.success(res, { users, companies, problems, topics, activeUsers }, 'Admin stats');
};

// ─── Users Management ─────────────────────────────────────────────────────────
exports.getUsers = async (req, res) => {
  const { page = 1, limit = 20, search, role } = req.query;
  const query = {};
  if (search) query.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
  if (role) query.role = role;

  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find(query).select('-password -refreshToken').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    User.countDocuments(query),
  ]);
  return ApiResponse.paginated(res, users, { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) });
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { isActive, role } = req.body;
  const user = await User.findByIdAndUpdate(id, { isActive, role }, { new: true }).select('-password -refreshToken');
  if (!user) return ApiResponse.notFound(res, 'User not found');
  return ApiResponse.success(res, { user }, 'User updated');
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  await User.findByIdAndDelete(id);
  await UserProgress.deleteMany({ user: id });
  return ApiResponse.success(res, null, 'User deleted');
};

// ─── Companies Management ─────────────────────────────────────────────────────
exports.createCompany = async (req, res) => {
  const { name, slug, logo, description, website, industry, isPopular } = req.body;
  const company = await Company.create({ name, slug, logo, description, website, industry, isPopular });
  return ApiResponse.created(res, { company }, 'Company created');
};

exports.updateCompany = async (req, res) => {
  const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!company) return ApiResponse.notFound(res, 'Company not found');
  return ApiResponse.success(res, { company }, 'Company updated');
};

exports.deleteCompany = async (req, res) => {
  await Company.findByIdAndDelete(req.params.id);
  return ApiResponse.success(res, null, 'Company deleted');
};

// ─── Problems Management ──────────────────────────────────────────────────────
exports.getProblems = async (req, res) => {
  const { page = 1, limit = 20, search, difficulty } = req.query;
  const query = { isActive: true };
  if (search) query.$or = [{ title: new RegExp(search, 'i') }, { slug: new RegExp(search, 'i') }];
  if (difficulty) query.difficulty = difficulty;

  const skip = (page - 1) * limit;
  const [problems, total] = await Promise.all([
    Problem.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    Problem.countDocuments(query),
  ]);
  return ApiResponse.paginated(res, problems, { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) });
};

exports.createProblem = async (req, res) => {
  const problem = await Problem.create(req.body);
  // If manual creation from admin panel supports companies, it should insert to CompanyProblem now.
  // For simplicity, we assume GitHub Sync is the primary source of truth for problem creation.
  if (problem.topics?.length) {
    await Topic.updateMany({ _id: { $in: problem.topics } }, { $inc: { problemCount: 1 } });
  }
  return ApiResponse.created(res, { problem }, 'Problem created');
};

exports.updateProblem = async (req, res) => {
  const problem = await Problem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!problem) return ApiResponse.notFound(res, 'Problem not found');
  return ApiResponse.success(res, { problem }, 'Problem updated');
};

exports.deleteProblem = async (req, res) => {
  const problem = await Problem.findByIdAndDelete(req.params.id);
  if (!problem) return ApiResponse.notFound(res, 'Problem not found');
  return ApiResponse.success(res, null, 'Problem deleted');
};

// ─── Topics Management ────────────────────────────────────────────────────────
exports.getTopics = async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const query = {};
  if (search) query.name = new RegExp(search, 'i');

  const skip = (page - 1) * limit;
  const [topics, total] = await Promise.all([
    Topic.find(query).sort({ name: 1 }).skip(skip).limit(Number(limit)).lean(),
    Topic.countDocuments(query),
  ]);
  return ApiResponse.paginated(res, topics, { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) });
};

exports.createTopic = async (req, res) => {
  const topic = await Topic.create(req.body);
  return ApiResponse.created(res, { topic }, 'Topic created');
};

exports.updateTopic = async (req, res) => {
  const topic = await Topic.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!topic) return ApiResponse.notFound(res, 'Topic not found');
  return ApiResponse.success(res, { topic }, 'Topic updated');
};

exports.deleteTopic = async (req, res) => {
  await Topic.findByIdAndDelete(req.params.id);
  return ApiResponse.success(res, null, 'Topic deleted');
};

// ─── Analytics ────────────────────────────────────────────────────────────────
exports.getAnalytics = async (req, res) => {
  const [topSolved, leastSolved, popularCompanies, popularTopics] = await Promise.all([
    UserProgress.aggregate([
      { $match: { status: 'solved' } },
      { $group: { _id: '$problem', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'problems', localField: '_id', foreignField: '_id', as: 'problem' } },
      { $unwind: '$problem' },
      { $project: { title: '$problem.title', difficulty: '$problem.difficulty', count: 1 } },
    ]),
    Problem.find({ isActive: true }).sort({ frequency: 1 }).limit(5).select('title difficulty frequency').lean(),
    Company.find({ isEnabled: true }).sort({ totalQuestions: -1 }).limit(10).select('name slug totalQuestions logo').lean(),
    Topic.find().sort({ problemCount: -1 }).limit(10).select('name slug problemCount').lean(),
  ]);

  return ApiResponse.success(res, { topSolved, leastSolved, popularCompanies, popularTopics }, 'Analytics fetched');
};

// ─── User Profile & Stats (Admin) ─────────────────────────────────────────────
exports.getUserDetails = async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id).select('-password -refreshToken').lean();
  if (!user) return ApiResponse.notFound(res, 'User not found');

  // Fetch user progress
  const progress = await UserProgress.find({ user: id })
    .populate('problem', 'title slug difficulty frequency acceptance')
    .lean();

  // Fetch scheduled
  const now = new Date();
  const weekFromNow = new Date(now);
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  const scheduled = await UserProgress.find({
    user: id,
    scheduledFor: { $gte: now, $lte: weekFromNow },
  })
    .populate('problem', 'title slug difficulty')
    .sort({ scheduledFor: 1 })
    .lean();

  // Fetch dashboard stats (similar to getDashboardStats but for the target user id)
  const [scheduledCount, favoritesCount, revisionCount, solvedAggr, totalAggr] = await Promise.all([
    UserProgress.countDocuments({ user: id, status: 'scheduled', scheduledFor: { $gte: new Date() } }),
    UserProgress.countDocuments({ user: id, isFavorite: true }),
    UserProgress.countDocuments({ user: id, status: 'revision' }),
    UserProgress.aggregate([
      { $match: { user: id, status: 'solved' } },
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

  // Heatmap
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today.getFullYear(), today.getMonth() - 11, 1);
  const endDate = today;
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  const heatmapAggr = await UserProgress.aggregate([
    {
      $match: {
        user: id,
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

  const recentActivity = await UserProgress.find({ user: id, status: 'solved' })
    .populate('problem', 'title slug difficulty')
    .sort({ completedAt: -1 })
    .limit(20)
    .lean();

  return ApiResponse.success(res, {
    user,
    progress,
    scheduled,
    stats: {
      solved: totalSolved,
      totalProblems,
      difficultyStats,
      scheduled: scheduledCount,
      favorites: favoritesCount,
      revision: revisionCount,
      weeklyProgress: weekDays,
      heatmapData,
      recentActivity,
    }
  }, 'User details fetched');
};
