const mongoose = require('mongoose');
const Company = require('../models/Company');
const Problem = require('../models/Problem');
const Job = require('../models/Job');
const JobSettings = require('../models/JobSettings');
const ApiResponse = require('../utils/apiResponse');
const { syncJobsForCompany, globalSyncCompanies } = require('../services/atsScraperService');
const { rescheduleDailySync, runAutoSyncNow } = require('../services/atsSchedulerService');
const {
  logScraper,
  getActiveSyncState,
  resetSyncSession,
  getIsSyncCancelled,
  setIsSyncCancelled,
} = require('./jobController');

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
  const { slug } = req.params;
  const isObjectId = mongoose.Types.ObjectId.isValid(slug);
  const company = await Company.findOne(
    isObjectId ? { _id: slug } : { slug: slug.toLowerCase() }
  ).lean();

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
    if (timeRange === '30d') {
      matchQuery.timeRange = '30_DAYS';
    } else if (timeRange === '3m') {
      matchQuery.timeRange = { $in: ['30_DAYS', '3_MONTHS'] };
    } else if (timeRange === '6m') {
      matchQuery.timeRange = { $in: ['30_DAYS', '3_MONTHS', '6_MONTHS'] };
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

  // Group by problem to remove duplicates from different timeRanges, taking max frequency and collecting time ranges
  pipeline.push({
    $group: {
      _id: '$problemDoc._id',
      problemDoc: { $first: '$problemDoc' },
      frequency: { $max: '$frequency' },
      timeRanges: { $addToSet: '$timeRange' }
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

  // Get active premium status for the user securely
  let isPremiumUser = false;
  if (req.user) {
    const User = require('../models/User');
    const user = await User.findById(req.user._id).lean();
    if (user && user.isPremium && user.premiumExpiresAt && new Date(user.premiumExpiresAt) > new Date()) {
      isPremiumUser = true;
    }
  }

  // Flatten the result to match frontend expectations
  const problems = mappings.map(m => {
    // 30_DAYS (last 30 days) and 3_MONTHS (last 90 days, which covers 60 days) require premium
    const requiresPremium = m.timeRanges && m.timeRanges.some(tr => tr === '30_DAYS' || tr === '3_MONTHS');
    const isLocked = requiresPremium && !isPremiumUser;

    return {
      ...m.problemDoc,
      frequency: m.frequency,
      companies: cpMap[m.problemDoc._id.toString()] || [],
      isLocked,
      timeRanges: m.timeRanges,
      // Strictly redact leetcode reference if locked to prevent client-side inspect bypasses
      leetcodeUrl: isLocked ? null : m.problemDoc.leetcodeUrl,
      leetcodeId: isLocked ? null : m.problemDoc.leetcodeId,
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

// ─── Admin: Get Companies with Full Filters & Stats ──────────────────────────
exports.getAdminCompanies = async (req, res) => {
  const {
    page = 1,
    limit = 25,
    search = '',
    platform = 'all',
    hasOpenRoles = 'all',
    isAutoSync = 'all',
    syncStatus = 'all',
    startingWith = '',
    sort = 'openRoles',
  } = req.query;

  const query = {};

  if (search && search.trim()) {
    const s = search.trim();
    query.$or = [
      { name: new RegExp(s, 'i') },
      { slug: new RegExp(s, 'i') },
      { token: new RegExp(s, 'i') },
      { boardUrl: new RegExp(s, 'i') },
    ];
  }

  if (platform && platform !== 'all') {
    query.platform = platform.toLowerCase();
  }

  if (hasOpenRoles === 'yes') {
    query.openRoles = { $gt: 0 };
  } else if (hasOpenRoles === 'no') {
    query.$or = [{ openRoles: { $lte: 0 } }, { openRoles: null }, { openRoles: { $exists: false } }];
  }

  if (isAutoSync === 'true') {
    query.isAutoSync = true;
  } else if (isAutoSync === 'false') {
    query.isAutoSync = false;
  }

  if (syncStatus && syncStatus !== 'all') {
    query.syncStatus = syncStatus;
  }

  if (startingWith) {
    if (startingWith === '#') {
      query.name = { $regex: /^[^a-zA-Z]/ };
    } else {
      query.name = { $regex: new RegExp('^' + startingWith, 'i') };
    }
  }

  const sortMap = {
    openRoles: { openRoles: -1, name: 1 },
    name: { name: 1 },
    '-name': { name: -1 },
    jobCount: { jobCount: -1, name: 1 },
    lastSyncAt: { lastSyncAt: -1 },
    newest: { createdAt: -1 },
  };

  const sortOption = sortMap[sort] || { openRoles: -1 };
  const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

  const [companies, total, totalWithRoles, autoSyncCount, totalJobs] = await Promise.all([
    Company.find(query).sort(sortOption).skip(skip).limit(Number(limit)).lean(),
    Company.countDocuments(query),
    Company.countDocuments({ openRoles: { $gt: 0 } }),
    Company.countDocuments({ isAutoSync: true }),
    Job.countDocuments({ isActive: true }),
  ]);

  return ApiResponse.paginated(
    res,
    companies,
    {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
      stats: {
        totalCompanies: await Company.estimatedDocumentCount(),
        withOpenRoles: totalWithRoles,
        autoSyncCount,
        totalJobs,
      },
    },
    'Admin companies fetched'
  );
};

// ─── Get Company Jobs (Career Board style) ───────────────────────────────────
exports.getCompanyJobs = async (req, res) => {
  const { slugOrId } = req.params;
  const {
    page = 1,
    limit = 20,
    search = '',
    department = '',
    workMode = 'all',
    category = 'all',
  } = req.query;

  let company = null;
  if (mongoose.Types.ObjectId.isValid(slugOrId)) {
    company = await Company.findById(slugOrId).lean();
  }
  if (!company) {
    company = await Company.findOne({ slug: slugOrId.toLowerCase() }).lean();
  }
  if (!company) {
    company = await Company.findOne({ name: new RegExp('^' + slugOrId + '$', 'i') }).lean();
  }

  const isAdmin = Boolean(req.user && req.user.role === 'admin');
  const isPaidOrAdmin = Boolean(
    isAdmin || (req.user && req.user.isPremium && (!req.user.premiumExpiresAt || new Date(req.user.premiumExpiresAt) > new Date()))
  );

  const jobQuery = { isActive: true };
  if (!isAdmin) {
    jobQuery.isReviewed = true;
  }

  if (company) {
    jobQuery.$or = [
      { company: company._id },
      { companyTag: company.slug },
      { companyName: new RegExp('^' + company.name + '$', 'i') },
    ];
  } else {
    jobQuery.$or = [
      { companyTag: slugOrId.toLowerCase() },
      { companyName: new RegExp('^' + slugOrId + '$', 'i') },
    ];
  }

  if (search && search.trim()) {
    const s = search.trim();
    jobQuery.$and = [
      {
        $or: [
          { title: new RegExp(s, 'i') },
          { location: new RegExp(s, 'i') },
          { description: new RegExp(s, 'i') },
          { tags: new RegExp(s, 'i') },
        ],
      },
    ];
  }

  if (department && department !== 'all') {
    jobQuery.tags = { $in: [new RegExp(department, 'i')] };
  }

  if (workMode && workMode !== 'all') {
    jobQuery.workMode = workMode;
  }

  if (category && category !== 'all') {
    jobQuery.category = category;
  }

  const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

  const [jobs, total] = await Promise.all([
    Job.find(jobQuery)
      .populate('company', 'name logo website platform boardUrl hasWhiteBg')
      .sort({ isFeatured: -1, reviewedAt: -1, postedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Job.countDocuments(jobQuery),
  ]);

  // Apply Free vs Paid user apply gating:
  // For free users, only the 5 oldest jobs for this company are unlocked.
  if (!isPaidOrAdmin) {
    const oldestFilter = {
      isActive: true,
      isReviewed: true,
      ...(company
        ? {
            $or: [
              { company: company._id },
              { companyTag: company.slug },
              { companyName: new RegExp('^' + company.name + '$', 'i') },
            ],
          }
        : {
            $or: [
              { companyTag: slugOrId.toLowerCase() },
              { companyName: new RegExp('^' + slugOrId + '$', 'i') },
            ],
          }),
    };

    const oldestJobs = await Job.find(oldestFilter)
      .sort({ postedAt: 1, createdAt: 1 })
      .limit(5)
      .select('_id')
      .lean();

    const unlockedSet = new Set(oldestJobs.map(oj => oj._id.toString()));

    jobs.forEach(j => {
      j.isLocked = !unlockedSet.has(j._id.toString());
      if (j.isLocked) {
        j.applyLink = null;
        j.applyEmail = null;
        j.contactPhone = null;
      }
    });
  } else {
    jobs.forEach(j => {
      j.isLocked = false;
    });
  }

  return ApiResponse.paginated(
    res,
    jobs,
    {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
      company: company || { name: slugOrId, slug: slugOrId },
    },
    'Company jobs fetched'
  );
};

// ─── Admin: Sync Single Company ───────────────────────────────────────────────
exports.syncSingleCompany = async (req, res) => {
  const { id } = req.params;
  const { postedWithinDays = 'all', experienceFilter = 'all', categoryFilter = 'all' } = req.body;

  let company = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    company = await Company.findById(id);
  }
  if (!company) {
    company = await Company.findOne({ slug: id.toLowerCase() });
  }

  if (!company) {
    return ApiResponse.notFound(res, 'Company not found');
  }

  try {
    const result = await syncJobsForCompany(company, {
      postedWithinDays,
      experienceFilter,
      categoryFilter,
    });

    return ApiResponse.success(res, result, `Synced ${result.saved} new jobs for ${company.name}`);
  } catch (err) {
    return ApiResponse.error(res, err.message || 'Sync failed', 500);
  }
};

// ─── Admin: Batch Global Sync with Live Terminal Logging ───────────────────────
exports.globalSync = async (req, res) => {
  const {
    companyIds = [],
    postedWithinDays = '2',
    experienceFilter = '0_1',
    categoryFilter = 'Tech',
    syncAll = false,
  } = req.body;

  let targets = [];
  if (syncAll || !Array.isArray(companyIds) || companyIds.length === 0) {
    targets = await Company.find({
      platform: { $ne: null, $nin: ['', 'none'] },
      isEnabled: true,
    }).select('_id name platform slug openRoles');
  } else {
    targets = await Company.find({
      _id: { $in: companyIds },
      isEnabled: true,
    }).select('_id name platform slug openRoles');
  }

  if (targets.length === 0) {
    return ApiResponse.badRequest(res, 'No ATS-supported companies found to scrape.');
  }

  // Check if a sync session is already active
  const curState = getActiveSyncState();
  if (curState && curState.isActive) {
    return ApiResponse.badRequest(res, 'A scrape session is already in progress. Please wait or stop it first.');
  }

  // Initialize scraper terminal session
  resetSyncSession({
    isActive: true,
    status: 'running',
    mode: 'ats_global',
    category: categoryFilter,
    totalToScrape: targets.length,
    processedCount: 0,
    savedCount: 0,
    duplicateCount: 0,
    errorsCount: 0,
    currentStep: `Starting Global ATS Scraper for ${targets.length} companies [0-1 Yrs Exp | Last 2 Days]...`,
    message: `Initialized Global ATS Scrape`,
  });

  logScraper(
    `=== STARTING GLOBAL ATS SCRAPER [${targets.length} Companies | Exp: 0-1 Yrs | Range: Last 2 Days | Category: ${categoryFilter}] ===`,
    'step',
    { isActive: true, status: 'running' }
  );

  // Respond immediately so client does not time out and can open Live Terminal
  ApiResponse.success(
    res,
    {
      started: true,
      totalCompanies: targets.length,
      filters: { postedWithinDays, experienceFilter, categoryFilter },
    },
    `Global ATS scrape started for ${targets.length} companies`
  );

  // Run in background asynchronously with live terminal logging
  setImmediate(async () => {
    let totalSaved = 0;
    let totalDuplicates = 0;
    let totalErrors = 0;

    for (let i = 0; i < targets.length; i++) {
      if (getIsSyncCancelled()) {
        logScraper('Global ATS scraping cancelled by admin.', 'warn', {
          isActive: false,
          status: 'stopped',
          currentStep: 'Stopped by admin',
        });
        break;
      }

      const comp = targets[i];
      logScraper(
        `[${i + 1}/${targets.length}] Scraping ${comp.name} (${(comp.platform || 'ats').toUpperCase()})...`,
        'info',
        {
          processedCount: i + 1,
          currentStep: `Scraping ${comp.name} (${comp.platform || 'ats'}) [${i + 1}/${targets.length}]`,
        }
      );

      try {
        const syncRes = await syncJobsForCompany(comp, {
          postedWithinDays,
          experienceFilter,
          categoryFilter,
        });

        totalSaved += syncRes.saved;
        totalDuplicates += syncRes.skippedDuplicates;

        if (syncRes.saved > 0) {
          logScraper(
            `[Saved +${syncRes.saved}] "${comp.name}": +${syncRes.saved} new 0-1 yr jobs added!`,
            'success',
            { savedCount: totalSaved, duplicateCount: totalDuplicates }
          );
        } else if (syncRes.skippedDuplicates > 0) {
          logScraper(
            `[${comp.name}] ${syncRes.skippedDuplicates} duplicate(s) already in DB`,
            'info',
            { duplicateCount: totalDuplicates }
          );
        } else {
          logScraper(
            `[${comp.name}] 0 matching roles found (0-1 yrs exp within last 2 days)`,
            'info'
          );
        }

        // Friendly delay between companies
        await new Promise((r) => setTimeout(r, 350));
      } catch (err) {
        totalErrors++;
        logScraper(`[${comp.name}] Error: ${err.message}`, 'error', {
          errorsCount: totalErrors,
        });
      }
    }

    const wasStopped = getIsSyncCancelled();
    const finalMsg = wasStopped
      ? `Global scrape stopped by admin. Saved ${totalSaved} jobs across ${targets.length} companies.`
      : `Global ATS scrape finished! Saved ${totalSaved} new 0-1 yr jobs (${totalDuplicates} duplicates skipped) across ${targets.length} companies.`;

    logScraper(`=== ${finalMsg} ===`, 'step', {
      isActive: false,
      status: wasStopped ? 'stopped' : 'completed',
      endedAt: new Date().toISOString(),
      currentStep: 'Done',
      message: finalMsg,
    });
  });
};

// ─── Admin: Update Company Info & Logo (Cascades to Jobs) ─────────────────────
exports.updateCompanyInfo = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  let company = await Company.findById(id);
  if (!company) {
    company = await Company.findOne({ slug: id.toLowerCase() });
  }

  if (!company) {
    return ApiResponse.notFound(res, 'Company not found');
  }

  const allowed = [
    'name',
    'logo',
    'website',
    'industry',
    'description',
    'platform',
    'token',
    'boardUrl',
    'isAutoSync',
    'hasWhiteBg',
    'isPopular',
    'isEnabled',
  ];

  for (const field of allowed) {
    if (updates[field] !== undefined) {
      company[field] = updates[field];
    }
  }

  await company.save();

  // Cascade name and logo to all corresponding Job documents
  const jobUpdates = {};
  if (updates.name && updates.name.trim()) jobUpdates.companyName = company.name;
  if (updates.logo !== undefined) jobUpdates.companyLogo = company.logo;

  if (Object.keys(jobUpdates).length > 0) {
    await Job.updateMany(
      {
        $or: [
          { company: company._id },
          { companyTag: company.slug },
          { companyName: new RegExp('^' + company.name + '$', 'i') },
        ],
      },
      { $set: jobUpdates }
    );
  }

  return ApiResponse.success(res, { company }, 'Company updated successfully');
};

// ─── Admin: Toggle Auto-Sync for Multiple Companies ───────────────────────────
exports.toggleAutoSync = async (req, res) => {
  const { companyIds = [], isAutoSync = true } = req.body;

  if (!Array.isArray(companyIds) || companyIds.length === 0) {
    return ApiResponse.badRequest(res, 'Please provide companyIds array');
  }

  await Company.updateMany(
    { _id: { $in: companyIds } },
    { $set: { isAutoSync: Boolean(isAutoSync) } }
  );

  return ApiResponse.success(
    res,
    { count: companyIds.length, isAutoSync },
    `Updated auto-sync for ${companyIds.length} companies`
  );
};

// ─── Admin: Daily Auto-Sync Scheduler Settings ───────────────────────────────
exports.getSchedulerSettings = async (req, res) => {
  let settings = await JobSettings.findOne();
  if (!settings) {
    settings = await JobSettings.create({});
  }

  const autoSyncCompaniesCount = await Company.countDocuments({ isAutoSync: true });

  return ApiResponse.success(res, {
    autoSyncScheduleTime: settings.autoSyncScheduleTime || '02:00',
    autoSyncEnabled: settings.autoSyncEnabled !== false,
    autoSyncFilterPostedWithinDays: settings.autoSyncFilterPostedWithinDays || 2,
    autoSyncFilterExperience: settings.autoSyncFilterExperience || 'all',
    autoSyncFilterCategory: settings.autoSyncFilterCategory || 'all',
    lastAutoSyncAt: settings.lastAutoSyncAt,
    lastAutoSyncResult: settings.lastAutoSyncResult,
    autoSyncCompaniesCount,
  });
};

exports.updateSchedulerSettings = async (req, res) => {
  const {
    autoSyncScheduleTime,
    autoSyncEnabled,
    autoSyncFilterPostedWithinDays,
    autoSyncFilterExperience,
    autoSyncFilterCategory,
  } = req.body;

  let settings = await JobSettings.findOne();
  if (!settings) {
    settings = await JobSettings.create({});
  }

  if (autoSyncScheduleTime !== undefined) settings.autoSyncScheduleTime = autoSyncScheduleTime;
  if (autoSyncEnabled !== undefined) settings.autoSyncEnabled = Boolean(autoSyncEnabled);
  if (autoSyncFilterPostedWithinDays !== undefined)
    settings.autoSyncFilterPostedWithinDays = Number(autoSyncFilterPostedWithinDays);
  if (autoSyncFilterExperience !== undefined) settings.autoSyncFilterExperience = autoSyncFilterExperience;
  if (autoSyncFilterCategory !== undefined) settings.autoSyncFilterCategory = autoSyncFilterCategory;

  await settings.save();

  // Reschedule cron job
  await rescheduleDailySync(settings.autoSyncScheduleTime, settings.autoSyncEnabled);

  return ApiResponse.success(res, { settings }, 'Scheduler settings saved');
};

exports.triggerAutoSyncNow = async (req, res) => {
  runAutoSyncNow().catch((err) => console.error('[Manual AutoSync] Error:', err));
  return ApiResponse.success(res, null, 'Auto-sync job triggered in background');
};
