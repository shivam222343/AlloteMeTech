import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { progressApi } from '../api';
import Spinner from '../components/common/Spinner';
import { DifficultyBadge } from '../components/common/Badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { CheckCircle2, Calendar, Star, RotateCcw, Flame, ArrowRight, Code2, Target } from 'lucide-react';
import { formatDate, formatRelativeTime } from '../utils/helpers';
import { useSocket } from '../context/SocketContext';
import ContinueLearningRecommendation from '../components/common/ContinueLearningRecommendation';

const StatCard = ({ icon: Icon, label, value, color, to }) => (
  <Link to={to || '#'} className={`card p-4 hover:border-border-strong transition-colors ${to ? 'cursor-pointer' : ''}`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-text-muted mb-1">{label}</p>
        <p className={`text-2xl font-bold ${color || 'text-text-primary'}`}>{value ?? 0}</p>
      </div>
      <Icon className={`w-5 h-5 ${color || 'text-text-muted'} opacity-70`} />
    </div>
  </Link>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="card px-3 py-2 text-xs shadow-card-hover">
        <p className="text-text-muted">{label}</p>
        <p className="text-accent-blue font-medium">{payload[0].value} solved</p>
      </div>
    );
  }
  return null;
};

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
            {/* Background Arc - uses CSS variable color */}
            <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--border)" strokeWidth={strokeWidth}
              strokeDasharray={`${arcLength} ${circumference}`} strokeLinecap="round" />
            
            {/* Easy Segment */}
            {easyLen > 0 && (
              <circle cx="50" cy="50" r={radius} fill="none" stroke="#00b8a3" strokeWidth={strokeWidth}
                strokeDasharray={`${easyLen} ${circumference}`} strokeLinecap="round" strokeDashoffset={-easyOffset} />
            )}
            
            {/* Medium Segment */}
            {medLen > 0 && (
              <circle cx="50" cy="50" r={radius} fill="none" stroke="#ffc01e" strokeWidth={strokeWidth}
                strokeDasharray={`${medLen} ${circumference}`} strokeLinecap="round" strokeDashoffset={-medOffset} />
            )}
            
            {/* Hard Segment */}
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
            <div className="absolute bottom-2 text-[10px] text-text-muted font-medium">
              0 Attempting
            </div>
          </div>
        </div>

        {/* Legend - adapts fully to light/dark modes */}
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

const ActivityHeatmap = ({ data = [], streak = 0, availableYears = [], selectedYear, onYearChange }) => {
  if (!data.length) return null;

  const totalSubmissions = data.reduce((sum, d) => sum + d.count, 0);
  const activeDays = data.filter(d => d.count > 0).length;

  const monthsData = [];
  
  let currentMonthName = null;
  let currentMonthBlocks = [];
  let currentWeek = [];

  data.forEach((day, index) => {
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
    monthsData.push({ label: currentMonthName, columns: currentMonthBlocks });
  }

  const getColor = (count) => {
    if (!count) return 'var(--bg-secondary)';
    if (count <= 1) return '#0e4429';
    if (count <= 3) return '#006d32';
    if (count <= 5) return '#26a641';
    return '#39d353';
  };

  return (
    <div className="card p-5 overflow-hidden">
      <div className="flex justify-between items-end mb-3">
        <h2 className="text-[15px] text-text-primary flex items-baseline gap-1.5">
          <span className="font-semibold">{totalSubmissions}</span> <span className="text-text-muted text-sm">submissions in {selectedYear}</span>
        </h2>
        <div className="flex items-center gap-4">
          <div className="text-xs text-text-muted flex gap-4">
            <span>Total active days: <span className="text-text-primary font-medium">{activeDays}</span></span>
            <span>Max streak: <span className="text-text-primary font-medium">{streak}</span></span>
          </div>
          <select 
            value={selectedYear} 
            onChange={(e) => onYearChange(e.target.value)}
            className="input text-xs py-1 px-2 h-7 min-h-0 bg-bg-secondary cursor-pointer"
          >
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="overflow-x-auto no-scrollbar pb-2">
        <div className="flex items-start gap-2 min-w-max pt-1">
          <div className="grid grid-rows-7 gap-[3px] text-[10px] text-text-muted pr-1 mb-[22px]">
            <div className="h-[10px] leading-[10px]">Sun</div>
            <div className="h-[10px] leading-[10px]">Mon</div>
            <div className="h-[10px] leading-[10px]">Tue</div>
            <div className="h-[10px] leading-[10px]">Wed</div>
            <div className="h-[10px] leading-[10px]">Thu</div>
            <div className="h-[10px] leading-[10px]">Fri</div>
            <div className="h-[10px] leading-[10px]">Sat</div>
          </div>
          
          <div className="flex gap-[12px]">
            {monthsData.map((m, mIdx) => (
              <div key={mIdx} className="flex flex-col">
                <div className="flex gap-[3px]">
                  {m.columns.map((col, cIdx) => (
                    <div key={cIdx} className="grid grid-rows-7 gap-[3px]">
                      {col.map((day, dIdx) => (
                        <div
                          key={dIdx}
                          className="w-[11px] h-[11px] rounded-[2px] relative cursor-pointer hover:scale-[1.3] hover:z-10 transition-all duration-200 hover:ring-1 hover:ring-white/30 border"
                          style={{ 
                            backgroundColor: day ? getColor(day.count) : 'var(--bg-secondary)',
                            borderColor: 'var(--border-subtle)'
                          }}
                          title={day ? `${day.count} submissions on ${new Date(day.date).toLocaleDateString()}` : undefined}
                        />
                      ))}
                    </div>
                  ))}
                </div>
                <span className="text-[10px] text-text-muted mt-2 text-center w-full block">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
const Dashboard = () => {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    const handleProgressUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    };
    socket.on('progressUpdated', handleProgressUpdate);
    return () => socket.off('progressUpdated', handleProgressUpdate);
  }, [socket, queryClient]);

  const joinYear = user?.createdAt ? new Date(user.createdAt).getFullYear() : currentYear;
  const availableYears = [];
  for (let y = currentYear; y >= joinYear; y--) {
    availableYears.push(y.toString());
  }

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats', selectedYear],
    queryFn: () => progressApi.getDashboard(selectedYear),
    refetchInterval: 60000,
  });

  const { data: scheduledData } = useQuery({
    queryKey: ['scheduled'],
    queryFn: () => progressApi.getScheduled(),
  });

  const stats = data?.data?.data;
  const scheduled = scheduledData?.data?.data?.scheduled || [];

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-lg" />)}
        </div>
        <div className="skeleton h-48 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-muted mt-0.5">Welcome back, {user?.name?.split(' ')[0]}</p>
        </div>
        <Link to="/companies" className="btn btn-primary btn-sm">
          Continue Practicing <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <ContinueLearningRecommendation />

      {/* Dashboard Top Row (Progress & Stats) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <LeetCodeProgress stats={stats} />
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={CheckCircle2} label="Problems Solved" value={stats?.solved} color="text-accent-green" to="/problems?status=solved" />
          <StatCard icon={Calendar} label="Scheduled" value={stats?.scheduled} color="text-accent-blue" to="/schedule" />
          <StatCard icon={Star} label="Favorites" value={stats?.favorites} color="text-accent-yellow" to="/problems?isFavorite=true" />
          <StatCard icon={RotateCcw} label="Revision Queue" value={stats?.revision} color="text-accent-purple" to="/problems?status=revision" />
        </div>
      </div>

      <ActivityHeatmap 
        data={stats?.heatmapData} 
        streak={user?.streak || 0} 
        availableYears={availableYears}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Weekly Chart */}
        <div className="lg:col-span-2 card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Weekly Progress</h2>
          {stats?.weeklyProgress?.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={stats.weeklyProgress} barSize={20}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={25} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.05)' }} />
                <Bar dataKey="count" fill="#3B82F6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-text-faint text-sm">
              No activity yet this week
            </div>
          )}
        </div>

        {/* Streak */}
        <div className="card p-5 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-accent-yellow/10 border border-accent-yellow/20 flex items-center justify-center">
            <Flame className="w-7 h-7 text-accent-yellow" />
          </div>
          <div>
            <p className="text-3xl font-bold text-text-primary">{user?.streak || 0}</p>
            <p className="text-sm text-text-muted">Day Streak</p>
          </div>
          <p className="text-xs text-text-faint">Keep it going! Solve at least one problem daily.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Scheduled */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Upcoming Schedule</h2>
            <Calendar className="w-4 h-4 text-text-faint" />
          </div>
          {scheduled.length === 0 ? (
            <div className="text-center py-8 text-text-faint text-xs">
              <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No problems scheduled. Add some from the company pages.
            </div>
          ) : (
            <div className="space-y-2">
              {scheduled.map(({ problem, scheduledFor }) => (
                <div key={problem._id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <DifficultyBadge difficulty={problem.difficulty} />
                    <a href={problem.leetcodeUrl} target="_blank" rel="noopener noreferrer"
                      data-problem-id={problem._id}
                      data-problem-title={problem.title}
                      data-problem-difficulty={problem.difficulty}
                      data-already-solved={false}
                      className="text-sm text-text-secondary hover:text-accent-blue truncate transition-colors">
                      {problem.title}
                    </a>
                  </div>
                  <span className="text-xs text-text-faint whitespace-nowrap ml-2">{formatRelativeTime(scheduledFor)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Recent Activity</h2>
            <Code2 className="w-4 h-4 text-text-faint" />
          </div>
          {!stats?.recentActivity?.length ? (
            <div className="text-center py-8 text-text-faint text-xs">
              <Code2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No activity yet. Start solving problems!
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-2">
              {stats.recentActivity.map((act) => {
                const problem = act.problem;
                const completedAt = act.completedAt;
                const timeSpent = act.timeSpent;
                return (
                  <div key={problem._id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-accent-green flex-shrink-0" />
                      <DifficultyBadge difficulty={problem.difficulty} />
                      <span className="text-sm text-text-secondary truncate">{problem.title}</span>
                      {timeSpent > 0 && (
                        <span className="text-2xs text-text-faint whitespace-nowrap ml-1 bg-bg-secondary px-1.5 py-0.5 rounded border border-border/40 font-medium text-text-muted">
                          took {timeSpent < 1 ? `${Math.round(timeSpent * 60)}s` : `${Math.round(timeSpent)}m`}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-text-faint whitespace-nowrap ml-2">{formatRelativeTime(completedAt)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

