const axios = require('axios');
const mongoose = require('mongoose');
const Job = require('../models/Job');
const Company = require('../models/Company');

// Standard user agent to avoid being blocked by Cloudflare/WAFs
const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
};

// Helper: Strip HTML tags
function stripHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?[^>]+(>|$)/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s\s+/g, ' ')
    .trim();
}

// Helper: Generate URL slug
function generateSlug(text) {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 90) + '-' + Math.random().toString(36).slice(2, 8);
}

// Helper: Determine Category (Tech vs Non-Tech)
function classifyCategory(title = '', department = '', description = '') {
  const text = `${title} ${department}`.toLowerCase();
  const techKeywords = [
    'software', 'engineer', 'developer', 'frontend', 'backend', 'full stack', 'fullstack',
    'web', 'mobile', 'ios', 'android', 'react', 'node', 'python', 'java', 'golang', 'c++',
    'devops', 'cloud', 'aws', 'azure', 'docker', 'kubernetes', 'sre', 'infrastructure',
    'data engineer', 'data scientist', 'data analyst', 'machine learning', 'ai', 'deep learning',
    'qa', 'quality assurance', 'test', 'automation', 'security', 'cyber', 'architect',
    'tech lead', 'product manager', 'ux', 'ui', 'designer', 'embedded', 'firmware',
  ];

  for (const kw of techKeywords) {
    if (text.includes(kw)) return 'Tech';
  }
  return 'Non-Tech';
}

// Helper: Filter by Date Posted
function filterByDate(postedAt, postedWithinDays) {
  if (!postedWithinDays || postedWithinDays === 0 || postedWithinDays === 'all') return true;
  if (!postedAt || isNaN(new Date(postedAt).getTime())) return true; // if date unknown, don't drop

  const daysNum = parseInt(postedWithinDays, 10);
  if (isNaN(daysNum) || daysNum <= 0) return true;

  const now = Date.now();
  const postTime = new Date(postedAt).getTime();
  const diffDays = (now - postTime) / (1000 * 60 * 60 * 24);

  return diffDays <= daysNum;
}

// Helper: Filter by Experience level
function filterByExperience(title = '', description = '', experienceFilter = 'all') {
  if (!experienceFilter || experienceFilter === 'all') return true;

  const combined = `${title} ${description}`.toLowerCase();

  if (experienceFilter === 'fresher_intern') {
    // 0 years / Intern / Fresher
    return /intern|internship|fresher|graduate|trainee|apprentice|entry level/i.test(combined);
  }

  if (experienceFilter === '0_1') {
    // 0 to 1 year / Junior / Associate
    return (
      /intern|internship|fresher|junior|associate|entry level|0-1|0 - 1|1 year/i.test(combined) &&
      !/senior|lead|principal|staff|manager/i.test(title)
    );
  }

  if (experienceFilter === '1_3') {
    // 1 to 3 years / Mid Level
    return (
      /1-3|1 - 3|2-3|2 - 3|mid-level|mid level|intermediate/i.test(combined) ||
      (!/senior|lead|principal|staff|director/i.test(title) && !/intern/i.test(title))
    );
  }

  if (experienceFilter === '3_plus') {
    // 3+ years / Senior / Lead
    return /senior|lead|principal|staff|director|architect|3\+|4\+|5\+|6\+/i.test(combined);
  }

  return true;
}

// ── Platform-specific Parsers ──────────────────────────────────────────────────

// 1. Greenhouse
async function fetchGreenhouseJobs(company, timeout = 15000) {
  const token = company.token || company.slug;
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`;
  const res = await axios.get(url, { headers: DEFAULT_HEADERS, timeout });
  const rawJobs = res.data?.jobs || [];

  return rawJobs.map((j) => ({
    externalId: String(j.id),
    title: j.title?.trim() || 'Open Position',
    postedAt: j.updated_at ? new Date(j.updated_at) : new Date(),
    applyLink: j.absolute_url || `https://job-boards.greenhouse.io/${token}/jobs/${j.id}`,
    location: j.location?.name || 'Remote',
    workMode: /remote/i.test(j.location?.name || '') ? 'Remote' : 'On-site',
    jobType: 'Full-time',
    department: j.departments?.[0]?.name || '',
    description: stripHtml(j.content || ''),
    rawHtml: j.content || '',
  }));
}

// 2. Ashby
async function fetchAshbyJobs(company, timeout = 15000) {
  const token = company.token || company.slug;
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(token)}?includeCompensation=true`;
  const res = await axios.get(url, { headers: DEFAULT_HEADERS, timeout });
  const rawJobs = res.data?.jobs || [];

  return rawJobs.map((j) => {
    let salary = '';
    if (j.compensation?.compensationTierSummary) {
      salary = j.compensation.compensationTierSummary;
    } else if (j.compensation?.min && j.compensation?.max) {
      salary = `${j.compensation.currency || '$'}${j.compensation.min.toLocaleString()} - ${j.compensation.currency || '$'}${j.compensation.max.toLocaleString()}`;
    }

    return {
      externalId: String(j.id),
      title: j.title?.trim() || 'Open Position',
      postedAt: j.publishedAt ? new Date(j.publishedAt) : new Date(),
      applyLink: j.applyUrl || j.jobUrl || `https://jobs.ashbyhq.com/${token}/${j.id}`,
      location: j.location || (j.isRemote ? 'Remote' : 'On-site'),
      workMode: j.isRemote ? 'Remote' : 'On-site',
      jobType: j.employmentType || 'Full-time',
      salary,
      department: j.department || '',
      description: stripHtml(j.descriptionHtml || j.descriptionPlain || ''),
      rawHtml: j.descriptionHtml || '',
    };
  });
}

// 3. Lever
async function fetchLeverJobs(company, timeout = 15000) {
  const token = company.token || company.slug;
  const baseUrl = company.region === 'EU' || company.apiUrl?.includes('api.eu.lever.co')
    ? `https://api.eu.lever.co/v0/postings/${encodeURIComponent(token)}?mode=json`
    : `https://api.lever.co/v0/postings/${encodeURIComponent(token)}?mode=json`;

  const res = await axios.get(baseUrl, { headers: DEFAULT_HEADERS, timeout });
  const rawJobs = Array.isArray(res.data) ? res.data : [];

  return rawJobs.map((j) => ({
    externalId: String(j.id),
    title: j.text?.trim() || 'Open Position',
    postedAt: j.createdAt ? new Date(j.createdAt) : new Date(),
    applyLink: j.applyUrl || j.hostedUrl || `https://jobs.lever.co/${token}/${j.id}`,
    location: j.categories?.location || 'Remote',
    workMode: /remote/i.test(j.categories?.location || '') ? 'Remote' : 'On-site',
    jobType: j.categories?.commitment || 'Full-time',
    department: j.categories?.team || j.categories?.department || '',
    description: stripHtml(j.descriptionPlain || j.description || ''),
    rawHtml: j.description || '',
  }));
}

// 4. Workable
async function fetchWorkableJobs(company, timeout = 15000) {
  const token = company.token || company.slug;
  const url = `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(token)}?details=true`;
  const res = await axios.get(url, { headers: DEFAULT_HEADERS, timeout });
  const rawJobs = res.data?.jobs || [];

  return rawJobs.map((j) => ({
    externalId: String(j.shortcode || j.id),
    title: j.title?.trim() || 'Open Position',
    postedAt: j.published ? new Date(j.published) : new Date(),
    applyLink: j.url || j.shortlink || `https://apply.workable.com/${token}/j/${j.shortcode}/`,
    location: [j.city, j.country].filter(Boolean).join(', ') || 'Remote',
    workMode: j.telecommuting ? 'Remote' : 'On-site',
    jobType: j.type || 'Full-time',
    department: j.department || '',
    description: stripHtml(j.description || ''),
    rawHtml: j.description || '',
  }));
}

// 5. SmartRecruiters
async function fetchSmartRecruitersJobs(company, timeout = 15000) {
  const token = company.token || company.slug;
  const url = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(token)}/postings?limit=100&offset=0`;
  const res = await axios.get(url, { headers: DEFAULT_HEADERS, timeout });
  const rawJobs = res.data?.content || [];

  return rawJobs.map((j) => ({
    externalId: String(j.id),
    title: j.name?.trim() || 'Open Position',
    postedAt: j.releasedDate ? new Date(j.releasedDate) : new Date(),
    applyLink: `https://jobs.smartrecruiters.com/${token}/${j.id}`,
    location: [j.location?.city, j.location?.country].filter(Boolean).join(', ') || 'Remote',
    workMode: j.location?.remote ? 'Remote' : 'On-site',
    jobType: j.typeOfEmployment?.label || 'Full-time',
    department: j.department?.label || '',
    description: '',
  }));
}

// 6. Workday
async function fetchWorkdayJobs(company, timeout = 15000) {
  if (!company.apiUrl) {
    throw new Error('Workday requires a valid apiUrl');
  }

  const payload = {
    appliedFacets: {},
    limit: 50,
    offset: 0,
    searchText: '',
  };

  const res = await axios.post(company.apiUrl, payload, {
    headers: { ...DEFAULT_HEADERS, 'Content-Type': 'application/json' },
    timeout,
  });

  const rawJobs = res.data?.jobPostings || [];
  return rawJobs.map((j) => {
    let applyLink = company.boardUrl || '';
    if (j.externalPath) {
      if (applyLink.endsWith('/')) applyLink = applyLink.slice(0, -1);
      applyLink += j.externalPath;
    }

    return {
      externalId: String(j.bulletFields?.[0] || j.title || Math.random()),
      title: j.title?.trim() || 'Open Position',
      postedAt: new Date(),
      applyLink: applyLink || company.boardUrl,
      location: j.locationsText || 'Remote',
      workMode: /remote/i.test(j.locationsText || '') ? 'Remote' : 'On-site',
      jobType: 'Full-time',
      department: '',
      description: j.bulletFields ? j.bulletFields.join(' · ') : '',
    };
  });
}

// 7. Recruitee
async function fetchRecruiteeJobs(company, timeout = 15000) {
  const token = company.token || company.slug;
  const url = `https://${encodeURIComponent(token)}.recruitee.com/api/offers/`;
  const res = await axios.get(url, { headers: DEFAULT_HEADERS, timeout });
  const rawJobs = res.data?.offers || [];

  return rawJobs.map((j) => ({
    externalId: String(j.id),
    title: j.title?.trim() || 'Open Position',
    postedAt: j.created_at ? new Date(j.created_at) : new Date(),
    applyLink: j.careers_url || `https://${token}.recruitee.com/o/${j.slug}`,
    location: [j.city, j.country].filter(Boolean).join(', ') || 'Remote',
    workMode: j.remote ? 'Remote' : 'On-site',
    jobType: j.employment_type_code || 'Full-time',
    department: j.department || '',
    description: stripHtml(j.description || ''),
    rawHtml: j.description || '',
  }));
}

// 8. Rippling
async function fetchRipplingJobs(company, timeout = 15000) {
  const token = company.token || company.slug;
  const url = `https://api.rippling.com/platform/api/ats/v1/board/${encodeURIComponent(token)}/jobs`;
  const res = await axios.get(url, { headers: DEFAULT_HEADERS, timeout });
  const rawJobs = Array.isArray(res.data) ? res.data : [];

  return rawJobs.map((j) => ({
    externalId: String(j.id || j.uuid),
    title: j.name?.trim() || 'Open Position',
    postedAt: j.updatedAt ? new Date(j.updatedAt) : new Date(),
    applyLink: j.url || `https://ats.rippling.com/${token}/jobs/${j.id}`,
    location: j.workLocation || 'Remote',
    workMode: /remote/i.test(j.workLocation || '') ? 'Remote' : 'On-site',
    jobType: 'Full-time',
    department: j.department?.name || '',
    description: stripHtml(j.description || ''),
    rawHtml: j.description || '',
  }));
}

// Master dispatcher based on platform
async function scrapeJobsForCompanyRaw(company) {
  const platform = (company.platform || '').toLowerCase().trim();

  switch (platform) {
    case 'greenhouse':
      return await fetchGreenhouseJobs(company);
    case 'ashby':
      return await fetchAshbyJobs(company);
    case 'lever':
      return await fetchLeverJobs(company);
    case 'workable':
      return await fetchWorkableJobs(company);
    case 'smartrecruiters':
      return await fetchSmartRecruitersJobs(company);
    case 'workday':
      return await fetchWorkdayJobs(company);
    case 'recruitee':
      return await fetchRecruiteeJobs(company);
    case 'rippling':
      return await fetchRipplingJobs(company);
    default:
      // If platform is not recognized or custom, check boardUrl/apiUrl
      if (company.apiUrl?.includes('greenhouse.io')) return await fetchGreenhouseJobs(company);
      if (company.apiUrl?.includes('ashbyhq.com')) return await fetchAshbyJobs(company);
      if (company.apiUrl?.includes('lever.co')) return await fetchLeverJobs(company);
      if (company.apiUrl?.includes('workable.com')) return await fetchWorkableJobs(company);
      throw new Error(`Unsupported or unconfigured ATS platform: ${platform || 'unknown'}`);
  }
}

/**
 * Main function: Syncs jobs for a single company applying scrap requirements filters,
 * deduplicating against the database, and updating company stats.
 */
async function syncJobsForCompany(companyIdOrDoc, options = {}) {
  const {
    postedWithinDays = 0, // 0 = all time, 1 = 24h, 2 = 48h, 7 = 1 week, 30 = 1 month
    experience = 'all',   // 'all', 'fresher_intern', '0_1', '1_3', '3_plus'
    category = 'all',     // 'all', 'Tech', 'Non-Tech'
    limit = 200,
  } = options;

  let company = companyIdOrDoc;
  if (typeof companyIdOrDoc === 'string' || mongoose.isObjectIdOrHexString(companyIdOrDoc)) {
    company = await Company.findById(companyIdOrDoc);
  }
  if (!company) {
    throw new Error('Company not found');
  }

  // Update status to syncing
  company.syncStatus = 'syncing';
  company.syncError = '';
  await company.save();

  try {
    const rawJobs = await scrapeJobsForCompanyRaw(company);

    let savedCount = 0;
    let skippedDuplicates = 0;
    let filteredOutCount = 0;

    const cleanCompanyTag = company.slug.toLowerCase().trim();

    // Fast in-memory deduplication against existing database records
    const existingJobs = await Job.find({
      $or: [{ company: company._id }, { companyTag: cleanCompanyTag }],
    })
      .select('applyLink sourceUrl title')
      .lean();

    const existingLinks = new Set();
    const existingTitles = new Set();
    for (const ej of existingJobs) {
      if (ej.applyLink) existingLinks.add(ej.applyLink.toLowerCase().trim());
      if (ej.sourceUrl) existingLinks.add(ej.sourceUrl.toLowerCase().trim());
      if (ej.title) existingTitles.add(ej.title.toLowerCase().trim());
    }

    const jobsToInsert = [];

    for (const rawJob of rawJobs) {
      if (savedCount >= limit) break;

      // Filter: Date Posted
      if (!filterByDate(rawJob.postedAt, postedWithinDays)) {
        filteredOutCount++;
        continue;
      }

      // Filter: Experience
      if (!filterByExperience(rawJob.title, rawJob.description, experience)) {
        filteredOutCount++;
        continue;
      }

      // Classify Category
      const detectedCategory = classifyCategory(rawJob.title, rawJob.department, rawJob.description);
      if (category !== 'all' && detectedCategory !== category) {
        filteredOutCount++;
        continue;
      }

      const cleanApplyLink = (rawJob.applyLink || '').toLowerCase().trim();
      const cleanTitle = (rawJob.title || '').toLowerCase().trim();

      // Deduplication check: by apply link or title
      if (
        (cleanApplyLink && existingLinks.has(cleanApplyLink)) ||
        (cleanTitle && existingTitles.has(cleanTitle))
      ) {
        skippedDuplicates++;
        continue;
      }

      // Register into seen sets to prevent intra-batch duplicates
      if (cleanApplyLink) existingLinks.add(cleanApplyLink);
      if (cleanTitle) existingTitles.add(cleanTitle);

      const slug = generateSlug(rawJob.title);
      jobsToInsert.push({
        title: rawJob.title,
        slug,
        category: detectedCategory,
        company: company._id,
        companyName: company.name, // Always use original formatted company name!
        companyTag: cleanCompanyTag,
        companyLogo: company.logo || '',
        location: rawJob.location || 'Remote',
        workMode: rawJob.workMode || 'Remote',
        jobType: rawJob.jobType || 'Full-time',
        salary: rawJob.salary || '',
        description: rawJob.description || '',
        applyLink: rawJob.applyLink,
        source: 'ats',
        sourceUrl: rawJob.applyLink,
        postedAt: rawJob.postedAt || new Date(),
        isActive: true,
      });

      savedCount++;
    }

    if (jobsToInsert.length > 0) {
      await Job.insertMany(jobsToInsert, { ordered: false });
    }

    // Update Company stats
    const totalJobsInDb = await Job.countDocuments({
      $or: [{ company: company._id }, { companyTag: company.slug }],
    });

    company.syncStatus = 'success';
    company.syncError = '';
    company.lastSyncAt = new Date();
    company.jobCount = totalJobsInDb;
    await company.save();

    return {
      success: true,
      companyId: company._id,
      companyName: company.name,
      totalFetched: rawJobs.length,
      saved: savedCount,
      skippedDuplicates,
      filteredOut: filteredOutCount,
      totalJobsInDb,
    };
  } catch (err) {
    company.syncStatus = 'failed';
    company.syncError = err.message || 'Sync failed';
    await company.save();
    throw err;
  }
}

/**
 * Batch Global Sync: Iterates through an array of companies sequentially
 * with rate limiting and returns a comprehensive summary.
 */
async function globalSyncCompanies(companyIds = [], options = {}, onProgress) {
  const results = [];
  let totalSaved = 0;
  let totalDuplicates = 0;
  let totalErrors = 0;

  for (let i = 0; i < companyIds.length; i++) {
    const id = companyIds[i];
    try {
      const company = await Company.findById(id);
      if (!company) continue;

      if (onProgress) {
        onProgress({
          index: i + 1,
          total: companyIds.length,
          companyName: company.name,
          platform: company.platform,
        });
      }

      const res = await syncJobsForCompany(company, options);
      results.push(res);
      totalSaved += res.saved;
      totalDuplicates += res.skippedDuplicates;

      // Friendly 400ms delay between company requests
      await new Promise((r) => setTimeout(r, 400));
    } catch (err) {
      totalErrors++;
      results.push({
        success: false,
        companyId: id,
        error: err.message,
      });
    }
  }

  return {
    processedCount: companyIds.length,
    totalSaved,
    totalDuplicates,
    totalErrors,
    results,
  };
}

module.exports = {
  fetchGreenhouseJobs,
  fetchAshbyJobs,
  fetchLeverJobs,
  fetchWorkableJobs,
  fetchSmartRecruitersJobs,
  fetchWorkdayJobs,
  fetchRecruiteeJobs,
  fetchRipplingJobs,
  syncJobsForCompany,
  globalSyncCompanies,
};
