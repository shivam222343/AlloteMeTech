import { useState, useCallback, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { topicsApi, progressApi } from '../api';
import { useAuth } from '../context/AuthContext';
import ProblemTable from '../components/problem/ProblemTable';
import ProblemFilters from '../components/problem/ProblemFilters';
import Spinner from '../components/common/Spinner';
import { ArrowLeft, Tag } from 'lucide-react';

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
    </div>
  );
};

export default TopicDetail;
