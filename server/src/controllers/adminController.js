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
