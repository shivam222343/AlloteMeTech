import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Briefcase, X } from 'lucide-react';
import { jobsApi } from '../api';
import JobCard from '../components/jobs/JobCard';
import JobsPremiumBanner from '../components/jobs/JobsPremiumBanner';
import Spinner from '../components/common/Spinner';

const JOB_TYPES = ['Full-time', 'Part-time', 'Internship', 'Contract', 'Freelance'];
const WORK_MODES = ['Remote', 'Hybrid', 'On-site'];

export default function Jobs() {
  const [search, setSearch] = useState('');
  const [jobType, setJobType] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [page, setPage] = useState(1);

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-1">Job Opportunities</h1>
        <p className="text-text-muted text-sm">Curated job listings to help you land your next role</p>
      </div>

      {/* Jobs Premium Banner for Free / Non-Premium Users */}
      <JobsPremiumBanner />

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
          {jobs.map(job => <JobCard key={job._id} job={job} />)}
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
    </div>
  );
}
