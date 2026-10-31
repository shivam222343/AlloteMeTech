export default async function handler(request, context) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Match /jobs/:slug (ignoring static files like .js/.css or /jobs alone or /jobs/admin)
  const match = pathname.match(/^\/jobs\/([a-zA-Z0-9_-]+)$/);
  if (!match || match[1] === 'admin') {
    return context.next();
  }

  const slug = match[1];

  // Fetch the base response (HTML) from Netlify
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  const html = await response.text();

  try {
    const apiUrl = `https://allotemetech.onrender.com/api/jobs/${slug}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const apiRes = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!apiRes.ok) {
      return new Response(html, response);
    }

    const data = await apiRes.json();
    const job = data?.data?.job;
    if (!job) {
      return new Response(html, response);
    }

    const companyName = job.company?.name || job.companyName || job.companyTag || 'Company';
    const title = job.title || 'Job Opportunity';
    const salary = job.salary ? ` | ${job.salary}` : '';
    const batch = job.eligibleBatch ? ` | ${job.eligibleBatch} batch` : '';
    const workMode = job.workMode || 'Remote';
    const location = job.location || 'India';

    // Structured title matching: "Role at Company | Salary | Batch"
    const ogTitle = `${title} at ${companyName}${salary}${batch}`;
    const ogDesc = job.description
      ? `${companyName} is hiring a ${title} in ${location} (${workMode}). ${job.description.slice(0, 160)}...`
      : `${companyName} is hiring a ${title} in ${location} (${workMode}). Apply on Tech AlloteMe.`;

    // High quality company logo (WhatsApp requires PNG, JPG, or WebP)
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

    const ogTags = `
    <!-- Dynamic Job Open Graph Preview -->
    <title>${escapeHtml(ogTitle)} — Tech AlloteMe</title>
    <meta name="description" content="${escapeHtml(ogDesc)}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Tech AlloteMe" />
    <meta property="og:title" content="${escapeHtml(ogTitle)}" />
    <meta property="og:description" content="${escapeHtml(ogDesc)}" />
    <meta property="og:image" content="${escapeHtml(logoUrl)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(logoUrl)}" />
    <meta property="og:image:alt" content="${escapeHtml(companyName)} Logo" />
    <meta property="og:url" content="${request.url}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(ogDesc)}" />
    <meta name="twitter:image" content="${escapeHtml(logoUrl)}" />
`;

    let modifiedHtml = html.replace(/<title>.*?<\/title>/i, '');
    modifiedHtml = modifiedHtml.replace(/<meta\s+name=["']description["'][^>]*>/i, '');
    modifiedHtml = modifiedHtml.replace('</head>', `${ogTags}\n  </head>`);

    return new Response(modifiedHtml, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers),
        'content-type': 'text/html; charset=UTF-8',
        'cache-control': 'public, max-age=120, s-maxage=600',
      },
    });
  } catch (err) {
    return new Response(html, response);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export const config = {
  path: '/jobs/*',
};

