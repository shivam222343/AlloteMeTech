const Topic = require('../models/Topic');
const Problem = require('../models/Problem');
const ApiResponse = require('../utils/apiResponse');

exports.getTopics = async (req, res) => {
  const topics = await Topic.find().sort({ problemCount: -1 }).lean();
  
  if (req.user) {
    const UserProgress = require('../models/UserProgress');
    const solvedAggr = await UserProgress.aggregate([
      { $match: { user: req.user._id, status: 'solved' } },
      { $lookup: { from: 'problems', localField: 'problem', foreignField: '_id', as: 'problemDoc' } },
      { $unwind: '$problemDoc' },
      { $unwind: { path: '$problemDoc.topics', preserveNullAndEmptyArrays: false } },
      { $group: { _id: '$problemDoc.topics', solvedCount: { $sum: 1 } } }
    ]);
    
    const solvedMap = {};
    solvedAggr.forEach(item => { solvedMap[item._id.toString()] = item.solvedCount; });
    
    topics.forEach(t => {
      t.solvedCount = solvedMap[t._id.toString()] || 0;
    });
  }

  return ApiResponse.success(res, { topics }, 'Topics fetched');
};

exports.getTopic = async (req, res) => {
  const topic = await Topic.findOne({ slug: req.params.slug }).lean();
  if (!topic) return ApiResponse.notFound(res, 'Topic not found');
  return ApiResponse.success(res, { topic }, 'Topic fetched');
};

exports.getTopicProblems = async (req, res) => {
  const { slug } = req.params;
  const { page = 1, limit = 50, difficulty, sort = 'frequency', search } = req.query;

  const topic = await Topic.findOne({ slug }).lean();
  if (!topic) return ApiResponse.notFound(res, 'Topic not found');

  const matchQuery = { topics: topic._id, isActive: true };
  if (difficulty) matchQuery.difficulty = difficulty;
  if (search) matchQuery.$text = { $search: search };

  const sortMap = {
    frequency: { frequency: -1 },
    acceptance: { acceptanceRate: -1 },
    title: { title: 1 },
  };

  const skip = (page - 1) * limit;

  const [problems, total] = await Promise.all([
    Problem.find(matchQuery)
      .populate('topics', 'name slug')
      .sort(sortMap[sort] || { frequency: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Problem.countDocuments(matchQuery),
  ]);

  const problemIds = problems.map(p => p._id);
  const CompanyProblem = require('../models/CompanyProblem');
  const companyProblems = await CompanyProblem.find({ problem: { $in: problemIds } })
    .populate('company', 'name slug logo hasWhiteBg')
    .lean();

  const cpMap = {};
  const problemTimeRanges = {}; // Track all timeRanges associated with each problem
  for (const cp of companyProblems) {
    if (!cp.company) continue;
    const pId = cp.problem.toString();
    
    if (!problemTimeRanges[pId]) {
      problemTimeRanges[pId] = new Set();
    }
    if (cp.timeRange) {
      problemTimeRanges[pId].add(cp.timeRange);
    }

    if (!cpMap[pId]) cpMap[pId] = [];
    const existing = cpMap[pId].find(c => c.company._id.toString() === cp.company._id.toString());
    if (!existing) cpMap[pId].push(cp);
  }

  // Get premium status of user securely
  let isPremiumUser = false;
  if (req.user) {
    const User = require('../models/User');
    const user = await User.findById(req.user._id).lean();
    if (user && user.isPremium && user.premiumExpiresAt && new Date(user.premiumExpiresAt) > new Date()) {
      isPremiumUser = true;
    }
  }

  problems.forEach(p => {
    const pId = p._id.toString();
    p.companies = cpMap[pId] || [];

    // Requires premium if asked in 30_DAYS (30d) or 3_MONTHS (90d)
    const ranges = problemTimeRanges[pId] || new Set();
    const requiresPremium = ranges.has('30_DAYS') || ranges.has('3_MONTHS');
    const isLocked = requiresPremium && !isPremiumUser;

    p.isLocked = isLocked;
    p.timeRanges = Array.from(ranges);
    if (isLocked) {
      p.leetcodeUrl = null;
      p.leetcodeId = null;
    }
  });

  return ApiResponse.paginated(
    res,
    problems,
    { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    'Problems fetched'
  );
};
