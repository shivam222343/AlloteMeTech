import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Briefcase, Calendar, Users, ExternalLink, ArrowLeft, CheckCircle2, Banknote, Mail, Phone, Lock } from 'lucide-react';
import { jobsApi } from '../api';
import Spinner from '../components/common/Spinner';
import { WhatsAppIcon, formatJobForWhatsApp, shareOnWhatsApp, formatTimeAgo } from '../components/jobs/whatsappHelper';
import { useJobApply } from '../components/jobs/useJobApply';

function timeAgo(date) {
  return formatTimeAgo(date);
}

export default function JobDetail() {
  const { slug } = useParams();
  const { hasReachedLimit, handleApply } = useJobApply();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['job', slug],
    queryFn: () => jobsApi.getOne(slug).then(r => r.data),
  });

  const job = data?.data?.job;

  if (isLoading) return (
    <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  );

  if (isError || !job) return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <p className="text-text-muted">Job not found</p>
      <Link to="/jobs" className="btn btn-ghost btn-sm mt-4">← Back to Jobs</Link>
    </div>
  );

  // Priority 1: First use uploaded company logo (from Company document)
  // Priority 2: If not available, use scraped logo (job.companyLogo)
  const companyLogo = (job.company?.logo && job.company.logo.trim())
    ? job.company.logo
    : (job.companyLogo || '');
  const companyName = job.company?.name || job.companyName;
  const rawApplyLink = (job.applyLink || '').trim();
  const hasDirectCompanyLink = rawApplyLink && !rawApplyLink.toLowerCase().includes('hiredoor') && !rawApplyLink.startsWith('mailto:');
  const companyEmail = (job.applyEmail && !job.applyEmail.toLowerCase().includes('hiredoor') && !job.applyEmail.toLowerCase().includes('alloteme'))
    ? job.applyEmail.trim()
    : (rawApplyLink.startsWith('mailto:') && !rawApplyLink.toLowerCase().includes('hiredoor') ? rawApplyLink.replace(/^mailto:/i, '').split('?')[0].trim() : '');
  const canApply = hasDirectCompanyLink || !!companyEmail;

  const infoItems = [
    job.salary && { icon: Banknote, label: 'Stipend / Salary', value: job.salary, accent: true },
    job.location && { icon: MapPin, label: 'Location', value: job.location },
    job.workMode && { icon: Briefcase, label: 'Work Mode', value: job.workMode },
    job.eligibleBatch && { icon: Users, label: 'Eligible Batch', value: job.eligibleBatch },
    job.contactPhone && { icon: Phone, label: 'Contact Phone', value: job.contactPhone },
    job.deadline
      ? { icon: Calendar, label: 'Apply By', value: new Date(job.deadline).toLocaleDateString() }
      : { icon: Calendar, label: 'Apply By', value: 'No deadline – apply early' },
  ].filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Jobs
      </Link>

      {/* Hero Card */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-bg-secondary border border-border flex items-center justify-center">
            {companyLogo ? (
              <img src={companyLogo} alt={companyName} className={`w-full h-full object-contain ${job.company?.hasWhiteBg ? 'bg-white' : ''}`} />
            ) : (
              <span className="text-2xl font-bold text-text-faint">{companyName?.charAt(0)}</span>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm text-accent-blue font-medium">{companyName}</p>
            <h1 className="text-xl font-bold text-text-primary mt-0.5">{job.title}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue">{job.jobType}</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent-green/10 text-accent-green">{job.workMode}</span>
              {job.eligibleBatch && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-bg-secondary text-text-muted">
                  Batches {job.eligibleBatch}
                </span>
              )}
            </div>
            <p className="text-xs text-text-faint mt-2">Posted {timeAgo(job.postedAt || job.createdAt)}</p>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => shareOnWhatsApp(formatJobForWhatsApp(job, null, { isUserShare: true }))}
                className="btn btn-ghost btn-sm text-[#25D366] hover:bg-[#25D366]/10 flex items-center gap-1.5 border border-[#25D366]/30"
                title="Share on WhatsApp"
              >
                <WhatsAppIcon className="w-4 h-4 fill-[#25D366]" /> Share
              </button>
              {canApply && (
                hasReachedLimit ? (
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
                      <>Apply Now <ExternalLink className="w-3.5 h-3.5" /></>
                    ) : (
                      <>Email Apply <Mail className="w-3.5 h-3.5" /></>
                    )}
                  </button>
                )
              )}
            </div>
            {companyEmail && (
              <a href={`mailto:${companyEmail}`} className="text-xs text-text-muted hover:text-text-primary transition-colors">
                {companyEmail}
              </a>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-4 p-4 bg-bg-secondary rounded-lg">
          {infoItems.map(({ icon: Icon, label, value, accent }) => (
            <div key={label} className="min-w-0">
              <p className="text-[10px] text-text-faint uppercase tracking-wider mb-0.5">{label}</p>
              <p className={`text-xs font-semibold truncate ${accent ? 'text-accent-green' : 'text-text-primary'}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* How to apply */}
        {(companyEmail || job.contactPhone) && (
          <div className="flex flex-wrap items-center gap-4 mt-4 p-3 border border-border rounded-lg text-sm text-text-muted">
            <span className="text-text-faint text-xs uppercase tracking-wider">Contact & How to Apply:</span>
            {companyEmail && (
              <div className="flex items-center gap-1.5 text-accent-blue">
                <Mail className="w-4 h-4" />
                <a href={`mailto:${companyEmail}`} className="hover:underline font-medium">{companyEmail}</a>
              </div>
            )}
            {job.contactPhone && (
              <div className="flex items-center gap-1.5 text-accent-green">
                <Phone className="w-4 h-4" />
                <a href={`tel:${job.contactPhone}`} className="hover:underline font-medium">{job.contactPhone}</a>
              </div>
            )}
          </div>
        )}

        {/* Mobile Apply & Share Buttons */}
        <div className="sm:hidden mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => shareOnWhatsApp(formatJobForWhatsApp(job, null, { isUserShare: true }))}
            className="btn btn-ghost border border-[#25D366]/40 text-[#25D366] flex items-center justify-center gap-1.5 px-4"
          >
            <WhatsAppIcon className="w-4 h-4 fill-[#25D366]" /> Share
          </button>
          {canApply && (
            hasReachedLimit ? (
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
                  <>Apply Now <ExternalLink className="w-4 h-4" /></>
                ) : (
                  <>Email Apply <Mail className="w-4 h-4" /></>
                )}
              </button>
            )
          )}
        </div>
      </div>

      {/* Description */}
      {job.description && (
        <div className="card p-6 mb-4">
          <h2 className="text-sm font-semibold text-text-primary mb-3">About the Role</h2>
          <p className="text-sm text-text-muted leading-relaxed">{job.description}</p>
        </div>
      )}

      {/* Responsibilities */}
      {job.responsibilities?.length > 0 && (
        <div className="card p-6 mb-4">
          <h2 className="text-sm font-semibold text-text-primary mb-3">Responsibilities</h2>
          <ul className="space-y-2">
            {job.responsibilities.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                <CheckCircle2 className="w-4 h-4 text-accent-green flex-shrink-0 mt-0.5" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Requirements */}
      {job.requirements?.length > 0 && (
        <div className="card p-6 mb-4">
          <h2 className="text-sm font-semibold text-text-primary mb-3">Requirements</h2>
          <ul className="space-y-2">
            {job.requirements.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                <CheckCircle2 className="w-4 h-4 text-accent-blue flex-shrink-0 mt-0.5" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tags */}
      {job.tags?.length > 0 && (
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-text-primary mb-3">Skills &amp; Tags</h2>
          <div className="flex flex-wrap gap-2">
            {job.tags.map((tag, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded bg-bg-secondary text-text-muted border border-border">{tag}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
