import { Link } from 'react-router-dom';
import { MapPin, Banknote, ExternalLink, Mail, Phone, Lock } from 'lucide-react';
import { WhatsAppIcon, formatJobForWhatsApp, shareOnWhatsApp, formatTimeAgo } from './whatsappHelper';
import { useJobApply } from './useJobApply';

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

export default function JobCard({ job }) {
  const { user, hasReachedLimit, handleApply } = useJobApply();

  // Priority 1: Uploaded company logo (from Company document)
  // Priority 2: Scraped company logo (job.companyLogo)
  const companyLogo = (job.company?.logo && job.company.logo.trim())
    ? job.company.logo
    : (job.companyLogo || '');

  const companyName = job.company?.name || job.companyName || 'Unknown Company';
  const slug = job.slug;

  // Direct company link: must NEVER be hiredoor.in
  const rawApplyLink = (job.applyLink || '').trim();
  const hasDirectCompanyLink = rawApplyLink && !rawApplyLink.toLowerCase().includes('hiredoor') && !rawApplyLink.startsWith('mailto:');

  // Company email: only genuine company email, never hiredoor or alloteme
  const rawEmail = (job.applyEmail || (rawApplyLink.startsWith('mailto:') ? rawApplyLink.replace(/^mailto:/i, '').split('?')[0].trim() : '')).trim();
  const email = (rawEmail && !rawEmail.toLowerCase().includes('hiredoor') && !rawEmail.toLowerCase().includes('alloteme')) ? rawEmail : '';

  return (
    <div className="card group flex flex-col gap-3 p-4 hover:border-accent-blue/40 transition-colors">
      {/* Company row */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-bg-secondary border border-border flex items-center justify-center p-1">
          {companyLogo ? (
            <img
              src={companyLogo}
              alt={companyName}
              className={`w-full h-full object-contain ${job.company?.hasWhiteBg ? 'bg-white' : ''}`}
            />
          ) : (
            <span className="text-lg font-bold text-text-faint">
              {companyName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-accent-blue font-medium truncate">{companyName}</p>
          <h3 className="text-sm font-semibold text-text-primary leading-tight line-clamp-2 mt-0.5">
            {job.title}
          </h3>
        </div>
        <span className="text-xs text-text-faint flex-shrink-0">{formatTimeAgo(job.postedAt || job.createdAt)}</span>
      </div>

      {/* Tags row */}
      <div className="flex flex-wrap gap-1.5">
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
              onClick={e => e.stopPropagation()}
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

          {/* Apply button with daily limit & lock (Direct company link or Company email only, NEVER hiredoor) */}
          {hasReachedLimit ? (
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
          ) : null}
        </div>
      </div>
    </div>
  );
}
