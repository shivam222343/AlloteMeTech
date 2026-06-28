import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { progressApi } from '../../api';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, X, RotateCcw, Clock } from 'lucide-react';

const SolvedConfirmationModal = () => {
  const { user } = useAuth();
  const [pending, setPending] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const checkPending = () => {
      const stored = localStorage.getItem('pending_leetcode_problem');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Only prompt if it was clicked within the last 12 hours
          if (Date.now() - parsed.timestamp < 12 * 60 * 60 * 1000) {
            setPending(parsed);
            setIsOpen(true);
          } else {
            localStorage.removeItem('pending_leetcode_problem');
          }
        } catch (e) {
          localStorage.removeItem('pending_leetcode_problem');
        }
      }
    };

    // Check on mount
    checkPending();

    // Check whenever window gains focus
    window.addEventListener('focus', checkPending);
    return () => window.removeEventListener('focus', checkPending);
  }, [user]);

  // Intercept click events on Leetcode links globally to record them
  useEffect(() => {
    if (!user) return;

    const handleGlobalClick = (e) => {
      const anchor = e.target.closest('a');
      if (anchor && anchor.href && anchor.href.includes('leetcode.com')) {
        const problemId = anchor.getAttribute('data-problem-id');
        const problemSlug = anchor.getAttribute('data-problem-slug');
        const problemTitle = anchor.getAttribute('data-problem-title') || anchor.textContent;
        const isAlreadySolved = anchor.getAttribute('data-already-solved') === 'true';
        const problemDifficulty = anchor.getAttribute('data-problem-difficulty');

        // Parse company slug if clicking from a company page
        const match = window.location.pathname.match(/\/companies\/([^/]+)/);
        const companySlug = match ? match[1] : null;

        if ((problemId || problemSlug) && problemTitle) {
          localStorage.setItem('pending_leetcode_problem', JSON.stringify({
            id: problemId || null,
            slug: problemSlug || null,
            title: problemTitle.trim(),
            difficulty: problemDifficulty || null,
            timestamp: Date.now(),
            type: isAlreadySolved ? 'revision' : 'solve',
            companySlug: companySlug
          }));
        }
      }
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [user]);

  // Real-time counter logic
  useEffect(() => {
    if (!isOpen || !pending?.timestamp) return;

    const updateTimer = () => {
      const diffSecs = Math.floor((Date.now() - pending.timestamp) / 1000);
      setElapsedSeconds(Math.max(0, diffSecs));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isOpen, pending]);

  if (!isOpen || !pending) return null;

  const isRevision = pending?.type === 'revision';
  const difficulty = pending?.difficulty || 'Medium';

  const expectedTimeMap = { Easy: 15, Medium: 35, Hard: 45 };
  const expectedTime = expectedTimeMap[difficulty] || 35;

  const formatTime = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleYes = async () => {
    // Authenticity block
    if (elapsedSeconds < 10) {
      toast.error('Solve duration is too short. Please solve the problem on LeetCode first.');
      return;
    }

    try {
      const targetStatus = isRevision ? 'revision' : 'solved';
      const timeSpent = parseFloat((elapsedSeconds / 60).toFixed(2));

      await progressApi.upsert({
        problemId: pending.id || undefined,
        slug: pending.slug || undefined,
        status: targetStatus,
        timeSpent,
        companySlug: pending.companySlug || undefined
      });

      if (isRevision) {
        toast.success(`Moved "${pending.title}" to revision! 🔄`);
      } else {
        toast.success(`Marked "${pending.title}" as solved! 🎉`);
      }
      
      // Invalidate queries to refresh lists / progress counters
      queryClient.invalidateQueries({ queryKey: ['user-progress'] });
      queryClient.invalidateQueries({ queryKey: ['user-progress-all'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['recommendation'] });
    } catch (err) {
      toast.error('Failed to update problem status');
    } finally {
      localStorage.removeItem('pending_leetcode_problem');
      setIsOpen(false);
      setPending(null);
      setElapsedSeconds(0);
    }
  };

  const handleNo = () => {
    localStorage.removeItem('pending_leetcode_problem');
    setIsOpen(false);
    setPending(null);
    setElapsedSeconds(0);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={handleNo} 
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-sm bg-bg-card border border-border rounded-3xl shadow-card-hover overflow-hidden animate-slide-up p-6 theme-transition">
        <button 
          onClick={handleNo} 
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-bg-secondary text-text-muted hover:text-text-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4 pt-2">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${isRevision ? 'bg-accent-purple/10 border-accent-purple/20' : 'bg-accent-green/10 border-accent-green/20'}`}>
            {isRevision ? (
              <RotateCcw className="w-7 h-7 text-accent-purple animate-pulse" />
            ) : (
              <CheckCircle2 className="w-7 h-7 text-accent-green animate-pulse" />
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-text-primary">
              {isRevision ? 'Revise Question?' : 'Solved Question?'}
            </h3>
            <p className="text-xs text-text-muted leading-relaxed px-2">
              {isRevision ? (
                <>Did you want to move <strong className="text-text-primary">"{pending.title}"</strong> to your Revision Queue?</>
              ) : (
                <>Did you solve <strong className="text-text-primary">"{pending.title}"</strong> on LeetCode?</>
              )}
            </p>
          </div>

          {/* Timer & Expected stats panel */}
          <div className="bg-bg-secondary/50 border border-border/60 rounded-2xl p-4 w-full space-y-2.5 text-xs text-left">
            <div className="flex justify-between items-center text-text-muted">
              <span>Expected Time:</span>
              <span className="font-semibold text-text-primary">{expectedTime} mins</span>
            </div>
            <div className="flex justify-between items-center text-text-muted">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-accent-blue" /> Time Spent:
              </span>
              <span className="font-mono font-bold text-accent-blue text-sm">{formatTime(elapsedSeconds)}</span>
            </div>
            {elapsedSeconds < 10 && (
              <p className="text-[10px] text-accent-red/90 leading-tight pt-1 border-t border-border/40 text-center font-medium animate-pulse">
                Please solve it on LeetCode first. Unlocking button in {10 - elapsedSeconds}s.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 w-full pt-2">
            <button 
              onClick={handleNo} 
              className="flex-1 px-4 py-2 text-xs font-semibold rounded-xl border border-border bg-transparent hover:bg-bg-secondary text-text-primary transition-all active:scale-[0.98]"
            >
              No
            </button>
            <button 
              onClick={handleYes} 
              disabled={elapsedSeconds < 10}
              className={`flex-1 px-4 py-2 text-xs font-semibold rounded-xl text-bg-primary hover:opacity-90 transition-all active:scale-[0.98] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 ${isRevision ? 'bg-accent-purple text-white' : 'bg-accent-green'}`}
            >
              {isRevision ? 'Yes, Revise' : 'Yes, Solved'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SolvedConfirmationModal;
