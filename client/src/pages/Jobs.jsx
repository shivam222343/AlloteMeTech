import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Briefcase, X, CheckSquare, Square, Copy, Check } from 'lucide-react';
import { jobsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import JobCard from '../components/jobs/JobCard';
import JobsPremiumBanner from '../components/jobs/JobsPremiumBanner';
import Spinner from '../components/common/Spinner';
import {
  WhatsAppIcon,
  formatJobForWhatsApp,
  formatMultipleJobsForWhatsApp,
  shareOnWhatsApp,
} from '../components/jobs/whatsappHelper';
import toast from 'react-hot-toast';

const JOB_TYPES = ['Full-time', 'Part-time', 'Internship', 'Contract', 'Freelance'];
const WORK_MODES = ['Remote', 'Hybrid', 'On-site'];

export default function Jobs() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [search, setSearch] = useState('');
  const [jobType, setJobType] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [page, setPage] = useState(1);
  const [selectedJobIds, setSelectedJobIds] = useState(new Set());
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', search, jobType, workMode, page],
    queryFn: () => jobsApi.getAll({ search, jobType, workMode, page, limit: 12 }).then(r => r.data),
    keepPreviousData: true,
  });

  const jobs = data?.data || [];
  const pagination = data?.pagination || {};
  const hasFilters = search || jobType || workMode;

  const clearFilters = () => {
    setSearch('');
    setJobType('');
    setWorkMode('');
    setPage(1);
  };

  const toggleSelect = (id) => {
    setSelectedJobIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllOnPage = () => {
    if (selectedJobIds.size === jobs.length && jobs.length > 0) {
      setSelectedJobIds(new Set());
    } else {
      setSelectedJobIds(new Set(jobs.map(j => j._id)));
    }
  };

  const clearSelection = () => {
    setSelectedJobIds(new Set());
  };

  const selectedJobs = jobs.filter(j => selectedJobIds.has(j._id));

  const handleShareSelected = () => {
    if (selectedJobs.length === 0) return;
    const text = selectedJobs.length === 1
      ? formatJobForWhatsApp(selectedJobs[0], null, { isUserShare: true })
      : formatMultipleJobsForWhatsApp(selectedJobs, { isUserShare: true });

    navigator.clipboard.writeText(text).catch(() => {});
    shareOnWhatsApp(text);
    toast.success(`Opening WhatsApp with ${selectedJobs.length} job${selectedJobs.length > 1 ? 's' : ''}!`);
  };

  const handleCopySelected = () => {
    if (selectedJobs.length === 0) return;
    const text = selectedJobs.length === 1
      ? formatJobForWhatsApp(selectedJobs[0], null, { isUserShare: true })
      : formatMultipleJobsForWhatsApp(selectedJobs, { isUserShare: true });

    navigator.clipboard.writeText(text)
      .then(() => {
        setCopied(true);
        toast.success(`Copied WhatsApp message for ${selectedJobs.length} job(s)!`);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error('Failed to copy text'));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-1">Job Opportunities</h1>
        <p className="text-text-muted text-sm">Curated job listings to help you land your next role</p>
      </div>

      {/* Jobs Premium Banner for Free / Non-Premium Users */}
      <JobsPremiumBanner />

      {/* Admin Multi-Select Toolbar (Admin Only) */}
      {isAdmin && (
        <div className="mb-4 p-3 rounded-xl bg-bg-card border border-accent-blue/30 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-accent-blue/20 text-accent-blue">
              Admin WhatsApp Share
            </span>
            <button
              type="button"
              onClick={selectAllOnPage}
              className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1.5 font-medium ml-1 transition-colors"
            >
              {selectedJobIds.size === jobs.length && jobs.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-accent-blue" />
              ) : (
                <Square className="w-4 h-4 text-text-faint" />
              )}
              Select All on Page ({jobs.length})
            </button>
            {selectedJobIds.size > 0 && (
              <span className="text-xs font-semibold text-accent-blue">
                ({selectedJobIds.size} selected)
              </span>
            )}
          </div>

          {selectedJobIds.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShareSelected}
                className="btn btn-sm text-xs font-semibold text-white bg-[#25D366] hover:bg-[#20ba5a] flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <WhatsAppIcon className="w-3.5 h-3.5 fill-white" />
                Share on WhatsApp ({selectedJobIds.size})
              </button>
              <button
                type="button"
                onClick={handleCopySelected}
                className="btn btn-ghost btn-sm text-xs flex items-center gap-1"
                title="Copy WhatsApp text"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-accent-green" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="btn btn-ghost btn-sm text-xs text-text-muted hover:text-text-primary p-1"
                title="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="input w-full pl-9 py-2 text-sm"
          />
        </div>

        {/* Job Type */}
        <select
          value={jobType}
          onChange={e => { setJobType(e.target.value); setPage(1); }}
          className="input text-sm py-2 min-w-[140px]"
        >
          <option value="">All Types</option>
          {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Work Mode */}
        <select
          value={workMode}
          onChange={e => { setWorkMode(e.target.value); setPage(1); }}
          className="input text-sm py-2 min-w-[140px]"
        >
          <option value="">All Modes</option>
          {WORK_MODES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        {hasFilters && (
          <button onClick={clearFilters} className="btn btn-ghost btn-sm flex items-center gap-1.5">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Results count */}
      {!isLoading && (
        <p className="text-text-faint text-xs mb-4">
          {pagination.total || 0} job{(pagination.total || 0) !== 1 ? 's' : ''} found
        </p>
      )}

      {/* Jobs Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20">
          <Briefcase className="w-12 h-12 text-text-faint mx-auto mb-3" />
          <p className="text-text-muted">No jobs found</p>
          {hasFilters && <button onClick={clearFilters} className="btn btn-ghost btn-sm mt-3">Clear filters</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {jobs.map(job => (
            <JobCard
              key={job._id}
              job={job}
              isAdmin={isAdmin}
              isSelected={selectedJobIds.has(job._id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-ghost btn-sm disabled:opacity-40"
          >← Prev</button>
          <span className="flex items-center px-3 text-sm text-text-muted">
            {page} / {pagination.pages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
            disabled={page === pagination.pages}
            className="btn btn-ghost btn-sm disabled:opacity-40"
          >Next →</button>
        </div>
      )}

      {/* Floating Bottom Action Bar for Admin Bulk Share */}
      {isAdmin && selectedJobIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-bg-card/95 backdrop-blur-md border border-accent-blue/40 shadow-2xl rounded-2xl px-4 py-2.5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="text-xs font-bold text-accent-blue whitespace-nowrap">
            {selectedJobIds.size} Job{selectedJobIds.size > 1 ? 's' : ''} Selected
          </span>
          <div className="h-4 w-px bg-border" />
          <button
            type="button"
            onClick={handleShareSelected}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[#25D366] hover:bg-[#20ba5a] flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
          >
            <WhatsAppIcon className="w-4 h-4 fill-white" />
            Share on WhatsApp
          </button>
          <button
            type="button"
            onClick={handleCopySelected}
            className="btn btn-ghost btn-sm text-xs flex items-center gap-1"
            title="Copy WhatsApp text"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-accent-green" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy Text'}
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-bg-secondary transition-colors"
            title="Deselect all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
