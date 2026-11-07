const axios = require('axios');

// Common ATS domains that shouldn't be used as company website domains
const ATS_DOMAINS = [
  'greenhouse.io',
  'ashbyhq.com',
  'myworkdayjobs.com',
  'workable.com',
  'smartrecruiters.com',
  'lever.co',
  'rippling.com',
  'jobvite.com',
  'recruitee.com',
  'bamboohr.com',
  'hiredoor.in',
  'alloteme.com',
];

/**
 * Extracts a candidate clean company domain (e.g. "airbnb.com", "asana.com")
 */
function extractDomain(website, slug) {
  if (website && typeof website === 'string') {
    try {
      let host = website.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase();
      host = host.replace(/^www\./, '').split(':')[0];
      const isAts = ATS_DOMAINS.some((d) => host.includes(d));
      if (!isAts && host.includes('.')) {
        return host;
      }
    } catch {}
  }
  const cleanSlug = (slug || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');
  return `${cleanSlug}.com`;
}

/**
 * Strips corporate legal suffixes from company name for cleaner search query
 */
function cleanCompanyName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .replace(/\b(inc|corp|llc|ltd|limited|corporation|technologies|solutions|group|gmbh|pvt|co)\b\.?/gi, '')
    .trim();
}

/**
 * Validates that an image URL is live, reachable, and returns a real image
 */
async function verifyImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const res = await axios.head(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
      },
      timeout: 3500,
      maxRedirects: 3,
    });
    const ctype = (res.headers['content-type'] || '').toLowerCase();
    const clen = parseInt(res.headers['content-length'] || '0', 10);
    if (res.status === 200 && (!clen || clen > 200) && (!ctype || ctype.includes('image') || ctype.includes('octet-stream'))) {
      return true;
    }
  } catch {}
  return false;
}

/**
 * Searches the internet for a company logo based on its name and slug.
 * Strongly prioritizes modern WebP logos, falling back to clean SVG, PNG, and high-res official favicons.
 *
 * @param {Object} company
 * @param {string} company.name
 * @param {string} company.slug
 * @param {string} [company.website]
 * @param {string} [company.platform]
 * @param {boolean} [preferWebp=true]
 * @returns {Promise<{ url: string, format: string, source: string } | null>}
 */
async function findCompanyLogo({ name, slug, website, platform, preferWebp = true }) {
  const cleanName = cleanCompanyName(name) || name || slug;
  const cleanSlug = (slug || '').toLowerCase().trim();
  const domain = extractDomain(website, cleanSlug);

  // Search queries targeting webp format
  const queries = [
    `"${cleanName}" company logo webp`,
    `"${cleanSlug}" logo webp`,
    `"${cleanName}" logo format:webp`,
    `"${cleanName}" logo site:wikimedia.org`,
    `"${cleanName}" company logo vector`,
    `"${cleanName}" company logo png`,
  ];

  for (const q of queries) {
    try {
      const res = await axios.get(
        `https://www.bing.com/images/search?q=${encodeURIComponent(q)}&first=1`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          timeout: 4500,
        }
      );
      const html = res.data;
      const mMatches = html.match(/murl&quot;:&quot;(https?:[^&]+)&quot;/g);
      if (!mMatches || mMatches.length === 0) continue;

      const urls = mMatches
        .map((m) => {
          try {
            return decodeURIComponent(m.replace(/^murl&quot;:&quot;/, '').replace(/&quot;$/, ''));
          } catch {
            return '';
          }
        })
        .filter(Boolean);

      // 1. If preferWebp, check for webp candidates first
      if (preferWebp) {
        for (const u of urls) {
          const lower = u.toLowerCase();
          const isWebp = lower.includes('.webp') || lower.includes('format=webp');
          const isRelevant =
            lower.includes('logo') ||
            lower.includes('icon') ||
            lower.includes('brand') ||
            lower.includes(cleanSlug);
          const isTrash =
            lower.includes('placeholder') ||
            lower.includes('banner') ||
            lower.includes('1x1') ||
            lower.includes('dummy') ||
            lower.includes('stock');

          if (isWebp && isRelevant && !isTrash) {
            const ok = await verifyImageUrl(u);
            if (ok) {
              return { url: u, format: 'webp', source: 'bing-webp' };
            }
          }
        }
      }

      // 2. Check for clean SVG or PNG from results
      for (const u of urls) {
        const lower = u.toLowerCase();
        const isSvgOrPng = lower.includes('.svg') || lower.includes('.png');
        const isRelevant = lower.includes('logo') || lower.includes('icon') || lower.includes(cleanSlug);
        const isTrash =
          lower.includes('placeholder') ||
          lower.includes('banner') ||
          lower.includes('1x1') ||
          lower.includes('stock');

        if (isSvgOrPng && isRelevant && !isTrash) {
          const ok = await verifyImageUrl(u);
          if (ok) {
            const format = lower.includes('.svg') ? 'svg' : 'png';
            return { url: u, format, source: `bing-${format}` };
          }
        }
      }
    } catch {
      // try next query
    }
  }

  // Fallback 1: SimpleIcons SVG
  try {
    const simpleUrl = `https://cdn.simpleicons.org/${cleanSlug}`;
    const ok = await verifyImageUrl(simpleUrl);
    if (ok) {
      return { url: simpleUrl, format: 'svg', source: 'simpleicons' };
    }
  } catch {}

  // Fallback 2: Clearbit
  try {
    const clearbitUrl = `https://logo.clearbit.com/${domain}`;
    const ok = await verifyImageUrl(clearbitUrl);
    if (ok) {
      return { url: clearbitUrl, format: 'png', source: 'clearbit' };
    }
  } catch {}

  // Fallback 3: Google Favicon High-Res (128px)
  const gfav = `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=128`;
  return { url: gfav, format: 'png', source: 'google-favicon' };
}

module.exports = {
  findCompanyLogo,
  verifyImageUrl,
  extractDomain,
};

