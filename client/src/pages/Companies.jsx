import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { companiesApi, jobsApi } from '../api';
import {
  Search,
  Building2,
  ChevronRight,
  Zap,
  Terminal,
  X,
  Play,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import Spinner from '../components/common/Spinner';
import { formatRelativeTime } from '../utils/helpers';
import ContinueLearningRecommendation from '../components/common/ContinueLearningRecommendation';
import { useAuth } from '../context/AuthContext';
import LiveSyncTerminal from '../components/jobs/LiveSyncTerminal';
import AutoLogoFinderModal from '../components/companies/AutoLogoFinderModal';
import toast from 'react-hot-toast';

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
      <div className="flex items-center gap-2 mt-0.5 text-xs">
        {company.openRoles > 0 ? (
          <span className="font-semibold text-accent-green">{company.openRoles} open roles</span>
        ) : (
          <span className="text-text-muted">{company.totalQuestions || 0} questions</span>
        )}
        {company.platform && (
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-bg-secondary text-text-faint capitalize">
            {company.platform}
          </span>
        )}
      </div>
      {company.updatedAt && (
        <p className="text-2xs text-text-faint mt-1">Updated {formatRelativeTime(company.updatedAt)}</p>
      )}
    </div>
  </Link>
);

const Companies = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [startingWith, setStartingWith] = useState('');
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(1);

  // Scraper Terminal & Modal state for Admin
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [syncState, setSyncState] = useState(null);
  const [syncLogs, setSyncLogs] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [stoppingSync, setStoppingSync] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [categoryChoice, setCategoryChoice] = useState('Tech');

  // Auto-Logo Search state for Admin
  const [logoModalOpen, setLogoModalOpen] = useState(false);
  const [logoTerminalOpen, setLogoTerminalOpen] = useState(false);
  const [logoSessionState, setLogoSessionState] = useState(null);
  const [logoSessionLogs, setLogoSessionLogs] = useState([]);
  const [logoSearching, setLogoSearching] = useState(false);
  const [stoppingLogoSearch, setStoppingLogoSearch] = useState(false);

  // Poll ATS sync status & live terminal logs
  useEffect(() => {
    let intervalId;
    const pollStatus = async () => {
      try {
        const res = await jobsApi.getSyncStatus();
        const data = res?.data?.data;
        if (data) {
          if (data.state) {
            setSyncState(data.state);
            const active = Boolean(data.state.isActive);
            setSyncing(active);
            if (!active && syncing) {
              queryClient.invalidateQueries(['companies']);
            }
          }
          if (Array.isArray(data.logs)) {
            setSyncLogs(data.logs);
          }
        }
      } catch (e) {
        // silent
      }
    };

    if (syncing || terminalOpen) {
      pollStatus();
      intervalId = setInterval(pollStatus, 1200);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [syncing, terminalOpen, queryClient]);

  // Poll Auto-Logo status & live terminal logs
  useEffect(() => {
    let intervalId;
    const pollLogoStatus = async () => {
      try {
        const res = await companiesApi.getAutoLogoStatus();
        const data = res?.data?.data;
        if (data) {
          if (data.state) {
            setLogoSessionState(data.state);
            const active = Boolean(data.state.isActive);
            setLogoSearching(active);
            if (!active && logoSearching) {
              queryClient.invalidateQueries(['companies']);
            }
          }
          if (Array.isArray(data.logs)) {
            setLogoSessionLogs(data.logs);
          }
        }
      } catch (e) {
        // silent
      }
    };

    if (logoSearching || logoTerminalOpen) {
      pollLogoStatus();
      intervalId = setInterval(pollLogoStatus, 1200);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [logoSearching, logoTerminalOpen, queryClient]);

  const handleStartGlobalScrape = async () => {
    try {
      setConfirmModalOpen(false);
      setSyncing(true);
      setTerminalOpen(true);

      const res = await companiesApi.globalSync({
        syncAll: true,
        postedWithinDays: '2',
        experienceFilter: '0_1',
        categoryFilter: categoryChoice,
      });

      toast.success(
        res?.data?.message || 'Started Global ATS scrape for 0-1 years experience (last 2 days)!',
        { duration: 5000 }
      );
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to start global scrape');
      setSyncing(false);
    }
  };

  const handleStopSync = async () => {
    setStoppingSync(true);
    try {
      await jobsApi.stopSync();
      toast('Stopping global scraper...', { icon: '🛑' });
    } catch (err) {
      toast.error('Failed to request stop');
    } finally {
      setStoppingSync(false);
    }
  };

  const handleStartAutoLogos = async (filters) => {
    try {
      setLogoModalOpen(false);
      setLogoSearching(true);
      setLogoTerminalOpen(true);

      const res = await companiesApi.startAutoLogos(filters);
      toast.success(
        res?.data?.message || 'Started automated logo search on the internet!',
        { duration: 5000 }
      );
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to start logo search');
      setLogoSearching(false);
    }
  };

  const handleStopAutoLogos = async () => {
    setStoppingLogoSearch(true);
    try {
      await companiesApi.stopAutoLogos();
      toast('Stopping logo automation...', { icon: '🛑' });
    } catch (err) {
      toast.error('Failed to stop logo automation');
    } finally {
      setStoppingLogoSearch(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['companies', { search, startingWith, sort, page }],
    queryFn: () => companiesApi.getAll({ search, startingWith, sort, page, limit: 24 }),
    keepPreviousData: true,
  });

  const companies = data?.data?.data || [];
  const pagination = data?.data?.pagination;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Live Terminal Modal for ATS Scrape */}
      <LiveSyncTerminal
        isOpen={terminalOpen}
        onClose={() => setTerminalOpen(false)}
        syncState={syncState}
        syncLogs={syncLogs}
        syncing={syncing}
        onStopSync={handleStopSync}
        stoppingSync={stoppingSync}
        title="global-ats-scraper@alloteme:~"
      />

      {/* Auto-Logo Search Terminal Modal */}
      <LiveSyncTerminal
        isOpen={logoTerminalOpen}
        onClose={() => setLogoTerminalOpen(false)}
        syncState={logoSessionState}
        syncLogs={logoSessionLogs}
        syncing={logoSearching}
        onStopSync={handleStopAutoLogos}
        stoppingSync={stoppingLogoSearch}
        title="logo-crawler@alloteme:~"
        badgeText={logoSessionState?.letter ? `LETTER: ${logoSessionState.letter}` : 'WEBP LOGOS'}
        statCards={[
          { label: 'Target Companies', value: logoSessionState?.totalToProcess || 0 },
          { label: 'Processed', value: logoSessionState?.processedCount || 0, color: 'text-accent-blue' },
          { label: 'WebP Logos Added', value: logoSessionState?.foundWebpCount || 0, color: 'text-accent-green' },
          { label: 'Other Logos Added', value: logoSessionState?.foundOtherCount || 0, color: 'text-indigo-400' },
          { label: 'Failed / Skipped', value: (logoSessionState?.failedCount || 0) + (logoSessionState?.skippedCount || 0), color: 'text-accent-red' },
        ]}
      />

      {/* Auto-Logo Finder Filter Modal */}
      <AutoLogoFinderModal
        isOpen={logoModalOpen}
        onClose={() => setLogoModalOpen(false)}
        onStart={handleStartAutoLogos}
        loading={logoSearching}
      />

      {/* Confirmation & Filter Modal before Global Scrape */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4 text-text-primary">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue">
                  <Zap className="w-4 h-4 text-amber-300" />
                </div>
                <h3 className="font-bold text-base">Global ATS Job Scrape</h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="btn-icon btn-ghost text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              This will sequentially crawl all registered companies across supported ATS platforms (Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Workday, etc.), automatically filtering out duplicate postings.
            </p>

            <div className="space-y-3 bg-bg-secondary/60 p-3.5 rounded-xl border border-border/60 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-text-secondary">Experience Requirement:</span>
                <span className="px-2.5 py-0.5 rounded-full font-bold bg-accent-blue/15 text-accent-blue border border-accent-blue/30">
                  0 - 1 Years Only (Freshers / Entry / Interns)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-text-secondary">Posted Window:</span>
                <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Last 2 Days (Recent 48 Hours)
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="font-semibold text-text-secondary">Job Category:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCategoryChoice('Tech')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      categoryChoice === 'Tech'
                        ? 'bg-accent-blue text-white shadow-sm'
                        : 'bg-bg-card border border-border text-text-muted hover:text-text-primary'
                    }`}
                  >
                    💻 Tech Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryChoice('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      categoryChoice === 'all'
                        ? 'bg-accent-blue text-white shadow-sm'
                        : 'bg-bg-card border border-border text-text-muted hover:text-text-primary'
                    }`}
                  >
                    All Roles
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="btn btn-ghost btn-sm text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartGlobalScrape}
                className="btn btn-primary btn-sm text-xs px-4 py-2 flex items-center gap-2 bg-gradient-to-r from-accent-blue to-indigo-600 font-bold shadow-md cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Scrape &amp; View Terminal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Building2 className="w-6 h-6 text-accent-blue" />
            Companies Directory
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Browse {pagination?.total || '—'} companies, active career boards, and interview questions
          </p>
        </div>

        {/* Admin Global Scrape, Logo Automation & Live Terminal Controls */}
        {isAdmin && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setLogoModalOpen(true)}
              disabled={logoSearching}
              className="btn btn-sm px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:opacity-95 text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(20,184,166,0.25)] cursor-pointer active:scale-95 transition-all"
              title="Automatically search the internet and add WebP logos for companies by letter"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Auto-Find Logos (WebP)</span>
              {logoSearching && <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping ml-1" />}
            </button>

            {logoSearching && (
              <button
                type="button"
                onClick={() => setLogoTerminalOpen(true)}
                className="btn btn-ghost btn-sm px-3 py-2 rounded-xl border border-emerald-500/40 text-xs font-mono flex items-center gap-1.5 cursor-pointer text-emerald-400 hover:text-emerald-300 bg-emerald-500/10"
                title="Open Logo Crawler Terminal"
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Logo Terminal</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setConfirmModalOpen(true)}
              disabled={syncing}
              className="btn btn-sm px-3.5 py-2 rounded-xl bg-gradient-to-r from-accent-blue via-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.25)] cursor-pointer active:scale-95 transition-all"
              title="Scrape all companies globally for 0-1 years experience posted in the last 2 days"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Global ATS Scrape (0-1 Yrs • 2 Days)</span>
              {syncing && <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping ml-1" />}
            </button>

            <button
              type="button"
              onClick={() => setTerminalOpen(true)}
              className="btn btn-ghost btn-sm px-3 py-2 rounded-xl border border-border text-xs font-mono flex items-center gap-1.5 cursor-pointer text-text-secondary hover:text-text-primary"
              title="Open Live Terminal to view scraping progress"
            >
              <Terminal className="w-3.5 h-3.5 text-accent-green" />
              <span>Live Terminal</span>
              {syncing && <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />}
            </button>
          </div>
        )}
      </div>

      <ContinueLearningRecommendation />

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
