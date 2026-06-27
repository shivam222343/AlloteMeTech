import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Calendar, Star, CheckCircle2, RotateCcw, Clock, ChevronDown } from 'lucide-react';
import { DifficultyBadge, TopicBadge } from '../common/Badge';
import { progressApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { formatRelativeTime } from '../../utils/helpers';

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started', Icon: null },
  { value: 'solved', label: 'Solved', Icon: CheckCircle2, color: 'text-accent-green' },
  { value: 'revision', label: 'Revision', Icon: RotateCcw, color: 'text-accent-yellow' },
  { value: 'scheduled', label: 'Scheduled', Icon: Calendar, color: 'text-accent-blue' },
];

const CompanyLogos = ({ companies }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!companies?.length) return <span className="text-text-faint text-xs">—</span>;

  const sortedCompanies = [...companies].sort((a, b) => (b.frequency || 0) - (a.frequency || 0));
  const visible = sortedCompanies.slice(0, 3);
  const rest = sortedCompanies.slice(3);

  const LogoItem = ({ c, isTag }) => {
    const [error, setError] = useState(false);
    return (
      <Link to={`/companies/${c.company.slug}`} title={c.company.name} 
        className={isTag 
          ? "flex items-center gap-1.5 px-2 py-1 bg-bg-secondary hover:bg-bg-card rounded-md border border-border transition-colors min-w-0" 
          : "flex items-center transition-transform hover:scale-105"}>
        {isTag && c.company.logo && !error ? (
          <img
            src={c.company.logo}
            alt={c.company.name}
            className="w-5 h-5 rounded object-contain flex-shrink-0 bg-white p-0.5"
            onError={() => setError(true)}
          />
        ) : (
          <div className="w-5 h-5 rounded bg-bg-secondary flex items-center justify-center text-[10px] font-bold text-text-secondary flex-shrink-0">
            {c.company.name[0].toUpperCase()}
          </div>
        )}
        {isTag && <span className="text-xs text-text-muted whitespace-nowrap overflow-hidden text-ellipsis">{c.company.name}</span>}
      </Link>
    );
  };

  return (
    <div className="relative flex items-center gap-1" ref={ref}>
      {visible.map((c) => c.company && <LogoItem key={c.company._id || c.company} c={c} />)}
      
      {rest.length > 0 && (
        <button 
          onClick={(e) => { e.preventDefault(); setOpen(!open); }}
          className="text-2xs text-text-faint hover:text-text-primary transition-colors cursor-pointer ml-1"
        >
          +{rest.length}
        </button>
      )}
      
      {open && rest.length > 0 && (
        <div className="absolute left-0 top-full mt-1 card p-3 z-50 shadow-card-hover animate-fade-in whitespace-nowrap min-w-[240px] max-w-[320px] max-h-[280px] overflow-y-auto overflow-x-hidden admin-scroll">
          <div className="flex flex-wrap gap-2">
            {rest.map((c) => c.company && <LogoItem key={c.company._id || c.company} c={c} isTag />)}
          </div>
        </div>
      )}
    </div>
  );
};

const StatusDropdown = ({ problemId, currentStatus, onUpdate }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus || 'not_started');

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
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs px-2 py-1 rounded border border-border hover:border-border-strong bg-bg-card transition-colors"
      >
        {current?.Icon && <current.Icon className={`w-3 h-3 ${current.color}`} />}
        <span className={current?.color || 'text-text-faint'}>{current?.label}</span>
        <ChevronDown className="w-3 h-3 text-text-faint" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 card shadow-card-hover z-30 animate-slide-down w-36">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-bg-secondary transition-colors text-left"
            >
              {opt.Icon ? <opt.Icon className={`w-3.5 h-3.5 ${opt.color}`} /> : <span className="w-3.5" />}
              <span className={opt.color || 'text-text-muted'}>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

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
          {problems.map((p) => (
            <tr key={p._id}>
              <td><DifficultyBadge difficulty={p.difficulty} /></td>
              <td>
                <a href={p.leetcodeUrl} target="_blank" rel="noopener noreferrer"
                  className="text-text-primary hover:text-accent-blue transition-colors font-medium text-sm">
                  {p.title}
                </a>
              </td>
              <td className="hidden md:table-cell">
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1 bg-bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-blue/60 rounded-full"
                      style={{ width: `${Math.min(p.frequency, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-faint">{p.frequency}</span>
                </div>
              </td>
              <td className="hidden lg:table-cell">
                <div className="flex flex-wrap gap-1 max-w-[200px]">
                  {p.topics?.slice(0, 3).map((t) => (
                    <TopicBadge key={t._id || t} name={t.name || t} />
                  ))}
                </div>
              </td>
              <td className="hidden md:table-cell">
                <CompanyLogos companies={p.companies} />
              </td>
              <td>
                <div className="flex items-center gap-2">
                  <a href={p.leetcodeUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex text-text-faint hover:text-accent-blue transition-colors"
                    aria-label="Open on LeetCode">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  {p.leetcodeId && <span className="text-xs text-text-faint">#{p.leetcodeId}</span>}
                </div>
              </td>
              <td>
                <StatusDropdown
                  problemId={p._id}
                  currentStatus={progressMap[p._id]}
                  onUpdate={onProgressUpdate}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProblemTable;
