import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Calendar, CheckCircle2, RotateCcw, ChevronDown, Lock } from 'lucide-react';

import { DifficultyBadge, TopicBadge } from '../common/Badge';
import { progressApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import useClickOutside from '../../utils/useClickOutside';

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started', Icon: null },
  { value: 'solved', label: 'Solved', Icon: CheckCircle2, color: 'text-accent-green' },
  { value: 'revision', label: 'Revision', Icon: RotateCcw, color: 'text-accent-yellow' },
  { value: 'scheduled', label: 'Scheduled', Icon: Calendar, color: 'text-accent-blue' },
];

// ── CompanyLogos ──────────────────────────────────────────────────────────────
const CompanyLogos = ({ companies }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  if (!companies?.length) return <span className="text-text-faint text-xs">—</span>;

  const sorted = [...companies].sort((a, b) => (b.frequency || 0) - (a.frequency || 0));
  const visible = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  // Compact logo pill for the inline row
  const LogoPill = ({ c }) => {
    const [imgErr, setImgErr] = useState(false);
    const { company } = c;
    if (!company) return null;
    return (
      <Link
        to={`/companies/${company.slug}`}
        title={company.name}
        className="flex-shrink-0 transition-transform hover:scale-110"
      >
        {company.logo && !imgErr ? (
          <img
            src={company.logo}
            alt={company.name}
            className="w-6 h-6 rounded object-contain bg-white p-0.5"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-6 h-6 rounded bg-bg-secondary border border-border flex items-center justify-center text-[10px] font-bold text-text-secondary">
            {company.name[0].toUpperCase()}
          </div>
        )}
      </Link>
    );
  };

  // Larger tag pill for the overflow popup
  const LogoTag = ({ c }) => {
    const [imgErr, setImgErr] = useState(false);
    const { company } = c;
    if (!company) return null;
    return (
      <Link
        to={`/companies/${company.slug}`}
        title={company.name}
        className="flex items-center gap-1.5 px-2 py-1 bg-bg-secondary hover:bg-bg-hover rounded-md border border-border transition-colors min-w-0"
      >
        {company.logo && !imgErr ? (
          <img src={company.logo} alt={company.name} className="w-5 h-5 rounded object-contain bg-white p-0.5 flex-shrink-0" onError={() => setImgErr(true)} />
        ) : (
          <div className="w-5 h-5 rounded bg-bg-secondary border border-border flex items-center justify-center text-[10px] font-bold text-text-secondary flex-shrink-0">
            {company.name[0].toUpperCase()}
          </div>
        )}
        <span className="text-xs text-text-muted truncate">{company.name}</span>
      </Link>
    );
  };

  return (
    <div className="relative flex items-center gap-1" ref={ref}>
      {visible.map((c) => <LogoPill key={c.company?._id || c.company} c={c} />)}

      {rest.length > 0 && (
        <button
          onClick={(e) => { e.preventDefault(); setOpen((o) => !o); }}
          className="text-2xs text-text-faint hover:text-text-primary transition-colors cursor-pointer ml-1 px-1 py-0.5 rounded border border-border hover:border-border-strong"
        >
          +{rest.length}
        </button>
      )}

      {open && rest.length > 0 && (
        <div className="absolute left-0 top-full mt-1 card p-3 z-50 shadow-card-hover animate-fade-in min-w-[240px] max-w-[320px] max-h-[240px] overflow-y-auto admin-scroll">
          <div className="flex flex-wrap gap-2">
            {rest.map((c) => <LogoTag key={c.company?._id || c.company} c={c} />)}
          </div>
        </div>
      )}
    </div>
  );
};

// ── StatusDropdown ────────────────────────────────────────────────────────────
const StatusDropdown = ({ problemId, currentStatus, onUpdate }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus || 'not_started');
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  useEffect(() => {
    setStatus(currentStatus || 'not_started');
  }, [currentStatus]);

  if (!user) return <span className="text-text-faint text-xs">Login</span>;

  const handleSelect = async (val) => {
    setStatus(val);
    setOpen(false);
    try {
      await progressApi.upsert({ problemId, status: val });
      onUpdate?.(problemId, val);
      toast.success(`Marked as ${val.replace('_', ' ')}`);
    } catch {
      toast.error('Failed to update');
      setStatus(currentStatus || 'not_started');
    }
  };

  const current = STATUS_OPTIONS.find((o) => o.value === status);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs px-2 py-1 rounded border border-border hover:border-border-strong bg-bg-card transition-colors"
      >
        {current?.Icon && <current.Icon className={`w-3 h-3 ${current.color}`} />}
        <span className={current?.color || 'text-text-faint'}>{current?.label}</span>
        <ChevronDown className={`w-3 h-3 text-text-faint transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 card shadow-card-hover z-30 animate-slide-down w-36">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-bg-secondary transition-colors text-left ${opt.value === status ? 'bg-bg-secondary' : ''}`}
            >
              {opt.Icon ? <opt.Icon className={`w-3.5 h-3.5 ${opt.color}`} /> : <span className="w-3.5" />}
              <span className={opt.color || 'text-text-muted'}>{opt.label}</span>
              {opt.value === status && <span className="ml-auto text-accent-blue text-[10px]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── ProblemTable ──────────────────────────────────────────────────────────────
const ProblemTable = ({ problems, progressMap = {}, onProgressUpdate }) => {
  if (!problems?.length) {
    return (
      <div className="text-center py-16 text-text-muted">
        <p className="text-sm">No problems found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th className="w-20">Difficulty</th>
            <th>Problem</th>
            <th className="w-24 hidden md:table-cell">Frequency</th>
            <th className="hidden lg:table-cell">Topics</th>
            <th className="hidden md:table-cell">Companies</th>
            <th className="w-8">Link</th>
            <th className="w-32">Status</th>
          </tr>
        </thead>
        <tbody>
          {problems.map((p) => {
            const isLocked = p.isLocked;
            return (
              <tr key={p._id} className={isLocked ? 'opacity-85' : ''}>
                <td><DifficultyBadge difficulty={p.difficulty} /></td>
                <td>
                  {isLocked ? (
                    <div className="flex flex-col gap-1 select-none">
                      <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('open-premium-modal'))} title="Unlock Premium">
                        <Lock className="w-3.5 h-3.5 text-accent-yellow flex-shrink-0" />
                        <span className="text-text-primary/30 blur-[3.5px] font-medium text-sm">
                          {p.title}
                        </span>
                      </div>
                      {p.timeRanges && (p.timeRanges.includes('30_DAYS') || p.timeRanges.includes('3_MONTHS')) && (
                        <div className="flex flex-wrap gap-1.5 pl-5">
                          {p.timeRanges.includes('30_DAYS') ? (
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-wider">
                              Asked in last 30 days
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider">
                              Asked in last 3 months
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <a href={p.leetcodeUrl} target="_blank" rel="noopener noreferrer"
                      data-problem-id={p._id}
                      data-problem-title={p.title}
                      data-already-solved={progressMap[p._id] === 'solved'}
                      className="text-text-primary hover:text-accent-blue transition-colors font-medium text-sm">
                      {p.title}
                    </a>
                  )}
                </td>
                <td className="hidden md:table-cell">
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1 bg-bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-accent-blue rounded-full opacity-60" style={{ width: `${Math.min(p.frequency, 100)}%` }} />
                    </div>
                    <span className="text-xs text-text-faint">{p.frequency}</span>
                  </div>
                </td>
                <td className="hidden lg:table-cell">
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {p.topics?.slice(0, 3).map((t) => <TopicBadge key={t._id || t} name={t.name || t} />)}
                  </div>
                </td>
                <td className="hidden md:table-cell">
                  <CompanyLogos companies={p.companies} />
                </td>
                <td>
                  {isLocked ? (
                    <button onClick={() => window.dispatchEvent(new CustomEvent('open-premium-modal'))}
                      className="inline-flex text-text-faint hover:text-accent-yellow transition-colors" title="Locked content">
                      <Lock className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <a href={p.leetcodeUrl} target="_blank" rel="noopener noreferrer"
                        data-problem-id={p._id}
                        data-problem-title={p.title}
                        data-already-solved={progressMap[p._id] === 'solved'}
                        className="inline-flex text-text-faint hover:text-accent-blue transition-colors" aria-label="Open on LeetCode">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      {p.leetcodeId && <span className="text-xs text-text-faint">#{p.leetcodeId}</span>}
                    </div>
                  )}
                </td>
                <td>
                  {isLocked ? (
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('open-premium-modal'))}
                      className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-accent-purple/40 bg-bg-card/50 hover:border-accent-purple/80 text-amber-300 hover:shadow-[0_0_8px_rgba(139,92,246,0.3)] transition-all duration-200 active:scale-95"
                    >
                      Unlock
                    </button>
                  ) : (
                    <StatusDropdown problemId={p._id} currentStatus={progressMap[p._id]} onUpdate={onProgressUpdate} />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ProblemTable;
