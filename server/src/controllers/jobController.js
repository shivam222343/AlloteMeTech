const fs = require('fs');
const path = require('path');
const Job = require('../models/Job');
const Company = require('../models/Company');
const JobSettings = require('../models/JobSettings');
const ApiResponse = require('../utils/apiResponse');

function generateSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
}

function decodeSerializedJsonString(str) {
  if (!str) return '';
  return str
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\\//g, '/')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .trim();
}

function extractDirectApplyLinkFromHtml(html) {
  if (!html || typeof html !== 'string') return null;

  // 1. Look for applicationLink in Next.js / React serialized stream:
  // e.g. \"applicationLink\":\"https://...\" or "applicationLink":"https://..."
  const appLinkMatch = html.match(/\\*"applicationLink\\*"\s*:\s*\\*"((?:\\.|[^"\\])*?)(?:\\*"|")/i);
  if (appLinkMatch && appLinkMatch[1]) {
    const raw = decodeSerializedJsonString(appLinkMatch[1]);
    if ((raw.startsWith('http://') || raw.startsWith('https://')) && !raw.toLowerCase().includes('hiredoor.in')) {
      return raw;
    }
  }

  // 2. Look for externalUrl / applyUrl / applyLink in stream
  const altMatch = html.match(/\\*"(?:applyUrl|externalApplyUrl|directApplyUrl|externalUrl)\\*"\s*:\s*\\*"((?:\\.|[^"\\])*?)(?:\\*"|")/i);
  if (altMatch && altMatch[1]) {
    const raw = decodeSerializedJsonString(altMatch[1]);
    if ((raw.startsWith('http://') || raw.startsWith('https://')) && !raw.toLowerCase().includes('hiredoor.in')) {
      return raw;
    }
  }

  // 3. Scan for Google Forms in HTML / stream
  const gFormMatch = html.match(/https?:\/\/(?:docs\.google\.com\/forms\/d\/[a-zA-Z0-9_\-\/]+|forms\.gle\/[a-zA-Z0-9_\-]+)/i);
  if (gFormMatch) {
    const found = decodeSerializedJsonString(gFormMatch[0]);
    if (!found.includes('1FAIpQLSfQWc_lv_mvwR3mbksJyjCTUjiOgEFjty8N36em97v2diOP_w')) {
      return found;
    }
  }

  return null;
}

function replaceHiredoorWithAlloteme(val) {
  if (!val) return val;
  if (typeof val === 'string') {
    return val
      .replace(/https?:\/\/(?:www\.)?hiredoor\.in[^\s]*/gi, '')
      .replace(/hiredoor\.in/gi, 'Tech AlloteMe')
      .replace(/hiredoor/gi, 'Tech AlloteMe')
      .replace(/hire\s*door/gi, 'Tech AlloteMe');
  }
  if (Array.isArray(val)) {
    return val.map(replaceHiredoorWithAlloteme).filter(Boolean);
  }
  return val;
}

// ── Public: Get All Jobs ──────────────────────────────────────────────────────
exports.getJobs = async (req, res) => {
  const { page = 1, limit = 20, search, jobType, workMode, company, tag, category } = req.query;
  const isAdmin = Boolean(req.user && req.user.role === 'admin');
  const isPaidOrAdmin = Boolean(
    isAdmin || (req.user && req.user.isPremium && (!req.user.premiumExpiresAt || new Date(req.user.premiumExpiresAt) > new Date()))
  );

  const query = { isActive: true };

  // Regular users only see admin-reviewed & approved jobs
  if (!isAdmin) {
    query.isReviewed = true;
  }
  
  if (search) query.$or = [
    { title: new RegExp(search, 'i') },
    { companyName: new RegExp(search, 'i') },
    { description: new RegExp(search, 'i') }
  ];
  if (jobType) query.jobType = jobType;
  if (workMode) query.workMode = workMode;
  if (company) query.companyTag = company;
  if (tag) query.tags = { $in: [tag] };

  // Category filter: Tech vs Non-Tech (backwards compatible with existing jobs that have no category set)
  if (category === 'Non-Tech') {
    query.category = 'Non-Tech';
  } else if (category === 'Tech') {
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { category: 'Tech' },
        { category: { $exists: false } },
        { category: null },
      ]
    });
  }

  const skip = (Number(page) - 1) * Number(limit);
  const countFilter = !isAdmin ? { isActive: true, isReviewed: true } : { isActive: true };

  const [jobs, total, techCount, nonTechCount] = await Promise.all([
    Job.find(query)
      .populate('company', 'name slug logo hasWhiteBg website')
      .sort({ isFeatured: -1, reviewedAt: -1, postedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Job.countDocuments(query),
    Job.countDocuments({ ...countFilter, $or: [{ category: 'Tech' }, { category: { $exists: false } }, { category: null }] }),
    Job.countDocuments({ ...countFilter, category: 'Non-Tech' }),
  ]);

  // Fallback company logo and original name population for jobs where company reference is missing or logo is empty
  const unlinkedTags = jobs
    .filter(j => (!j.company || !j.company.logo) && j.companyTag)
    .map(j => j.companyTag.toLowerCase());

  if (unlinkedTags.length > 0) {
    const matchedCompanies = await Company.find({
      slug: { $in: unlinkedTags }
    }).select('name slug logo hasWhiteBg').lean();

    const compMap = new Map();
    matchedCompanies.forEach(c => compMap.set(c.slug.toLowerCase(), c));

    jobs.forEach(j => {
      if ((!j.company || !j.company.logo) && j.companyTag) {
        const found = compMap.get(j.companyTag.toLowerCase());
        if (found) {
          if (!j.company) {
            j.company = found;
          } else if (!j.company.logo) {
            j.company.logo = found.logo;
          }
          if (!j.companyLogo && found.logo) j.companyLogo = found.logo;
          if (found.name && (!j.companyName || j.companyName.toLowerCase() === j.companyTag.toLowerCase())) {
            j.companyName = found.name;
          }
        }
      }
    });
  }

  // Free vs Paid Apply Gating:
  // Paid users & admins: all jobs are unlocked.
  // Free users: only the 5 OLDEST jobs per company are unlocked; newer/current jobs are locked.
  if (!isPaidOrAdmin) {
    const companyTags = Array.from(new Set(jobs.map(j => j.companyTag).filter(Boolean)));
    const unlockedIdSet = new Set();

    if (companyTags.length > 0) {
      const oldestPerCompany = await Job.aggregate([
        {
          $match: {
            companyTag: { $in: companyTags },
            isActive: true,
            isReviewed: true,
          }
        },
        { $sort: { postedAt: 1, createdAt: 1 } },
        {
          $group: {
            _id: '$companyTag',
            oldestIds: { $push: '$_id' }
          }
        },
        {
          $project: {
            _id: 1,
            unlockedIds: { $slice: ['$oldestIds', 5] }
          }
        }
      ]);

      oldestPerCompany.forEach(item => {
        if (Array.isArray(item.unlockedIds)) {
          item.unlockedIds.forEach(id => unlockedIdSet.add(id.toString()));
        }
      });
    }

    jobs.forEach(j => {
      const isUnlocked = unlockedIdSet.has(j._id.toString());
      j.isLocked = !isUnlocked;
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

  return ApiResponse.paginated(res, jobs, {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit)),
    techCount,
    nonTechCount,
  });
};

// ── Public: Get Single Job ────────────────────────────────────────────────────
exports.getJob = async (req, res) => {
  const isAdmin = Boolean(req.user && req.user.role === 'admin');
  const isPaidOrAdmin = Boolean(
    isAdmin || (req.user && req.user.isPremium && (!req.user.premiumExpiresAt || new Date(req.user.premiumExpiresAt) > new Date()))
  );

  const query = { slug: req.params.slug, isActive: true };
  if (!isAdmin) {
    query.isReviewed = true;
  }

  const job = await Job.findOne(query)
    .populate('company', 'name slug logo hasWhiteBg website industry');
  if (!job) return ApiResponse.notFound(res, 'Job not found or pending admin review');

  // Fallback logo & name from Company collection if needed
  if ((!job.company || !job.company.logo) && job.companyTag) {
    const matchedCompany = await Company.findOne({ slug: job.companyTag.toLowerCase() })
      .select('name slug logo hasWhiteBg website industry')
      .lean();
    if (matchedCompany) {
      if (!job.company) job.company = matchedCompany;
      if (!job.companyLogo && matchedCompany.logo) job.companyLogo = matchedCompany.logo;
      if (matchedCompany.name && (!job.companyName || job.companyName.toLowerCase() === job.companyTag.toLowerCase())) {
        job.companyName = matchedCompany.name;
      }
    }
  }

  const jobObj = job.toObject ? job.toObject() : job;

  // Free vs Paid user apply gating
  if (!isPaidOrAdmin) {
    const oldestJobs = await Job.find({
      companyTag: job.companyTag,
      isActive: true,
      isReviewed: true,
    })
      .sort({ postedAt: 1, createdAt: 1 })
      .limit(5)
      .select('_id')
      .lean();

    const isUnlocked = oldestJobs.some(oj => oj._id.toString() === job._id.toString());
    jobObj.isLocked = !isUnlocked;
    if (jobObj.isLocked) {
      jobObj.applyLink = null;
      jobObj.applyEmail = null;
      jobObj.contactPhone = null;
    }
  } else {
    jobObj.isLocked = false;
  }

  return ApiResponse.success(res, { job: jobObj });
};

// ── Public: Serve Job OG HTML (for bots / WhatsApp preview crawlers) ──────────
exports.serveJobOgHtml = async (req, res) => {
  const { slug } = req.params;
  const job = await Job.findOne({ slug, isActive: true })
    .populate('company', 'name slug logo hasWhiteBg website industry')
    .lean();

  if (!job) {
    return res.redirect(`https://tech.alloteme.online/jobs/${slug}`);
  }

  const companyName = job.company?.name || job.companyName || job.companyTag || 'Company';
  const title = job.title || 'Job Opportunity';
  const salary = job.salary ? ` | ${job.salary}` : '';
  const batch = job.eligibleBatch ? ` | ${job.eligibleBatch} batch` : '';
  const workMode = job.workMode || 'Remote';
  const location = job.location || 'India';

  const ogTitle = `${title} at ${companyName}${salary}${batch}`;
  const ogDesc = job.description
    ? `${companyName} is hiring a ${title} in ${location} (${workMode}). ${job.description.slice(0, 160)}...`
    : `${companyName} is hiring a ${title} in ${location} (${workMode}). Apply on Tech AlloteMe.`;

  let logoUrl = (job.company?.logo && !job.company.logo.endsWith('.svg'))
    ? job.company.logo
    : (job.companyLogo && !job.companyLogo.endsWith('.svg'))
    ? job.companyLogo
    : '';

  if (!logoUrl) {
    const tag = job.companyTag || companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    logoUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(tag)}.com&sz=256`;
  }

  if (logoUrl.startsWith('//')) {
    logoUrl = `https:${logoUrl}`;
  }

  const jobUrl = `https://tech.alloteme.online/jobs/${slug}`;

  // If a real human browser opens this directly, redirect them to the frontend React app
  const userAgent = req.headers['user-agent'] || '';
  const isBot = /facebookexternalhit|WhatsApp|Twitterbot|TelegramBot|LinkedInBot|Discordbot|Slackbot|Googlebot/i.test(userAgent);
  if (!isBot) {
    return res.redirect(jobUrl);
  }

  const escape = (str) =>
    String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escape(ogTitle)} — Tech AlloteMe</title>
  <meta name="description" content="${escape(ogDesc)}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Tech AlloteMe" />
  <meta property="og:title" content="${escape(ogTitle)}" />
  <meta property="og:description" content="${escape(ogDesc)}" />
  <meta property="og:image" content="${escape(logoUrl)}" />
  <meta property="og:image:secure_url" content="${escape(logoUrl)}" />
  <meta property="og:image:alt" content="${escape(companyName)} Logo" />
  <meta property="og:url" content="${jobUrl}" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${escape(ogTitle)}" />
  <meta name="twitter:description" content="${escape(ogDesc)}" />
  <meta name="twitter:image" content="${escape(logoUrl)}" />
  <meta http-equiv="refresh" content="0;url=${jobUrl}" />
</head>
<body>
  <h1>${escape(ogTitle)}</h1>
  <p>${escape(ogDesc)}</p>
  <p><a href="${jobUrl}">Click here to view this job on Tech AlloteMe</a></p>
</body>
</html>`);
};

// ── Admin: Get All Jobs (including inactive) ──────────────────────────────────
exports.adminGetJobs = async (req, res) => {
  const { page = 1, limit = 20, search, source, category, isReviewed } = req.query;
  const query = {};
  if (search) query.$or = [{ title: new RegExp(search, 'i') }, { companyName: new RegExp(search, 'i') }];
  if (source) query.source = source;
  if (isReviewed === 'true') query.isReviewed = true;
  else if (isReviewed === 'false') query.isReviewed = false;

  if (category && category !== 'all') {
    if (category === 'Non-Tech') {
      query.category = 'Non-Tech';
    } else if (category === 'Tech') {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { category: 'Tech' },
          { category: { $exists: false } },
          { category: null },
        ]
      });
    }
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [jobs, total, techCount, nonTechCount, pendingReviewCount, reviewedCount] = await Promise.all([
    Job.find(query).populate('company', 'name slug logo hasWhiteBg').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    Job.countDocuments(query),
    Job.countDocuments({ $or: [{ category: 'Tech' }, { category: { $exists: false } }, { category: null }] }),
    Job.countDocuments({ category: 'Non-Tech' }),
    Job.countDocuments({ isReviewed: false }),
    Job.countDocuments({ isReviewed: true }),
  ]);
  return ApiResponse.paginated(res, jobs, {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit)),
    techCount,
    nonTechCount,
    pendingReviewCount,
    reviewedCount,
  });
};

// ── Admin: Review / Approve Single Job ───────────────────────────────────────
exports.reviewJob = async (req, res) => {
  const { id } = req.params;
  const { isReviewed } = req.body;
  const job = await Job.findById(id);
  if (!job) return ApiResponse.notFound(res, 'Job not found');

  job.isReviewed = isReviewed !== undefined ? Boolean(isReviewed) : !job.isReviewed;
  job.reviewedAt = job.isReviewed ? new Date() : null;
  await job.save();

  return ApiResponse.success(res, { job }, job.isReviewed ? 'Job marked as verified & approved' : 'Job unapproved');
};

// ── Admin: Bulk Review / Approve Jobs ───────────────────────────────────────
exports.adminBulkReview = async (req, res) => {
  const { ids, isReviewed = true } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return ApiResponse.error(res, 'ids array is required', 400);
  }
  const status = Boolean(isReviewed);
  const result = await Job.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        isReviewed: status,
        reviewedAt: status ? new Date() : null,
      }
    }
  );
  return ApiResponse.success(res, { modifiedCount: result.modifiedCount }, `Updated ${result.modifiedCount} jobs`);
};

// ── Helper: validate genuine company logo URL ─────────────────────────────────
function isValidCompanyLogo(url) {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim().toLowerCase();
  if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('data:image/')) return false;

  // Disallow tiny 16px google favicon fetchers
  if (clean.includes('google.com/s2/favicons') && clean.includes('sz=16')) {
    return false;
  }

  return true;
}

// ── Helper: resolve company from tag ─────────────────────────────────────────
async function resolveCompany(companyTag) {
  if (!companyTag) return { companyId: null, companyName: '', companyLogo: '' };
  const cleanTag = companyTag.toLowerCase().trim().replace(/[^a-z0-9]/g, '');

  // 1. Try finding in Company collection
  let company = await Company.findOne({
    $or: [
      { slug: cleanTag },
      { slug: companyTag.toLowerCase().trim() },
    ],
  });

  if (company && company.logo && isValidCompanyLogo(company.logo)) {
    return { companyId: company._id, companyName: company.name, companyLogo: company.logo };
  }

  // 2. Check if any existing Job with this companyTag has a valid verified logo
  const existingJob = await Job.findOne({
    companyTag: { $in: [cleanTag, companyTag.toLowerCase().trim()] },
    companyLogo: { $exists: true, $ne: '' },
  }).select('companyLogo companyName company');

  if (existingJob?.companyLogo && isValidCompanyLogo(existingJob.companyLogo)) {
    return {
      companyId: company?._id || existingJob.company || null,
      companyName: company?.name || existingJob.companyName || companyTag,
      companyLogo: existingJob.companyLogo,
    };
  }

  return {
    companyId: company?._id || null,
    companyName: company?.name || companyTag,
    companyLogo: (company?.logo && isValidCompanyLogo(company.logo)) ? company.logo : '',
  };
}

// ── Admin: Get Deduplicated Companies for Jobs ──────────────────────────────
exports.adminGetCompanies = async (req, res) => {
  const { search } = req.query;

  // 1. Aggregate companies from Jobs grouped by companyTag
  const jobCompanies = await Job.aggregate([
    { $match: { companyTag: { $exists: true, $ne: '' } } },
    {
      $group: {
        _id: { $toLower: '$companyTag' },
        jobCount: { $sum: 1 },
        companyName: { $first: '$companyName' },
        companyLogo: { $max: '$companyLogo' },
        companyId: { $first: '$company' },
      },
    },
    { $sort: { jobCount: -1 } },
  ]);

  // 2. Map of existing Company documents
  const allCompanies = await Company.find().select('name slug logo').lean();
  const companyMap = new Map();
  allCompanies.forEach((c) => {
    companyMap.set(c.slug.toLowerCase(), c);
  });

  const companiesByTag = new Map();

  // First add companies that have active jobs (distinct by companyTag)
  for (const jc of jobCompanies) {
    const tag = jc._id;
    const cDoc = companyMap.get(tag);
    companiesByTag.set(tag, {
      tag,
      name: cDoc?.name || jc.companyName || tag,
      logo: cDoc?.logo || jc.companyLogo || '',
      jobCount: jc.jobCount,
      companyId: cDoc?._id || jc.companyId || null,
    });
  }

  // Also include remaining companies from Company collection (jobCount: 0)
  for (const c of allCompanies) {
    const tag = c.slug.toLowerCase();
    if (!companiesByTag.has(tag)) {
      companiesByTag.set(tag, {
        tag,
        name: c.name,
        logo: c.logo || '',
        jobCount: 0,
        companyId: c._id,
      });
    }
  }

  let list = Array.from(companiesByTag.values());

  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    list = list.filter((c) => c.name.toLowerCase().includes(s) || c.tag.toLowerCase().includes(s));
  }

  // Sort by jobCount descending, then name alphabetically
  list.sort((a, b) => b.jobCount - a.jobCount || a.name.localeCompare(b.name));

  return ApiResponse.success(res, { companies: list, count: list.length });
};

// ── Admin: Update Company Logo (propagates to all job cards with same tag) ───
exports.adminUpdateCompany = async (req, res) => {
  const { tag } = req.params;
  const { name, logo } = req.body;
  if (!tag) return ApiResponse.error(res, 'Company tag is required', 400);

  const cleanTag = tag.toLowerCase().trim().replace(/[^a-z0-9]/g, '');

  let company = await Company.findOne({
    $or: [{ slug: cleanTag }, { slug: tag.toLowerCase().trim() }],
  });

  if (company) {
    if (logo !== undefined) company.logo = logo;
    if (name) company.name = name;
    await company.save();
  } else {
    company = await Company.create({
      name: name || tag,
      slug: cleanTag || tag.toLowerCase().trim(),
      logo: logo || '',
    });
  }

  // Update ALL existing jobs that have this companyTag to share the exact same logo!
  const updateResult = await Job.updateMany(
    { companyTag: { $in: [tag, cleanTag, tag.toLowerCase()] } },
    {
      $set: {
        companyLogo: logo || '',
        company: company._id,
        ...(name ? { companyName: name } : {}),
      },
    }
  );

  return ApiResponse.success(
    res,
    {
      company,
      updatedJobsCount: updateResult.modifiedCount,
    },
    `Logo updated for ${company.name} and applied to ${updateResult.modifiedCount} job cards`
  );
};

// ── Admin: Create Job (manual) ────────────────────────────────────────────────
exports.createJob = async (req, res) => {
  const { companyTag, ...rest } = req.body;
  const { companyId, companyName, companyLogo } = await resolveCompany(companyTag);
  const slug = generateSlug(rest.title);
  const job = await Job.create({
    ...rest,
    slug,
    category: rest.category === 'Non-Tech' ? 'Non-Tech' : 'Tech',
    companyTag: companyTag || '',
    company: companyId,
    companyName: companyName || rest.companyName || '',
    companyLogo: companyLogo || rest.companyLogo || '',
    source: 'manual',
  });
  return ApiResponse.created(res, { job }, 'Job created');
};

// ── Admin: Update Job ─────────────────────────────────────────────────────────
exports.updateJob = async (req, res) => {
  const { companyTag, ...rest } = req.body;
  let updateData = { ...rest };
  if (companyTag !== undefined) {
    const { companyId, companyName, companyLogo } = await resolveCompany(companyTag);
    updateData.companyTag = companyTag;
    updateData.company = companyId;
    if (companyName) updateData.companyName = companyName;
    if (companyLogo) updateData.companyLogo = companyLogo;
  }
  const job = await Job.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
  if (!job) return ApiResponse.notFound(res, 'Job not found');
  return ApiResponse.success(res, { job }, 'Job updated');
};

// ── Admin: Delete Job ─────────────────────────────────────────────────────────
exports.deleteJob = async (req, res) => {
  await Job.findByIdAndDelete(req.params.id);
  return ApiResponse.success(res, null, 'Job deleted');
};

// ── Admin: Bulk Delete Jobs ───────────────────────────────────────────────────
exports.adminBulkDelete = async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return ApiResponse.error(res, 'No job IDs provided', 400);
  }

  const result = await Job.deleteMany({ _id: { $in: ids } });
  return ApiResponse.success(
    res,
    { deletedCount: result.deletedCount },
    `Successfully deleted ${result.deletedCount} job(s)`
  );
};

// ── Helper: Get Effective Groq API Key (DB first, fallback .env) ──────────────
async function getEffectiveGroqKey() {
  try {
    const settings = await JobSettings.findOne().lean();
    if (settings?.groqApiKey && settings.groqApiKey.trim()) {
      return { key: settings.groqApiKey.trim(), source: 'database' };
    }
  } catch (err) {
    console.warn('Error fetching JobSettings from DB:', err.message);
  }
  const envKey = process.env.GROQ_API_KEY?.trim();
  const validEnv = envKey && envKey !== 'your_groq_api_key_here';
  return { key: validEnv ? envKey : '', source: validEnv ? 'env' : 'none' };
}

// ── Helper: Get Effective HireDoor Credentials (DB first, fallback .env) ───────
async function getEffectiveHireDoorCredentials() {
  try {
    const settings = await JobSettings.findOne().lean();
    if (settings?.hiredoorEmail && settings.hiredoorEmail.trim()) {
      return {
        email: settings.hiredoorEmail.trim(),
        password: settings.hiredoorPassword?.trim() || '',
        source: 'database',
      };
    }
  } catch (err) {
    console.warn('Error reading JobSettings for HireDoor credentials:', err.message);
  }
  const envEmail = process.env.HIREDOOR_EMAIL?.trim();
  const envPass = process.env.HIREDOOR_PASSWORD?.trim();
  return {
    email: envEmail || '',
    password: envPass || '',
    source: envEmail ? 'env' : 'none',
  };
}

// ── Admin: Get Job Settings (Groq API Key & HireDoor login status) ─────────────
exports.adminGetSettings = async (req, res) => {
  const settings = await JobSettings.findOne().lean();
  const customKey = settings?.groqApiKey?.trim() || '';
  const envKey = process.env.GROQ_API_KEY?.trim();
  const hasEnv = !!(envKey && envKey !== 'your_groq_api_key_here');

  let activeKeyMasked = '';
  let source = 'none';

  if (customKey) {
    activeKeyMasked = customKey.length > 8 ? `${customKey.slice(0, 4)}...${customKey.slice(-4)}` : '••••••••';
    source = 'database';
  } else if (hasEnv) {
    activeKeyMasked = envKey.length > 8 ? `${envKey.slice(0, 4)}...${envKey.slice(-4)}` : '••••••••';
    source = 'env';
  }

  // HireDoor credentials
  const customHiredoorEmail = settings?.hiredoorEmail?.trim() || '';
  const envHiredoorEmail = process.env.HIREDOOR_EMAIL?.trim() || '';
  let hiredoorSource = 'none';
  let hiredoorEmailMasked = '';

  const maskEmail = (em) => {
    if (!em) return '';
    const [userPart, domain] = em.split('@');
    return (userPart?.length > 2 ? userPart.slice(0, 2) + '••••' : '••••') + '@' + (domain || '');
  };

  if (customHiredoorEmail) {
    hiredoorSource = 'database';
    hiredoorEmailMasked = maskEmail(customHiredoorEmail);
  } else if (envHiredoorEmail) {
    hiredoorSource = 'env';
    hiredoorEmailMasked = maskEmail(envHiredoorEmail);
  }

  return ApiResponse.success(res, {
    hasCustomKey: !!customKey,
    hasEnvKey: hasEnv,
    source,
    activeKeyMasked,
    // HireDoor credentials status
    hasCustomHiredoor: !!customHiredoorEmail,
    hasEnvHiredoor: !!envHiredoorEmail,
    hiredoorSource,
    hiredoorEmailMasked,
  });
};

// ── Admin: Update Job Settings (Groq API Key & HireDoor Credentials) ───────────
exports.adminUpdateSettings = async (req, res) => {
  const { groqApiKey, hiredoorEmail, hiredoorPassword } = req.body;
  let settings = await JobSettings.findOne();
  if (!settings) {
    settings = new JobSettings();
  }
  if (groqApiKey !== undefined) settings.groqApiKey = (groqApiKey || '').trim();
  if (hiredoorEmail !== undefined) settings.hiredoorEmail = (hiredoorEmail || '').trim();
  if (hiredoorPassword !== undefined) settings.hiredoorPassword = (hiredoorPassword || '').trim();
  await settings.save();

  return exports.adminGetSettings(req, res);
};

// ── Helper: call AI (Groq preferred, fallback Gemini) ────────────────────────
async function callAI(prompt) {
  const { key: groqKey } = await getEffectiveGroqKey();
  const hasGroq = !!groqKey;

  // Try Groq models (gpt-oss-20b has much higher TPM limits for large bulk parse batches)
  if (hasGroq) {
    const Groq = require('groq-sdk');
    const groq = new Groq({ apiKey: groqKey });
    const modelsToTry = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'];

    for (const model of modelsToTry) {
      try {
        const completion = await groq.chat.completions.create({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 8192,
        });
        const output = completion.choices[0]?.message?.content?.trim();
        if (output) return output;
      } catch (groqErr) {
        console.warn(`Groq AI call with ${model} failed, trying next option...`, groqErr.message);
      }
    }
  }

  // Fallback to Gemini
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const hasGemini = geminiKey && geminiKey !== 'your_gemini_api_key_here';

  if (hasGemini) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  }

  throw new Error('No valid AI API key configured. Provide a working GROQ_API_KEY or GEMINI_API_KEY in admin settings or server/.env');
}

function stripCodeFences(text) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
}

// ── Admin: AI Parse Single Job ────────────────────────────────────────────────
exports.aiParseJob = async (req, res) => {
  const { description, applyLink } = req.body;
  if (!description) return ApiResponse.error(res, 'Description is required', 400);

  const prompt = `You are a job data extractor. Extract structured data from this job description and return ONLY valid JSON — no markdown, no explanation, no code fences.

Job Description:
${description}

Apply Link (if provided): ${applyLink || 'none'}

Return ONLY this JSON structure (no extra text):
{
  "title": "job title",
  "companyName": "company name",
  "companyTag": "company slug in lowercase e.g. flipkart, google, ibm (derive from company name, no spaces or special chars)",
  "location": "city or Remote",
  "workMode": "Remote|Hybrid|On-site",
  "jobType": "Full-time|Part-time|Internship|Contract|Freelance",
  "salary": "salary range as string e.g. ₹25,000-30,000/month",
  "experience": "experience required e.g. 2-4 years or Fresher",
  "eligibleBatch": "batch years e.g. 2024-2026 or empty string",
  "description": "2-3 sentence summary of the role",
  "responsibilities": ["responsibility 1", "responsibility 2"],
  "requirements": ["requirement 1", "requirement 2"],
  "applyLink": "direct apply URL or empty string",
  "applyEmail": "company email to apply if specifically mentioned or empty string (NEVER extract hiredoor.in email, leave empty if no employer email mentioned)",
  "tags": ["tag1", "tag2", "tag3"],
  "deadline": null
}`;

  const raw = await callAI(prompt);
  const cleaned = stripCodeFences(raw);

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
    if (parsed.applyEmail && parsed.applyEmail.toLowerCase().includes('hiredoor')) parsed.applyEmail = '';
    if (parsed.applyLink && parsed.applyLink.toLowerCase().includes('hiredoor') && parsed.applyLink.toLowerCase().includes('mailto:')) parsed.applyLink = '';
    if (parsed.description) parsed.description = replaceHiredoorWithAlloteme(parsed.description);
    if (parsed.responsibilities) parsed.responsibilities = replaceHiredoorWithAlloteme(parsed.responsibilities);
    if (parsed.requirements) parsed.requirements = replaceHiredoorWithAlloteme(parsed.requirements);
    if (parsed.title) parsed.title = replaceHiredoorWithAlloteme(parsed.title);
  } catch (e) {
    return ApiResponse.error(res, 'AI could not parse the job description. Please try manual form.', 422);
  }

  return ApiResponse.success(res, { parsed }, 'Job parsed successfully');
};

// ── Admin: AI Bulk Parse (paste raw HireDoor/any listing text) ────────────────
exports.aiBulkParse = async (req, res) => {
  const { rawText, applyLinks } = req.body;
  if (!rawText || rawText.trim().length < 50) {
    return ApiResponse.error(res, 'Please provide the job listing text to parse', 400);
  }

  const prompt = `You are an expert job listing parser. You will receive raw text copied from a job listings page (like HireDoor). Extract ALL individual job listings from it.

For each job, also look for the apply link or apply email in the text. The apply links/emails section may appear separately at the bottom — match them to the correct job by company name or job title.

Apply links/emails section provided separately:
${applyLinks || '(none provided)'}

Raw listings text:
${rawText}

Return ONLY a valid JSON array (no markdown, no code fences, no explanation). Each element must be:
{
  "title": "job title",
  "companyName": "exact company name as shown",
  "companyTag": "company slug in lowercase no spaces e.g. ibm, instaastro, parkplacetechnologies",
  "location": "city or Remote",
  "workMode": "Remote|Hybrid|On-site",
  "jobType": "Full-time|Part-time|Internship|Contract|Freelance",
  "salary": "salary/stipend as shown e.g. ₹25,000-30,000/month or ₹10-15 LPA",
  "experience": "experience or batch info e.g. 0-2 years or Fresher",
  "eligibleBatch": "batch years if mentioned e.g. 2025-2027 or empty string",
  "description": "brief 1-2 sentence description based on the job title and company",
  "responsibilities": [],
  "requirements": [],
  "applyLink": "URL if found for this job or empty string",
  "applyEmail": "company email if found for this job or empty string (NEVER extract hiredoor.in emails like jobsinfo@hiredoor.in, leave empty if no company email mentioned)",
  "postedTime": "e.g. 5h ago or 2d ago if mentioned in listing, or empty string",
  "tags": ["infer 2-4 relevant skill tags based on job title"],
  "deadline": null
}

Return ONLY the JSON array, nothing else.`;

  const raw = await callAI(prompt);
  const cleaned = stripCodeFences(raw);

  let jobs;
  try {
    jobs = JSON.parse(cleaned);
    if (!Array.isArray(jobs)) jobs = [jobs];
    // Sanitize any accidental hiredoor email or mailto, and rebrand text to Tech AlloteMe
    jobs = jobs.map(j => ({
      ...j,
      title: replaceHiredoorWithAlloteme(j.title),
      description: replaceHiredoorWithAlloteme(j.description),
      responsibilities: replaceHiredoorWithAlloteme(j.responsibilities),
      requirements: replaceHiredoorWithAlloteme(j.requirements),
      applyEmail: (j.applyEmail && !j.applyEmail.toLowerCase().includes('hiredoor') && !j.applyEmail.toLowerCase().includes('alloteme')) ? j.applyEmail.trim() : '',
      applyLink: (j.applyLink && j.applyLink.toLowerCase().includes('hiredoor') && j.applyLink.toLowerCase().includes('mailto:')) ? '' : j.applyLink,
    }));
  } catch (e) {
    console.error('[BulkParse] JSON parse error:', e.message, '\nRaw:', cleaned.slice(0, 500));
    return ApiResponse.error(res, 'AI could not parse the listing. Try reducing the text size or check the format.', 422);
  }

  return ApiResponse.success(res, { jobs, count: jobs.length }, `AI extracted ${jobs.length} jobs`);
};

// ── Admin: Bulk Create (post all AI-parsed jobs at once) ──────────────────────
exports.bulkCreateJobs = async (req, res) => {
  const { jobs } = req.body;
  if (!Array.isArray(jobs) || jobs.length === 0) {
    return ApiResponse.error(res, 'jobs array is required', 400);
  }

  let created = 0;
  const errors = [];

  for (const jobData of jobs) {
    try {
      const { companyTag, postedTime, ...rest } = jobData;
      const { companyId, companyName, companyLogo } = await resolveCompany(companyTag);
      const slug = generateSlug(rest.title || 'job');

      // Convert relative postedTime (e.g. "5h ago", "2d ago") to real Date
      let postedAt = rest.postedAt ? new Date(rest.postedAt) : new Date();
      if (postedTime && typeof postedTime === 'string') {
        const m = postedTime.toLowerCase().match(/^(\d+)\s*([a-z]+)/);
        if (m) {
          const num = parseInt(m[1], 10);
          const u = m[2];
          if (u.startsWith('m') && !u.startsWith('mo')) postedAt = new Date(Date.now() - num * 60000);
          else if (u.startsWith('h')) postedAt = new Date(Date.now() - num * 3600000);
          else if (u.startsWith('d')) postedAt = new Date(Date.now() - num * 86400000);
          else if (u.startsWith('w')) postedAt = new Date(Date.now() - num * 7 * 86400000);
          else if (u.startsWith('mo')) postedAt = new Date(Date.now() - num * 30 * 86400000);
          else if (u.startsWith('y')) postedAt = new Date(Date.now() - num * 365 * 86400000);
        }
      }

      const cleanApplyEmail = (rest.applyEmail && !rest.applyEmail.toLowerCase().includes('hiredoor') && !rest.applyEmail.toLowerCase().includes('alloteme')) ? rest.applyEmail.trim() : '';
      const cleanApplyLink = (rest.applyLink && rest.applyLink.toLowerCase().includes('hiredoor') && rest.applyLink.toLowerCase().includes('mailto:')) ? '' : rest.applyLink;

      await Job.create({
        ...rest,
        title: replaceHiredoorWithAlloteme(rest.title) || 'Open Position',
        description: replaceHiredoorWithAlloteme(rest.description),
        responsibilities: replaceHiredoorWithAlloteme(rest.responsibilities),
        requirements: replaceHiredoorWithAlloteme(rest.requirements),
        applyEmail: cleanApplyEmail,
        applyLink: cleanApplyLink || '',
        slug,
        companyTag: companyTag || '',
        company: companyId,
        companyName: replaceHiredoorWithAlloteme(companyName || rest.companyName || ''),
        companyLogo: companyLogo || rest.companyLogo || '',
        category: rest.category === 'Non-Tech' ? 'Non-Tech' : 'Tech',
        postedAt,
        source: 'ai',
        isActive: true,
      });
      created++;
    } catch (e) {
      errors.push(`${jobData.title}: ${e.message}`);
    }
  }

  return ApiResponse.success(res, { created, errors: errors.slice(0, 10) }, `Created ${created} of ${jobs.length} jobs`);
};

// ── Helper: detect local, cached, or @sparticuz/chromium executable path ──────
async function getPuppeteerExecutablePath(puppeteer) {
  // 1. Explicit env var
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  // 2. Known local browser paths (Windows / Edge / Linux system chrome)
  const candidatePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }

  // 3. Scan local project .cache/puppeteer recursively
  const cacheRoots = [
    path.join(__dirname, '../../.cache/puppeteer'),
    path.join(__dirname, '../../../.cache/puppeteer'),
    path.join(process.cwd(), '.cache/puppeteer'),
    path.join(process.cwd(), 'server/.cache/puppeteer'),
  ];
  for (const root of cacheRoots) {
    if (!fs.existsSync(root)) continue;
    const stack = [root];
    while (stack.length > 0) {
      const current = stack.pop();
      try {
        const entries = fs.readdirSync(current, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(current, entry.name);
          if (entry.isDirectory()) {
            stack.push(fullPath);
          } else if (
            entry.name === 'chrome' ||
            entry.name === 'chrome.exe' ||
            entry.name === 'chromium'
          ) {
            return fullPath;
          }
        }
      } catch {}
    }
  }

  // 4. In cloud Linux environments (like Render), use @sparticuz/chromium
  try {
    const rawChromium = require('@sparticuz/chromium');
    const chromium = rawChromium.default || rawChromium;
    if (chromium && typeof chromium.executablePath === 'function') {
      const spartPath = await chromium.executablePath();
      if (spartPath && fs.existsSync(spartPath)) {
        console.log('[HireDoor Scraper] Found @sparticuz/chromium at:', spartPath);
        return spartPath;
      }
    }
  } catch (err) {
    console.warn('[HireDoor Scraper] Note on @sparticuz/chromium:', err?.message);
  }

  // 5. Default puppeteer.executablePath()
  if (puppeteer && typeof puppeteer.executablePath === 'function') {
    try {
      const p = puppeteer.executablePath();
      const resolved = p && typeof p.then === 'function' ? await p : p;
      if (resolved && fs.existsSync(resolved)) {
        return resolved;
      }
    } catch {}
  }

  return undefined;
}

// ── Global Scraper State & Real-Time Sync Terminal Logs ───────────────────────
let isSyncCancelled = false;
let activeSyncLogs = [];
let activeSyncState = {
  isActive: false,
  status: 'idle', // 'idle' | 'running' | 'completed' | 'stopped' | 'failed'
  mode: 'count',
  category: 'Tech',
  startedAt: null,
  endedAt: null,
  totalToScrape: 0,
  processedCount: 0,
  savedCount: 0,
  duplicateCount: 0,
  errorsCount: 0,
  currentStep: '',
  message: '',
};

const syncLogListeners = new Set();

function logScraper(message, type = 'info', extraState = {}) {
  const timestamp = new Date();
  const timeStr = timestamp.toLocaleTimeString('en-US', { hour12: false });
  console.log(`[HireDoor Scraper][${timeStr}] ${message}`);

  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    time: timeStr,
    timestamp: timestamp.toISOString(),
    message,
    type, // 'info' | 'success' | 'warn' | 'error' | 'step'
  };

  activeSyncLogs.push(entry);
  if (activeSyncLogs.length > 600) activeSyncLogs.shift();

  Object.assign(activeSyncState, extraState);

  // Broadcast to any active SSE listeners
  if (syncLogListeners.size > 0) {
    const payload = `data: ${JSON.stringify({ type: 'log', log: entry, state: activeSyncState })}\n\n`;
    for (const clientRes of syncLogListeners) {
      try {
        clientRes.write(payload);
      } catch (err) {
        syncLogListeners.delete(clientRes);
      }
    }
  }

  return entry;
}

// ── Admin: Get Sync Status & Recent Terminal Logs (Polling API) ───────────────
exports.getSyncStatus = async (req, res) => {
  return ApiResponse.success(res, {
    state: activeSyncState,
    logs: activeSyncLogs,
  });
};

// ── Admin: Stream Sync Logs (Server-Sent Events) ──────────────────────────────
exports.streamSyncLogs = (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send initial payload with all existing logs and state
  res.write(`data: ${JSON.stringify({ type: 'init', state: activeSyncState, logs: activeSyncLogs })}\n\n`);
  syncLogListeners.add(res);

  const heartbeat = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch {
      clearInterval(heartbeat);
      syncLogListeners.delete(res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    syncLogListeners.delete(res);
  });
};

// ── Admin: Stop In-Progress HireDoor Sync ────────────────────────────────────
exports.stopSync = async (req, res) => {
  isSyncCancelled = true;
  logScraper('Admin requested to stop active sync.', 'warn', {
    status: 'stopping',
    message: 'Cancellation requested by admin',
  });
  return ApiResponse.success(res, { stopped: true }, 'Sync cancellation requested');
};

// ── Helper: Extract Valid Job Card URLs from a HireDoor Listing Page ─────────
async function extractJobLinksFromPage(page) {
  return page.evaluate(() => {
    const footerLinks = new Set(Array.from(document.querySelectorAll('footer a, nav a, header a')).map(a => a.href));
    const categorySlugs = new Set([
      'internships', 'freshers', 'remote', 'bangalore', 'bengaluru', 'hyderabad', 'pune',
      'delhi', 'mumbai', 'chennai', 'noida', 'gurgaon', 'kolkata', 'ahmedabad',
      'full-time', 'part-time', 'contract', 'freelance', 'work-from-home', 'hybrid', 'onsite'
    ]);

    const allLinks = Array.from(document.querySelectorAll('a[href*="/jobs/"]'));
    const seen = new Set();
    const urls = [];

    for (const a of allLinks) {
      const href = a.href;
      if (!href || seen.has(href)) continue;
      if (footerLinks.has(href)) continue;

      // Exclude root /jobs or /jobs/
      if (href.endsWith('/jobs') || href.endsWith('/jobs/')) continue;

      const slug = href.split('/jobs/')[1]?.split('?')[0]?.split('#')[0]?.replace(/\/+$/, '')?.toLowerCase();
      if (!slug) continue;

      // Exclude category and location search filters
      if (categorySlugs.has(slug) || categorySlugs.has(slug.replace(/-jobs$/, '')) || slug.startsWith('jobs-in-')) {
        continue;
      }

      // Real HireDoor job slugs always end with an alphanumeric id hash (e.g. software-engineering-amts-45ea59)
      if (!/-[a-f0-9]{4,10}$/i.test(slug)) {
        continue;
      }

      seen.add(href);
      urls.push(href);
    }
    return urls;
  });
}

// ── Admin: Sync Jobs from HireDoor ───────────────────────────────────────────
exports.syncHireDoor = async (req, res) => {
  let browser;
  isSyncCancelled = false;

  const category = req.body?.category === 'Non-Tech' ? 'Non-Tech' : 'Tech';
  const mode = req.body?.mode || 'count'; // 'until_last_added', 'count', or 'pages'
  const limitParam = parseInt(req.body?.limit || req.query?.limit || 10, 10);
  const rawPages = req.body?.pages;
  let targetPages = [];

  if (mode === 'pages') {
    if (Array.isArray(rawPages)) {
      targetPages = rawPages.map(p => parseInt(p, 10)).filter(p => !isNaN(p) && p > 0);
    } else if (typeof rawPages === 'string') {
      targetPages = rawPages.split(/[,;\s]+/).map(p => parseInt(p.trim(), 10)).filter(p => !isNaN(p) && p > 0);
    }
    targetPages = Array.from(new Set(targetPages)).sort((a, b) => a - b);
    if (targetPages.length === 0) targetPages = [1];
  }

  const maxJobs = mode === 'until_last_added'
    ? 200
    : (mode === 'pages' ? targetPages.length * 25 : Math.min(Math.max(limitParam, 1), 200));

  // Reset active sync state for live terminal streaming
  activeSyncLogs = [];
  activeSyncState = {
    isActive: true,
    status: 'running',
    mode,
    category,
    startedAt: new Date().toISOString(),
    endedAt: null,
    totalToScrape: maxJobs,
    processedCount: 0,
    savedCount: 0,
    duplicateCount: 0,
    errorsCount: 0,
    currentStep: `Starting scraper session for ${category} jobs...`,
    message: `Initialized HireDoor ${category} sync (mode: ${mode})`,
  };

  logScraper(`=== STARTING HIREDOOR SCRAPER [Portal: ${category} | Mode: ${mode}] ===`, 'step', {
    isActive: true,
    status: 'running',
  });

  try {
    const puppeteer = require('puppeteer');
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    
    // Resolve credentials from JobSettings (DB) first, fallback to .env
    const creds = await getEffectiveHireDoorCredentials();
    const HIREDOOR_EMAIL = creds.email;
    const HIREDOOR_PASSWORD = creds.password;

    let chromiumArgs = [];
    try {
      const rawChromium = require('@sparticuz/chromium');
      const chromium = rawChromium.default || rawChromium;
      if (chromium && Array.isArray(chromium.args)) {
        chromiumArgs = chromium.args;
      }
    } catch {}

    const executablePath = await getPuppeteerExecutablePath(puppeteer);

    const baseArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
    ];

    const launchArgs = Array.from(new Set([...chromiumArgs, ...baseArgs]));

    const launchOptions = {
      headless: true,
      args: launchArgs,
    };
    if (executablePath) {
      logScraper(`Using browser executable: ${executablePath}`, 'info');
      launchOptions.executablePath = executablePath;
    }

    logScraper('Launching headless Chromium browser...', 'info', { currentStep: 'Launching Chromium browser' });
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 1. Log in to HireDoor if credentials available
    if (HIREDOOR_EMAIL && HIREDOOR_PASSWORD) {
      try {
        logScraper(`Attempting login at https://hiredoor.in/login (credentials source: ${creds.source})...`, 'info', { currentStep: 'Logging in to HireDoor' });
        await page.goto('https://hiredoor.in/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
        await sleep(1500);

        // HireDoor defaults to "Sign up" tab on /login — switch to "Sign in" tab
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const signInTab = buttons.find(b => b.innerText.trim().toLowerCase() === 'sign in');
          if (signInTab) signInTab.click();
        });
        await sleep(1000);

        await page.waitForSelector('input[type="email"]', { timeout: 8000 });
        const emailInputs = await page.$$('input[type="email"]');
        if (emailInputs.length) await emailInputs[0].type(HIREDOOR_EMAIL);
        const passInputs = await page.$$('input[type="password"]');
        if (passInputs.length) await passInputs[0].type(HIREDOOR_PASSWORD);

        // Click the form submit / Sign in button
        await page.evaluate(() => {
          const submitBtn = document.querySelector('form button[type="submit"]') ||
            Array.from(document.querySelectorAll('button')).find(b => /sign in|log in/i.test(b.innerText));
          if (submitBtn) submitBtn.click();
        });

        await sleep(3500);
        logScraper(`HireDoor session authenticated for ${maskEmail(HIREDOOR_EMAIL)}.`, 'success');
      } catch (loginErr) {
        logScraper(`HireDoor login note: ${loginErr.message}. Proceeding with public access.`, 'warn');
      }
    } else {
      logScraper('No HireDoor credentials configured. Proceeding with public listings.', 'info');
    }

    // Determine target portal base URL and toggle vertical state on HireDoor
    const baseListingUrl = category === 'Non-Tech' ? 'https://hiredoor.in/non-tech' : 'https://hiredoor.in/jobs';
    const getPageUrl = (p) => p === 1 ? baseListingUrl : `${baseListingUrl}?page=${p}`;

    logScraper(`Selected Portal Mode: ${category} -> Base URL: ${baseListingUrl}`, 'step', {
      currentStep: `Preparing ${category} listings`,
    });

    // 2. Multi-page collection of job cards
    let pageNum = 1;
    let jobUrls = [];
    const seenUrls = new Set();
    let stoppedAtDuplicate = false;
    let duplicateCount = 0;

    if (mode === 'pages') {
      logScraper(`Mode 'Pages': Crawling specific selected pages [${targetPages.join(', ')}]...`, 'info', {
        currentStep: `Crawling pages ${targetPages.join(', ')}`,
      });
      for (const pNum of targetPages) {
        if (isSyncCancelled) {
          logScraper('Sync cancelled by admin. Exiting page loop.', 'warn');
          break;
        }

        const pageUrl = getPageUrl(pNum);
        logScraper(`Navigating to ${category} Page ${pNum}: ${pageUrl}`, 'info', {
          currentStep: `Scanning page ${pNum}`,
        });

        try {
          await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
          await sleep(1500);

          // Ensure vertical toggle matches selected category on HireDoor and wait for render
          await page.evaluate((targetCategory) => {
            try {
              const isNonTech = targetCategory === 'Non-Tech';
              const targetLabel = isNonTech ? 'Non-tech' : 'Tech';
              localStorage.setItem('hd-vertical', isNonTech ? 'non-tech' : 'tech');
              document.cookie = `hd-vertical=${isNonTech ? 'non-tech' : 'tech'}; path=/; domain=hiredoor.in`;

              const buttons = Array.from(document.querySelectorAll('button'));
              const btn = buttons.find(b => b.innerText.trim().toLowerCase() === targetLabel.toLowerCase());
              if (btn) btn.click();
            } catch (e) {}
          }, category);
          await sleep(2500);
        } catch (pageNavErr) {
          logScraper(`Failed to load ${pageUrl}: ${pageNavErr.message}`, 'error');
          continue;
        }

        if (isSyncCancelled) break;
        const pageUrls = await extractJobLinksFromPage(page);
        let pageNewCount = 0;
        let pageDupCount = 0;

        for (const cardUrl of pageUrls) {
          if (isSyncCancelled) break;
          if (seenUrls.has(cardUrl)) continue;
          seenUrls.add(cardUrl);

          const alreadyInDb = await Job.findOne({ sourceUrl: cardUrl }).select('_id title').lean();
          if (alreadyInDb) {
            duplicateCount++;
            pageDupCount++;
            logScraper(`[Already in DB] "${alreadyInDb.title}" (Skipped)`, 'info', { duplicateCount });
            continue;
          }

          pageNewCount++;
          jobUrls.push(cardUrl);
        }

        logScraper(`Page ${pNum} Summary: ${pageUrls.length} cards inspected (${pageNewCount} new queued, ${pageDupCount} already in database).`, 'step');
      }
    } else {
      const maxPagesToInspect = Math.max(Math.ceil(maxJobs / 15) + 3, 5);

      while (jobUrls.length < maxJobs && pageNum <= maxPagesToInspect && !stoppedAtDuplicate) {
        if (isSyncCancelled) {
          logScraper('Sync cancelled by admin. Exiting page loop.', 'warn');
          break;
        }

        const pageUrl = getPageUrl(pageNum);
        logScraper(`Crawling ${category} Listing Page ${pageNum}: ${pageUrl} (Found: ${jobUrls.length}/${maxJobs})`, 'info', {
          currentStep: `Scanning page ${pageNum} (${jobUrls.length}/${maxJobs} jobs queued)`,
        });
        
        try {
          await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
          await sleep(1500);

          // Ensure vertical toggle matches selected category on HireDoor and wait for render
          await page.evaluate((targetCategory) => {
            try {
              const isNonTech = targetCategory === 'Non-Tech';
              const targetLabel = isNonTech ? 'Non-tech' : 'Tech';
              localStorage.setItem('hd-vertical', isNonTech ? 'non-tech' : 'tech');
              document.cookie = `hd-vertical=${isNonTech ? 'non-tech' : 'tech'}; path=/; domain=hiredoor.in`;

              const buttons = Array.from(document.querySelectorAll('button'));
              const btn = buttons.find(b => b.innerText.trim().toLowerCase() === targetLabel.toLowerCase());
              if (btn) btn.click();
            } catch (e) {}
          }, category);
          await sleep(2500);
        } catch (pageNavErr) {
          logScraper(`Failed to load ${pageUrl}: ${pageNavErr.message}`, 'error');
          break;
        }

        if (isSyncCancelled) break;

        const pageUrls = await extractJobLinksFromPage(page);

        if (!pageUrls || pageUrls.length === 0) {
          logScraper(`No job cards found on page ${pageNum}. Reached end of listings.`, 'warn');
          break;
        }

        // Check duplicates against DB so we don't add existing jobs
        let pageNewCount = 0;
        let pageDupCount = 0;
        for (const cardUrl of pageUrls) {
          if (isSyncCancelled) break;
          if (seenUrls.has(cardUrl)) continue;
          seenUrls.add(cardUrl);

          const alreadyInDb = await Job.findOne({ sourceUrl: cardUrl }).select('_id title').lean();
          if (alreadyInDb) {
            duplicateCount++;
            pageDupCount++;
            if (mode === 'until_last_added') {
              logScraper(`Reached previously added job in DB: "${alreadyInDb.title}". Stopping incremental crawl.`, 'step', {
                duplicateCount,
              });
              stoppedAtDuplicate = true;
              break;
            } else {
              logScraper(`[Already in DB] "${alreadyInDb.title}" (Skipped)`, 'info', { duplicateCount });
              continue;
            }
          }

          pageNewCount++;
          jobUrls.push(cardUrl);
          if (jobUrls.length >= maxJobs) break;
        }

        logScraper(`Page ${pageNum} Summary: Found ${pageUrls.length} cards (${pageNewCount} new queued, ${pageDupCount} already in database).`, 'info');
        pageNum++;
      }
    }

    logScraper(`Queued ${jobUrls.length} new unique ${category} jobs to extract.`, 'step', {
      totalToScrape: jobUrls.length,
      currentStep: `Extracting ${jobUrls.length} job cards...`,
    });

    let savedCount = 0;
    let processedCount = 0;
    const errors = [];

    // 3. For each unique new job card: open detail page in isolated tab, scrape info, click Apply Now
    for (const jobUrl of jobUrls) {
      if (isSyncCancelled) {
        logScraper('Sync cancelled by admin. Exiting job scraping loop.', 'warn');
        break;
      }
      let jobPage = null;
      let targetListener = null;
      try {
        processedCount++;
        logScraper(`[${processedCount}/${jobUrls.length}] Opening: ${jobUrl}`, 'info', {
          processedCount,
          currentStep: `Scraping job ${processedCount}/${jobUrls.length}`,
        });

        // Use dedicated tab for each job detail to prevent tab corruption, hung sockets, or memory accumulation
        jobPage = await browser.newPage();
        await jobPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        jobPage.setDefaultNavigationTimeout(20000);
        jobPage.setDefaultTimeout(20000);

        // Capture direct applicationLink returned from internal HireDoor API on click
        let apiApplyUrl = null;
        const responseHandler = async (res) => {
          try {
            if (res.url().includes('/api/apply/')) {
              const json = await res.json().catch(() => null);
              if (json && json.applicationLink && typeof json.applicationLink === 'string') {
                const link = json.applicationLink.trim();
                if (link && !link.toLowerCase().includes('hiredoor.in')) {
                  apiApplyUrl = link;
                  if (!externalApplyUrl) externalApplyUrl = link;
                }
              }
            }
          } catch (e) {}
        };
        jobPage.on('response', responseHandler);

        // Hook window.open BEFORE navigation to immediately capture exact apply URLs from React buttons (e.g. keka, lever, greenhouse)
        await jobPage.evaluateOnNewDocument(() => {
          window.__capturedApplyUrl = null;
          const origOpen = window.open;
          window.open = function(url, target, features) {
            if (url && typeof url === 'string') {
              window.__capturedApplyUrl = url;
            }
            return origOpen ? origOpen.call(window, url, target, features) : null;
          };
        });

        // Set up target listener to capture the external apply URL on click
        let externalApplyUrl = null;
        targetListener = async (target) => {
          try {
            const url = target.url();
            if (url && url !== 'about:blank' && !url.includes('hiredoor.in')) {
              let resolvedUrl = url;
              // Unwrap Google Accounts sign-in wrapper around Google Forms if present
              if (url.includes('accounts.google.com') && url.includes('continue=')) {
                try {
                  const u = new URL(url);
                  const cont = u.searchParams.get('continue');
                  if (cont) resolvedUrl = decodeURIComponent(cont);
                } catch (e) {}
              }
              externalApplyUrl = resolvedUrl;
              try {
                const targetPage = await target.page();
                if (targetPage) await targetPage.close().catch(() => {});
              } catch (e) {}
            }
          } catch (e) {}
        };
        browser.on('targetcreated', targetListener);
        browser.on('targetchanged', targetListener);

        // Fast domcontentloaded navigation so tracking beacons / analytics don't cause 30s timeout
        try {
          await jobPage.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 18000 });
        } catch (navErr) {
          logScraper(`Initial navigation note on ${jobUrl}: ${navErr.message}. Retrying...`, 'warn');
          await sleep(1000);
          await jobPage.goto(jobUrl, { waitUntil: 'load', timeout: 12000 }).catch(() => {});
        }
        await sleep(1500);

        // 1. Immediately inspect full HTML/Next.js data payload for direct applicationLink
        const pageHtml = await jobPage.content().catch(() => '');
        const payloadApplyUrl = extractDirectApplyLinkFromHtml(pageHtml);
        if (payloadApplyUrl) {
          externalApplyUrl = payloadApplyUrl;
          logScraper(`[Direct Apply Link Found] "${jobUrl}" -> ${payloadApplyUrl}`, 'success');
        }

        // Extract detailed data from the job page
        const jobData = await jobPage.evaluate(() => {
          const title = document.querySelector('h1')?.innerText?.trim() || '';

          // Find company name
          const companyEl = document.querySelector('h1')?.previousElementSibling || document.querySelector('a[href*="/companies/"]');
          const companyName = companyEl ? companyEl.innerText.trim() : '';

          // Find company logo strictly within the job's header section.
          // Never grab unrelated images from other sections, recommendation carousels, or social icons.
          let companyLogo = '';
          const headerContainer = document.querySelector('h1')?.closest('header, section, div.grid, div.flex, div[class*="header"], div[class*="hero"], div[class*="banner"]') || document.querySelector('h1')?.parentElement?.parentElement;

          if (headerContainer) {
            const headerImgs = Array.from(headerContainer.querySelectorAll('img'));
            const logoImg = headerImgs.find(img => {
              const src = (img.src || '').toLowerCase();
              const alt = (img.alt || '').toLowerCase();
              if (!src || src.startsWith('data:')) return false;
              if (src.includes('hiredoor-logo') || src.includes('hiredoor_logo') || src.includes('googleusercontent') || src.includes('avatar')) return false;
              if (/linkedin|instagram|whatsapp|facebook|twitter|youtube|discord|telegram/.test(src) || /linkedin|instagram|whatsapp|facebook|twitter|youtube|discord|telegram/.test(alt)) return false;
              return src.includes('/companies/') || src.includes('/company/') || src.includes('/employers/') || alt.includes('logo') || src.includes('logo');
            });
            if (logoImg) companyLogo = logoImg.src;
          }

          const bodyText = document.body.innerText;

          // Helper to get text under specific headings
          const getSectionText = (headingText) => {
            const headings = Array.from(document.querySelectorAll('h2, h3, h4, div, span'));
            const found = headings.find(h => h.innerText.trim().toLowerCase() === headingText.toLowerCase());
            if (!found) return '';
            const next = found.nextElementSibling;
            const parent = found.parentElement;
            return (next ? next.innerText.trim() : '') || (parent ? parent.innerText.replace(found.innerText, '').trim() : '');
          };

          // Work mode
          const workModeMatch = bodyText.match(/Work mode\s*\n*([A-Za-z\-]+)/i);
          let workMode = workModeMatch ? workModeMatch[1].trim() : 'Remote';
          if (!['Remote', 'Hybrid', 'On-site'].includes(workMode)) {
            if (/remote/i.test(workMode)) workMode = 'Remote';
            else if (/hybrid/i.test(workMode)) workMode = 'Hybrid';
            else workMode = 'On-site';
          }

          // Job type
          let jobType = 'Full-time';
          if (/\bInternship\b/i.test(bodyText)) jobType = 'Internship';
          else if (/\bContract\b/i.test(bodyText)) jobType = 'Contract';
          else if (/\bPart-time\b/i.test(bodyText)) jobType = 'Part-time';

          // Salary / Stipend
          const salaryMatch = bodyText.match(/(?:Salary|Stipend)\s*\n*([₹$][^\n]+)/i);
          const salary = salaryMatch ? salaryMatch[1].trim() : '';

          // Location
          const locationMatch = bodyText.match(/Location\s*\n*([^\n]+)/i);
          const location = locationMatch ? locationMatch[1].trim() : (workMode === 'Remote' ? 'Remote' : 'India');

          // Eligible batch
          const batchMatch = bodyText.match(/Eligible batch\s*\n*([^\n]+)/i);
          const eligibleBatch = batchMatch ? batchMatch[1].trim() : '';

          // Experience
          const expMatch = bodyText.match(/Experience:\s*([^\n]+)/i);
          const experience = expMatch ? expMatch[1].trim() : eligibleBatch;

          // Description, Responsibilities, Requirements, Skills
          const desc = getSectionText('About the role');
          const respText = getSectionText('Responsibilities');
          const reqText = getSectionText('Requirements');
          const skillsText = getSectionText('Required Skills');

          const splitLines = (t) => t ? t.split('\n').map(s => s.trim().replace(/^[•\-\*]\s*/, '')).filter(s => s.length > 2) : [];

          // Look for direct employer email in how to apply section, NEVER extract hiredoor or alloteme emails
          const allEmails = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
          const validEmail = allEmails.find(em => {
            const low = em.toLowerCase();
            return !low.includes('hiredoor') && !low.includes('alloteme') && !low.includes('example.com');
          });
          const applyEmail = validEmail ? validEmail.trim() : '';

          // Look for direct contact phone / WhatsApp / tel: links
          const telLinks = Array.from(document.querySelectorAll('a[href^="tel:"]'))
            .map(a => a.href.replace(/^tel:/i, '').trim())
            .filter(Boolean);

          const waLinks = Array.from(document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp.com/send"]'))
            .map(a => {
              const m = a.href.match(/phone=([0-9+]+)/i) || a.href.match(/wa\.me\/([0-9+]+)/i);
              return m ? m[1] : '';
            })
            .filter(Boolean);

          // Regex search in text for phone/whatsapp
          const phoneInText = bodyText.match(/(?:whatsapp|contact|phone|call|mobile|reach out|apply via|hr)[:\s\-–]*([+]?[0-9\s\-]{10,15})/i) ||
            bodyText.match(/(\+91[\s\-]?[6-9]\d{9})/i) ||
            bodyText.match(/\b([6-9]\d{9})\b/);

          const rawPhone = telLinks[0] || waLinks[0] || (phoneInText ? phoneInText[1].trim() : '');
          const cleanPhone = rawPhone ? rawPhone.replace(/[^\d+]/g, '') : '';
          const contactPhone = cleanPhone && cleanPhone.replace(/\D/g, '').length >= 10 ? cleanPhone : '';

          // Look for posted time e.g. "5h ago", "2d ago", "1 day ago"
          const postedMatch = bodyText.match(/(\d+\s*(?:m|h|d|w|mo|y|min|mins|minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)\s*ago)/i);
          const postedTime = postedMatch ? postedMatch[1] : '';

          return {
            title,
            companyName,
            companyLogo,
            workMode,
            jobType,
            salary,
            location,
            eligibleBatch,
            experience,
            description: desc || bodyText.slice(0, 500),
            responsibilities: splitLines(respText),
            requirements: splitLines(reqText),
            tags: splitLines(skillsText),
            applyEmail,
            contactPhone,
            postedTime,
          };
        });

        // If not already resolved from page stream payload, click Apply Now button to trigger API / window.open / target
        if (!externalApplyUrl) {
          try {
            const btns = await jobPage.$$('button, a');
            for (const b of btns) {
              const text = await (await b.getProperty('innerText')).jsonValue().catch(() => '');
              if (/apply now|apply for this job/i.test(text || '')) {
                await b.click().catch(() => {});
                break;
              }
            }
          } catch (e) {}

          await sleep(2500);

          if (apiApplyUrl) {
            externalApplyUrl = apiApplyUrl;
          }
        }

        // Check if window.open captured the exact direct ATS apply link
        const hookUrl = await jobPage.evaluate(() => window.__capturedApplyUrl).catch(() => null);
        if (hookUrl && typeof hookUrl === 'string' && !hookUrl.includes('hiredoor.in')) {
          let cleanHook = hookUrl;
          if (cleanHook.includes('accounts.google.com')) {
            try {
              const u = new URL(cleanHook);
              const cont = u.searchParams.get('continue') || u.searchParams.get('followup');
              if (cont) cleanHook = decodeURIComponent(cont);
            } catch (e) {}
          }
          if (!externalApplyUrl) externalApplyUrl = cleanHook;
        }

        if (targetListener) {
          browser.off('targetcreated', targetListener);
          browser.off('targetchanged', targetListener);
          targetListener = null;
        }

        // If popup was blocked or delayed, check for Google Forms or ATS systems (NEVER company homepage / "Official website" links)
        if (!externalApplyUrl || externalApplyUrl.includes('hiredoor.in')) {
          try {
            const pageJobLink = await jobPage.evaluate(() => {
              const allA = Array.from(document.querySelectorAll('a[href]'));
              const bodyText = document.body.innerText || '';
              
              // Strict ATS and application portal patterns
              const atsPatterns = [
                'docs.google.com/forms', 'forms.gle', 'forms.office.com', 'typeform.com', 'tally.so',
                'keka.com', 'greenhouse.io', 'lever.co', 'workday', 'myworkdayjobs', 'darwinbox',
                'smartrecruiters', 'bamboohr', 'ashbyhq', 'job-boards', 'recruitee', 'taleo',
                'zohorecruit', 'rippling', 'lever', 'greenhouse'
              ];

              for (const a of allA) {
                const href = (a.href || '').trim();
                const text = (a.innerText || '').trim().toLowerCase();
                if (!href || href.startsWith('javascript:') || href.includes('hiredoor.in') || href.includes('whatsapp.com/channel') || href.includes('linkedin.com/company') || href.includes('alloteme')) {
                  continue;
                }

                // Explicitly ignore "Official website", "Website", "Homepage"
                if (/official website|website|home|homepage/i.test(text)) {
                  continue;
                }

                const lowHref = href.toLowerCase();
                const isATS = atsPatterns.some(p => lowHref.includes(p));
                const hasCareerPath = lowHref.includes('/careers/') || lowHref.includes('/apply/') || lowHref.includes('/jobs/');

                if (isATS || hasCareerPath) {
                  return href;
                }
              }

              // Scan text for direct Google Forms link
              const gFormText = bodyText.match(/https?:\/\/(?:docs\.google\.com\/forms\/d\/[^\s"'>)]+|forms\.gle\/[a-zA-Z0-9_-]+)/i);
              if (gFormText && !gFormText[0].includes('1FAIpQLSfQWc_lv_mvwR3mbksJyjCTUjiOgEFjty8N36em97v2diOP_w')) {
                return gFormText[0];
              }

              return null;
            });

            if (pageJobLink) {
              externalApplyUrl = pageJobLink;
            }
          } catch (e) {}
        }

        // Clean any residual trailing backslashes, quotes, or URI-encoding from externalApplyUrl
        if (externalApplyUrl && typeof externalApplyUrl === 'string') {
          externalApplyUrl = externalApplyUrl
            .trim()
            .replace(/[\"'\\]+$/, '')
            .replace(/\\u0026/g, '&')
            .replace(/\\\//g, '/');

          if (/docs\.google\.com\/forms|forms\.gle/i.test(externalApplyUrl)) {
            logScraper(`[Google Form Detected] Captured direct Google Form apply link: ${externalApplyUrl}`, 'success');
          }
        }

        // Apply link resolution: ONLY genuine external company apply URL, company mailto, or employer contact number. NEVER hiredoor.in!
        let finalApplyLink = '';
        if (externalApplyUrl && !externalApplyUrl.toLowerCase().includes('hiredoor.in')) {
          finalApplyLink = externalApplyUrl;
        }
        const validApplyEmail = (jobData.applyEmail && !jobData.applyEmail.toLowerCase().includes('hiredoor') && !jobData.applyEmail.toLowerCase().includes('alloteme')) ? jobData.applyEmail.trim() : '';
        if (!finalApplyLink && validApplyEmail) {
          finalApplyLink = `mailto:${validApplyEmail}`;
        }

        // When apply link or email is not found, look for contact number as requested
        const validContactPhone = jobData.contactPhone ? jobData.contactPhone.trim() : '';
        if (!finalApplyLink && !validApplyEmail && validContactPhone) {
          finalApplyLink = `tel:${validContactPhone}`;
          logScraper(`[Contact Found] "${jobData.title}" has no direct link/email, using contact phone: ${validContactPhone}`, 'info');
        }

        // Skip adding jobs only if neither apply link, email, nor contact number is available
        if (!finalApplyLink && !validApplyEmail && !validContactPhone) {
          logScraper(`Skipping "${jobData.title}" (${jobData.companyName || 'Unknown'}) - no direct company apply link, email, or contact number found.`, 'warn');
          continue;
        }

        // Skip category listing pages that have no actual job responsibilities or requirements
        const isCategoryTitle = /internships|freshers|remote|bangalore|hyderabad|pune|mumbai|delhi|jobs in /i.test(jobData.title) && (!jobData.responsibilities?.length && !jobData.requirements?.length);
        if (isCategoryTitle) {
          logScraper(`Skipping category index link: "${jobData.title}"`, 'warn');
          continue;
        }

        const companyTag = (jobData.companyName || 'company').toLowerCase().replace(/[^a-z0-9]/g, '');
        const { companyId, companyName, companyLogo: resolvedLogo } = await resolveCompany(companyTag);

        // Priority 1: First use uploaded company logo (from Company collection)
        // Priority 2: If not available, use verified scraped logo from HireDoor
        const candidateLogo = resolvedLogo || jobData.companyLogo || '';
        const finalCompanyLogo = isValidCompanyLogo(candidateLogo) ? candidateLogo : '';

        // Clean and brand all scraped text fields: replace any HireDoor mention with Tech AlloteMe
        const cleanTitle = replaceHiredoorWithAlloteme(jobData.title) || 'Open Position';
        const rawCompany = companyName || jobData.companyName || 'Company';
        const cleanCompanyName = replaceHiredoorWithAlloteme(rawCompany);
        const cleanDescription = replaceHiredoorWithAlloteme(jobData.description);
        const cleanResponsibilities = replaceHiredoorWithAlloteme(jobData.responsibilities);
        const cleanRequirements = replaceHiredoorWithAlloteme(jobData.requirements);
        const cleanTags = replaceHiredoorWithAlloteme(jobData.tags);
        const cleanExperience = replaceHiredoorWithAlloteme(jobData.experience);
        const cleanEligibleBatch = replaceHiredoorWithAlloteme(jobData.eligibleBatch);

        const slug = generateSlug(cleanTitle);

        // Check for existing job to prevent duplicates
        const queryOr = [{ sourceUrl: jobUrl }];
        if (slug) queryOr.push({ slug });
        if (cleanTitle && companyTag && companyTag !== 'company' && companyTag.length > 2) {
          queryOr.push({
            title: new RegExp(`^${cleanTitle.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
            companyTag,
          });
        }
        const existing = await Job.findOne({ $or: queryOr });

        if (existing) {
          duplicateCount++;
          logScraper(`[Already in DB] "${cleanTitle}" at ${cleanCompanyName} (Skipping duplicate)`, 'info', { duplicateCount });
          if (mode === 'until_last_added') {
            stoppedAtDuplicate = true;
            break;
          }
          continue;
        }

        await Job.create({
          title: cleanTitle,
          slug,
          company: companyId,
          companyTag,
          companyName: cleanCompanyName,
          companyLogo: finalCompanyLogo,
          category,
          scrapedAt: new Date(),
          location: jobData.location,
          workMode: jobData.workMode,
          jobType: jobData.jobType,
          salary: jobData.salary,
          experience: cleanExperience,
          eligibleBatch: cleanEligibleBatch,
          description: cleanDescription,
          responsibilities: cleanResponsibilities,
          requirements: cleanRequirements,
          tags: cleanTags.length ? cleanTags : [category === 'Non-Tech' ? 'Non-Tech' : 'Software'],
          applyLink: finalApplyLink,
          applyEmail: validApplyEmail,
          contactPhone: jobData.contactPhone || '',
          source: 'scraped',
          sourceUrl: jobUrl,
          isActive: true,
          postedAt: (() => {
            if (jobData.postedTime) {
              const m = jobData.postedTime.toLowerCase().match(/^(\d+)\s*([a-z]+)/);
              if (m) {
                const num = parseInt(m[1], 10);
                const u = m[2];
                if (u.startsWith('m') && !u.startsWith('mo')) return new Date(Date.now() - num * 60000);
                if (u.startsWith('h')) return new Date(Date.now() - num * 3600000);
                if (u.startsWith('d')) return new Date(Date.now() - num * 86400000);
                if (u.startsWith('w')) return new Date(Date.now() - num * 7 * 86400000);
                if (u.startsWith('mo')) return new Date(Date.now() - num * 30 * 86400000);
                if (u.startsWith('y')) return new Date(Date.now() - num * 365 * 86400000);
              }
            }
            return new Date();
          })(),
        });
        savedCount++;
        logScraper(`[Saved #${savedCount}] "${cleanTitle}" at ${cleanCompanyName} [${category}]`, 'success', {
          savedCount,
        });
      } catch (jobErr) {
        logScraper(`Error scraping ${jobUrl}: ${jobErr.message}`, 'error');
        errors.push(`${jobUrl}: ${jobErr.message}`);
        activeSyncState.errorsCount = errors.length;
      } finally {
        if (targetListener) {
          browser.off('targetcreated', targetListener);
          browser.off('targetchanged', targetListener);
        }
        if (jobPage) {
          await jobPage.close().catch(() => {});
        }
      }
    }

    const msg = isSyncCancelled
      ? `Sync stopped by admin. Saved ${savedCount} new ${category} jobs.`
      : (mode === 'pages'
        ? `Successfully synced ${savedCount} new ${category} jobs across page(s) ${targetPages.join(', ')}`
        : (stoppedAtDuplicate
          ? `Incremental sync complete: saved ${savedCount} new ${category} jobs (stopped upon reaching previously added job)`
          : `Successfully synced ${savedCount} new ${category} jobs from HireDoor across ${pageNum - 1 || 1} page(s)`));

    logScraper(`=== SYNC FINISHED: ${msg} ===`, 'step', {
      isActive: false,
      status: isSyncCancelled ? 'stopped' : 'completed',
      endedAt: new Date().toISOString(),
      currentStep: 'Done',
      message: msg,
    });

    return ApiResponse.success(res, {
      scraped: processedCount,
      saved: savedCount,
      category,
      stoppedAtDuplicate,
      wasCancelled: isSyncCancelled,
      mode,
      errors: errors.slice(0, 5),
    }, msg);

  } catch (error) {
    logScraper(`Sync process failed: ${error.message}`, 'error', {
      isActive: false,
      status: 'failed',
      endedAt: new Date().toISOString(),
      currentStep: 'Failed',
      message: error.message,
    });
    console.error('[HireDoor Sync Error]', error);
    return ApiResponse.error(res, `Sync failed: ${error.message}`, 500);
  } finally {
    activeSyncState.isActive = false;
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
};

// ── Public / Auth: Get Daily Job Application Limit Status ─────────────────────
exports.getApplyStatus = async (req, res) => {
  const user = req.user;
  const today = new Date().toISOString().slice(0, 10);

  if (!user) {
    return ApiResponse.success(res, {
      isLoggedIn: false,
      isPremium: false,
      dailyLimit: 5,
      appliedCount: 0,
      remaining: 5,
      hasReachedLimit: false,
    });
  }

  const isPremium = !!(user.isPremium && user.premiumExpiresAt && new Date(user.premiumExpiresAt) > new Date());
  if (isPremium) {
    return ApiResponse.success(res, {
      isLoggedIn: true,
      isPremium: true,
      dailyLimit: -1,
      appliedCount: user.dailyJobApplies?.date === today ? (user.dailyJobApplies.count || 0) : 0,
      remaining: -1,
      hasReachedLimit: false,
    });
  }

  const currentDate = user.dailyJobApplies?.date || '';
  const count = currentDate === today ? (user.dailyJobApplies?.count || 0) : 0;

  return ApiResponse.success(res, {
    isLoggedIn: true,
    isPremium: false,
    dailyLimit: 5,
    appliedCount: count,
    remaining: Math.max(0, 5 - count),
    hasReachedLimit: count >= 5,
  });
};

// ── Public / Auth: Track a Job Application & Enforce Daily Limits ─────────────
exports.trackJobApply = async (req, res) => {
  const user = req.user;
  const { jobId } = req.body;
  const today = new Date().toISOString().slice(0, 10);

  if (!user) {
    return ApiResponse.success(res, {
      isLoggedIn: false,
      isPremium: false,
      dailyLimit: 5,
      appliedCount: 0,
      remaining: 5,
      hasReachedLimit: false,
      allowed: true,
    });
  }

  const isPremium = !!(user.isPremium && user.premiumExpiresAt && new Date(user.premiumExpiresAt) > new Date());
  const isAdmin = user.role === 'admin';

  if (isPremium || isAdmin) {
    const curCount = user.dailyJobApplies?.date === today ? (user.dailyJobApplies.count || 0) : 0;
    user.dailyJobApplies = { count: curCount + 1, date: today };
    await user.save();
    return ApiResponse.success(res, {
      isLoggedIn: true,
      isPremium: true,
      dailyLimit: -1,
      appliedCount: curCount + 1,
      remaining: -1,
      hasReachedLimit: false,
      allowed: true,
    });
  }

  // Free user: check if the targeted job is locked (only the 5 oldest jobs per company are unlocked)
  if (jobId) {
    const targetJob = await Job.findById(jobId).select('companyTag isReviewed isActive');
    if (targetJob && targetJob.companyTag) {
      const oldestJobs = await Job.find({
        companyTag: targetJob.companyTag,
        isActive: true,
        isReviewed: true,
      })
        .sort({ postedAt: 1, createdAt: 1 })
        .limit(5)
        .select('_id')
        .lean();

      const isUnlocked = oldestJobs.some(oj => oj._id.toString() === targetJob._id.toString());
      if (!isUnlocked) {
        return ApiResponse.error(
          res,
          'This job is locked for free users. Please upgrade to Premium to apply to latest jobs!',
          403,
          { isLocked: true }
        );
      }
    }
  }

  // Free user: limit is 5 applications per day
  const currentDate = user.dailyJobApplies?.date || '';
  let count = currentDate === today ? (user.dailyJobApplies?.count || 0) : 0;

  if (count >= 5) {
    return ApiResponse.error(res, 'Daily limit reached. Free users can apply to 5 jobs per day. Upgrade to Premium for unlimited daily applications.', 403, {
      hasReachedLimit: true,
      dailyLimit: 5,
      appliedCount: count,
      remaining: 0,
      allowed: false,
    });
  }

  count += 1;
  user.dailyJobApplies = { count, date: today };
  await user.save();

  return ApiResponse.success(res, {
    isLoggedIn: true,
    isPremium: false,
    dailyLimit: 5,
    appliedCount: count,
    remaining: Math.max(0, 5 - count),
    hasReachedLimit: count >= 5,
    allowed: true,
  });
};

// ── Shared Scraper Terminal Helpers for ATS & HireDoor ────────────────────────
exports.logScraper = logScraper;
exports.getActiveSyncState = () => activeSyncState;
exports.getActiveSyncLogs = () => activeSyncLogs;
exports.getIsSyncCancelled = () => isSyncCancelled;
exports.setIsSyncCancelled = (val) => { isSyncCancelled = Boolean(val); };
exports.resetSyncSession = (initialState = {}) => {
  activeSyncLogs.length = 0;
  isSyncCancelled = false;
  Object.keys(activeSyncState).forEach((k) => delete activeSyncState[k]);
  Object.assign(activeSyncState, {
    isActive: true,
    status: 'running',
    startedAt: new Date().toISOString(),
    endedAt: null,
    totalToScrape: 0,
    processedCount: 0,
    savedCount: 0,
    duplicateCount: 0,
    errorsCount: 0,
    currentStep: '',
    message: '',
    ...initialState,
  });
};
