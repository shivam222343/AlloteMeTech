import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Spinner from '../../components/common/Spinner';
import { DifficultyBadge } from '../../components/common/Badge';

const COLORS = ['#3B82F6', '#8B5CF6', '#22C55E', '#F59E0B', '#EF4444', '#06B6D4', '#10B981', '#F97316', '#EC4899', '#6366F1'];

const AdminAnalytics = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => adminApi.getAnalytics(),
  });

  const stats = data?.data?.data;

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Solved Problems */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Most Solved Problems</h2>
          {stats?.topSolved?.length > 0 ? (
            <div className="space-y-2">
              {stats.topSolved.map((p, i) => (
                <div key={p._id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-text-faint w-5">{i + 1}.</span>
                    <DifficultyBadge difficulty={p.difficulty} />
                    <span className="text-sm text-text-secondary truncate">{p.title}</span>
                  </div>
                  <span className="text-xs font-medium text-accent-blue ml-2 flex-shrink-0">{p.count} solves</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-text-faint">No data yet</p>}
        </div>

        {/* Popular Companies */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Top Companies by Questions</h2>
          {stats?.popularCompanies?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.popularCompanies.slice(0, 8)} layout="vertical" barSize={12}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip formatter={(v) => [`${v} questions`]} contentStyle={{ background: '#111827', border: '1px solid #2D3748', borderRadius: 6, fontSize: 12 }} />
                <Bar dataKey="totalQuestions" radius={[0, 3, 3, 0]}>
                  {stats.popularCompanies.slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-text-faint">No data yet</p>}
        </div>

        {/* Popular Topics */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Popular Topics</h2>
          {stats?.popularTopics?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {stats.popularTopics.map((t, i) => (
                <span key={t._id} className="badge badge-blue" style={{ opacity: 1 - (i * 0.05) }}>
                  {t.name} <span className="opacity-60">({t.problemCount})</span>
                </span>
              ))}
            </div>
          ) : <p className="text-sm text-text-faint">No data yet</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
