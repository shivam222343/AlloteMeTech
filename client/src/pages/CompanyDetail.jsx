import { useState, useCallback, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { companiesApi, progressApi } from '../api';
import { useAuth } from '../context/AuthContext';
import ProblemTable from '../components/problem/ProblemTable';
import ProblemFilters from '../components/problem/ProblemFilters';
import Spinner from '../components/common/Spinner';
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';
import { formatRelativeTime } from '../utils/helpers';
import PremiumButton from '../components/common/PremiumButton';

const DifficultyBar = ({ distribution, total }) => {
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

const CompanyDetail = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const [filters, setFilters] = useState({ search: '', difficulty: '', sort: 'frequency', timeRange: 'all' });
  const [page, setPage] = useState(1);
  const [progressMap, setProgressMap] = useState({});

  const { data: companyData, isLoading: companyLoading } = useQuery({
    queryKey: ['company', slug],
    queryFn: () => companiesApi.getOne(slug),
  });

  const { data: problemsData, isLoading: problemsLoading } = useQuery({
    queryKey: ['company-problems', slug, filters, page],
    queryFn: () => companiesApi.getProblems(slug, { ...filters, page, limit: 50 }),
    keepPreviousData: true,
    enabled: !!user,
  });

  // Load user progress map
  const { data: progressRes } = useQuery({
    queryKey: ['user-progress'],
    queryFn: () => progressApi.getAll(),
    enabled: !!user,
  });

  useEffect(() => {
    if (progressRes?.data?.data?.progress) {
      const map = {};
      progressRes.data.data.progress.forEach((p) => { map[p.problem._id] = p.status; });
      setProgressMap(map);
    }
  }, [progressRes]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const handleProgressUpdate = useCallback((problemId, status) => {
    setProgressMap((prev) => ({ ...prev, [problemId]: status }));
  }, []);

  const company = companyData?.data?.data?.company;
  const problems = problemsData?.data?.data || [];
  const pagination = problemsData?.data?.pagination;

  if (companyLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <div className="skeleton h-8 w-40 rounded" />
        <div className="skeleton h-24 rounded-lg" />
        <div className="skeleton h-96 rounded-lg" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <p className="text-text-muted">Company not found</p>
        <Link to="/companies" className="btn btn-secondary btn-sm mt-4">Back to Companies</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      {/* Breadcrumb */}
      <Link to="/companies" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Companies
      </Link>

      {/* Company Header */}
      <div className="card p-5">
        <div className="flex items-start gap-4">
          {company.logo ? (
            <img src={company.logo} alt={company.name}
              className="w-14 h-14 rounded-lg object-contain flex-shrink-0 bg-white p-1.5"
              onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${company.name[0]}&background=1F2937&color=9CA3AF&size=56`; }}
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-bg-secondary flex items-center justify-center text-xl font-bold text-text-muted flex-shrink-0">
              {company.name[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-xl font-bold text-text-primary">{company.name}</h1>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-sm text-text-muted">{company.totalQuestions} questions</span>
                  {company.updatedAt && (
                    <span className="flex items-center gap-1 text-xs text-text-faint">
                      <RefreshCw className="w-3 h-3" /> Updated {formatRelativeTime(company.updatedAt)}
                    </span>
                  )}
                  {company.industry && (
                    <span className="badge badge-gray">{company.industry}</span>
                  )}
                </div>
              </div>
              {company.website && (
                <a href={company.website} target="_blank" rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm flex-shrink-0">
                  Website <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            <div className="mt-3">
              <DifficultyBar distribution={company.difficultyDistribution} total={company.totalQuestions} />
            </div>
          </div>
        </div>
      </div>

      {/* Problems Section — login gate */}
      {!user ? (
        <div className="card p-10 flex flex-col items-center justify-center text-center gap-4 border-dashed">
          <div className="w-14 h-14 rounded-full bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V7.5a4.5 4.5 0 00-9 0v3M5.25 10.5h13.5A1.5 1.5 0 0120.25 12v7.5a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V12a1.5 1.5 0 011.5-1.5z" />
            </svg>
          </div>
          <div>
            <p className="text-text-primary font-semibold text-base">Sign in to view problems</p>
            <p className="text-text-muted text-sm mt-1">Create a free account to access all {company.totalQuestions} problems for {company.name}.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn btn-primary btn-sm">Sign In</Link>
            <Link to="/signup" className="btn btn-secondary btn-sm">Create Account</Link>
          </div>
        </div>
      ) : (
        <>
          {/* Premium banner promotion if user is not premium */}
          {user && !user.isPremium && (
            <div className="card bg-gradient-to-r from-accent-blue/10 via-accent-purple/10 to-accent-cyan/10 border border-accent-blue/20 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent-yellow/20 flex items-center justify-center flex-shrink-0 text-lg">
                  👑
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">Unlock Recent {company.name} Questions</p>
                  <p className="text-xs text-text-muted">Questions asked in the last 30 days and 60 days are reserved for premium members. Unlock now for just ₹59/year!</p>
                </div>
              </div>
              <PremiumButton />
            </div>
          )}

          {/* Filters */}
          <div className="card p-4">
            <ProblemFilters filters={filters} onChange={(f) => { setFilters(f); setPage(1); }} showTimeRange={true} />
          </div>

          {/* Problem count */}
          {!problemsLoading && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted">
                Showing {problems.length} of {pagination?.total || 0} problems
              </p>
            </div>
          )}

          {/* Problems Table */}
          <div className="card overflow-hidden">
            {problemsLoading ? (
              <div className="p-8 flex justify-center"><Spinner size="lg" /></div>
            ) : (
              <ProblemTable problems={problems} progressMap={progressMap} onProgressUpdate={handleProgressUpdate} />
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="btn btn-secondary btn-sm disabled:opacity-40">Previous</button>
              <span className="text-xs text-text-muted">Page {page} of {pagination.pages}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={page === pagination.pages} className="btn btn-secondary btn-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CompanyDetail;
