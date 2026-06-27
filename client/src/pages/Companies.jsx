import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { companiesApi } from '../api';
import { Search, Building2, ChevronRight } from 'lucide-react';
import Spinner from '../components/common/Spinner';
import { formatRelativeTime } from '../utils/helpers';

const SORT_OPTIONS = [
  { value: 'name', label: 'Alphabetical' },
  { value: 'questions', label: 'Most Qs' },
  { value: 'newest', label: 'Recent' },
];

const ALPHABET = ['#', ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))];

const CompanyCard = ({ company }) => (
  <Link
    to={`/companies/${company.slug}`}
    className="card-hover p-4 flex items-start gap-3 group"
    aria-label={`${company.name} — ${company.totalQuestions} questions`}
  >
    {company.logo ? (
      <img
        src={company.logo}
        alt={company.name}
        className="w-10 h-10 rounded object-contain flex-shrink-0 bg-white p-1"
        onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${company.name[0]}&background=1F2937&color=9CA3AF&size=40`; }}
      />
    ) : (
      <div className="w-10 h-10 rounded bg-bg-secondary flex items-center justify-center text-sm font-semibold text-text-muted flex-shrink-0">
        {company.name[0]}
      </div>
    )}
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-1">
        <h3 className="text-sm font-medium text-text-primary group-hover:text-accent-blue transition-colors truncate">
          {company.name}
        </h3>
        <ChevronRight className="w-3.5 h-3.5 text-text-faint group-hover:text-accent-blue transition-colors flex-shrink-0" />
      </div>
      <p className="text-xs text-text-muted mt-0.5">{company.totalQuestions} questions</p>
      {company.updatedAt && (
        <p className="text-2xs text-text-faint mt-1">Updated {formatRelativeTime(company.updatedAt)}</p>
      )}
    </div>
  </Link>
);

const Companies = () => {
  const [search, setSearch] = useState('');
  const [startingWith, setStartingWith] = useState('');
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['companies', { search, startingWith, sort, page }],
    queryFn: () => companiesApi.getAll({ search, startingWith, sort, page, limit: 24 }),
    keepPreviousData: true,
  });

  const companies = data?.data?.data || [];
  const pagination = data?.data?.pagination;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Building2 className="w-6 h-6 text-accent-blue" />
          Companies
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Browse {pagination?.total || '—'} companies and their DSA questions (Tech Round + Interview)
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (e.target.value) setStartingWith('');
              setPage(1);
            }}
            placeholder="Search companies..."
            className="input pl-9"
            id="company-search"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted whitespace-nowrap">Sort by:</span>
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => { setSort(o.value); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded border transition-colors ${sort === o.value ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/30' : 'border-border text-text-muted hover:border-border-strong hover:text-text-secondary'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alphabet Scroller */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
        <button
          onClick={() => { setStartingWith(''); setSearch(''); setPage(1); }}
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors border ${startingWith === '' ? 'bg-accent-blue text-white border-accent-blue' : 'bg-bg-secondary text-text-secondary border-border hover:border-border-strong hover:text-text-primary'
            }`}
        >
          All
        </button>
        {ALPHABET.map((letter) => (
          <button
            key={letter}
            onClick={() => { setStartingWith(letter); setSearch(''); setPage(1); }}
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors border ${startingWith === letter ? 'bg-accent-blue text-white border-accent-blue' : 'bg-bg-secondary text-text-secondary border-border hover:border-border-strong hover:text-text-primary'
              }`}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-lg" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-20 text-text-muted">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No companies found{search ? ` for "${search}"` : ''}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {companies.map((c) => <CompanyCard key={c._id} company={c} />)}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="btn btn-secondary btn-sm disabled:opacity-40">Previous</button>
              <span className="text-xs text-text-muted">Page {page} of {pagination.pages}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={page === pagination.pages} className="btn btn-secondary btn-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Companies;
