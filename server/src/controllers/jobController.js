const fs = require('fs');
const path = require('path');
const Job = require('../models/Job');
const Company = require('../models/Company');
const JobSettings = require('../models/JobSettings');
const ApiResponse = require('../utils/apiResponse');

function generateSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
}

// ── Public: Get All Jobs ──────────────────────────────────────────────────────
exports.getJobs = async (req, res) => {
  const { page = 1, limit = 20, search, jobType, workMode, company, tag } = req.query;
  const query = { isActive: true };
  
  if (search) query.$or = [
    { title: new RegExp(search, 'i') },
    { companyName: new RegExp(search, 'i') },
    { description: new RegExp(search, 'i') }
  ];
  if (jobType) query.jobType = jobType;
  if (workMode) query.workMode = workMode;
  if (company) query.companyTag = company;
  if (tag) query.tags = { $in: [tag] };

  const skip = (Number(page) - 1) * Number(limit);
  const [jobs, total] = await Promise.all([
    Job.find(query)
      .populate('company', 'name slug logo hasWhiteBg')
      .sort({ isFeatured: -1, postedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Job.countDocuments(query)
  ]);

  return ApiResponse.paginated(res, jobs, {
    page: Number(page), limit: Number(limit), total,
    pages: Math.ceil(total / Number(limit))
  });
};

// ── Public: Get Single Job ────────────────────────────────────────────────────
exports.getJob = async (req, res) => {
  const job = await Job.findOne({ slug: req.params.slug, isActive: true })
    .populate('company', 'name slug logo hasWhiteBg website industry');
  if (!job) return ApiResponse.notFound(res, 'Job not found');
  return ApiResponse.success(res, { job });
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
  const { page = 1, limit = 20, search, source } = req.query;
  const query = {};
  if (search) query.$or = [{ title: new RegExp(search, 'i') }, { companyName: new RegExp(search, 'i') }];
  if (source) query.source = source;

  const skip = (Number(page) - 1) * Number(limit);
  const [jobs, total] = await Promise.all([
    Job.find(query).populate('company', 'name slug logo').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    Job.countDocuments(query)
  ]);
  return ApiResponse.paginated(res, jobs, { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) });
};

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

  if (company && company.logo) {
    return { companyId: company._id, companyName: company.name, companyLogo: company.logo };
  }

  // 2. Check if any existing Job with this companyTag has a logo
  const existingJob = await Job.findOne({
    companyTag: { $in: [cleanTag, companyTag.toLowerCase().trim()] },
    companyLogo: { $exists: true, $ne: '' },
  }).select('companyLogo companyName company');

  if (existingJob?.companyLogo) {
    return {
      companyId: company?._id || existingJob.company || null,
      companyName: company?.name || existingJob.companyName || companyTag,
      companyLogo: existingJob.companyLogo,
    };
  }

  return {
    companyId: company?._id || null,
    companyName: company?.name || companyTag,
    companyLogo: company?.logo || '',
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
    // Sanitize any accidental hiredoor email or mailto
    jobs = jobs.map(j => ({
      ...j,
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
        applyEmail: cleanApplyEmail,
        applyLink: cleanApplyLink || '',
        slug,
        companyTag: companyTag || '',
        company: companyId,
        companyName: companyName || rest.companyName || '',
        companyLogo: companyLogo || rest.companyLogo || '',
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

// ── Global Scraper Cancel Flag ────────────────────────────────────────────────
let isSyncCancelled = false;

// ── Admin: Stop In-Progress HireDoor Sync ────────────────────────────────────
exports.stopSync = async (req, res) => {
  isSyncCancelled = true;
  console.log('[HireDoor Scraper] Admin requested to stop active sync.');
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
  try {
    const puppeteer = require('puppeteer');
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    
    // Resolve credentials from JobSettings (DB) first, fallback to .env
    const creds = await getEffectiveHireDoorCredentials();
    const HIREDOOR_EMAIL = creds.email;
    const HIREDOOR_PASSWORD = creds.password;

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
      console.log('[HireDoor Scraper] Using browser executable at:', executablePath);
      launchOptions.executablePath = executablePath;
    }

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 1. Log in to HireDoor if credentials available
    if (HIREDOOR_EMAIL && HIREDOOR_PASSWORD) {
      try {
        console.log(`[HireDoor Scraper] Logging in at https://hiredoor.in/login (source: ${creds.source}) ...`);
        await page.goto('https://hiredoor.in/login', { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('input[type="email"]', { timeout: 8000 });
        await page.type('input[type="email"]', HIREDOOR_EMAIL);
        await page.type('input[type="password"]', HIREDOOR_PASSWORD);

        // Click the form submit / Sign in button
        await page.evaluate(() => {
          const email = document.querySelector('input[type="email"]');
          const form = email ? email.closest('form') : null;
          const btn = form ? form.querySelector('button') : null;
          if (btn) btn.click();
        });

        await sleep(4000);
      } catch (loginErr) {
        console.warn('[HireDoor] Login attempt skipped or failed:', loginErr.message);
      }
    }

    // 2. Multi-page collection of job cards
    console.log(`[HireDoor Scraper] Starting collection (mode: ${mode}, limit: ${maxJobs})...`);
    let pageNum = 1;
    let jobUrls = [];
    const seenUrls = new Set();
    let stoppedAtDuplicate = false;

    if (mode === 'pages') {
      console.log(`[HireDoor Scraper] Crawling specific selected pages: ${targetPages.join(', ')} ...`);
      for (const pNum of targetPages) {
        if (isSyncCancelled) {
          console.log('[HireDoor Scraper] Sync cancelled by admin. Exiting page loop.');
          break;
        }

        const pageUrl = pNum === 1 ? 'https://hiredoor.in/jobs' : `https://hiredoor.in/jobs?page=${pNum}`;
        console.log(`[HireDoor Scraper] Crawling selected page ${pNum}: ${pageUrl} ...`);
        try {
          await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 35000 });
          await sleep(2500);
        } catch (pageNavErr) {
          console.warn(`[HireDoor Scraper] Failed to load ${pageUrl}:`, pageNavErr.message);
          continue;
        }

        if (isSyncCancelled) break;
        const pageUrls = await extractJobLinksFromPage(page);

        for (const cardUrl of pageUrls) {
          if (isSyncCancelled) break;
          if (seenUrls.has(cardUrl)) continue;
          seenUrls.add(cardUrl);

          const alreadyInDb = await Job.findOne({ sourceUrl: cardUrl }).select('_id title').lean();
          if (alreadyInDb) {
            console.log(`[HireDoor Scraper] Skipping duplicate job already in DB: ${cardUrl}`);
            continue;
          }

          jobUrls.push(cardUrl);
        }
      }
    } else {
      const maxPagesToInspect = Math.max(Math.ceil(maxJobs / 15) + 3, 5);

      while (jobUrls.length < maxJobs && pageNum <= maxPagesToInspect && !stoppedAtDuplicate) {
        if (isSyncCancelled) {
          console.log('[HireDoor Scraper] Sync cancelled by admin. Exiting page loop.');
          break;
        }

        const pageUrl = pageNum === 1 ? 'https://hiredoor.in/jobs' : `https://hiredoor.in/jobs?page=${pageNum}`;
        console.log(`[HireDoor Scraper] Crawling listing page ${pageNum}: ${pageUrl} (collected: ${jobUrls.length}/${maxJobs})`);
        
        try {
          await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 35000 });
          await sleep(2500);
        } catch (pageNavErr) {
          console.warn(`[HireDoor Scraper] Failed to load ${pageUrl}:`, pageNavErr.message);
          break;
        }

        if (isSyncCancelled) break;

        const pageUrls = await extractJobLinksFromPage(page);

        if (!pageUrls || pageUrls.length === 0) {
          console.log(`[HireDoor Scraper] No job cards found on page ${pageNum}. Reached end of listings.`);
          break;
        }

        // Check duplicates against DB so we don't add existing jobs
        for (const cardUrl of pageUrls) {
          if (isSyncCancelled) break;
          if (seenUrls.has(cardUrl)) continue;
          seenUrls.add(cardUrl);

          const alreadyInDb = await Job.findOne({ sourceUrl: cardUrl }).select('_id title').lean();
          if (alreadyInDb) {
            if (mode === 'until_last_added') {
              console.log(`[HireDoor Scraper] Found last added job in DB: "${alreadyInDb.title}". Stopping incremental sync.`);
              stoppedAtDuplicate = true;
              break;
            } else {
              console.log(`[HireDoor Scraper] Skipping duplicate job already in DB: ${cardUrl}`);
              continue;
            }
          }

          jobUrls.push(cardUrl);
          if (jobUrls.length >= maxJobs) break;
        }

        pageNum++;
      }
    }

    console.log(`[HireDoor Scraper] Found ${jobUrls.length} new job cards to scrape.`);

    let savedCount = 0;
    let processedCount = 0;
    const errors = [];

    // 3. For each unique new job card: open detail page, scrape info, click Apply Now to get application link
    for (const jobUrl of jobUrls) {
      if (isSyncCancelled) {
        console.log('[HireDoor Scraper] Sync cancelled by admin. Exiting job scraping loop.');
        break;
      }
      try {
        processedCount++;
        console.log(`[HireDoor Scraper] Opening job ${processedCount}/${jobUrls.length}: ${jobUrl}`);
        await page.goto(jobUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await sleep(2000);

        // Set up target listener to capture the external apply URL on click
        let externalApplyUrl = null;
        const targetListener = async (target) => {
          try {
            const url = target.url();
            if (url && url !== 'about:blank' && !url.includes('hiredoor.in')) {
              externalApplyUrl = url;
              try {
                const targetPage = await target.page();
                if (targetPage) await targetPage.close().catch(() => {});
              } catch (e) {}
            }
          } catch (e) {}
        };
        browser.on('targetcreated', targetListener);
        browser.on('targetchanged', targetListener);

        // Extract detailed data from the job page
        const jobData = await page.evaluate(() => {
          const title = document.querySelector('h1')?.innerText?.trim() || '';

          // Find company name
          const companyEl = document.querySelector('h1')?.previousElementSibling || document.querySelector('a[href*="/companies/"]');
          const companyName = companyEl ? companyEl.innerText.trim() : '';

          // Find company logo (ignore hiredoor main logo)
          const allImgs = Array.from(document.querySelectorAll('img'));
          const logoImg = allImgs.find(img => 
            img.src && !img.src.includes('hiredoor-logo') && (img.src.includes('companies') || img.src.includes('logo') || (img.alt && img.alt.toLowerCase().includes('logo')))
          );
          const companyLogo = logoImg ? logoImg.src : '';

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

          // Look for contact phone / WhatsApp
          const phoneMatch = bodyText.match(/(?:phone|call|contact|whatsapp|tel|mobile)[:\s]*([+]?[0-9\s-]{10,15})/i) || bodyText.match(/(\+91[\s-]?[6-9]\d{9})/);
          const contactPhone = phoneMatch ? phoneMatch[1].trim() : '';

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

        // Click Apply Now button to trigger external tab / modal
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button, a')).filter(el => 
            el.innerText.trim().toLowerCase().includes('apply now')
          );
          if (btns.length > 0) btns[0].click();
        });

        await sleep(3500);
        browser.off('targetcreated', targetListener);
        browser.off('targetchanged', targetListener);

        // If popup was blocked or delayed, check for any external company link on the page
        if (!externalApplyUrl || externalApplyUrl.includes('hiredoor.in')) {
          try {
            const pageExtLink = await page.evaluate(() => {
              const links = Array.from(document.querySelectorAll('a[href]'))
                .map(a => a.href)
                .filter(h => h && !h.includes('hiredoor.in') && !h.includes('javascript:') && !h.includes('whatsapp') && !h.includes('linkedin') && !h.includes('telegram') && !h.includes('alloteme'));
              return links[0] || null;
            });
            if (pageExtLink) externalApplyUrl = pageExtLink;
          } catch (e) {}
        }

        // Apply link resolution: ONLY genuine external company apply URL or company mailto. NEVER hiredoor.in!
        let finalApplyLink = '';
        if (externalApplyUrl && !externalApplyUrl.toLowerCase().includes('hiredoor.in')) {
          finalApplyLink = externalApplyUrl;
        }
        const validApplyEmail = (jobData.applyEmail && !jobData.applyEmail.toLowerCase().includes('hiredoor') && !jobData.applyEmail.toLowerCase().includes('alloteme')) ? jobData.applyEmail.trim() : '';
        if (!finalApplyLink && validApplyEmail) {
          finalApplyLink = `mailto:${validApplyEmail}`;
        }
        // NEVER set finalApplyLink = jobUrl (which is hiredoor.in)! Leave empty if no company link/email found.

        // Skip adding jobs that don't have company apply links or company emails
        if (!finalApplyLink && !validApplyEmail) {
          console.log(`[HireDoor Scraper] Skipping "${jobData.title}" (${jobUrl}) - no company apply link or email found.`);
          continue;
        }

        // Skip category listing pages that have no actual job responsibilities or requirements
        const isCategoryTitle = /internships|freshers|remote|bangalore|hyderabad|pune|mumbai|delhi|jobs in /i.test(jobData.title) && (!jobData.responsibilities?.length && !jobData.requirements?.length);
        if (isCategoryTitle) {
          console.log(`[HireDoor Scraper] Skipping category page: "${jobData.title}"`);
          continue;
        }

        const companyTag = (jobData.companyName || 'company').toLowerCase().replace(/[^a-z0-9]/g, '');
        const { companyId, companyName, companyLogo: resolvedLogo } = await resolveCompany(companyTag);

        // Priority 1: First use uploaded company logo (from Company collection)
        // Priority 2: If not available, use scraped logo from HireDoor
        const finalCompanyLogo = resolvedLogo || jobData.companyLogo || '';

        const slug = generateSlug(jobData.title || 'job');

        // Check for existing job to prevent duplicates
        const existing = await Job.findOne({
          $or: [
            { sourceUrl: jobUrl },
            { slug },
            { title: new RegExp(`^${(jobData.title || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), companyTag }
          ]
        });

        if (existing) {
          console.log(`[HireDoor Scraper] Skipping duplicate job: "${jobData.title}" (${companyTag})`);
          if (mode === 'until_last_added') {
            stoppedAtDuplicate = true;
            break;
          }
          continue;
        }

        await Job.create({
          title: jobData.title || 'Open Position',
          slug,
          company: companyId,
          companyTag,
          companyName: companyName || jobData.companyName,
          companyLogo: finalCompanyLogo,
          location: jobData.location,
          workMode: jobData.workMode,
          jobType: jobData.jobType,
          salary: jobData.salary,
          experience: jobData.experience,
          eligibleBatch: jobData.eligibleBatch,
          description: jobData.description,
          responsibilities: jobData.responsibilities,
          requirements: jobData.requirements,
          tags: jobData.tags.length ? jobData.tags : ['Software'],
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
      } catch (jobErr) {
        console.error(`[HireDoor Scraper] Error scraping ${jobUrl}:`, jobErr.message);
        errors.push(`${jobUrl}: ${jobErr.message}`);
      }
    }

    const msg = isSyncCancelled
      ? `Sync stopped by admin. Saved ${savedCount} new jobs.`
      : (mode === 'pages'
        ? `Successfully synced ${savedCount} new jobs across page(s) ${targetPages.join(', ')}`
        : (stoppedAtDuplicate
          ? `Incremental sync complete: saved ${savedCount} new jobs (stopped upon reaching previously added job)`
          : `Successfully synced ${savedCount} new jobs from HireDoor across ${pageNum - 1 || 1} page(s)`));

    return ApiResponse.success(res, {
      scraped: processedCount,
      saved: savedCount,
      stoppedAtDuplicate,
      wasCancelled: isSyncCancelled,
      mode,
      errors: errors.slice(0, 5),
    }, msg);

  } catch (error) {
    console.error('[HireDoor Sync Error]', error);
    return ApiResponse.error(res, `Sync failed: ${error.message}`, 500);
  } finally {
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
  if (isPremium) {
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
