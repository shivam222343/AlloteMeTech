import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { topicsApi } from '../api';
import { Tag, ArrowRight } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

const TOPIC_COLORS = [
  { baseClass: 'border-accent-blue/30 text-accent-blue bg-accent-blue/5 hover:bg-accent-blue/10', hex: '#3B82F6' },
  { baseClass: 'border-accent-purple/30 text-accent-purple bg-accent-purple/5 hover:bg-accent-purple/10', hex: '#8B5CF6' },
  { baseClass: 'border-accent-green/30 text-accent-green bg-accent-green/5 hover:bg-accent-green/10', hex: '#22C55E' },
  { baseClass: 'border-accent-yellow/30 text-accent-yellow bg-accent-yellow/5 hover:bg-accent-yellow/10', hex: '#F59E0B' },
  { baseClass: 'border-accent-red/30 text-accent-red bg-accent-red/5 hover:bg-accent-red/10', hex: '#EF4444' },
  { baseClass: 'border-[#06B6D4]/30 text-[#06B6D4] bg-[#06B6D4]/5 hover:bg-[#06B6D4]/10', hex: '#06B6D4' },
];

const Topics = () => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    const handleProgressUpdate = () => {
      queryClient.invalidateQueries(['topics']);
    };
    socket.on('progressUpdated', handleProgressUpdate);
    return () => socket.off('progressUpdated', handleProgressUpdate);
  }, [socket, queryClient]);

  const { data, isLoading } = useQuery({
    queryKey: ['topics'],
    queryFn: () => topicsApi.getAll(),
  });

  const topics = data?.data?.data?.topics || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Tag className="w-6 h-6 text-accent-blue" />
          Topics
        </h1>
        <p className="text-sm text-text-muted mt-1">
          {topics.length} topics covering all major data structures and algorithms
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 16 }).map((_, i) => <div key={i} className="skeleton h-10 w-28 rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tag cloud */}
          <div className="flex flex-wrap gap-2.5">
            {topics.map((t, i) => {
              const theme = TOPIC_COLORS[i % TOPIC_COLORS.length];
              const pct = t.problemCount > 0 ? Math.min(100, Math.round(((t.solvedCount || 0) / t.problemCount) * 100)) : 0;
              return (
                <Link
                  key={t._id}
                  to={`/topics/${t.slug}`}
                  className={`relative isolate overflow-hidden inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-150 ${theme.baseClass}`}
                >
                  {pct > 0 && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 -z-10 transition-all duration-500 opacity-20"
                      style={{ width: `${pct}%`, backgroundColor: theme.hex }} 
                    />
                  )}
                  <span>{t.name}</span>
                  <span className="text-2xs opacity-60 font-normal">({t.problemCount})</span>
                </Link>
              );
            })}
          </div>

          {/* Detailed list */}
          <div className="divider" />
          <div>
            <h2 className="text-sm font-semibold text-text-primary mb-4">All Topics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {topics.map((t) => (
                <Link
                  key={t._id}
                  to={`/topics/${t.slug}`}
                  className="card-hover p-4 flex items-center justify-between group"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary group-hover:text-accent-blue transition-colors">{t.name}</p>
                    <p className="text-xs text-text-muted mt-0.5">{t.problemCount} problems</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-text-faint group-hover:text-accent-blue transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Topics;
