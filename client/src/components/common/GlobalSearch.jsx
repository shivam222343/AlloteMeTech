import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Code2, Building2, Tag } from 'lucide-react';
import { searchApi } from '../../api';
import Spinner from './Spinner';

const typeIcon = { problem: Code2, company: Building2, topic: Tag };
const typeRoute = {
  company: (r) => `/companies/${r.slug}`,
  topic: (r) => `/topics/${r.slug}`,
};

const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await searchApi.global(query);
        setResults(data.data.results || []);
        setOpen(true);
        setSelected(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && results[selected]) {
      const r = results[selected];
      if (r.type === 'problem') {
        window.open(r.leetcodeUrl || `https://leetcode.com/problems/${r.slug}`, '_blank');
      } else {
        navigate(typeRoute[r.type](r));
      }
      setOpen(false);
      setQuery('');
    }
    if (e.key === 'Escape') setOpen(false);
  };

  const handleSelect = (r) => {
    if (r.type === 'problem') {
      window.open(r.leetcodeUrl || `https://leetcode.com/problems/${r.slug}`, '_blank');
    } else {
      navigate(typeRoute[r.type](r));
    }
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="relative w-full max-w-sm" ref={ref}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search problems, companies..."
          className="input pl-9 pr-8 py-1.5 text-sm h-9"
          aria-label="Global search"
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-muted">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 card shadow-card-hover z-50 overflow-hidden animate-slide-down">
          {loading ? (
            <div className="p-4 flex justify-center"><Spinner size="sm" /></div>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-faint">No results for "{query}"</p>
          ) : (
            <ul role="listbox">
              {results.map((r, i) => {
                const Icon = typeIcon[r.type];
                return (
                  <li
                    key={`${r.type}-${r._id || r.slug}`}
                    role="option"
                    aria-selected={i === selected}
                    onClick={() => handleSelect(r)}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${i === selected ? 'bg-bg-secondary' : 'hover:bg-bg-hover'}`}
                  >
                    <Icon className="w-4 h-4 text-text-faint flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">{r.title || r.name}</p>
                      {r.difficulty && (
                        <p className={`text-2xs text-difficulty-${r.difficulty?.toLowerCase()}`}>{r.difficulty}</p>
                      )}
                    </div>
                    <span className="text-2xs text-text-faint capitalize px-1.5 py-0.5 bg-bg-secondary rounded">{r.type}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
