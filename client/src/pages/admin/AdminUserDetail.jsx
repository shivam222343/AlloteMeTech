import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api';
import Spinner from '../../components/common/Spinner';
import { DifficultyBadge } from '../../components/common/Badge';
import { getInitials, formatDate, formatRelativeTime } from '../../utils/helpers';
import { CheckCircle2, Calendar, Star, RotateCcw, Flame, Code2, Target, Mail, ArrowLeft, Clock } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="card p-4">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-text-muted mb-1">{label}</p>
        <p className={`text-2xl font-bold ${color || 'text-text-primary'}`}>{value ?? 0}</p>
      </div>
      <Icon className={`w-5 h-5 ${color || 'text-text-muted'} opacity-75`} />
    </div>
  </div>
);

const LeetCodeProgress = ({ stats }) => {
  const easy = stats?.difficultyStats?.easy?.solved || 0;
  const easyTot = stats?.difficultyStats?.easy?.total || 1;
  const medium = stats?.difficultyStats?.medium?.solved || 0;
  const medTot = stats?.difficultyStats?.medium?.total || 1;
  const hard = stats?.difficultyStats?.hard?.solved || 0;
  const hardTot = stats?.difficultyStats?.hard?.total || 1;
  
  const total = easy + medium + hard;
  const allTotal = (stats?.difficultyStats?.easy?.total || 0) + (stats?.difficultyStats?.medium?.total || 0) + (stats?.difficultyStats?.hard?.total || 0) || 1;

  const strokeWidth = 3.5;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75; // 270 degrees
  const gap = 2; // Gap between segments in pixels

  const easyLen = total > 0 ? (easy / total) * (arcLength - 2 * gap) : 0;
  const medLen = total > 0 ? (medium / total) * (arcLength - 2 * gap) : 0;
  const hardLen = total > 0 ? (hard / total) * (arcLength - 2 * gap) : 0;

  const easyOffset = 0;
  const medOffset = easyLen > 0 ? easyLen + gap : 0;
  const hardOffset = medOffset + (medLen > 0 ? medLen + gap : 0);

  return (
    <div className="card p-5 h-full flex flex-col justify-center min-h-[160px]">
      <div className="flex items-center gap-6 justify-center">
        {/* Circular Progress Ring */}
        <div className="relative w-36 h-36 flex-shrink-0">
          <svg className="w-full h-full transform rotate-[135deg]" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--border)" strokeWidth={strokeWidth}
              strokeDasharray={`${arcLength} ${circumference}`} strokeLinecap="round" />
            
            {easyLen > 0 && (
              <circle cx="50" cy="50" r={radius} fill="none" stroke="#00b8a3" strokeWidth={strokeWidth}
                strokeDasharray={`${easyLen} ${circumference}`} strokeLinecap="round" strokeDashoffset={-easyOffset} />
            )}
            
            {medLen > 0 && (
              <circle cx="50" cy="50" r={radius} fill="none" stroke="#ffc01e" strokeWidth={strokeWidth}
                strokeDasharray={`${medLen} ${circumference}`} strokeLinecap="round" strokeDashoffset={-medOffset} />
            )}
            
            {hardLen > 0 && (
              <circle cx="50" cy="50" r={radius} fill="none" stroke="#ff375f" strokeWidth={strokeWidth}
                strokeDasharray={`${hardLen} ${circumference}`} strokeLinecap="round" strokeDashoffset={-hardOffset} />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
            <div className="flex items-baseline gap-[1px]">
              <span className="text-[28px] font-medium text-text-primary tracking-tight leading-none">{total}</span>
              <span className="text-[11px] text-text-muted font-medium leading-none">/{allTotal}</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3 text-[#26a641]" />
              <span className="text-xs text-text-primary font-medium">Solved</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2 w-32">
          <div className="bg-bg-secondary border border-border rounded-md p-2 flex flex-col justify-center items-center h-[52px]">
            <span className="text-xs font-semibold text-[#00b8a3]">Easy</span>
            <span className="text-[13px] font-semibold text-text-primary mt-0.5">{easy}<span className="text-text-muted text-[11px]">/{easyTot}</span></span>
          </div>
          <div className="bg-bg-secondary border border-border rounded-md p-2 flex flex-col justify-center items-center h-[52px]">
            <span className="text-xs font-semibold text-[#ffc01e]">Med.</span>
            <span className="text-[13px] font-semibold text-text-primary mt-0.5">{medium}<span className="text-text-muted text-[11px]">/{medTot}</span></span>
          </div>
          <div className="bg-bg-secondary border border-border rounded-md p-2 flex flex-col justify-center items-center h-[52px]">
            <span className="text-xs font-semibold text-[#ff375f]">Hard</span>
            <span className="text-[13px] font-semibold text-text-primary mt-0.5">{hard}<span className="text-text-muted text-[11px]">/{hardTot}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActivityHeatmap = ({ data = [], streak = 0 }) => {
  if (!data.length) return null;

  const totalSubmissions = data.reduce((sum, d) => sum + d.count, 0);
  const activeDays = data.filter(d => d.count > 0).length;

  const monthsData = [];
  let currentMonthName = null;
  let currentMonthBlocks = [];
  let currentWeek = [];

  data.forEach((day) => {
    const d = new Date(day.date + 'T12:00:00');
    const mName = d.toLocaleString('en-US', { month: 'short' });

    if (mName !== currentMonthName) {
      if (currentMonthName) {
        while (currentWeek.length < 7) currentWeek.push(null);
        currentMonthBlocks.push(currentWeek);
        monthsData.push({ label: currentMonthName, columns: currentMonthBlocks });
      }
      currentMonthName = mName;
      currentMonthBlocks = [];
      currentWeek = Array(d.getDay()).fill(null);
    }

    currentWeek.push(day);

    if (currentWeek.length === 7) {
      currentMonthBlocks.push(currentWeek);
      currentWeek = [];
    }
  });

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    currentMonthBlocks.push(currentWeek);
  }
  if (currentMonthName) {
    monthsData.push({ label: currentMonthName, columns: currentMonthBlocks });
  }

  const getHeatColor = (count) => {
    if (count === 0) return 'bg-bg-hover border border-border/40';
    if (count === 1) return 'bg-accent-green/20 border border-accent-green/30';
    if (count === 2) return 'bg-accent-green/45 border border-accent-green/50';
    if (count === 3) return 'bg-accent-green/70 border border-accent-green/80';
    return 'bg-accent-green border border-accent-green-strong';
  };

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Activity</h2>
          <p className="text-2xs text-text-muted mt-0.5">
            {totalSubmissions} problems solved · {activeDays} active days
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-bg-secondary px-3 py-1.5 rounded-full border border-border">
          <Flame className="w-3.5 h-3.5 text-accent-yellow" />
          <span className="text-xs font-bold text-text-primary">{streak} Streak</span>
        </div>
      </div>

      <div className="flex items-start gap-4 overflow-x-auto admin-scroll pb-2">
        <div className="grid grid-rows-7 gap-[3px] text-[9px] text-text-faint font-semibold h-[93px] pt-[20px] select-none">
          <span>Mon</span>
          <span>Wed</span>
          <span>Fri</span>
        </div>

        <div className="flex gap-[10px]">
          {monthsData.map((month, mIdx) => (
            <div key={mIdx} className="flex flex-col gap-1.5">
              <span className="text-[10px] text-text-faint font-semibold h-4 leading-none select-none">
                {month.columns[0]?.some(x => x && new Date(x.date).getDate() <= 7) ? month.label : ''}
              </span>
              <div className="flex gap-[3px]">
                {month.columns.map((week, wIdx) => (
                  <div key={wIdx} className="grid grid-rows-7 gap-[3px]">
                    {week.map((day, dIdx) => (
                      <div
                        key={dIdx}
                        className={`w-2.5 h-2.5 rounded-sm transition-all duration-300 ${day ? getHeatColor(day.count) : 'opacity-0 pointer-events-none'}`}
                        title={day ? `${day.count} solved on ${formatDate(day.date)}` : ''}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AdminUserDetail = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('solved');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-user-detail', id],
    queryFn: () => adminApi.getUserDetail(id),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data?.data?.data) {
    return (
      <div className="card p-8 text-center max-w-md mx-auto mt-12">
        <p className="text-sm font-semibold text-accent-red">Failed to load user details</p>
        <Link to="/admin/users" className="btn btn-secondary btn-sm mt-4 inline-flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </Link>
      </div>
    );
  }

  const { user, progress, scheduled, stats } = data.data.data;

  // Filter progress lists based on status
  const solvedList = progress.filter((p) => p.status === 'solved');
  const favList = progress.filter((p) => p.isFavorite);
  const revisionList = progress.filter((p) => p.status === 'revision');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header back button */}
      <div className="flex items-center gap-3">
        <Link to="/admin/users" className="btn-icon btn-ghost p-1.5 rounded-full" title="Back to Users list">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-text-primary">User Performance</h1>
          <p className="text-xs text-text-muted">Detailed review of user metrics and progress pipelines</p>
        </div>
      </div>

      {/* User profile details card */}
      <div className="card p-6 theme-transition">
        <div className="flex items-start gap-4 flex-wrap">
          {user.isPremium ? (
            <div className="premium-avatar-container flex-shrink-0" style={{ padding: '3px' }}>
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-accent-blue/20 flex items-center justify-center text-2xl font-bold text-accent-blue">
                  {getInitials(user.name)}
                </div>
              )}
            </div>
          ) : (
            user.avatar ? (
              <img src={user.avatar} alt="" className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center text-2xl font-bold text-accent-blue flex-shrink-0">
                {getInitials(user.name)}
              </div>
            )
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-text-primary">{user.name}</h2>
              <span className={`badge ${user.role === 'admin' ? 'badge-blue' : 'badge-gray'}`}>
                {user.role}
              </span>
              {user.isPremium && (
                <span className="px-2 py-0.5 text-[9px] font-extrabold rounded bg-gradient-to-r from-accent-yellow to-amber-500 text-bg-primary uppercase tracking-wider shadow-sm select-none">
                  👑 Premium
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-1 text-sm text-text-muted">
              <Mail className="w-3.5 h-3.5" />
              {user.email}
            </div>

            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-text-faint">
                <Flame className="w-4 h-4 text-accent-yellow animate-pulse" />
                <span>{user.streak || 0} Day streak</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-text-faint">
                <Clock className="w-4 h-4" />
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

      {/* Grid count cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={CheckCircle2} label="Solved" value={stats.solved} color="text-accent-green" />
        <StatCard icon={Star} label="Favorites" value={stats.favorites} color="text-accent-yellow" />
        <StatCard icon={Calendar} label="Scheduled" value={stats.scheduled} color="text-accent-blue" />
        <StatCard icon={RotateCcw} label="Revision" value={stats.revision} color="text-accent-purple" />
      </div>

      {/* Analytics block: progress ring and heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <LeetCodeProgress stats={stats} />
        </div>
        <div className="lg:col-span-2">
          <ActivityHeatmap data={stats.heatmapData} streak={user.streak} />
        </div>
      </div>

      {/* Tabs section */}
      <div className="card overflow-hidden">
        <div className="border-b border-border bg-bg-secondary/40 flex px-2 overflow-x-auto select-none">
          {[
            { id: 'solved', label: `Solved (${solvedList.length})`, icon: CheckCircle2 },
            { id: 'favorites', label: `Favorites (${favList.length})`, icon: Star },
            { id: 'revision', label: `Revision (${revisionList.length})`, icon: RotateCcw },
            { id: 'scheduled', label: `Scheduled (${scheduled.length})`, icon: Calendar },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                  active
                    ? 'border-accent-blue text-accent-blue bg-bg-card/50'
                    : 'border-transparent text-text-muted hover:text-text-primary'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-5">
          {activeTab === 'solved' && (
            <div className="space-y-3">
              {solvedList.length === 0 ? (
                <p className="text-center py-6 text-xs text-text-faint">No solved problems recorded.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table w-full">
                    <thead>
                      <tr>
                        <th>Problem</th>
                        <th>Difficulty</th>
                        <th>Frequency</th>
                        <th>Solved Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {solvedList.map((p) => (
                        <tr key={p._id}>
                          <td>
                            <a href={p.problem?.leetcodeUrl} target="_blank" rel="noopener noreferrer" className="hover:text-accent-blue transition-colors font-medium text-sm">
                              {p.problem?.title}
                            </a>
                          </td>
                          <td><DifficultyBadge difficulty={p.problem?.difficulty} /></td>
                          <td>{p.problem?.frequency || 0}</td>
                          <td className="text-xs text-text-faint">{p.completedAt ? formatDate(p.completedAt) : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className="space-y-3">
              {favList.length === 0 ? (
                <p className="text-center py-6 text-xs text-text-faint">No favorites added.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table w-full">
                    <thead>
                      <tr>
                        <th>Problem</th>
                        <th>Difficulty</th>
                        <th>Status</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {favList.map((p) => (
                        <tr key={p._id}>
                          <td>
                            <a href={p.problem?.leetcodeUrl} target="_blank" rel="noopener noreferrer" className="hover:text-accent-blue transition-colors font-medium text-sm">
                              {p.problem?.title}
                            </a>
                          </td>
                          <td><DifficultyBadge difficulty={p.problem?.difficulty} /></td>
                          <td><span className="capitalize text-xs font-semibold">{p.status?.replace('_', ' ')}</span></td>
                          <td className="text-xs text-text-muted truncate max-w-[200px]" title={p.notes}>{p.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'revision' && (
            <div className="space-y-3">
              {revisionList.length === 0 ? (
                <p className="text-center py-6 text-xs text-text-faint">No problems in revision.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table w-full">
                    <thead>
                      <tr>
                        <th>Problem</th>
                        <th>Difficulty</th>
                        <th>Revision Count</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revisionList.map((p) => (
                        <tr key={p._id}>
                          <td>
                            <a href={p.problem?.leetcodeUrl} target="_blank" rel="noopener noreferrer" className="hover:text-accent-blue transition-colors font-medium text-sm">
                              {p.problem?.title}
                            </a>
                          </td>
                          <td><DifficultyBadge difficulty={p.problem?.difficulty} /></td>
                          <td>{p.revisionCount || 0}</td>
                          <td className="text-xs text-text-muted truncate max-w-[200px]" title={p.notes}>{p.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'scheduled' && (
            <div className="space-y-3">
              {scheduled.length === 0 ? (
                <p className="text-center py-6 text-xs text-text-faint">No upcoming scheduled reviews.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table w-full">
                    <thead>
                      <tr>
                        <th>Problem</th>
                        <th>Difficulty</th>
                        <th>Scheduled For</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduled.map((p) => (
                        <tr key={p._id}>
                          <td>
                            <a href={p.problem?.leetcodeUrl} target="_blank" rel="noopener noreferrer" className="hover:text-accent-blue transition-colors font-medium text-sm">
                              {p.problem?.title}
                            </a>
                          </td>
                          <td><DifficultyBadge difficulty={p.problem?.difficulty} /></td>
                          <td className="text-xs text-text-faint">{p.scheduledFor ? formatRelativeTime(p.scheduledFor) : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUserDetail;
