import { useState } from 'react';
import { Sparkles, X, Play, Globe, CheckCircle2, SlidersHorizontal, Image } from 'lucide-react';

const LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  '0-9', 'All'
];

const LIMIT_OPTIONS = [
  { value: 25, label: '25 companies' },
  { value: 50, label: '50 companies (Recommended)' },
  { value: 100, label: '100 companies' },
  { value: 250, label: '250 companies' },
  { value: 500, label: '500 companies' },
  { value: 'all', label: 'All matching companies' },
];

export default function AutoLogoFinderModal({ isOpen, onClose, onStart, loading = false }) {
  const [selectedLetter, setSelectedLetter] = useState('A');
  const [limit, setLimit] = useState(50);
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [preferWebp, setPreferWebp] = useState(true);
  const [cascadeToJobs, setCascadeToJobs] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onStart({
      letter: selectedLetter.toLowerCase(),
      limit,
      onlyMissing,
      preferWebp,
      cascadeToJobs,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-bg-card border border-border rounded-2xl w-full max-w-xl shadow-2xl p-5 sm:p-6 space-y-5 text-text-primary my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accent-blue to-purple-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-1.5">
                Auto-Find Company Logos
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase font-semibold">
                  WebP Priority
                </span>
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Automated internet crawler to find and assign high-quality WebP logos by company slug
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon btn-ghost text-text-muted hover:text-text-primary flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Letter Selector Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-text-primary flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-accent-blue" />
                Select Alphabet / Starting Letter:
              </label>
              <span className="text-accent-blue font-bold">
                {selectedLetter === 'All'
                  ? 'All Companies'
                  : selectedLetter === '0-9'
                  ? 'Numbers (0-9)'
                  : `Starts with "${selectedLetter}"`}
              </span>
            </div>

            <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5 p-2.5 rounded-xl bg-bg-secondary/60 border border-border/60">
              {LETTERS.map((char) => {
                const isSelected = selectedLetter === char;
                return (
                  <button
                    key={char}
                    type="button"
                    onClick={() => setSelectedLetter(char)}
                    className={`py-1.5 px-1 rounded-lg text-xs font-mono font-bold transition-all text-center cursor-pointer ${
                      isSelected
                        ? 'bg-accent-blue text-white shadow-md ring-2 ring-accent-blue/40 scale-105'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-card'
                    }`}
                  >
                    {char}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-text-faint">
              Tip: Process companies in small sets by selecting a letter (e.g. &ldquo;A&rdquo; for Airbnb, Adobe, Asana).
            </p>
          </div>

          {/* 2. Batch Limit */}
          <div className="space-y-1.5">
            <label className="font-semibold text-xs text-text-primary flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              Batch Size / Max Companies to Search:
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="input w-full text-xs sm:text-sm py-2"
            >
              {LIMIT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Toggles & Checkboxes */}
          <div className="space-y-2.5 bg-bg-secondary/40 p-3.5 rounded-xl border border-border/50 text-xs">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyMissing}
                onChange={(e) => setOnlyMissing(e.target.checked)}
                className="mt-0.5 rounded border-border text-accent-blue focus:ring-accent-blue"
              />
              <div>
                <span className="font-semibold text-text-primary block">
                  Only search companies missing a logo (Recommended)
                </span>
                <span className="text-text-faint text-[11px]">
                  Skips companies that already have an existing logo URL in the database.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={preferWebp}
                onChange={(e) => setPreferWebp(e.target.checked)}
                className="mt-0.5 rounded border-border text-accent-blue focus:ring-accent-blue"
              />
              <div>
                <span className="font-semibold text-text-primary flex items-center gap-1">
                  Prioritize WebP format logos
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                    .webp
                  </span>
                </span>
                <span className="text-text-faint text-[11px]">
                  Searches the internet for modern lightweight WebP images; falls back to SVG/PNG if WebP isn&rsquo;t found.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={cascadeToJobs}
                onChange={(e) => setCascadeToJobs(e.target.checked)}
                className="mt-0.5 rounded border-border text-accent-blue focus:ring-accent-blue"
              />
              <div>
                <span className="font-semibold text-text-primary block">
                  Cascade new logo to all active job listings
                </span>
                <span className="text-text-faint text-[11px]">
                  Automatically updates the logo on all existing user job cards for each company.
                </span>
              </div>
            </label>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn btn-ghost btn-sm text-xs px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-sm text-xs px-5 py-2.5 flex items-center gap-2 bg-gradient-to-r from-accent-blue via-indigo-600 to-purple-600 font-bold shadow-md cursor-pointer active:scale-95 transition-all text-white"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{loading ? 'Starting...' : 'Start Automation & Open Terminal'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

