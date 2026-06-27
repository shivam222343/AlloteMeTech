import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api';
import { Users, Building2, Code2, Tag, TrendingUp, Activity } from 'lucide-react';
import Spinner from '../../components/common/Spinner';

const KpiCard = ({ icon: Icon, label, value, color = 'text-accent-blue' }) => (
  <div className="card p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-text-muted mb-1">{label}</p>
        <p className="text-3xl font-bold text-text-primary">{value ?? '—'}</p>
      </div>
      <Icon className={`w-5 h-5 ${color} opacity-70`} />
    </div>
  </div>
);

const AdminDashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats(),
  });

  const stats = data?.data?.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Admin Dashboard</h1>
        <p className="text-sm text-text-muted mt-0.5">Overview of the platform</p>
      </div>

      {isLoading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard icon={Users} label="Total Users" value={stats?.users} color="text-accent-blue" />
          <KpiCard icon={Activity} label="Active Users (7d)" value={stats?.activeUsers} color="text-accent-green" />
          <KpiCard icon={Building2} label="Companies" value={stats?.companies} color="text-accent-purple" />
          <KpiCard icon={Code2} label="Problems" value={stats?.problems} color="text-accent-yellow" />
          <KpiCard icon={Tag} label="Topics" value={stats?.topics} color="text-accent-cyan" />
        </div>
      )}

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent-blue" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Add Company', to: '/admin/companies' },
            { label: 'Add Problem', to: '/admin/problems' },
            { label: 'Add Topic', to: '/admin/topics' },
            { label: 'Manage Users', to: '/admin/users' },
          ].map(({ label, to }) => (
            <a key={to} href={to}
              className="btn btn-secondary btn-sm justify-center">{label}</a>
          ))}
        </div>
      </div>
      <div className="card p-5 mt-6 border border-accent-blue/20 bg-accent-blue/5">
        <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent-blue" />
          System Actions
        </h2>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (window.confirm('This will trigger a full GitHub sync. It may take a few minutes. Continue?')) {
                const toastId = import('react-hot-toast').then(m => m.default.loading('Starting GitHub Sync...'));
                adminApi.syncGithub()
                  .then(async () => {
                    const toast = await import('react-hot-toast');
                    toast.default.success('GitHub Sync completed successfully!', { id: await toastId });
                  })
                  .catch(async (err) => {
                    const toast = await import('react-hot-toast');
                    toast.default.error(err.response?.data?.message || 'Sync failed', { id: await toastId });
                  });
              }
            }}
            className="btn btn-primary btn-sm"
          >
            Manual GitHub Sync
          </button>
          <p className="text-xs text-text-muted">Fetches latest company-wise problems from GitHub repository.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
