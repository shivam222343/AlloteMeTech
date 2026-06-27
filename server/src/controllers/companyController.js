const Company = require('../models/Company');
const Problem = require('../models/Problem');
const ApiResponse = require('../utils/apiResponse');

// ─── Get All Companies ────────────────────────────────────────────────────────
exports.getCompanies = async (req, res) => {
  const {
    page = 1,
    limit = 20,
    sort = 'name',
    search,
    popular,
    startingWith,
  } = req.query;

  const query = { isEnabled: true };
  if (search) {
    query.name = { $regex: new RegExp(search, 'i') };
  } else if (startingWith) {
    // If startingWith is '#' match anything not starting with a letter
    if (startingWith === '#') {
      query.name = { $regex: /^[^a-zA-Z]/ };
    } else {
      query.name = { $regex: new RegExp('^' + startingWith, 'i') };
    }
  }

  if (popular === 'true') query.isPopular = true;

  const sortMap = {
    name: { name: 1 },
    questions: { totalQuestions: -1 },
    '-name': { name: -1 },
    newest: { createdAt: -1 },
  };

  const sortOption = sortMap[sort] || { name: 1 };
  const skip = (page - 1) * limit;

  const [companies, total] = await Promise.all([
    Company.find(query).sort(sortOption).skip(skip).limit(Number(limit)).lean(),
    Company.countDocuments(query),
  ]);

  return ApiResponse.paginated(
    res,
    companies,
    {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit),
    },
    'Companies fetched'
  );
};

// ─── Get Single Company ───────────────────────────────────────────────────────
exports.getCompany = async (req, res) => {
  const company = await Company.findOne({
    slug: req.params.slug,
    isEnabled: true,
  }).lean();

  if (!company) return ApiResponse.notFound(res, 'Company not found');

  // Difficulty distribution
  const CompanyProblem = require('../models/CompanyProblem');
  
  // We need to group by problem difficulty, so we must populate problem first
  // Alternatively, we can use an aggregation pipeline joining CompanyProblem with Problem
  const distribution = await CompanyProblem.aggregate([
    { $match: { company: company._id } },
    { $lookup: {
        from: 'problems',
        localField: 'problem',
        foreignField: '_id',
        as: 'problemDoc'
    }},
    { $unwind: '$problemDoc' },
    { $match: { 'problemDoc.isActive': true } },
    { $group: { _id: '$problemDoc._id', difficulty: { $first: '$problemDoc.difficulty' } } },
    { $group: { _id: '$difficulty', count: { $sum: 1 } } },
  ]);

  company.difficultyDistribution = distribution.reduce(
    (acc, d) => ({ ...acc, [d._id]: d.count }),
    { Easy: 0, Medium: 0, Hard: 0 }
  );

  return ApiResponse.success(res, { company }, 'Company fetched');
};

// ─── Get Company Problems ─────────────────────────────────────────────────────
exports.getCompanyProblems = async (req, res) => {
  const { slug } = req.params;
  const {
    page = 1,
    limit = 50,
    difficulty,
    sort = 'frequency',
    search,
    topic,
    timeRange, // 30d, 3m, 6m, all
  } = req.query;

  const company = await Company.findOne({ slug, isEnabled: true }).lean();
  if (!company) return ApiResponse.notFound(res, 'Company not found');

  const CompanyProblem = require('../models/CompanyProblem');

  const matchQuery = { company: company._id };

  if (timeRange && timeRange !== 'all') {
    const rangeMap = { '30d': '30_DAYS', '3m': '3_MONTHS', '6m': '6_MONTHS' };
    const mappedRange = rangeMap[timeRange];
    if (mappedRange) {
      matchQuery.timeRange = mappedRange;
    }
  }

  // We need to build an aggregation pipeline to filter problems by topic, difficulty, etc.
  const pipeline = [
    { $match: matchQuery },
    {
      $lookup: {
        from: 'problems',
        localField: 'problem',
        foreignField: '_id',
        as: 'problemDoc'
      }
    },
    { $unwind: '$problemDoc' },
    { $match: { 'problemDoc.isActive': true } }
  ];

  if (difficulty) {
    pipeline.push({ $match: { 'problemDoc.difficulty': difficulty } });
  }

  if (search) {
    // Basic regex search since $text requires it to be the first stage in Mongo, 
    // or we search Problems first.
    pipeline.push({ $match: { 'problemDoc.title': { $regex: search, $options: 'i' } } });
  }

  if (topic) {
    const mongoose = require('mongoose');
    pipeline.push({ $match: { 'problemDoc.topics': new mongoose.Types.ObjectId(topic) } });
  }

  // Group by problem to remove duplicates from different timeRanges, taking max frequency
  pipeline.push({
    $group: {
      _id: '$problemDoc._id',
      problemDoc: { $first: '$problemDoc' },
      frequency: { $max: '$frequency' }
    }
  });

  const sortMap = {
    frequency: { frequency: -1 },
    acceptance: { 'problemDoc.acceptanceRate': -1 },
    '-acceptance': { 'problemDoc.acceptanceRate': 1 },
    title: { 'problemDoc.title': 1 },
    newest: { 'problemDoc.createdAt': -1 },
    oldest: { 'problemDoc.createdAt': 1 },
  };

  const sortOption = sortMap[sort] || { frequency: -1 };
  
  // Total count
  const countPipeline = [...pipeline, { $count: 'total' }];
  const countResult = await CompanyProblem.aggregate(countPipeline);
  const total = countResult.length > 0 ? countResult[0].total : 0;

  // Pagination & Sorting
  pipeline.push({ $sort: sortOption });
  pipeline.push({ $skip: (page - 1) * limit });
  pipeline.push({ $limit: Number(limit) });

  // Populate topics for each problem
  pipeline.push({
    $lookup: {
      from: 'topics',
      localField: 'problemDoc.topics',
      foreignField: '_id',
      as: 'problemDoc.topics'
    }
  });

  const mappings = await CompanyProblem.aggregate(pipeline);

  const problemIds = mappings.map(m => m.problemDoc._id);
  const allCompanyProblems = await CompanyProblem.find({ problem: { $in: problemIds } })
    .populate('company', 'name slug logo hasWhiteBg')
    .lean();

  const cpMap = {};
  for (const cp of allCompanyProblems) {
    if (!cp.company) continue;
    const pId = cp.problem.toString();
    if (!cpMap[pId]) cpMap[pId] = [];
    const existing = cpMap[pId].find(c => c.company._id.toString() === cp.company._id.toString());
    if (!existing) cpMap[pId].push(cp);
  }

  // Flatten the result to match frontend expectations
  const problems = mappings.map(m => {
    return {
      ...m.problemDoc,
      frequency: m.frequency,
      companies: cpMap[m.problemDoc._id.toString()] || []
    };
  });

  return ApiResponse.paginated(
    res,
    problems,
    {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit),
    },
    'Problems fetched'
  );
};
