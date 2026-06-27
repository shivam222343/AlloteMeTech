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
  for (const cp of companyProblems) {
    if (!cp.company) continue;
    const pId = cp.problem.toString();
    if (!cpMap[pId]) cpMap[pId] = [];
    // Deduplicate by company since same problem might have multiple timeRanges
    const existing = cpMap[pId].find(c => c.company._id.toString() === cp.company._id.toString());
    if (!existing) cpMap[pId].push(cp);
  }

  problems.forEach(p => {
    p.companies = cpMap[p._id.toString()] || [];
  });

  return ApiResponse.paginated(
    res,
    problems,
    { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    'Problems fetched'
  );
};
