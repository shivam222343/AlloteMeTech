import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { progressApi } from '../api';
import { User, CheckCircle2, Star, Calendar, RotateCcw, Flame, Clock, Mail } from 'lucide-react';
import { DifficultyBadge } from '../components/common/Badge';
import { getInitials, formatDate, formatRelativeTime } from '../utils/helpers';
import Spinner from '../components/common/Spinner';

const StatItem = ({ icon: Icon, label, value, color }) => (
  <div className="flex flex-col items-center gap-1 text-center p-4 card">
    <Icon className={`w-5 h-5 ${color || 'text-text-muted'} mb-1`} />
    <span className={`text-2xl font-bold ${color || 'text-text-primary'}`}>{value ?? 0}</span>
    <span className="text-xs text-text-muted">{label}</span>
  </div>
);

const Profile = () => {
  const { user } = useAuth();

  const { data: progressData, isLoading } = useQuery({
    queryKey: ['user-progress-all'],
    queryFn: () => progressApi.getAll(),
  });

  const { data: favData } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => progressApi.getAll({ status: 'favorite' }),
  });

  const { data: scheduledData } = useQuery({
    queryKey: ['scheduled'],
    queryFn: () => progressApi.getScheduled(),
  });

  const all = progressData?.data?.data?.progress || [];
  const favorites = all.filter((p) => p.isFavorite);
  const solved = all.filter((p) => p.status === 'solved');
  const revision = all.filter((p) => p.status === 'revision');
  const scheduled = scheduledData?.data?.data?.scheduled || [];

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Profile Header */}
      <div className="card p-6">
        <div className="flex items-start gap-4 flex-wrap">
          {user.isPremium ? (
            <div className="premium-avatar-container flex-shrink-0">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-accent-blue/20 flex items-center justify-center text-xl font-semibold text-accent-blue">
                  {getInitials(user.name)}
                </div>
              )}
            </div>
          ) : (
            user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center text-xl font-semibold text-accent-blue flex-shrink-0">
                {getInitials(user.name)}
              </div>
            )
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-text-primary">{user.name}</h1>
              {user.role === 'admin' && <span className="badge badge-blue">Admin</span>}
              {user.isPremium ? (
                <span className="px-2 py-0.5 text-3xs font-extrabold rounded bg-gradient-to-r from-accent-yellow to-amber-500 text-bg-primary uppercase tracking-wider shadow-sm select-none">Premium</span>
              ) : (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('open-premium-modal'))}
                  className="px-2.5 py-0.5 text-3xs font-extrabold rounded bg-gradient-to-r from-accent-yellow to-amber-500 text-bg-primary uppercase tracking-wider hover:opacity-95 shadow transition-all hover:scale-105"
                >
                  Get Premium
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-sm text-text-muted">
              <Mail className="w-3.5 h-3.5" />
              {user.email}
            </div>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-text-faint">
                <Flame className="w-3.5 h-3.5 text-accent-yellow" />
                <span>{user.streak || 0} day streak</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-text-faint">
                <Clock className="w-3.5 h-3.5" />
                <span>Joined {formatDate(user.createdAt)}</span>
              </div>
              {user.isPremium && user.premiumExpiresAt && (
                <div className="flex items-center gap-1.5 text-xs text-text-faint border border-accent-yellow/20 bg-accent-yellow/5 px-2 py-0.5 rounded-full">
                  <span className="text-accent-yellow font-bold">Expires:</span>
                  <span className="text-text-secondary">{formatDate(user.premiumExpiresAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatItem icon={CheckCircle2} label="Solved" value={solved.length} color="text-accent-green" />
        <StatItem icon={Star} label="Favorites" value={favorites.length} color="text-accent-yellow" />
        <StatItem icon={Calendar} label="Scheduled" value={scheduled.length} color="text-accent-blue" />
        <StatItem icon={RotateCcw} label="Revision" value={revision.length} color="text-accent-purple" />
      </div>

      {/* Recent Solved */}
      {isLoading ? (
        <div className="card p-6"><Spinner /></div>
      ) : solved.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Recently Solved</h2>
          <div className="space-y-2">
            {solved.slice(0, 10).map((p) => (
              <div key={p._id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <DifficultyBadge difficulty={p.problem?.difficulty} />
                  <a href={p.problem?.leetcodeUrl} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-text-secondary hover:text-accent-blue transition-colors truncate">
                    {p.problem?.title}
                  </a>
                </div>
                <span className="text-xs text-text-faint whitespace-nowrap ml-2">
                  {p.completedAt ? formatRelativeTime(p.completedAt) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Favorites */}
      {favorites.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-accent-yellow" /> Favorite Problems
          </h2>
          <div className="space-y-2">
            {favorites.slice(0, 10).map((p) => (
              <div key={p._id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <DifficultyBadge difficulty={p.problem?.difficulty} />
                  <a href={p.problem?.leetcodeUrl} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-text-secondary hover:text-accent-blue transition-colors truncate">
                    {p.problem?.title}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;

