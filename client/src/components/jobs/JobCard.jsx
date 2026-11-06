import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Banknote, ExternalLink, Mail, Phone, Lock, CheckCircle2 } from 'lucide-react';
import { WhatsAppIcon, formatJobForWhatsApp, shareOnWhatsApp, formatTimeAgo } from './whatsappHelper';
import { useJobApply } from './useJobApply';

export const isValidCompanyLogo = (url) => {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim().toLowerCase();
  if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('data:image/')) return false;
  // Filter out 16px google favicon fetchers
  if (clean.includes('google.com/s2/favicons') && clean.includes('sz=16')) return false;
  return true;
};

const TYPE_COLORS = {
  'Full-time': 'text-accent-green bg-accent-green/10',
  'Internship': 'text-accent-blue bg-accent-blue/10',
  'Part-time': 'text-accent-yellow bg-accent-yellow/10',
  'Contract': 'text-purple-400 bg-purple-400/10',
  'Freelance': 'text-orange-400 bg-orange-400/10',
};

const MODE_COLORS = {
  'Remote': 'text-accent-green bg-accent-green/10',
  'Hybrid': 'text-accent-blue bg-accent-blue/10',
  'On-site': 'text-text-muted bg-bg-secondary',
};

export const formatCompanyName = (job) => {
  if (job?.company?.name && job.company.name.trim()) return job.company.name.trim();
  const raw = (job?.companyName || job?.companyTag || '').trim();
  if (!raw) return 'Company';
  // If it contains spaces or uppercase, it is already an original formatted name
  if (raw !== raw.toLowerCase() || raw.includes(' ')) return raw;
  // If it's a slug, capitalize words cleanly
  return raw
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export default function JobCard({
  job,
  isAdmin = false,
  isSelected = false,
  onToggleSelect,
}) {
  const { user, hasReachedLimit, handleApply } = useJobApply();
  const [imgError, setImgError] = useState(false);

  // Priority 1: Uploaded company logo (from Company document)
  // Priority 2: Scraped company logo (job.companyLogo)
  const rawLogo = (job.company?.logo && job.company.logo.trim())
    ? job.company.logo
    : (job.companyLogo || '');

  const companyLogo = isValidCompanyLogo(rawLogo) ? rawLogo : '';
  const companyName = formatCompanyName(job);
  const slug = job.slug;

  // Direct company link: must NEVER be hiredoor.in
  const rawApplyLink = (job.applyLink || '').trim();
  const hasDirectCompanyLink = rawApplyLink && !rawApplyLink.toLowerCase().includes('hiredoor') && !rawApplyLink.startsWith('mailto:');

  // Company email: only genuine company email, never hiredoor or alloteme
  const rawEmail = (job.applyEmail || (rawApplyLink.startsWith('mailto:') ? rawApplyLink.replace(/^mailto:/i, '').split('?')[0].trim() : '')).trim();
  const email = (rawEmail && !rawEmail.toLowerCase().includes('hiredoor') && !rawEmail.toLowerCase().includes('alloteme')) ? rawEmail : '';

  const isLocked = Boolean(job.isLocked);

  const handleOpenSubscription = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    window.dispatchEvent(
      new CustomEvent('open-premium-modal', {
        detail: {
          message: 'Unlock latest jobs! Free users can only access the 5 oldest archived jobs per company. Upgrade to Premium to instantly apply to all newly posted jobs!',
        },
      })
    );
  };

  return (
    <div
      className={`card group flex flex-col gap-3 p-4 transition-all relative ${isSelected
          ? 'border-accent-blue bg-accent-blue/5 shadow-[0_0_15px_rgba(59,130,246,0.18)] ring-1 ring-accent-blue/50'
          : 'hover:border-accent-blue/40'
        }`}
    >
      {/* Company row */}
      <div className="flex items-start gap-3">
        {isAdmin && (
          <div
            className="pt-1 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect && onToggleSelect(job._id)}
              className="w-4 h-4 rounded border-border text-accent-blue focus:ring-accent-blue/30 cursor-pointer accent-accent-blue"
              title="Select job for WhatsApp bulk share"
            />
          </div>
        )}
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center p-1">
            {companyLogo && !imgError ? (
              <img
                src={companyLogo}
                alt={companyName}
                onError={() => setImgError(true)}
                className={`w-full h-full object-contain ${job.company?.hasWhiteBg ? 'bg-white' : ''}`}
              />
            ) : (
              <span className="text-base font-bold text-accent-blue select-none">
                {(companyName?.trim()?.charAt(0) || 'C').toUpperCase()}
              </span>
            )}
          </div>
          {job.isReviewed && (
            <div
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md ring-2 ring-bg-card"
              title="Verified by Tech AlloteMe"
            >
              <svg className="w-2.5 h-2.5 text-white stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-accent-blue font-medium truncate">{companyName}</p>
          <h3 className="text-sm font-semibold text-text-primary leading-tight line-clamp-2 mt-0.5">
            {job.title}
          </h3>
        </div>

        {/* Time display: Just show time, no words like 'Scraped' */}
        <div className="text-right flex-shrink-0">
          {isAdmin ? (
            <div className="text-[11px] text-text-faint leading-tight space-y-0.5">
              <div>Posted {formatTimeAgo(job.postedAt || job.createdAt)}</div>
              <div className="text-accent-blue font-medium">{formatTimeAgo(job.reviewedAt || job.scrapedAt || job.createdAt)}</div>
            </div>
          ) : (
            <span className="text-xs text-text-faint" title={job.reviewedAt ? `Approved ${formatTimeAgo(job.reviewedAt)}` : ''}>
              {formatTimeAgo(job.reviewedAt || job.scrapedAt || job.createdAt)}
            </span>
          )}
        </div>
      </div>


      {/* Tags row */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${job.category === 'Non-Tech'
            ? 'text-purple-400 bg-purple-500/10 border-purple-500/20'
            : 'text-accent-blue bg-accent-blue/10 border-accent-blue/20'
          }`}>
          {job.category === 'Non-Tech' ? '💼 Non-Tech' : '💻 Tech'}
        </span>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[job.jobType] || 'text-text-muted bg-bg-secondary'}`}>
          {job.jobType}
        </span>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${MODE_COLORS[job.workMode] || 'text-text-muted bg-bg-secondary'}`}>
          {job.workMode}
        </span>
        {job.eligibleBatch && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full text-text-muted bg-bg-secondary">
            Batch {job.eligibleBatch}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="space-y-1">
        {job.salary && (
          <div className="flex items-center gap-1.5 text-xs text-accent-green font-semibold">
            <Banknote className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{job.salary}</span>
          </div>
        )}
        {job.location && (
          <div className="flex items-center gap-1.5 text-xs text-text-faint">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{job.location}</span>
          </div>
        )}
        {/* Email on card */}
        {email && (
          <div className="flex items-center gap-1.5 text-xs text-accent-blue min-w-0">
            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
            <a
              href={`mailto:${email}`}
              className="truncate hover:underline"
              onClick={e => {
                if (isLocked) {
                  e.preventDefault();
                  handleOpenSubscription(e);
                  return;
                }
                if (!user) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleApply(e, job);
                } else {
                  e.stopPropagation();
                }
              }}
              title={email}
            >
              {email}
            </a>
          </div>
        )}
        {/* Contact Phone on card */}
        {job.contactPhone && (
          <div className="flex items-center gap-1.5 text-xs text-text-secondary min-w-0">
            <Phone className="w-3.5 h-3.5 flex-shrink-0 text-accent-green" />
            <a
              href={`tel:${job.contactPhone}`}
              className="truncate hover:underline"
              onClick={e => {
                if (isLocked) {
                  e.preventDefault();
                  handleOpenSubscription(e);
                  return;
                }
                e.stopPropagation();
              }}
            >
              {job.contactPhone}
            </a>
          </div>
        )}
      </div>

      {/* Action */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
        <Link
          to={`/jobs/${slug}`}
          className="text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          View Details
        </Link>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              shareOnWhatsApp(formatJobForWhatsApp(job, null, { isUserShare: true }));
            }}
            className="p-1.5 rounded-lg text-[#25D366] hover:bg-[#25D366]/10 transition-colors"
            title="Share on WhatsApp"
          >
            <WhatsAppIcon className="w-4 h-4 fill-[#25D366]" />
          </button>

          {/* Gating: If job is locked for free user, show Take Subscription */}
          {isLocked ? (
            <button
              type="button"
              onClick={handleOpenSubscription}
              className="btn btn-sm px-3 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold hover:brightness-110 shadow-sm flex items-center gap-1.5 cursor-pointer rounded-lg text-xs"
              title="Locked for free users. Upgrade to Premium to apply."
            >
              <span>Take Subscription</span>
              <span className="text-xs">👑</span>
            </button>
          ) : hasReachedLimit ? (
            <button
              type="button"
              onClick={(e) => handleApply(e, job)}
              className="btn btn-primary btn-sm flex items-center gap-1.5 opacity-90 hover:opacity-100 cursor-pointer"
              title="Daily limit reached (5/5). Click to unlock unlimited applications."
            >
              Apply <Lock className="w-3.5 h-3.5 text-amber-300" />
            </button>
          ) : hasDirectCompanyLink ? (
            <button
              type="button"
              onClick={(e) => handleApply(e, job)}
              className="btn btn-primary btn-sm flex items-center gap-1"
            >
              Apply <ExternalLink className="w-3 h-3" />
            </button>
          ) : email ? (
            <button
              type="button"
              onClick={(e) => handleApply(e, job)}
              className="btn btn-primary btn-sm flex items-center gap-1"
            >
              Email Apply <Mail className="w-3 h-3" />
            </button>
          ) : (job.contactPhone || rawApplyLink.startsWith('tel:')) ? (
            <button
              type="button"
              onClick={(e) => handleApply(e, job)}
              className="btn btn-primary btn-sm flex items-center gap-1"
            >
              Contact <Phone className="w-3 h-3" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
