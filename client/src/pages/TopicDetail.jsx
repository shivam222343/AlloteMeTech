import { useState, useCallback, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { topicsApi, progressApi } from '../api';
import { useAuth } from '../context/AuthContext';
import ProblemTable from '../components/problem/ProblemTable';
import ProblemFilters from '../components/problem/ProblemFilters';
import Spinner from '../components/common/Spinner';
import { ArrowLeft, Tag } from 'lucide-react';
import PremiumButton from '../components/common/PremiumButton';

const TopicDetail = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const [filters, setFilters] = useState({ search: '', difficulty: '', sort: 'frequency' });
  const [page, setPage] = useState(1);
  const [progressMap, setProgressMap] = useState({});

  const { data: topicData, isLoading: topicLoading } = useQuery({
    queryKey: ['topic', slug],
    queryFn: () => topicsApi.getOne(slug),
  });

  const { data: problemsData, isLoading: problemsLoading } = useQuery({
    queryKey: ['topic-problems', slug, filters, page],
    queryFn: () => topicsApi.getProblems(slug, { ...filters, page, limit: 50 }),
    keepPreviousData: true,
    enabled: !!user,
  });

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

  const problems = problemsData?.data?.data || [];
  const pagination = problemsData?.data?.pagination;

  if (topicLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
        <div className="skeleton h-8 w-40 rounded" />
        <div className="skeleton h-16 rounded-lg" />
        <div className="skeleton h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      <Link to="/topics" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Topics
      </Link>

      {/* Header */}
      <div className="card p-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center">
          <Tag className="w-5 h-5 text-accent-blue" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary capitalize">{slug?.replace(/-/g, ' ')}</h1>
          <p className="text-sm text-text-muted mt-0.5">{pagination?.total || 0} problems</p>
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
            <p className="text-text-muted text-sm mt-1">Create a free account to access all problems in this topic.</p>
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
                  <p className="text-sm font-bold text-text-primary">Unlock Recent Interview Questions</p>
                  <p className="text-xs text-text-muted">Questions asked in the last 30 days and 60 days are reserved for premium members. Unlock now for just ₹49/year!</p>
                </div>
              </div>
              <PremiumButton />
            </div>
          )}

          {/* Filters */}
          <div className="card p-4">
            <ProblemFilters filters={filters} onChange={(f) => { setFilters(f); setPage(1); }} showTimeRange={false} />
          </div>

          {/* Table */}
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

export default TopicDetail;
