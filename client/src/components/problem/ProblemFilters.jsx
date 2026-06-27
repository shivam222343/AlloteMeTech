import { Search, SlidersHorizontal, X } from 'lucide-react';

const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard'];
const SORT_OPTIONS = [
  { value: 'frequency', label: 'Most Frequent' },
  { value: 'acceptance', label: 'Acceptance ↑' },
  { value: '-acceptance', label: 'Acceptance ↓' },
  { value: 'title', label: 'Alphabetical' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
];
const TIME_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '3m', label: 'Last 3 Months' },
  { value: '6m', label: 'Last 6 Months' },
];

const ProblemFilters = ({ filters, onChange, showTimeRange = true }) => {
  const update = (key, val) => onChange({ ...filters, [key]: val });

  const activeCount = [
    filters.difficulty,
    filters.sort !== 'frequency' ? filters.sort : null,
    filters.timeRange && filters.timeRange !== 'all' ? filters.timeRange : null,
    filters.search,
  ].filter(Boolean).length;

  const clearAll = () => onChange({ search: '', difficulty: '', sort: 'frequency', timeRange: 'all' });

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint pointer-events-none" />
        <input
          type="text"
          value={filters.search || ''}
          onChange={(e) => update('search', e.target.value)}
          placeholder="Search problems..."
          className="input pl-9 text-sm"
          id="problem-search"
        />
        {filters.search && (
          <button onClick={() => update('search', '')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-muted">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal className="w-4 h-4 text-text-faint" />

        {/* Difficulty */}
        <div className="flex items-center gap-1">
          {DIFFICULTY_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => update('difficulty', filters.difficulty === d ? '' : d)}
              className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                filters.difficulty === d
                  ? d === 'Easy' ? 'bg-accent-green/10 text-accent-green border-accent-green/30'
                  : d === 'Medium' ? 'bg-accent-yellow/10 text-accent-yellow border-accent-yellow/30'
                  : 'bg-accent-red/10 text-accent-red border-accent-red/30'
                  : 'border-border text-text-muted hover:border-border-strong hover:text-text-secondary'
              }`}
            >{d}</button>
          ))}
        </div>

        {/* Time range */}
        {showTimeRange && (
          <select
            value={filters.timeRange || 'all'}
            onChange={(e) => update('timeRange', e.target.value)}
            className="text-xs bg-bg-secondary border border-border rounded px-2 py-1 text-text-muted focus:outline-none focus:border-accent-blue"
          >
            {TIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}

        {/* Sort */}
        <select
          value={filters.sort || 'frequency'}
          onChange={(e) => update('sort', e.target.value)}
          className="text-xs bg-bg-secondary border border-border rounded px-2 py-1 text-text-muted focus:outline-none focus:border-accent-blue"
        >
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* Clear */}
        {activeCount > 0 && (
          <button onClick={clearAll} className="text-xs text-accent-blue hover:underline flex items-center gap-1">
            <X className="w-3 h-3" /> Clear ({activeCount})
          </button>
        )}
      </div>
    </div>
  );
};

export default ProblemFilters;
