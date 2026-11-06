import { useState, useCallback, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { companiesApi, progressApi } from '../api';
import { useAuth } from '../context/AuthContext';
import ProblemTable from '../components/problem/ProblemTable';
import ProblemFilters from '../components/problem/ProblemFilters';
import Spinner from '../components/common/Spinner';
import {
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  Briefcase,
  Code2,
  MapPin,
  Banknote,
  Search,
  Filter,
  Calendar,
  Clock,
  Play,
  X,
  Radio,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { formatRelativeTime } from '../utils/helpers';
import PremiumButton from '../components/common/PremiumButton';
import JobsPremiumBanner from '../components/jobs/JobsPremiumBanner';
import { useJobApply } from '../components/jobs/useJobApply';
import toast from 'react-hot-toast';

const DATE_OPTIONS = [
  { value: '2', label: 'Last 2 Days (Recommended)' },
  { value: '7', label: 'Last 1 Week' },
  { value: '14', label: 'Last 2 Weeks' },
  { value: '30', label: 'Last 1 Month' },
  { value: 'all', label: 'All Available Roles' },
];

const EXPERIENCE_OPTIONS = [
  { value: 'all', label: 'All Experience Levels' },
  { value: 'fresher_intern', label: 'Fresher / Internship (0 yr)' },
  { value: '0_1', label: 'Entry Level (0 - 1 yr)' },
  { value: '1_3', label: 'Mid-Level (1 - 3 yrs)' },
];

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Roles (Tech & Non-Tech)' },
  { value: 'Tech', label: 'Tech Only 💻' },
  { value: 'Non-Tech', label: 'Non-Tech Only 💼' },
];

const DifficultyBar = ({ distribution }) => {
  const items = [
    { label: 'Easy', count: distribution?.Easy || 0, color: 'bg-accent-green' },
    { label: 'Medium', count: distribution?.Medium || 0, color: 'bg-accent-yellow' },
    { label: 'Hard', count: distribution?.Hard || 0, color: 'bg-accent-red' },
  ];
  return (
    <div className="flex items-center gap-4">
      {items.map(({ label, count, color }) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${color}`} />
          <span className="text-xs text-text-muted">{label}</span>
          <span className="text-xs font-medium text-text-secondary">{count}</span>
        </div>
      ))}
    </div>
  );
};

export default function CompanyDetail() {
  const { slug } = useParams();
  const { user, isAdmin } = useAuth();
  const { hasReachedLimit, handleApply } = useJobApply();
  const qc = useQueryClient();

  // Active Tab: 'jobs' (Career Board) or 'problems' (Interview Prep)
  const [activeTab, setActiveTab] = useState('jobs');

  // Job Filters
  const [jobSearch, setJobSearch] = useState('');
  const [jobWorkMode, setJobWorkMode] = useState('all');
  const [jobCategory, setJobCategory] = useState('all');
  const [jobPage, setJobPage] = useState(1);

  // Sync Modal State (for Admin)
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncOptions, setSyncOptions] = useState({
    postedWithinDays: '2',
    experienceFilter: 'all',
    categoryFilter: 'all',
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // LeetCode Problem Filters
  const [filters, setFilters] = useState({ search: '', difficulty: '', sort: 'frequency', timeRange: 'all' });
  const [problemPage, setProblemPage] = useState(1);
  const [progressMap, setProgressMap] = useState({});

  // 1. Fetch Company Info
  const { data: companyData, isLoading: companyLoading } = useQuery({
    queryKey: ['company', slug],
    queryFn: () => companiesApi.getOne(slug),
  });

  const company = companyData?.data?.data?.company;

  // Set default tab based on whether company has questions or jobs
  useEffect(() => {
    if (company && company.totalQuestions > 0 && (!company.openRoles || company.openRoles === 0)) {
      setActiveTab('problems');
    }
  }, [company]);

  // 2. Fetch Company Jobs (Career Board)
  const { data: jobsRes, isLoading: jobsLoading, refetch: refetchJobs } = useQuery({
    queryKey: ['company-jobs', slug, { search: jobSearch, workMode: jobWorkMode, category: jobCategory, page: jobPage }],
    queryFn: () =>
      companiesApi.getJobs(slug, {
        search: jobSearch,
        workMode: jobWorkMode,
        category: jobCategory,
        page: jobPage,
        limit: 20,
      }),
    keepPreviousData: true,
  });

  const jobsList = jobsRes?.data?.data || [];
  const jobsPagination = jobsRes?.data?.pagination || { page: 1, limit: 20, total: 0, pages: 1 };

  // 3. Fetch Problems (Interview Prep)
  const { data: problemsData, isLoading: problemsLoading } = useQuery({
    queryKey: ['company-problems', slug, filters, problemPage],
    queryFn: () => companiesApi.getProblems(slug, { ...filters, page: problemPage, limit: 50 }),
    keepPreviousData: true,
    enabled: !!user && activeTab === 'problems',
  });

  const problems = problemsData?.data?.data || [];
  const problemsPagination = problemsData?.data?.pagination;

  // 4. User Progress
  const { data: progressRes } = useQuery({
    queryKey: ['user-progress'],
    queryFn: () => progressApi.getAll(),
    enabled: !!user && activeTab === 'problems',
  });

  useEffect(() => {
    if (progressRes?.data?.data?.progress) {
      const map = {};
      progressRes.data.data.progress.forEach((p) => {
        map[p.problem._id] = p.status;
      });
      setProgressMap(map);
    }
  }, [progressRes]);

  const handleProgressUpdate = useCallback((problemId, status) => {
    setProgressMap((prev) => ({ ...prev, [problemId]: status }));
  }, []);

  // Admin Single Sync Trigger
  const handleStartSync = async () => {
    if (!company) return;
    setIsSyncing(true);
    try {
      const res = await companiesApi.syncCompany(company._id || company.slug, syncOptions);
      const data = res.data?.data;
      toast.success(
        `Successfully synced ${company.name}! +${data?.saved || 0} new jobs added (${data?.skippedDuplicates || 0} duplicates skipped).`,
        { duration: 5000 }
      );
      setShowSyncModal(false);
      qc.invalidateQueries(['company', slug]);
      qc.invalidateQueries(['company-jobs', slug]);
      refetchJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  if (companyLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <div className="skeleton h-8 w-40 rounded" />
        <div className="skeleton h-32 rounded-xl" />
        <div className="skeleton h-96 rounded-xl" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <Building2 className="w-12 h-12 text-text-faint mx-auto opacity-40 mb-3" />
        <p className="text-text-muted font-medium">Company not found in directory</p>
        <Link to="/companies" className="btn btn-secondary btn-sm mt-4">
          Back to Directory
        </Link>
      </div>
    );
  }

  const firstChar = (company.name || 'C').charAt(0).toUpperCase();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
      <Link
        to="/companies"
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-text-muted hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Companies Directory
      </Link>

      {/* ── Company Hero Header (Greenhouse / Ashby Portal style) ───────────── */}
      <div className="card p-6 border-border relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            {/* Logo */}
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-bg-secondary border border-border flex items-center justify-center flex-shrink-0 p-2 shadow-sm">
              {company.logo ? (
                <img
                  src={company.logo}
                  alt={company.name}
                  className={`w-full h-full object-contain ${company.hasWhiteBg ? 'bg-white' : ''}`}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-2xl font-bold text-accent-blue select-none">
                  {firstChar}
                </span>
              )}
            </div>

            {/* Title & Meta */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-text-primary tracking-tight">
                  {company.name}
                </h1>
                {company.platform && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-accent-blue/10 text-accent-blue border border-accent-blue/20 capitalize">
                    {company.platform} Career Board
                  </span>
                )}
                {company.isPopular && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent-yellow/15 text-accent-yellow font-bold">
                    Featured
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
                {company.industry && (
                  <span className="px-2 py-0.5 rounded bg-bg-secondary text-text-secondary">
                    {company.industry}
                  </span>
                )}
                {company.openRoles > 0 && (
                  <span className="font-semibold text-accent-green">
                    {company.openRoles} Open Roles
                  </span>
                )}
                {company.totalQuestions > 0 && (
                  <span>{company.totalQuestions} Interview Problems</span>
                )}
                {company.lastSyncAt && (
                  <span className="text-text-faint flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Last Synced{' '}
                    {formatRelativeTime(company.lastSyncAt)}
                  </span>
                )}
              </div>

              {company.description && (
                <p className="text-xs text-text-muted line-clamp-2 max-w-2xl pt-1">
                  {company.description}
                </p>
              )}
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            {/* Admin Sync Button */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowSyncModal(true)}
                className="btn btn-primary btn-sm flex items-center gap-2 shadow-sm"
                title="Fetch latest open roles directly from ATS API"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync Latest Jobs</span>
              </button>
            )}

            {/* Admin-Only External Links: Hide from free/regular users so they don't bypass AlloteMe */}
            {isAdmin && company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm flex items-center gap-1.5"
              >
                <span>Company Website</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {isAdmin && company.boardUrl && (
              <a
                href={company.boardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm flex items-center gap-1.5"
              >
                <span>Official ATS Board</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Difficulty Distribution if problem counts exist */}
        {company.totalQuestions > 0 && (
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between flex-wrap gap-3">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Interview Questions Breakdown:
            </span>
            <DifficultyBar distribution={company.difficultyDistribution} />
          </div>
        )}
      </div>

      {/* ── Tabs Navigation: Open Jobs vs Interview Prep ────────────────────── */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'jobs'
              ? 'border-accent-blue text-accent-blue'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Open Jobs ({jobsPagination.total || jobsList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('problems')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'problems'
              ? 'border-accent-blue text-accent-blue'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Interview Problems ({company.totalQuestions || 0})</span>
        </button>
      </div>

      {/* ── TAB 1: Open Jobs & Careers (Greenhouse style list) ───────────────── */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          {/* Jobs Premium Banner & Daily Limit Counter for Free Users */}
          <JobsPremiumBanner />

          {/* Search & Work Mode Filters */}
          <div className="card p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={jobSearch}
                onChange={(e) => {
                  setJobSearch(e.target.value);
                  setJobPage(1);
                }}
                placeholder={`Search open roles at ${company.name} by title or department...`}
                className="input pl-9 w-full text-xs sm:text-sm"
              />
              {jobSearch && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-primary"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={jobWorkMode}
              onChange={(e) => {
                setJobWorkMode(e.target.value);
                setJobPage(1);
              }}
              className="input text-xs sm:text-sm py-1.5"
            >
              <option value="all">Work Mode: All</option>
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="On-site">On-site</option>
            </select>

            <select
              value={jobCategory}
              onChange={(e) => {
                setJobCategory(e.target.value);
                setJobPage(1);
              }}
              className="input text-xs sm:text-sm py-1.5"
            >
              <option value="all">Category: All</option>
              <option value="Tech">Tech Roles</option>
              <option value="Non-Tech">Non-Tech</option>
            </select>
          </div>

          {/* Job List */}
          {jobsLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <Spinner size="lg" />
              <p className="text-xs text-text-muted">Loading open roles...</p>
            </div>
          ) : jobsList.length === 0 ? (
            <div className="card p-10 text-center space-y-3">
              <Briefcase className="w-12 h-12 text-text-faint mx-auto opacity-40" />
              <p className="text-sm font-semibold text-text-primary">
                No active jobs currently listed in DB for {company.name}
              </p>
              <p className="text-xs text-text-muted max-w-md mx-auto">
                {company.openRoles > 0
                  ? `There are ${company.openRoles} open positions on their ATS portal. Click "Sync Latest Jobs" to fetch them now.`
                  : 'Check back soon or visit their official ATS board directly.'}
              </p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowSyncModal(true)}
                  className="btn btn-primary btn-sm mx-auto flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync Latest Jobs for {company.name}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {jobsList.map((job) => {
                const applyUrl = job.applyLink || job.sourceUrl || company.boardUrl;
                return (
                  <div
                    key={job._id}
                    className="card p-4 hover:border-accent-blue/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center p-1">
                          {company.logo ? (
                            <img
                              src={company.logo}
                              alt={company.name}
                              className={`w-full h-full object-contain ${company.hasWhiteBg ? 'bg-white' : ''}`}
                            />
                          ) : (
                            <span className="text-base font-bold text-accent-blue select-none">
                              {(company.name?.trim()?.charAt(0) || 'C').toUpperCase()}
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

                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            to={`/jobs/${job.slug}`}
                            className="text-base font-bold text-text-primary hover:text-accent-blue transition-colors line-clamp-1"
                          >
                            {job.title}
                          </Link>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                              job.category === 'Non-Tech'
                                ? 'text-purple-400 bg-purple-500/10 border-purple-500/20'
                                : 'text-accent-blue bg-accent-blue/10 border-accent-blue/20'
                            }`}
                          >
                            {job.category === 'Non-Tech' ? '💼 Non-Tech' : '💻 Tech'}
                          </span>
                        </div>

                      <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
                        <span className="font-medium text-text-secondary">{job.jobType}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-text-faint" />
                          {job.location || 'Remote'} ({job.workMode})
                        </span>
                        {job.salary && (
                          <>
                            <span>·</span>
                            <span className="text-accent-green font-semibold flex items-center gap-1">
                              <Banknote className="w-3 h-3" /> {job.salary}
                            </span>
                          </>
                        )}
                        <span>·</span>
                        {isAdmin ? (
                          <span className="text-text-faint">
                            Posted {formatRelativeTime(job.postedAt || job.createdAt)} · <span className="text-accent-blue font-medium">{formatRelativeTime(job.scrapedAt || job.createdAt)}</span>
                          </span>
                        ) : (
                          <span className="text-text-faint">
                            {formatRelativeTime(job.scrapedAt || job.createdAt)}
                          </span>
                        )}
                      </div>

                      {job.tags && job.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                          {job.tags.slice(0, 4).map((t, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded bg-bg-secondary text-text-faint"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link
                        to={`/jobs/${job.slug}`}
                        className="btn btn-secondary btn-sm text-xs"
                      >
                        View Details
                      </Link>
                      {job.isLocked ? (
                        <button
                          type="button"
                          onClick={() => {
                            window.dispatchEvent(
                              new CustomEvent('open-premium-modal', {
                                detail: {
                                  message: 'Unlock latest jobs! Free users can only access the 5 oldest archived jobs per company. Upgrade to Premium to instantly apply to all newly posted jobs!',
                                },
                              })
                            );
                          }}
                          className="btn btn-sm text-xs px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold hover:brightness-110 shadow-sm flex items-center gap-1 cursor-pointer rounded-lg"
                          title="Locked for free users. Upgrade to Premium to apply."
                        >
                          <span>Take Subscription</span>
                          <span className="text-xs">👑</span>
                        </button>
                      ) : applyUrl ? (
                        <button
                          type="button"
                          onClick={(e) => handleApply(e, job)}
                          className="btn btn-primary btn-sm text-xs flex items-center gap-1.5"
                          title={hasReachedLimit ? 'Daily limit reached (5/5). Upgrade to Premium to apply.' : 'Apply Directly'}
                        >
                          <span>Apply Directly</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Job Pagination */}
          {jobsPagination.pages > 1 && (
            <div className="flex items-center justify-between text-xs text-text-muted pt-2">
              <span>
                Page {jobsPagination.page} of {jobsPagination.pages} ({jobsPagination.total} roles)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={jobsPagination.page <= 1}
                  onClick={() => setJobPage((p) => Math.max(1, p - 1))}
                  className="btn btn-secondary btn-xs"
                >
                  Previous
                </button>
                <button
                  disabled={jobsPagination.page >= jobsPagination.pages}
                  onClick={() => setJobPage((p) => Math.min(jobsPagination.pages, p + 1))}
                  className="btn btn-secondary btn-xs"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Interview Problems (LeetCode questions) ──────────────────── */}
      {activeTab === 'problems' && (
        <div className="space-y-4">
          {!user ? (
            <div className="card p-10 flex flex-col items-center justify-center text-center gap-4 border-dashed">
              <div className="w-14 h-14 rounded-full bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center">
                <Code2 className="w-7 h-7 text-accent-blue" />
              </div>
              <div>
                <p className="text-text-primary font-semibold text-base">Sign in to view problems</p>
                <p className="text-text-muted text-sm mt-1">
                  Create a free account to access all {company.totalQuestions || 0} problems for {company.name}.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link to="/login" className="btn btn-primary btn-sm">
                  Sign In
                </Link>
                <Link to="/signup" className="btn btn-secondary btn-sm">
                  Create Account
                </Link>
              </div>
            </div>
          ) : (
            <>
              {user && !user.isPremium && (
                <div className="card bg-gradient-to-r from-accent-blue/10 via-accent-purple/10 to-accent-cyan/10 border border-accent-blue/20 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent-yellow/20 flex items-center justify-center flex-shrink-0 text-lg">
                      👑
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-primary">
                        Unlock Recent {company.name} Questions
                      </p>
                      <p className="text-xs text-text-muted">
                        Questions asked in the last 30 and 60 days are reserved for premium members. Unlock now
                        for just ₹59/year!
                      </p>
                    </div>
                  </div>
                  <PremiumButton />
                </div>
              )}

              {/* Filters */}
              <div className="card p-4">
                <ProblemFilters
                  filters={filters}
                  onChange={(f) => {
                    setFilters(f);
                    setProblemPage(1);
                  }}
                  showTimeRange={true}
                />
              </div>

              {/* Problems Table */}
              <div className="card overflow-hidden">
                {problemsLoading ? (
                  <div className="p-8 flex justify-center">
                    <Spinner size="lg" />
                  </div>
                ) : problems.length === 0 ? (
                  <div className="p-12 text-center text-text-muted text-sm">
                    No interview questions found matching the selected filters.
                  </div>
                ) : (
                  <ProblemTable
                    problems={problems}
                    progressMap={progressMap}
                    onProgressUpdate={handleProgressUpdate}
                  />
                )}
              </div>

              {/* Pagination */}
              {problemsPagination && problemsPagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setProblemPage((p) => p - 1)}
                    disabled={problemPage === 1}
                    className="btn btn-secondary btn-sm disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-text-muted">
                    Page {problemPage} of {problemsPagination.pages}
                  </span>
                  <button
                    onClick={() => setProblemPage((p) => p + 1)}
                    disabled={problemPage === problemsPagination.pages}
                    className="btn btn-secondary btn-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Modal: Scraping Requirements Filter Modal (For Admin) ──────────── */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !isSyncing && setShowSyncModal(false)}
          />
          <div className="relative bg-bg-card border border-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-bg-secondary/40">
              <div className="flex items-center gap-2">
                <RefreshCw className={`w-5 h-5 text-accent-blue ${isSyncing ? 'animate-spin' : ''}`} />
                <h3 className="text-sm font-bold text-text-primary">
                  Sync Jobs: {company.name}
                </h3>
              </div>
              {!isSyncing && (
                <button
                  onClick={() => setShowSyncModal(false)}
                  className="p-1 rounded text-text-muted hover:text-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-text-muted">
                Choose the filter parameters to crawl and parse postings from {company.name} ({company.platform || 'ATS'}):
              </p>

              {/* Date Filter */}
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  📅 Jobs Posted Within:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {DATE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={isSyncing}
                      onClick={() => setSyncOptions((o) => ({ ...o, postedWithinDays: opt.value }))}
                      className={`p-2.5 rounded-lg border text-xs text-left transition-all ${
                        syncOptions.postedWithinDays === opt.value
                          ? 'border-accent-blue bg-accent-blue/10 text-accent-blue font-semibold ring-1 ring-accent-blue'
                          : 'border-border bg-bg-secondary/40 text-text-secondary hover:border-border/80'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Experience Filter */}
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  🎓 Experience Level:
                </label>
                <select
                  disabled={isSyncing}
                  value={syncOptions.experienceFilter}
                  onChange={(e) =>
                    setSyncOptions((o) => ({ ...o, experienceFilter: e.target.value }))
                  }
                  className="input w-full text-xs"
                >
                  {EXPERIENCE_OPTIONS.map((exp) => (
                    <option key={exp.value} value={exp.value}>
                      {exp.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  💼 Category:
                </label>
                <select
                  disabled={isSyncing}
                  value={syncOptions.categoryFilter}
                  onChange={(e) =>
                    setSyncOptions((o) => ({ ...o, categoryFilter: e.target.value }))
                  }
                  className="input w-full text-xs"
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2 bg-bg-secondary/30">
              <button
                type="button"
                disabled={isSyncing}
                onClick={() => setShowSyncModal(false)}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSyncing}
                onClick={handleStartSync}
                className="btn btn-primary btn-sm flex items-center gap-2"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Syncing Roles...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start Scrape</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
