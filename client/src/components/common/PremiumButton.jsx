import { ChevronRight } from 'lucide-react';

const PremiumButton = ({ variant = 'large', onClick }) => {
  const isCompact = variant === 'compact';

  if (isCompact) {
    return (
      <button
        onClick={onClick || (() => window.dispatchEvent(new CustomEvent('open-premium-modal')))}
        className="relative flex items-center gap-2 p-1 pr-3 rounded-full border border-accent-purple/30 bg-bg-card/50 backdrop-blur-md hover:border-accent-purple/60 hover:shadow-[0_0_12px_rgba(139,92,246,0.25)] transition-all duration-200 active:scale-[0.98] select-none text-left"
      >
        {/* Glow Spark */}
        <div className="absolute -top-0.5 -left-0.5 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_#fbbf24] animate-pulse" />

        {/* Crown Icon Container */}
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-md">
          <svg className="w-4 h-4 text-amber-300 drop-shadow-[0_1px_4px_rgba(251,191,36,0.6)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 75 L85 75 L92 35 L70 52 L50 20 L30 52 L8 35 Z" fill="currentColor" />
            <path d="M50 48 C50 53 53 53 53 53 C53 53 53 53 58 53 C53 53 53 58 50 58 C50 58 47 58 47 53 C47 53 47 53 42 53 C47 53 47 48 50 48 Z" fill="#8B5CF6" />
          </svg>
        </div>

        {/* Text */}
        <span className="text-xs font-black tracking-tight bg-gradient-to-r from-amber-200 via-amber-300 to-yellow-500 bg-clip-text text-transparent uppercase">
          Go Premium
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick || (() => window.dispatchEvent(new CustomEvent('open-premium-modal')))}
      className="relative flex items-center gap-4 p-2.5 pr-5 rounded-2xl border border-accent-purple/35 bg-bg-card/45 backdrop-blur-md hover:border-accent-purple/65 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all duration-300 active:scale-[0.98] select-none text-left w-full max-w-[340px] flex-shrink-0"
    >
      {/* Glow Spark */}
      <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_0_10px_#fbbf24] animate-pulse" />

      {/* Crown Icon Container */}
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg border border-white/10">
        <svg className="w-7 h-7 text-amber-300 drop-shadow-[0_2px_6px_rgba(251,191,36,0.6)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 75 L85 75 L92 35 L70 52 L50 20 L30 52 L8 35 Z" fill="currentColor" />
          <path d="M50 48 C50 53 53 53 53 53 C53 53 53 53 58 53 C53 53 53 58 50 58 C50 58 47 58 47 53 C47 53 47 53 42 53 C47 53 47 48 50 48 Z" fill="#8B5CF6" />
        </svg>
      </div>

      {/* Text Column */}
      <div className="flex-1 min-w-0">
        <h3 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-amber-200 via-amber-300 to-yellow-500 bg-clip-text text-transparent leading-none">
          Premium
        </h3>
        <p className="text-[9px] font-bold text-text-muted tracking-widest uppercase mt-1 leading-none">
          Unlock Your Potential
        </p>
      </div>

      {/* Chevron Right */}
      <ChevronRight className="w-4 h-4 text-accent-purple ml-auto flex-shrink-0" />
    </button>
  );
};

export default PremiumButton;
