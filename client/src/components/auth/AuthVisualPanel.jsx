import { Sparkles, Code2, Briefcase, Award } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function AuthVisualPanel() {
  const { isDark } = useTheme();

  return (
    <div className="w-full flex flex-col justify-between h-full max-w-xl mx-auto py-2 select-none">
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
              Career &amp; Hiring Intelligence
            </p>
          </div>
        </div>

        {/* Static Pill Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm text-xs font-semibold text-slate-600 dark:text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-accent-blue" />
          <span>Tech Careers</span>
        </div>
      </div>

      {/* Main Card Frame with Static Vector Artwork */}
      <div className="relative my-auto">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-[0_20px_50px_rgba(28,68,130,0.08)] border border-slate-200/80 dark:border-slate-800 overflow-hidden relative">
          {/* Decorative ambient background accents */}
          <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-accent-blue/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-accent-green/10 blur-3xl pointer-events-none" />

          {/* Static Doodle Illustration matching the reference design */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 aspect-[16/10] flex items-center justify-center p-3">
            <svg
              viewBox="0 0 640 400"
              className="w-full h-full object-contain"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Subtle background blueprint grid */}
              <defs>
                <pattern id="auth-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="0.75" className="text-slate-200 dark:text-slate-800/80" />
                </pattern>
                <filter id="soft-shadow" x="-8%" y="-8%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#0f172a" floodOpacity="0.08" />
                </filter>
              </defs>

              <rect width="640" height="400" fill="url(#auth-grid)" />

              {/* Background Card 1: Top-Left Analytics Line Chart */}
              <g filter="url(#soft-shadow)">
                <rect x="40" y="35" width="130" height="85" rx="8" className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-700" strokeWidth="2" />
                <path d="M 55 95 L 75 80 L 100 85 L 125 60 L 150 50" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="55" cy="95" r="3" fill="#ef4444" />
                <circle cx="75" cy="80" r="3" fill="#ef4444" />
                <circle cx="100" cy="85" r="3" fill="#ef4444" />
                <circle cx="125" cy="60" r="3" fill="#ef4444" />
                <circle cx="150" cy="50" r="3" fill="#ef4444" />
              </g>

              {/* Background Card 2: Top-Right Circle Gauges */}
              <g filter="url(#soft-shadow)">
                <rect x="470" y="35" width="130" height="85" rx="8" className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-700" strokeWidth="2" />
                <circle cx="505" cy="78" r="16" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="3" />
                <path d="M 505 62 A 16 16 0 0 1 521 78" stroke="#0ea5e9" strokeWidth="3.5" strokeLinecap="round" />
                
                <circle cx="545" cy="78" r="16" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="3" />
                <path d="M 545 62 A 16 16 0 1 1 530 84" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" />
                
                <circle cx="585" cy="78" r="16" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="3" />
                <path d="M 585 62 A 16 16 0 1 1 573 70" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" />
              </g>

              {/* Background Card 3: Bottom-Left Bar Chart */}
              <g filter="url(#soft-shadow)">
                <rect x="40" y="270" width="100" height="80" rx="8" className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-700" strokeWidth="2" />
                <rect x="55" y="315" width="12" height="25" rx="2" fill="#0ea5e9" stroke="#0f172a" strokeWidth="1.5" />
                <rect x="75" y="295" width="12" height="45" rx="2" fill="#10b981" stroke="#0f172a" strokeWidth="1.5" />
                <rect x="95" y="305" width="12" height="35" rx="2" fill="#f59e0b" stroke="#0f172a" strokeWidth="1.5" />
                <rect x="115" y="285" width="12" height="55" rx="2" fill="#8b5cf6" stroke="#0f172a" strokeWidth="1.5" />
              </g>

              {/* Background Doodle Card 4: Top Center Metrics */}
              <g>
                <line x1="320" y1="45" x2="320" y2="75" stroke="#94a3b8" strokeWidth="2" strokeDasharray="3 3" />
                <line x1="335" y1="45" x2="335" y2="75" stroke="#94a3b8" strokeWidth="2" strokeDasharray="3 3" />
                <line x1="350" y1="45" x2="350" y2="75" stroke="#94a3b8" strokeWidth="2" strokeDasharray="3 3" />
              </g>

              {/* Central Tablet Device */}
              <g filter="url(#soft-shadow)">
                {/* Outer Slate/Dark Bezel */}
                <rect x="180" y="95" width="280" height="190" rx="16" fill="#0f172a" stroke="#1e293b" strokeWidth="4" />
                
                {/* Inner Screen Display (Pale Blue / Cyan) */}
                <rect x="194" y="108" width="252" height="164" rx="10" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1.5" />
                
                {/* Camera dot on bezel */}
                <circle cx="320" cy="101" r="2.5" fill="#475569" />

                {/* Workflow Diagram inside the Tablet Screen */}
                {/* Node 1: Top-Left (Gear / Algorithm Problem) */}
                <circle cx="270" cy="155" r="18" fill="#ffffff" stroke="#1e293b" strokeWidth="2.5" />
                <path d="M 270 144 L 270 148 M 270 162 L 270 166 M 259 155 L 263 155 M 277 155 L 281 155 M 262 147 L 265 150 M 275 160 L 278 163 M 262 163 L 265 160 M 275 150 L 278 147" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" />
                <circle cx="270" cy="155" r="6" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />

                {/* Node 2: Top-Right (Candidate / Engineer Profile) */}
                <circle cx="370" cy="155" r="18" fill="#ffffff" stroke="#1e293b" strokeWidth="2.5" />
                <circle cx="370" cy="150" r="5" fill="#8b5cf6" />
                <path d="M 360 164 A 10 10 0 0 1 380 164" fill="#8b5cf6" />

                {/* Node 3: Bottom Center (Verified Job / Package / Offer) */}
                <circle cx="320" cy="210" r="18" fill="#ffffff" stroke="#1e293b" strokeWidth="2.5" />
                {/* 3D Box / Package */}
                <path d="M 320 200 L 330 205 L 320 210 L 310 205 Z" fill="#f8fafc" stroke="#1e293b" strokeWidth="1.5" />
                <path d="M 310 205 L 310 218 L 320 223 L 320 210 Z" fill="#cbd5e1" stroke="#1e293b" strokeWidth="1.5" />
                <path d="M 330 205 L 330 218 L 320 223 L 320 210 Z" fill="#94a3b8" stroke="#1e293b" strokeWidth="1.5" />

                {/* Workflow Connecting Arrows */}
                <path d="M 292 150 C 310 144, 330 144, 348 150" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
                <path d="M 374 175 C 370 190, 355 200, 340 205" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
                <path d="M 300 205 C 285 200, 270 190, 266 175" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />

                {/* Action CTA Button on Tablet */}
                <rect x="290" y="240" width="60" height="15" rx="4" fill="#ea580c" />
              </g>

              {/* Hand Holding Left Bezel */}
              <g>
                {/* Sleeve (Teal / Dark Cyan) */}
                <path d="M 120 370 L 175 320 L 150 280 L 95 330 Z" fill="#0d9488" stroke="#1e293b" strokeWidth="3.5" strokeLinejoin="round" />
                {/* Left Palm & Thumb */}
                <path d="M 150 280 L 180 250 L 195 258 C 198 266, 192 278, 175 285 L 175 320 Z" fill="#fbcfe8" stroke="#1e293b" strokeWidth="3" strokeLinejoin="round" />
                {/* Thumb resting on bezel */}
                <path d="M 180 250 C 185 240, 195 245, 195 258" fill="#fbcfe8" stroke="#1e293b" strokeWidth="3" />
              </g>

              {/* Hand Pointing / Interacting on Right Screen */}
              <g>
                {/* Right Sleeve */}
                <path d="M 490 380 L 450 320 L 515 280 L 555 340 Z" fill="#0d9488" stroke="#1e293b" strokeWidth="3.5" strokeLinejoin="round" />
                {/* Right Hand Palm */}
                <path d="M 450 320 L 400 280 L 435 245 L 475 275 L 515 280 Z" fill="#fbcfe8" stroke="#1e293b" strokeWidth="3" strokeLinejoin="round" />
                {/* Index Finger Tapping Screen */}
                <path d="M 400 280 L 350 250 C 342 245, 345 235, 355 235 L 415 255 Z" fill="#fbcfe8" stroke="#1e293b" strokeWidth="3" strokeLinejoin="round" />
              </g>
            </svg>
          </div>

          {/* Static Feature Highlights underneath visual */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
            <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60">
              <Code2 className="w-4 h-4 mx-auto text-accent-blue mb-1" />
              <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">DSA &amp; Problems</div>
              <div className="text-[10px] text-slate-400">Curated practice</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60">
              <Briefcase className="w-4 h-4 mx-auto text-accent-green mb-1" />
              <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Verified Jobs</div>
              <div className="text-[10px] text-slate-400">100% direct links</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60">
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
