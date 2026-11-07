const axios = require('axios');
const mongoose = require('mongoose');
const Job = require('../models/Job');
const Company = require('../models/Company');

// Standard user agent to avoid being blocked by Cloudflare/WAFs
const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
};

// Helper: Decode HTML entities repeatedly
function decodeHtmlEntities(str) {
  if (!str || typeof str !== 'string') return '';
  let prev = '';
  let curr = str;
  for (let i = 0; i < 3 && prev !== curr; i++) {
    prev = curr;
    curr = curr
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ');
  }
  return curr;
}

// Helper: Convert HTML into clean formatted text with bullets
function htmlToStructuredText(html) {
  if (!html || typeof html !== 'string') return '';
  let text = decodeHtmlEntities(html);

  text = text
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<li>/gi, '\n● ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<(?:p|div|h[1-6]|tr)>/gi, '\n')
    .replace(/<\/(?:p|div|h[1-6]|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, ' \n ')
    .replace(/<\/?[^>]+(>|$)/g, ' ');

  return text;
}

// Helper: Strip HTML tags
function stripHtml(html) {
  if (!html || typeof html !== 'string') return '';
  const text = htmlToStructuredText(html);
  return text.replace(/\s+/g, ' ').trim();
}

// Helper: Intelligently Segregate Raw Job Content into About the Role, Responsibilities, Requirements, and Tags
function parseJobDescription(rawInput, title = '') {
  const plainText = htmlToStructuredText(rawInput);
  if (!plainText) {
    return { description: '', responsibilities: [], requirements: [], tags: [] };
  }

  const rawLines = plainText.split('\n').map(l => l.trim()).filter(Boolean);

  let currentSection = 'description';
  const descParagraphs = [];
  const respItems = [];
  const reqItems = [];

  const respHeaders = /^(?:key\s+)?responsibilities|what\s+you(?:'ll|\s+will)\s+do|duties|your\s+role|role\s+(?:&|and)\s+responsibilities|scope\s+of\s+work/i;
  const reqHeaders = /^(?:basic\s+|minimum\s+|preferred\s+)?(?:qualifications|requirements|what\s+we(?:'re|\s+are)\s+looking\s+for|what\s+you(?:'ll|\s+will)\s+need|who\s+you\s+are|skills|ideal\s+candidate|experience)/i;
  const overviewHeaders = /^(?:position\s+overview|overview|about\s+(?:the\s+)?role|job\s+summary|the\s+opportunity)/i;
  const companyHeaders = /^(?:about\s+(?:us|[a-z0-9_\s]+)|who\s+we\s+are|company\s+overview|our\s+mission)/i;

  let currentItem = '';

  const flushItem = () => {
    if (!currentItem) return;
    const clean = currentItem
      .replace(/^[●•\*\-\u2022\u2023\u25E6\u2043\u2219\d\.\)]\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (clean && clean.length > 3) {
      if (currentSection === 'responsibilities') respItems.push(clean);
      else if (currentSection === 'requirements') reqItems.push(clean);
    }
    currentItem = '';
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const cleanHeader = line.replace(/^[#*_\-:\s]+|[#*_\-:\s]+$/g, '').trim();

    if (respHeaders.test(cleanHeader)) {
      flushItem();
      currentSection = 'responsibilities';
      continue;
    } else if (reqHeaders.test(cleanHeader)) {
      flushItem();
      currentSection = 'requirements';
      continue;
    } else if (companyHeaders.test(cleanHeader)) {
      flushItem();
      currentSection = 'about_company';
      continue;
    } else if (overviewHeaders.test(cleanHeader)) {
      flushItem();
      currentSection = 'description';
      continue;
    }

    const isBulletStart = /^[●•\*\-\u2022\u2023\u25E6\u2043\u2219]/.test(line);

    if (currentSection === 'responsibilities' || currentSection === 'requirements') {
      if (isBulletStart) {
        flushItem();
        currentItem = line;
      } else if (currentItem) {
        currentItem += ' ' + line;
      } else {
        flushItem();
        currentItem = line;
      }
    } else if (currentSection === 'description') {
      if (!/equal\s+opportunity|diversity\s+and\s+inclusion|all\s+qualified\s+applicants/i.test(line)) {
        descParagraphs.push(line);
      }
    }
  }
  flushItem();

  // Extract skills & tags
  const allText = `${title} ${plainText}`.toLowerCase();
  const knownTags = [
    'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Java', 'C++', 'Golang',
    'AWS', 'Azure', 'Docker', 'Kubernetes', 'SQL', 'MongoDB', 'PostgreSQL',
    'Machine Learning', 'AI/ML', 'Deep Learning', 'Data Science', 'Data Analytics',
    'DevOps', 'CI/CD', 'REST API', 'GraphQL', 'Next.js', 'Tailwind CSS',
    'Problem Solving', 'CS Fundamentals', 'Communication', 'Fitness', 'Personal Training',
    'Strength Training', 'CPR/AED', 'Agile', 'Scrum', 'Git', 'Linux'
  ];

  const extractedTags = [];
  for (const t of knownTags) {
    const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(allText)) {
      extractedTags.push(t);
    }
  }

  // Join description paragraphs cleanly
  let cleanDesc = descParagraphs.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();

  return {
    description: cleanDesc,
    responsibilities: respItems,
    requirements: reqItems,
    tags: extractedTags,
  };
}

function normalizeJobType(val) {
  if (!val) return 'Full-time';
  const v = val.toLowerCase().trim();
  if (v.includes('part')) return 'Part-time';
  if (v.includes('intern')) return 'Internship';
  if (v.includes('contract') || v.includes('temp')) return 'Contract';
  if (v.includes('free')) return 'Freelance';
  return 'Full-time';
}

function normalizeWorkMode(val) {
  if (!val) return 'Remote';
  const v = val.toLowerCase().trim();
  if (v.includes('remote') || v.includes('virtual') || v.includes('wfh')) return 'Remote';
  if (v.includes('hybrid')) return 'Hybrid';
  return 'On-site';
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
  const t = (title || '').toLowerCase();
  const dep = (department || '').toLowerCase();
  const text = `${t} ${dep}`;

  // 1. Explicit Non-Tech exclusion patterns (health, medical, fitness, retail, warehouse, legal, accounting, etc.)
  const nonTechKeywords = [
    'personal trainer', 'strength training', 'fitness', 'instructor', 'nurse', 'nursing',
    'pharmacy', 'pharmacist', 'store manager', 'sales associate', 'cashier', 'driver',
    'warehouse', 'cook', 'chef', 'barista', 'receptionist', 'customer service',
    'human resources', 'recruiter', 'talent acquisition', 'accountant', 'accounting',
    'legal counsel', 'attorney', 'paralegal', 'sales representative', 'account executive',
    'business development representative', 'therapist', 'physician', 'medical assistant',
    'retail associate', 'custodian', 'janitor', 'security guard', 'housekeeper',
  ];
  for (const nkw of nonTechKeywords) {
    if (text.includes(nkw)) return 'Non-Tech';
  }

  // 2. Tech Keywords
  const techKeywords = [
    'software', 'engineer', 'developer', 'frontend', 'front-end', 'backend', 'back-end',
    'full stack', 'fullstack', 'web', 'mobile', 'ios', 'android', 'react', 'node', 'python',
    'java', 'golang', 'c++', 'rust', 'devops', 'cloud', 'aws', 'azure', 'docker', 'kubernetes',
    'sre', 'infrastructure', 'data engineer', 'data scientist', 'data analyst', 'machine learning',
    'ai', 'deep learning', 'qa', 'quality assurance', 'test', 'automation', 'security',
    'cyber', 'architect', 'tech lead', 'product manager', 'ux', 'ui', 'designer',
    'embedded', 'firmware', 'tech intern', 'software intern', 'developer intern',
    'programmer', 'sde', 'swe', 'database', 'systems engineer', 'network engineer',
    'solutions architect', 'it specialist', 'it support', 'information technology',
    'computer science', 'artificial intelligence', 'big data', 'bi analyst', 'business intelligence',
  ];

  for (const kw of techKeywords) {
    if (text.includes(kw)) return 'Tech';
  }

  // 3. Fallback: check description for dominant tech skill signals
  if (/\b(?:coding|javascript|typescript|python|react|golang|node\.js|sql|database|api|backend|frontend|software development|git|aws|ci\/cd)\b/i.test(description)) {
    return 'Tech';
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

  const t = (title || '').toLowerCase();
  const d = (description || '').toLowerCase();
  const combined = `${t} ${d}`;

  // Roles that are explicitly senior / lead / manager / principal / staff / director
  const isSeniorOrLead = /\b(?:sr\.?|senior|lead|principal|staff|director|head|vp|vice\s+president|manager|architect|partner|chief)\b/i.test(t);

  // Check if job explicitly demands higher years of experience (e.g. 2+ years, 3+ years, 4+ years, 5+ years)
  const requiresHigherExperience =
    /\b(?:[2-9]|\d{2})\s*(?:\+|-|\s*to\s*\d+)?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:relevant\s+|work\s+|professional\s+|software\s+)?experience\b/i.test(d) ||
    /\b(?:minimum|at\s+least)\s+(?:[2-9]|\d{2})\s*(?:years?|yrs?)\b/i.test(d) ||
    /\b(?:[2-9]|\d{2})\+\s*(?:years?|yrs?)\b/i.test(d);

  if (experienceFilter === 'fresher_intern') {
    if (isSeniorOrLead || requiresHigherExperience) return false;
    return (
      /\b(?:intern|internship|fresher|graduate\s+trainee|apprentice|entry[\s-]level|campus|college\s+grad|new\s+grad)\b/i.test(t) ||
      /\b(?:0\s*(?:years?|yrs?)|no\s+prior\s+experience|fresher|internship|apprentice)\b/i.test(d)
    );
  }

  if (experienceFilter === '0_1') {
    // Strictly 0 to 1 year of experience required
    if (isSeniorOrLead || requiresHigherExperience) return false;

    // Check title for 0-1 / entry indicators
    const has01InTitle = /\b(?:intern|internship|fresher|junior|jr\.?|associate|entry[\s-]level|trainee|apprentice|graduate|new\s+grad|campus|sde[\s-]?1|sde[\s-]?i\b|engineer[\s-]?1|engineer[\s-]?i\b|developer[\s-]?1|developer[\s-]?i\b|analyst[\s-]?1|analyst[\s-]?i\b)\b/i.test(t);

    // Check description for explicit 0-1 / 0-2 / entry / fresher indicators
    const has01InDesc = /\b(?:0\s*-\s*1|0\s*to\s*1|0\s*-\s*2|0\s*to\s*2|0\s*yr|0\s*year|1\s*yr|1\s*year|fresher|intern|internship|entry[\s-]level|recent\s+grad|new\s+grad|college\s+grad|apprentice|trainee|no\s+experience\s+required|0\s*years?\s+of\s+experience|1\s*year\s+of\s+experience)\b/i.test(d);

    return has01InTitle || has01InDesc;
  }

  if (experienceFilter === '1_3') {
    if (isSeniorOrLead) return false;
    return /\b(?:1\s*-\s*3|1\s*to\s*3|2\s*-\s*3|2\s*to\s*3|1\s*\+|2\s*\+|mid[\s-]level|intermediate)\b/i.test(combined);
  }

  if (experienceFilter === '3_plus') {
    return isSeniorOrLead || requiresHigherExperience;
  }

  return true;
}

// ── Country / Location Reference Map ──────────────────────────────────────────
const COUNTRY_MAP = {
  india: {
    names: ['india', 'bharat'],
    cities: [
      'bengaluru', 'bangalore', 'hyderabad', 'pune', 'mumbai', 'delhi', 'new delhi',
      'noida', 'gurgaon', 'gurugram', 'chennai', 'kolkata', 'ahmedabad', 'kochi',
      'cochin', 'indore', 'jaipur', 'chandigarh', 'mysore', 'mysuru', 'trivandrum',
      'thiruvananthapuram', 'coimbatore', 'bhubaneswar', 'nagpur', 'vadodara', 'surat',
      'visakhapatnam', 'lucknow', 'kanpur', 'andhra pradesh', 'telangana', 'karnataka',
      'maharashtra', 'tamil nadu', 'gujarat', 'uttar pradesh', 'haryana', 'kerala'
    ],
  },
  us: {
    names: ['united states', 'usa', 'u.s.a.', 'u.s.'],
    stateCodes: [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL',
      'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT',
      'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
      'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
    ],
    cities: [
      'san francisco', 'new york', 'nyc', 'seattle', 'austin', 'chicago', 'los angeles',
      'boston', 'denver', 'atlanta', 'san jose', 'sunnyvale', 'mountain view', 'palo alto',
      'san diego', 'dallas', 'houston', 'miami', 'phoenix', 'philadelphia', 'portland',
      'washington dc', 'salt lake city', 'minneapolis', 'raleigh', 'charlotte', 'california',
      'texas', 'washington', 'colorado', 'massachusetts', 'illinois'
    ],
  },
  uk: {
    names: ['united kingdom', 'great britain', 'england', 'scotland', 'wales', 'northern ireland'],
    cities: ['london', 'manchester', 'birmingham', 'edinburgh', 'glasgow', 'bristol', 'cambridge', 'oxford', 'leeds', 'liverpool', 'belfast', 'sheffield'],
  },
  canada: {
    names: ['canada'],
    stateCodes: ['ON', 'QC', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB'],
    cities: ['toronto', 'vancouver', 'montreal', 'ottawa', 'calgary', 'edmonton', 'waterloo', 'halifax', 'ontario', 'quebec', 'british columbia', 'alberta'],
  },
  germany: {
    names: ['germany', 'deutschland'],
    cities: ['berlin', 'munich', 'münchen', 'frankfurt', 'hamburg', 'cologne', 'köln', 'stuttgart', 'düsseldorf', 'leipzig'],
  },
};

// Helper: Filter by Location / Country
function filterByLocation(jobLocation = '', jobWorkMode = '', selectedCountry = 'all', customLocations = '', includeRemote = true) {
  if (!selectedCountry || selectedCountry === 'all' || selectedCountry === 'worldwide') {
    return true;
  }

  const loc = (jobLocation || '').trim();
  const locLower = loc.toLowerCase();
  const isJobRemote = jobWorkMode === 'Remote' || /\bremote\b|\banywhere\b|\bwfh\b/i.test(loc);

  // If user selected "remote_only"
  if (selectedCountry === 'remote' || selectedCountry === 'remote_only') {
    return isJobRemote;
  }

  // If includeRemote is enabled and job is completely global remote without country restriction
  if (includeRemote && (locLower === 'remote' || locLower === 'remote / worldwide' || locLower === 'work from anywhere')) {
    return true;
  }

  // Check preset country
  const presetKey = selectedCountry.toLowerCase().replace(/[^a-z]/g, '');
  const preset =
    COUNTRY_MAP[presetKey] ||
    (selectedCountry.toLowerCase() === 'united states' ? COUNTRY_MAP.us : null) ||
    (selectedCountry.toLowerCase() === 'united kingdom' ? COUNTRY_MAP.uk : null);

  if (preset) {
    // 1. Check country names
    for (const name of preset.names) {
      const regex = new RegExp(`\\b${name}\\b`, 'i');
      if (regex.test(locLower)) return true;
    }

    // 2. Check cities / states
    if (preset.cities) {
      for (const city of preset.cities) {
        const regex = new RegExp(`\\b${city}\\b`, 'i');
        if (regex.test(locLower)) return true;
      }
    }

    // 3. Check US / Canada state codes e.g. ", CA", " - NY", "/ TX"
    if (preset.stateCodes) {
      const codePattern = new RegExp(`(?:,|\\/|\\-|\\s)\\s*(${preset.stateCodes.join('|')})(?:\\s|;|,|\\/|$|\\d)`, 'i');
      if (codePattern.test(loc)) return true;
    }
  }

  // Check custom locations if provided (comma-separated e.g. "Singapore, Sydney, Tokyo")
  if (customLocations && typeof customLocations === 'string') {
    const customList = customLocations.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    for (const cl of customList) {
      if (locLower.includes(cl)) return true;
    }
  }

  // Also check if selectedCountry was a custom string not in preset
  if (!preset && selectedCountry !== 'custom') {
    if (locLower.includes(selectedCountry.toLowerCase())) return true;
  }

  return false;
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
    limit: 20,
    offset: 0,
    searchText: '',
  };

  const headers = {
    Accept: 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'User-Agent': DEFAULT_HEADERS['User-Agent'],
  };

  const res = await axios.post(company.apiUrl, payload, {
    headers,
    timeout,
  });

  const rawJobs = res.data?.jobPostings || [];
  const baseDetailUrl = company.apiUrl.replace(/\/jobs\/?$/, '');

  const results = [];
  for (const j of rawJobs) {
    let applyLink = company.boardUrl || '';
    if (j.externalPath) {
      if (applyLink.endsWith('/')) applyLink = applyLink.slice(0, -1);
      applyLink += j.externalPath;
    }

    let detailHtml = '';
    // Fetch detailed job description for first 20 candidate jobs
    if (j.externalPath && results.length < 20) {
      try {
        const detailRes = await axios.get(`${baseDetailUrl}${j.externalPath}`, {
          headers: {
            Accept: 'application/json',
            'User-Agent': DEFAULT_HEADERS['User-Agent'],
          },
          timeout: 5000,
        });
        detailHtml = detailRes.data?.jobPostingInfo?.jobDescription || '';
      } catch (e) {
        detailHtml = j.bulletFields ? j.bulletFields.join('\n') : '';
      }
    } else {
      detailHtml = j.bulletFields ? j.bulletFields.join('\n') : '';
    }

    results.push({
      externalId: String(j.bulletFields?.[0] || j.title || Math.random()),
      title: j.title?.trim() || 'Open Position',
      postedAt: new Date(),
      applyLink: applyLink || company.boardUrl,
      location: j.locationsText || 'Remote',
      workMode: /remote/i.test(j.locationsText || '') ? 'Remote' : 'On-site',
      jobType: j.timeType || 'Full-time',
      department: '',
      description: detailHtml,
      rawHtml: detailHtml,
    });
  }

  return results;
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
  const postedWithinDays = options.postedWithinDays !== undefined ? options.postedWithinDays : 'all';
  const experienceFilter = options.experienceFilter || options.experience || 'all';
  const categoryFilter = options.categoryFilter || options.category || 'all';
  const country = options.country || options.locationFilter || 'all';
  const customLocations = options.customLocations || '';
  const includeRemote = options.includeRemote !== undefined ? Boolean(options.includeRemote) : true;
  const limit = options.limit || 200;

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
      const jobDesc = rawJob.description || rawJob.rawHtml || '';
      if (!filterByExperience(rawJob.title, jobDesc, experienceFilter)) {
        filteredOutCount++;
        continue;
      }

      // Classify Category: Tech vs Non-Tech
      const detectedCategory = classifyCategory(rawJob.title, rawJob.department, jobDesc);
      if (categoryFilter !== 'all' && detectedCategory !== categoryFilter) {
        filteredOutCount++;
        continue;
      }

      // Filter: Country / Location (Strict)
      if (!filterByLocation(rawJob.location, rawJob.workMode, country, customLocations, includeRemote)) {
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
      const parsedContent = parseJobDescription(rawJob.rawHtml || rawJob.description || '', rawJob.title);

      jobsToInsert.push({
        title: rawJob.title,
        slug,
        category: detectedCategory,
        company: company._id,
        companyName: company.name, // Always original formatted company name!
        companyTag: cleanCompanyTag,
        companyLogo: company.logo || '',
        location: rawJob.location || 'Remote',
        workMode: normalizeWorkMode(rawJob.workMode || rawJob.location),
        jobType: normalizeJobType(rawJob.jobType),
        salary: rawJob.salary || '',
        description: parsedContent.description || stripHtml(rawJob.description || ''),
        responsibilities: (rawJob.responsibilities && rawJob.responsibilities.length > 0)
          ? rawJob.responsibilities
          : parsedContent.responsibilities,
        requirements: (rawJob.requirements && rawJob.requirements.length > 0)
          ? rawJob.requirements
          : parsedContent.requirements,
        tags: Array.from(new Set([...(rawJob.tags || []), ...parsedContent.tags])),
        applyLink: rawJob.applyLink,
        source: 'ats',
        sourceUrl: rawJob.applyLink,
        postedAt: rawJob.postedAt || new Date(),
        isActive: true,
      });
    }

    if (jobsToInsert.length > 0) {
      try {
        const inserted = await Job.insertMany(jobsToInsert, { ordered: false });
        savedCount = inserted.length;
      } catch (insertErr) {
        savedCount = insertErr.insertedDocs ? insertErr.insertedDocs.length : 0;
        console.warn(`[ATS Scraper] Batch insert note for ${company.name}: ${insertErr.message}`);
      }
    } else {
      savedCount = 0;
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
  classifyCategory,
  filterByExperience,
  filterByLocation,
  COUNTRY_MAP,
};
