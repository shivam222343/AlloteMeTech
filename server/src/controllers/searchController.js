const Problem = require('../models/Problem');
const Company = require('../models/Company');
const Topic = require('../models/Topic');
const ApiResponse = require('../utils/apiResponse');

exports.globalSearch = async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return ApiResponse.success(res, { results: [] }, 'Search results');
  }

  const query = q.trim();
  const regex = new RegExp(query, 'i');

  const [problems, companies, topics] = await Promise.all([
    Problem.find({ title: regex, isActive: true })
      .select('title slug difficulty frequency acceptanceRate leetcodeUrl')
      .limit(8)
      .lean(),
    Company.find({ name: regex, isEnabled: true })
      .select('name slug logo totalQuestions')
      .limit(5)
      .lean(),
    Topic.find({ name: regex })
      .select('name slug problemCount')
      .limit(5)
      .lean(),
  ]);

  const results = [
    ...problems.map((p) => ({ ...p, type: 'problem' })),
    ...companies.map((c) => ({ ...c, type: 'company' })),
    ...topics.map((t) => ({ ...t, type: 'topic' })),
  ];

  return ApiResponse.success(res, { results }, 'Search results');
};
