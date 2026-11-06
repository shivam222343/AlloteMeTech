import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  Briefcase,
  Calendar,
  Users,
  ExternalLink,
  ArrowLeft,
  CheckCircle2,
  Banknote,
  Mail,
  Phone,
  Lock,
} from 'lucide-react';
import { jobsApi } from '../api';
import Spinner from '../components/common/Spinner';
import { useAuth } from '../context/AuthContext';
import {
  WhatsAppIcon,
  formatJobForWhatsApp,
  shareOnWhatsApp,
  formatTimeAgo,
} from '../components/jobs/whatsappHelper';
import JobsPremiumBanner from '../components/jobs/JobsPremiumBanner';
import { useJobApply } from '../components/jobs/useJobApply';

function timeAgo(date) {
  return formatTimeAgo(date);
}

const isValidCompanyLogo = (url) => {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim().toLowerCase();
  if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('data:image/')) return false;
  if (clean.includes('google.com/s2/favicons') && clean.includes('sz=16')) return false;
  return true;
};

// Helper to decode HTML entities
function decodeHtmlEntities(str) {
  if (!str) return '';
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

// Client-side parser fallback for jobs containing raw HTML
function parseClientJobContent(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') {
    return { description: '', responsibilities: [], requirements: [] };
  }

  let text = decodeHtmlEntities(rawInput);
  text = text
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<li>/gi, '\n● ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<(?:p|div|h[1-6]|tr)>/gi, '\n')
    .replace(/<\/(?:p|div|h[1-6]|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, ' \n ')
    .replace(/<\/?[^>]+(>|$)/g, ' ');

  const rawLines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

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

  return {
    description: descParagraphs.join('\n\n').replace(/\n{3,}/g, '\n\n').trim(),
    responsibilities: respItems,
    requirements: reqItems,
  };
}

export default function JobDetail() {
  const { slug } = useParams();
  const { user, hasReachedLimit, handleApply } = useJobApply();
  const { isAdmin } = useAuth();
  const [imgError, setImgError] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['job', slug],
    queryFn: () => jobsApi.getOne(slug).then((r) => r.data),
  });

  const job = data?.data?.job;

  if (isLoading)
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );

  if (isError || !job)
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-text-muted">Job not found or pending admin review</p>
        <Link to="/jobs" className="btn btn-ghost btn-sm mt-4">
          ← Back to Jobs
        </Link>
      </div>
    );

  // Priority 1: Uploaded company logo (from Company document)
  // Priority 2: Scraped logo (job.companyLogo)
  const rawLogo =
    job.company?.logo && job.company.logo.trim()
      ? job.company.logo
      : job.companyLogo || '';
  const companyLogo = isValidCompanyLogo(rawLogo) ? rawLogo : '';
  const companyName = job.company?.name || job.companyName;
  const rawApplyLink = (job.applyLink || '').trim();
  const hasDirectCompanyLink =
    rawApplyLink &&
    !rawApplyLink.toLowerCase().includes('hiredoor') &&
    !rawApplyLink.startsWith('mailto:');
  const companyEmail =
    job.applyEmail &&
    !job.applyEmail.toLowerCase().includes('hiredoor') &&
    !job.applyEmail.toLowerCase().includes('alloteme')
      ? job.applyEmail.trim()
      : rawApplyLink.startsWith('mailto:') &&
        !rawApplyLink.toLowerCase().includes('hiredoor')
      ? rawApplyLink.replace(/^mailto:/i, '').split('?')[0].trim()
      : '';
  const canApply = hasDirectCompanyLink || !!companyEmail;
  const isLocked = Boolean(job.isLocked);

  const handleOpenSubscription = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    window.dispatchEvent(
      new CustomEvent('open-premium-modal', {
        detail: {
          message: 'Unlock latest jobs! Free users can only access the 5 oldest archived jobs per company. Upgrade to Premium to instantly apply to all newly posted jobs!',
        },
      })
    );
  };

  // Process structured sections
  let cleanDesc = job.description || '';
  let responsibilities = Array.isArray(job.responsibilities)
    ? [...job.responsibilities]
    : [];
  let requirements = Array.isArray(job.requirements)
    ? [...job.requirements]
    : [];
  let tags = Array.isArray(job.tags) ? [...job.tags] : [];

  // Fallback on-the-fly parsing if raw HTML was present or if lists are empty
  if (
    /<[a-z][\s\S]*>/i.test(cleanDesc) ||
    cleanDesc.includes('&lt;') ||
    (responsibilities.length === 0 && cleanDesc.length > 200)
  ) {
    const parsed = parseClientJobContent(cleanDesc);
    if (parsed.description) cleanDesc = parsed.description;
    if (responsibilities.length === 0 && parsed.responsibilities.length > 0) {
      responsibilities = parsed.responsibilities;
    }
    if (requirements.length === 0 && parsed.requirements.length > 0) {
      requirements = parsed.requirements;
    }
  } else {
    // Strip any residual HTML entities or tags
    cleanDesc = decodeHtmlEntities(cleanDesc).replace(/<\/?[^>]+(>|$)/g, ' ').replace(/\s\s+/g, ' ').trim();
  }

  const descParagraphs = cleanDesc
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const infoItems = [
    job.salary && {
      icon: Banknote,
      label: 'Stipend / Salary',
      value: job.salary,
      accent: true,
    },
    job.location && { icon: MapPin, label: 'Location', value: job.location },
    job.workMode && { icon: Briefcase, label: 'Work Mode', value: job.workMode },
    job.eligibleBatch && {
      icon: Users,
      label: 'Eligible Batch',
      value: job.eligibleBatch,
    },
    job.contactPhone && {
      icon: Phone,
      label: 'Contact Phone',
      value: job.contactPhone,
    },
    job.deadline
      ? {
          icon: Calendar,
          label: 'Apply By',
          value: new Date(job.deadline).toLocaleDateString(),
        }
      : { icon: Calendar, label: 'Apply By', value: 'No deadline – apply early' },
  ].filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Link
        to="/jobs"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Jobs
      </Link>

      {/* Jobs Premium Banner & Daily Limit Counter for Free Users */}
      <JobsPremiumBanner />

      {/* Hero Card */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center p-1.5">
              {companyLogo && !imgError ? (
                <img
                  src={companyLogo}
                  alt={companyName}
                  onError={() => setImgError(true)}
                  className={`w-full h-full object-contain ${
                    job.company?.hasWhiteBg ? 'bg-white' : ''
                  }`}
                />
              ) : (
                <span className="text-2xl font-bold text-accent-blue select-none">
                  {(companyName?.trim()?.charAt(0) || 'C').toUpperCase()}
                </span>
              )}
            </div>
            {job.isReviewed && (
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md ring-2 ring-bg-card"
                title="Verified by Tech AlloteMe"
              >
                <svg className="w-3 h-3 text-white stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm text-accent-blue font-medium">{companyName}</p>
            <h1 className="text-xl font-bold text-text-primary mt-0.5">{job.title}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue">
                {job.jobType}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent-green/10 text-accent-green">
                {job.workMode}
              </span>
              {job.eligibleBatch && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-bg-secondary text-text-muted">
                  Batches {job.eligibleBatch}
                </span>
              )}
            </div>


            {/* Time: Just show time, no words like 'Scraped' */}
            <div className="text-xs text-text-faint mt-2">
              {isAdmin ? (
                <span className="space-x-1.5">
                  <span>Posted {timeAgo(job.postedAt || job.createdAt)}</span>
                  <span>·</span>
                  <span className="text-accent-blue font-medium">{timeAgo(job.scrapedAt || job.createdAt)}</span>
                </span>
              ) : (
                <span>{timeAgo(job.scrapedAt || job.createdAt)}</span>
              )}
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  shareOnWhatsApp(formatJobForWhatsApp(job, null, { isUserShare: true }))
                }
                className="btn btn-ghost btn-sm text-[#25D366] hover:bg-[#25D366]/10 flex items-center gap-1.5 border border-[#25D366]/30"
                title="Share on WhatsApp"
              >
                <WhatsAppIcon className="w-4 h-4 fill-[#25D366]" /> Share
              </button>
              {isLocked ? (
                <button
                  type="button"
                  onClick={handleOpenSubscription}
                  className="btn btn-sm px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold hover:brightness-110 shadow-sm flex items-center gap-1.5 cursor-pointer rounded-lg text-xs"
                  title="Locked for free users. Upgrade to Premium to apply."
                >
                  <span>Take Subscription</span>
                  <span className="text-xs">👑</span>
                </button>
              ) : canApply &&
                (hasReachedLimit ? (
                  <button
                    type="button"
                    onClick={(e) => handleApply(e, job)}
                    className="btn btn-primary btn-sm flex items-center gap-1.5 opacity-90 hover:opacity-100 cursor-pointer"
                    title="Daily limit reached (5/5). Click to unlock unlimited applications."
                  >
                    Apply Now <Lock className="w-3.5 h-3.5 text-amber-300" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => handleApply(e, job)}
                    className="btn btn-primary btn-sm flex items-center gap-1.5"
                  >
                    {hasDirectCompanyLink ? (
                      <>
                        Apply Now <ExternalLink className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        Email Apply <Mail className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                ))}
            </div>
            {companyEmail && !isLocked && (
              <a
                href={`mailto:${companyEmail}`}
                onClick={(e) => {
                  if (!user) {
                    e.preventDefault();
                    handleApply(e, job);
                  }
                }}
                className="text-xs text-text-muted hover:text-text-primary transition-colors"
              >
                {companyEmail}
              </a>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-4 p-4 bg-bg-secondary rounded-lg">
          {infoItems.map(({ icon: Icon, label, value, accent }) => (
            <div key={label} className="min-w-0">
              <p className="text-[10px] text-text-faint uppercase tracking-wider mb-0.5">
                {label}
              </p>
              <p
                className={`text-xs font-semibold truncate ${
                  accent ? 'text-accent-green' : 'text-text-primary'
                }`}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* How to apply */}
        {(companyEmail || job.contactPhone) && (
          <div className="flex flex-wrap items-center gap-4 mt-4 p-3 border border-border rounded-lg text-sm text-text-muted">
            <span className="text-text-faint text-xs uppercase tracking-wider">
              Contact &amp; How to Apply:
            </span>
            {companyEmail && (
              <div className="flex items-center gap-1.5 text-accent-blue">
                <Mail className="w-4 h-4" />
                <a
                  href={`mailto:${companyEmail}`}
                  onClick={(e) => {
                    if (!user) {
                      e.preventDefault();
                      handleApply(e, job);
                    }
                  }}
                  className="hover:underline font-medium"
                >
                  {companyEmail}
                </a>
              </div>
            )}
            {job.contactPhone && (
              <div className="flex items-center gap-1.5 text-accent-green">
                <Phone className="w-4 h-4" />
                <a
                  href={`tel:${job.contactPhone}`}
                  className="hover:underline font-medium"
                >
                  {job.contactPhone}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Mobile Apply & Share Buttons */}
        <div className="sm:hidden mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              shareOnWhatsApp(formatJobForWhatsApp(job, null, { isUserShare: true }))
            }
            className="btn btn-ghost border border-[#25D366]/40 text-[#25D366] flex items-center justify-center gap-1.5 px-4"
          >
            <WhatsAppIcon className="w-4 h-4 fill-[#25D366]" /> Share
          </button>
          {isLocked ? (
            <button
              type="button"
              onClick={handleOpenSubscription}
              className="btn btn-sm flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold hover:brightness-110 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer rounded-lg text-xs"
              title="Locked for free users. Upgrade to Premium to apply."
            >
              <span>Take Subscription</span>
              <span className="text-xs">👑</span>
            </button>
          ) : canApply &&
            (hasReachedLimit ? (
              <button
                type="button"
                onClick={(e) => handleApply(e, job)}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2 opacity-90 hover:opacity-100 cursor-pointer"
              >
                Apply Now <Lock className="w-4 h-4 text-amber-300" />
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => handleApply(e, job)}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {hasDirectCompanyLink ? (
                  <>
                    Apply Now <ExternalLink className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Email Apply <Mail className="w-4 h-4" />
                  </>
                )}
              </button>
            ))}
        </div>
      </div>

      {/* About the Role */}
      {descParagraphs.length > 0 && (
        <div className="card p-6 mb-4">
          <h2 className="text-sm font-semibold text-text-primary mb-3">About the Role</h2>
          <div className="space-y-3">
            {descParagraphs.map((p, i) => (
              <p key={i} className="text-sm text-text-muted leading-relaxed">
                {p}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Responsibilities */}
      {responsibilities.length > 0 && (
        <div className="card p-6 mb-4">
          <h2 className="text-sm font-semibold text-text-primary mb-3">Responsibilities</h2>
          <ul className="space-y-2.5">
            {responsibilities.map((r, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-text-muted">
                <CheckCircle2 className="w-4 h-4 text-accent-green flex-shrink-0 mt-0.5" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Requirements */}
      {requirements.length > 0 && (
        <div className="card p-6 mb-4">
          <h2 className="text-sm font-semibold text-text-primary mb-3">Requirements</h2>
          <ul className="space-y-2.5">
            {requirements.map((r, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-text-muted">
                <CheckCircle2 className="w-4 h-4 text-accent-blue flex-shrink-0 mt-0.5" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Skills & Tags */}
      {tags.length > 0 && (
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-text-primary mb-3">Skills &amp; Tags</h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, i) => (
              <span
                key={i}
                className="text-xs px-2.5 py-1 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20 font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
