import { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Sparkles, CheckCircle2, Search, Code2, Briefcase, Award } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function AuthVisualPanel() {
  const { isDark } = useTheme();
  const [isMuted, setIsMuted] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef(null);
  const audioCtxRef = useRef(null);
  const oscillatorRef = useRef(null);

  // Synthesize gentle ambient audio on unmute using Web Audio API
  const toggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }

    try {
      if (!nextMuted) {
        if (!audioCtxRef.current) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) {
            audioCtxRef.current = new AudioContext();
          }
        }
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }
        playChime();
      }
    } catch (e) {
      // Audio autoplay policy fallback
    }
  };

  const playChime = () => {
    if (!audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;
      // Play a gentle major chord chime
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.04, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 1.3);
      });
    } catch (e) {}
  };

  return (
    <div className="w-full flex flex-col justify-between h-full max-w-xl mx-auto py-2">
      {/* Top Header Row */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          {/* App Logo Badge in rounded square */}
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-md border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center p-2 transition-transform hover:scale-105">
            <img
              src={isDark ? '/AlloteMe_Logos.png' : '/AlloteMe_Logos _Light.png'}
              alt="AlloteMe Tech"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              AlloteMe Tech
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-wider text-accent-blue">
              Job Hunting &amp; Career Intelligence
            </p>
          </div>
        </div>

        {/* Audio Mute / Unmute pill button */}
        <button
          type="button"
          onClick={toggleSound}
          className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-accent-blue shadow-sm hover:scale-105 active:scale-95 transition-all"
          title={isMuted ? 'Unmute animation sound' : 'Mute animation sound'}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-slate-400" />
          ) : (
            <Volume2 className="w-4 h-4 text-accent-blue animate-pulse" />
          )}
        </button>
      </div>

      {/* Main Animated Card Frame */}
      <div className="relative my-auto">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(28,68,130,0.08)] border border-slate-200/80 dark:border-slate-800 overflow-hidden relative group">
          {/* Decorative ambient background accents */}
          <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-accent-blue/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-accent-green/10 blur-3xl pointer-events-none" />

          {/* 2D Animated Video Component */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 aspect-[16/10] flex items-center justify-center">
            <video
              ref={videoRef}
              src="/videos/job-hunting-doodle.webm"
              autoPlay
              loop
              muted={isMuted}
              playsInline
              onLoadedData={() => setVideoLoaded(true)}
              className="w-full h-full object-cover transition-opacity duration-500"
            />

            {/* Seamless Animated Doodle Vector Fallback (matches style if video pauses/loads) */}
            {!videoLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-blue-50/80 to-slate-50/80 dark:from-slate-900 dark:to-slate-950">
                <div className="w-16 h-16 rounded-2xl bg-accent-blue/10 border border-accent-blue/30 flex items-center justify-center mb-3 animate-bounce">
                  <Search className="w-8 h-8 text-accent-blue" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Doodle Career Scanner
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Solving DSA problems &amp; hunting verified tech roles in real time...
                </p>
              </div>
            )}

            {/* Live animated status badge in corner */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60 shadow-sm text-[10px] font-bold text-accent-blue">
              <span className="w-2 h-2 rounded-full bg-accent-green animate-ping" />
              <span>Live Job Hunt Radar</span>
            </div>
          </div>

          {/* Mini Interactive Feature Highlights underneath video */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
            <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/50">
              <Code2 className="w-4 h-4 mx-auto text-accent-blue mb-1" />
              <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">DSA &amp; Problems</div>
              <div className="text-[10px] text-slate-400">Curated practice</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/50">
              <Briefcase className="w-4 h-4 mx-auto text-accent-green mb-1" />
              <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Direct Links</div>
              <div className="text-[10px] text-slate-400">100% verified</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/50">
              <Award className="w-4 h-4 mx-auto text-purple-500 mb-1" />
              <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Interview Ready</div>
              <div className="text-[10px] text-slate-400">High placement rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Tagline Row */}
      <div className="mt-8 pt-2">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-tight">
          Smarter Decisions. Stronger Career Pipelines.
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Master problem-solving, track verified applications, and crack your dream tech role.
        </p>
      </div>
    </div>
  );
}

