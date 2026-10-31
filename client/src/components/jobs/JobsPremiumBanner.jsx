import { Sparkles, Zap, Lock, ChevronRight } from 'lucide-react';
import { useJobApply } from './useJobApply';

export default function JobsPremiumBanner() {
  const { isPremium, remaining, appliedCount, hasReachedLimit } = useJobApply();

  // If user is already premium, hide the upgrade banner
  if (isPremium) {
    return null;
  }

  const handleOpenUpgrade = () => {
    window.dispatchEvent(
      new CustomEvent('open-premium-modal', {
        detail: {
          message: hasReachedLimit
            ? 'Daily limit reached (5/5). Free users can apply to 5 jobs daily. Upgrade to Premium for unlimited daily applications!'
            : 'Upgrade to Jobs Premium for unlimited applications every day & automation!',
        },
      })
    );
  };

  const safeRemaining = Math.max(0, typeof remaining === 'number' ? remaining : 5);
  const safeApplied = Math.min(5, Math.max(0, typeof appliedCount === 'number' ? appliedCount : 0));

  return (
    <div className="relative mb-6 rounded-2xl border border-accent-purple/35 bg-gradient-to-r from-accent-purple/15 via-bg-card to-amber-500/10 p-3.5 sm:p-4 shadow-[0_4px_20px_rgba(139,92,246,0.12)] hover:border-accent-purple/60 transition-all duration-300">
      {/* Golden Glowing Spark */}
      <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_0_10px_#fbbf24] animate-pulse" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        {/* Left: Crown Icon + Title + Features */}
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          {/* Crown Icon Container (matching Premium Modal) */}
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg border border-white/10">
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 drop-shadow-[0_2px_6px_rgba(251,191,36,0.6)]"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M15 75 L85 75 L92 35 L70 52 L50 20 L30 52 L8 35 Z" fill="currentColor" />
              <path d="M50 48 C50 53 53 53 53 53 C53 53 53 53 58 53 C53 53 53 58 50 58 C50 58 47 58 47 53 C47 53 47 53 42 53 C47 53 47 48 50 48 Z" fill="#8B5CF6" />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-extrabold tracking-tight bg-gradient-to-r from-amber-200 via-amber-300 to-yellow-500 bg-clip-text text-transparent">
                Jobs Premium • Apply Unlimited Everyday
              </span>
              <span className="px-2 py-0.2 text-[9px] font-extrabold uppercase rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-sm">
                From ₹99
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-text-muted mt-0.5 line-clamp-1">
              Auto apply workflow (25/day) • Resume ATS matching • 450+ Company Interview Questions
            </p>
          </div>
        </div>

        {/* Right: Daily Apply Counter + CTA Button */}
        <div className="flex items-center justify-between md:justify-end gap-3 flex-shrink-0 border-t md:border-t-0 border-border/50 pt-2.5 md:pt-0">
          {/* Daily remaining pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg-secondary/70 border border-border text-left">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-text-muted tracking-wider">
                <span>Daily Limit</span>
                <span className="flex items-center gap-0.5 ml-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      className={`inline-block w-1.5 h-1.5 rounded-full ${
                        n <= safeApplied
                          ? 'bg-accent-purple shadow-[0_0_4px_#8B5CF6]'
                          : 'bg-border'
                      }`}
                    />
                  ))}
                </span>
              </div>
              <p className="text-xs font-bold text-text-primary mt-0.5">
                {hasReachedLimit ? (
                  <span className="text-amber-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 inline" /> 0 / 5 left today
                  </span>
                ) : (
                  <span className="text-accent-green">
                    {safeRemaining} of 5 applies left
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Upgrade Button */}
          <button
            type="button"
            onClick={handleOpenUpgrade}
            className="btn btn-sm px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-accent-purple via-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(139,92,246,0.35)] cursor-pointer active:scale-95 transition-all flex-shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Get Premium</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-80" />
          </button>
        </div>
      </div>
    </div>
  );
}

