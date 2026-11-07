import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Pencil,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Layers,
  Settings,
  X,
  Play,
  Upload,
  Check,
  Globe,
  Radio,
  FileText,
  SlidersHorizontal,
  Terminal,
  Zap,
  Sparkles,
} from 'lucide-react';
import { companiesApi, jobsApi } from '../../api';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
import LiveSyncTerminal from '../../components/jobs/LiveSyncTerminal';
import AutoLogoFinderModal from '../../components/companies/AutoLogoFinderModal';

const ALPHABET = ['All', '#', ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))];

const PLATFORMS = [
  { id: 'all', label: 'All ATS Platforms' },
  { id: 'greenhouse', label: 'Greenhouse' },
  { id: 'ashby', label: 'Ashby' },
  { id: 'lever', label: 'Lever' },
  { id: 'workday', label: 'Workday' },
  { id: 'workable', label: 'Workable' },
  { id: 'smartrecruiters', label: 'SmartRecruiters' },
  { id: 'recruitee', label: 'Recruitee' },
  { id: 'rippling', label: 'Rippling' },
  { id: 'personio', label: 'Personio' },
];

const DATE_OPTIONS = [
  { value: '2', label: 'Last 2 Days (Recommended)' },
  { value: '7', label: 'Last 1 Week' },
  { value: '14', label: 'Last 2 Weeks' },
  { value: '30', label: 'Last 1 Month' },
  { value: 'all', label: 'All Available Roles' },
];

const EXPERIENCE_OPTIONS = [
  { value: 'all', label: 'All Experience Levels' },
  { value: 'fresher_intern', label: 'Fresher / Internship (0 yr)' },
  { value: '0_1', label: 'Entry Level (0 - 1 yr)' },
  { value: '1_3', label: 'Mid-Level (1 - 3 yrs)' },
];

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Roles (Tech & Non-Tech)' },
  { value: 'Tech', label: 'Tech Only 💻' },
  { value: 'Non-Tech', label: 'Non-Tech Only 💼' },
];

const COUNTRY_OPTIONS = [
  { value: 'all', label: '🌐 All / Worldwide (No restriction)' },
  { value: 'india', label: '🇮🇳 India (Bengaluru, Pune, Hyderabad, Delhi, etc.)' },
  { value: 'us', label: '🇺🇸 United States (SF, NY, Austin, Seattle, etc.)' },
  { value: 'uk', label: '🇬🇧 United Kingdom (London, Manchester, etc.)' },
  { value: 'canada', label: '🇨🇦 Canada (Toronto, Vancouver, etc.)' },
  { value: 'germany', label: '🇩🇪 Germany (Berlin, Munich, etc.)' },
  { value: 'remote', label: '🏠 Remote Only (Telecommute / WFH)' },
  { value: 'custom', label: '✏️ Custom Location Keywords...' },
];

export default function AdminCompanies() {
  const qc = useQueryClient();

  // Filters & State
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [platform, setPlatform] = useState('all');
  const [hasOpenRoles, setHasOpenRoles] = useState('all');
  const [isAutoSyncOnly, setIsAutoSyncOnly] = useState('all');
  const [startingWith, setStartingWith] = useState('All');
  const [sort, setSort] = useState('openRoles');

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Live Terminal & Scraper state
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [syncState, setSyncState] = useState(null);
  const [syncLogs, setSyncLogs] = useState([]);
  const [stoppingSync, setStoppingSync] = useState(false);

  // Modals
  const [syncModalTarget, setSyncModalTarget] = useState(null); // single company doc OR 'global'
  const [syncOptions, setSyncOptions] = useState({
    postedWithinDays: '2',
    experienceFilter: 'all',
    categoryFilter: 'all',
    country: 'all',
    customLocations: '',
    includeRemote: true,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [globalProgress, setGlobalProgress] = useState(null);

  // Poll sync status & live terminal logs when scraping is active or terminal is open
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
            setIsSyncing(active);
            if (!active && isSyncing) {
              qc.invalidateQueries(['admin-companies']);
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

    if (isSyncing || terminalOpen) {
      pollStatus();
      intervalId = setInterval(pollStatus, 1200);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isSyncing, terminalOpen, qc]);

  // Auto-Logo Search state for Admin
  const [logoModalOpen, setLogoModalOpen] = useState(false);
  const [logoTerminalOpen, setLogoTerminalOpen] = useState(false);
  const [logoSessionState, setLogoSessionState] = useState(null);
  const [logoSessionLogs, setLogoSessionLogs] = useState([]);
  const [logoSearching, setLogoSearching] = useState(false);
  const [stoppingLogoSearch, setStoppingLogoSearch] = useState(false);

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
              qc.invalidateQueries(['admin-companies']);
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
  }, [logoSearching, logoTerminalOpen, qc]);

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

  // Edit Modal
  const [editingCompany, setEditingCompany] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    logo: '',
    website: '',
    platform: '',
    token: '',
    boardUrl: '',
    industry: '',
    description: '',
    isAutoSync: false,
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Scheduler Settings Modal
  const [showSchedulerModal, setShowSchedulerModal] = useState(false);
  const [schedulerConfig, setSchedulerConfig] = useState({
    autoSyncScheduleTime: '02:00',
    autoSyncEnabled: true,
    autoSyncFilterPostedWithinDays: 2,
    autoSyncFilterExperience: 'all',
    autoSyncFilterCategory: 'all',
    autoSyncCompaniesCount: 0,
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch Companies
  const { data: resData, isLoading, isFetching } = useQuery({
    queryKey: [
      'admin-companies',
      {
        page,
        limit,
        search: debouncedSearch,
        platform,
        hasOpenRoles,
        isAutoSync: isAutoSyncOnly,
        startingWith: startingWith === 'All' ? '' : startingWith,
        sort,
      },
    ],
    queryFn: () =>
      companiesApi.adminGetAll({
        page,
        limit,
        search: debouncedSearch,
        platform,
        hasOpenRoles,
        isAutoSync: isAutoSyncOnly,
        startingWith: startingWith === 'All' ? '' : startingWith,
        sort,
      }),
    keepPreviousData: true,
  });

  const companies = resData?.data?.data || [];
  const pagination = resData?.data?.pagination || { page: 1, limit: 25, total: 0, pages: 1 };
  const stats = pagination?.stats || {
    totalCompanies: 0,
    withOpenRoles: 0,
    autoSyncCount: 0,
    totalJobs: 0,
  };

  // Fetch Scheduler Settings when opening modal
  const fetchSchedulerSettings = async () => {
    try {
      const res = await companiesApi.getSchedulerSettings();
      if (res?.data?.data) {
        setSchedulerConfig(res.data.data);
      }
    } catch {
      toast.error('Could not load scheduler settings');
    }
  };

  // ── Multi-select handlers ──────────────────────────────────────────────────
  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllOnPage = () => {
    const pageIds = companies.map((c) => c._id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  // ── Single Company Sync ───────────────────────────────────────────────────
  const handleSingleSync = async () => {
    if (!syncModalTarget) return;
    setIsSyncing(true);
    try {
      const res = await companiesApi.syncCompany(syncModalTarget._id, syncOptions);
      const data = res.data?.data;
      toast.success(
        `Synced "${syncModalTarget.name}": +${data?.saved || 0} jobs added (${data?.skippedDuplicates || 0} duplicates skipped)!`,
        { duration: 5000 }
      );
      qc.invalidateQueries(['admin-companies']);
      qc.invalidateQueries(['admin-jobs']);
      setSyncModalTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Global Multi-Company Sync ─────────────────────────────────────────────
  const handleGlobalSync = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.error('Please select at least one company to sync');
      return;
    }

    setIsSyncing(true);
    setTerminalOpen(true);
    setSyncModalTarget(null);

    try {
      const res = await companiesApi.globalSync({
        companyIds: ids,
        ...syncOptions,
      });

      toast.success(
        res.data?.message || `Global ATS scrape started for ${ids.length} companies! Live terminal opened.`,
        { duration: 5000 }
      );
      clearSelection();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Global sync failed');
      setIsSyncing(false);
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

  // ── Toggle Auto-Sync Flag ──────────────────────────────────────────────────
  const handleToggleAutoSync = async (ids, newState) => {
    try {
      await companiesApi.toggleAutoSync({
        companyIds: Array.isArray(ids) ? ids : [ids],
        isAutoSync: newState,
      });
      toast.success(
        `${Array.isArray(ids) ? ids.length : 1} company(ies) ${newState ? 'added to' : 'removed from'} Daily Auto-Sync`
      );
      qc.invalidateQueries(['admin-companies']);
    } catch {
      toast.error('Failed to update auto-sync status');
    }
  };

  // ── Edit Company Info ──────────────────────────────────────────────────────
  const openEditModal = (c) => {
    setEditingCompany(c);
    setEditForm({
      name: c.name || '',
      logo: c.logo || '',
      website: c.website || '',
      platform: c.platform || '',
      token: c.token || '',
      boardUrl: c.boardUrl || '',
      industry: c.industry || '',
      description: c.description || '',
      isAutoSync: Boolean(c.isAutoSync),
    });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'unsigned_preset');

    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) throw new Error('Cloudinary cloud name is not set in environment variables');

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.secure_url) {
        setEditForm((f) => ({ ...f, logo: data.secure_url }));
        toast.success('Company logo uploaded!');
      } else {
        throw new Error(data.error?.message || 'Upload failed');
      }
    } catch (err) {
      toast.error(err.message || 'Error uploading image');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    if (!editingCompany) return;
    try {
      await companiesApi.updateInfo(editingCompany._id, editForm);
      toast.success(
        `Updated "${editForm.name}"! Logo & company name updated across all job cards.`,
        { duration: 4500 }
      );
      qc.invalidateQueries(['admin-companies']);
      qc.invalidateQueries(['admin-jobs']);
      setEditingCompany(null);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update company');
    }
  };

  // ── Scheduler Settings Save ────────────────────────────────────────────────
  const handleSaveSchedulerSettings = async (e) => {
    e.preventDefault();
    try {
      await companiesApi.updateSchedulerSettings(schedulerConfig);
      toast.success(`Daily Auto-Sync scheduled at ${schedulerConfig.autoSyncScheduleTime} every day!`);
      setShowSchedulerModal(false);
      qc.invalidateQueries(['admin-companies']);
    } catch {
      toast.error('Failed to update scheduler settings');
    }
  };

  const handleTriggerAutoSyncNow = async () => {
    try {
      await companiesApi.runSchedulerNow();
      toast.success('Auto-sync started in background for all enabled companies!');
    } catch {
      toast.error('Failed to trigger background auto-sync');
    }
  };

  const isAllPageSelected =
    companies.length > 0 && companies.every((c) => selectedIds.has(c._id));

  return (
    <div className="space-y-6">
      {/* Live Terminal Modal for ATS Scrape */}
      <LiveSyncTerminal
        isOpen={terminalOpen}
        onClose={() => setTerminalOpen(false)}
        syncState={syncState}
        syncLogs={syncLogs}
        syncing={isSyncing}
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

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-accent-blue" />
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
              Companies &amp; ATS Job Boards
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Directory of 12,000+ companies across Greenhouse, Ashby, Lever, Workday, Workable, and more with live sync &amp; daily scheduler.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setLogoModalOpen(true)}
            disabled={logoSearching}
            className="btn btn-sm px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 transition-all"
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
              className="btn btn-ghost btn-sm px-3 py-1.5 rounded-xl border border-emerald-500/40 text-xs font-mono flex items-center gap-1.5 cursor-pointer text-emerald-400 hover:text-emerald-300 bg-emerald-500/10"
              title="Open Logo Crawler Terminal"
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Logo Terminal</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setSyncOptions((prev) => ({
                ...prev,
                postedWithinDays: '2',
                experienceFilter: '0_1',
                categoryFilter: 'Tech',
              }));
              setSyncModalTarget('global');
            }}
            disabled={isSyncing}
            className="btn btn-sm px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-accent-blue via-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Global ATS scrape for 0-1 years experience (last 2 days)"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>0-1 Yrs Global Scrape (2 Days)</span>
            {isSyncing && <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping ml-1" />}
          </button>

          <button
            type="button"
            onClick={() => setTerminalOpen(true)}
            className="btn btn-ghost btn-sm px-3 py-1.5 rounded-xl border border-border text-xs font-mono flex items-center gap-1.5 cursor-pointer text-text-secondary hover:text-text-primary"
            title="Open Live Terminal"
          >
            <Terminal className="w-3.5 h-3.5 text-accent-green" />
            <span>Live Terminal</span>
            {isSyncing && <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />}
          </button>

          <button
            onClick={() => {
              fetchSchedulerSettings();
              setShowSchedulerModal(true);
            }}
            className="btn btn-secondary btn-sm flex items-center gap-2 shadow-sm"
          >
            <Clock className="w-4 h-4 text-accent-blue" />
            <span>Daily Auto-Sync</span>
          </button>

          {selectedIds.size > 0 && (
            <button
              onClick={() => {
                setSyncModalTarget('global');
              }}
              className="btn btn-primary btn-sm flex items-center gap-2 shadow-md animate-pulse"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Sync Selected ({selectedIds.size})</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Stats Ribbon ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card p-3 sm:p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-accent-blue" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-text-muted uppercase font-medium">Directory Companies</p>
            <p className="text-lg sm:text-xl font-bold text-text-primary truncate">
              {(stats.totalCompanies || pagination.total || 12244).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="card p-3 sm:p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-green/10 border border-accent-green/20 flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-5 h-5 text-accent-green" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-text-muted uppercase font-medium">With Open Roles</p>
            <p className="text-lg sm:text-xl font-bold text-accent-green truncate">
              {(stats.withOpenRoles || 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="card p-3 sm:p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
            <Radio className="w-5 h-5 text-purple-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-text-muted uppercase font-medium">Daily Auto-Sync</p>
            <p className="text-lg sm:text-xl font-bold text-purple-400 truncate">
              {(stats.autoSyncCount || 0).toLocaleString()} Active
            </p>
          </div>
        </div>

        <div className="card p-3 sm:p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-yellow/10 border border-accent-yellow/20 flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5 text-accent-yellow" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-text-muted uppercase font-medium">Active Jobs in DB</p>
            <p className="text-lg sm:text-xl font-bold text-accent-yellow truncate">
              {(stats.totalJobs || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Bar ────────────────────────────────────────────── */}
      <div className="card p-4 space-y-3">
        {/* Top search & platform row */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies by name, slug, token (e.g. Stripe, Coinbase, Datadog)..."
              className="input pl-9 w-full text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Platform select */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-text-muted flex-shrink-0" />
            <select
              value={platform}
              onChange={(e) => {
                setPlatform(e.target.value);
                setPage(1);
              }}
              className="input text-xs sm:text-sm py-1.5"
            >
              {PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Open Roles filter */}
          <select
            value={hasOpenRoles}
            onChange={(e) => {
              setHasOpenRoles(e.target.value);
              setPage(1);
            }}
            className="input text-xs sm:text-sm py-1.5"
          >
            <option value="all">Roles: All Companies</option>
            <option value="yes">Roles: Has Open Roles &gt; 0</option>
            <option value="no">Roles: 0 Roles Listed</option>
          </select>

          {/* Auto-Sync filter */}
          <select
            value={isAutoSyncOnly}
            onChange={(e) => {
              setIsAutoSyncOnly(e.target.value);
              setPage(1);
            }}
            className="input text-xs sm:text-sm py-1.5"
          >
            <option value="all">Auto-Sync: All</option>
            <option value="true">Auto-Sync: Enabled Only</option>
            <option value="false">Auto-Sync: Disabled Only</option>
          </select>

          {/* Sort order */}
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="input text-xs sm:text-sm py-1.5"
          >
            <option value="openRoles">Sort: Most Open Roles</option>
            <option value="name">Sort: Name (A-Z)</option>
            <option value="-name">Sort: Name (Z-A)</option>
            <option value="jobCount">Sort: Most Synced Jobs</option>
            <option value="lastSyncAt">Sort: Recently Synced</option>
          </select>
        </div>

        {/* Alphabet fast filter pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 pt-1 scrollbar-thin">
          {ALPHABET.map((char) => (
            <button
              key={char}
              onClick={() => {
                setStartingWith(char);
                setPage(1);
              }}
              className={`px-2 py-0.5 text-xs rounded font-medium flex-shrink-0 transition-colors ${
                startingWith === char
                  ? 'bg-accent-blue text-white font-bold'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary'
              }`}
            >
              {char}
            </button>
          ))}
        </div>
      </div>

      {/* ── Selection Action Banner (when any checked) ──────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-accent-blue/10 border border-accent-blue/25 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-accent-blue flex-shrink-0" />
            <span className="font-semibold text-text-primary">
              {selectedIds.size} company(ies) selected
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleToggleAutoSync(Array.from(selectedIds), true)}
              className="btn btn-secondary btn-xs"
            >
              Enable Daily Auto-Sync
            </button>
            <button
              onClick={() => handleToggleAutoSync(Array.from(selectedIds), false)}
              className="btn btn-secondary btn-xs"
            >
              Disable Auto-Sync
            </button>
            <button
              onClick={() => setSyncModalTarget('global')}
              className="btn btn-primary btn-xs flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sync Selected Now
            </button>
            <button
              onClick={clearSelection}
              className="text-xs text-text-faint hover:text-text-primary underline ml-2"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* ── Companies Table ─────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Spinner size="lg" />
            <p className="text-xs text-text-muted">Loading companies directory...</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Building2 className="w-12 h-12 text-text-faint mx-auto opacity-40" />
            <p className="text-sm font-semibold text-text-primary">No companies found</p>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              No companies match your search or filter criteria. Try adjusting your platform or search query.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setPlatform('all');
                setHasOpenRoles('all');
                setIsAutoSyncOnly('all');
                setStartingWith('All');
              }}
              className="btn btn-secondary btn-xs"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-secondary/40 text-text-muted text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={selectAllOnPage}
                      className="w-4 h-4 rounded border-border text-accent-blue focus:ring-accent-blue/30 cursor-pointer accent-accent-blue"
                      title="Select all on page"
                    />
                  </th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-3">ATS Platform</th>
                  <th className="py-3 px-3 text-center">Open Roles</th>
                  <th className="py-3 px-3 text-center">Synced In DB</th>
                  <th className="py-3 px-3 text-center">Auto-Sync</th>
                  <th className="py-3 px-3">Last Sync</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {companies.map((c) => {
                  const isChecked = selectedIds.has(c._id);
                  const firstChar = (c.name || 'C').charAt(0).toUpperCase();

                  return (
                    <tr
                      key={c._id}
                      className={`hover:bg-bg-secondary/40 transition-colors ${
                        isChecked ? 'bg-accent-blue/5' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(c._id)}
                          className="w-4 h-4 rounded border-border text-accent-blue focus:ring-accent-blue/30 cursor-pointer accent-accent-blue"
                        />
                      </td>

                      {/* Company Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-bg-secondary border border-border flex items-center justify-center flex-shrink-0">
                            {c.logo ? (
                              <img
                                src={c.logo}
                                alt={c.name}
                                className={`w-full h-full object-contain ${
                                  c.hasWhiteBg ? 'bg-white' : ''
                                }`}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <span className="text-xs font-bold text-accent-blue">
                                {firstChar}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Link
                                to={`/companies/${c.slug}`}
                                className="font-semibold text-text-primary hover:text-accent-blue transition-colors truncate"
                                title="Open Company Career Board"
                              >
                                {c.name}
                              </Link>
                              {c.isPopular && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-accent-yellow/15 text-accent-yellow font-bold">
                                  Top
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-text-faint truncate">
                              <span>slug: {c.slug}</span>
                              {c.token && <span>· token: {c.token}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* ATS Platform */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-bg-secondary border border-border text-text-secondary capitalize">
                          {c.platform || 'Unknown'}
                        </span>
                      </td>

                      {/* Open Roles */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {c.openRoles > 0 ? (
                          <span className="font-bold text-accent-green bg-accent-green/10 border border-accent-green/20 px-2 py-0.5 rounded-full text-xs">
                            {c.openRoles} roles
                          </span>
                        ) : (
                          <span className="text-text-faint text-xs">0</span>
                        )}
                      </td>

                      {/* Synced Jobs Count in DB */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {c.jobCount > 0 ? (
                          <span className="font-semibold text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded text-xs">
                            {c.jobCount} in DB
                          </span>
                        ) : (
                          <span className="text-text-faint text-xs">—</span>
                        )}
                      </td>

                      {/* Auto-Sync Toggle Checkbox */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleAutoSync(c._id, !c.isAutoSync)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                            c.isAutoSync
                              ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                              : 'bg-bg-secondary text-text-faint hover:text-text-primary'
                          }`}
                          title="Toggle automated daily scraping for this company"
                        >
                          <Radio className="w-2.5 h-2.5" />
                          {c.isAutoSync ? 'Daily Active' : 'Off'}
                        </button>
                      </td>

                      {/* Last Sync Info */}
                      <td className="py-3 px-3 whitespace-nowrap text-[11px] text-text-muted">
                        {c.lastSyncAt ? (
                          <div className="space-y-0.5">
                            <span className="text-text-secondary">
                              {new Date(c.lastSyncAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                            <span
                              className={`block text-[10px] ${
                                c.syncStatus === 'success'
                                  ? 'text-accent-green'
                                  : c.syncStatus === 'failed'
                                  ? 'text-accent-red'
                                  : 'text-text-faint'
                              }`}
                            >
                              {c.syncStatus}
                            </span>
                          </div>
                        ) : (
                          <span className="text-text-faint">Never</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Sync single company */}
                          <button
                            type="button"
                            onClick={() => setSyncModalTarget(c)}
                            className="btn-icon btn-ghost btn-sm text-accent-blue hover:bg-accent-blue/10"
                            title="Scrape & Sync Jobs for this company"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>

                          {/* View Career Page */}
                          <Link
                            to={`/companies/${c.slug}`}
                            className="btn-icon btn-ghost btn-sm text-text-muted hover:text-text-primary"
                            title="Open Career Page & Jobs"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          {/* Edit Info / Logo */}
                          <button
                            type="button"
                            onClick={() => openEditModal(c)}
                            className="btn-icon btn-ghost btn-sm text-text-muted hover:text-text-primary"
                            title="Edit company info & logo"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ────────────────────────────────────────────────────── */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
            <div>
              Showing page <strong className="text-text-primary">{pagination.page}</strong> of{' '}
              <strong className="text-text-primary">{pagination.pages}</strong> ({pagination.total} companies)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn btn-secondary btn-xs flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                className="btn btn-secondary btn-xs flex items-center gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal 1: Scraping Requirements Filter Modal (Single or Global) ─── */}
      {syncModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !isSyncing && setSyncModalTarget(null)}
          />
          <div className="relative bg-bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-bg-secondary/40">
              <div className="flex items-center gap-2">
                <RefreshCw className={`w-5 h-5 text-accent-blue ${isSyncing ? 'animate-spin' : ''}`} />
                <h3 className="text-sm font-bold text-text-primary">
                  {syncModalTarget === 'global'
                    ? `Global Sync (${selectedIds.size} Companies)`
                    : `Sync Jobs: ${syncModalTarget.name}`}
                </h3>
              </div>
              {!isSyncing && (
                <button
                  onClick={() => setSyncModalTarget(null)}
                  className="p-1 rounded text-text-muted hover:text-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <p className="text-xs text-text-muted">
                Configure your scraping requirements below. The ATS API will fetch live job postings, verify
                direct application links, skip existing duplicates, and categorize Tech/Non-Tech roles.
              </p>

              {/* Requirement 1: Date Filter */}
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  📅 Jobs Posted Within:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DATE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={isSyncing}
                      onClick={() => setSyncOptions((o) => ({ ...o, postedWithinDays: opt.value }))}
                      className={`p-2.5 rounded-lg border text-xs text-left transition-all ${
                        syncOptions.postedWithinDays === opt.value
                          ? 'border-accent-blue bg-accent-blue/10 text-accent-blue font-semibold ring-1 ring-accent-blue'
                          : 'border-border bg-bg-secondary/40 text-text-secondary hover:border-border/80'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Requirement 2: Experience Filter */}
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  🎓 Experience Level:
                </label>
                <select
                  disabled={isSyncing}
                  value={syncOptions.experienceFilter}
                  onChange={(e) =>
                    setSyncOptions((o) => ({ ...o, experienceFilter: e.target.value }))
                  }
                  className="input w-full text-xs"
                >
                  {EXPERIENCE_OPTIONS.map((exp) => (
                    <option key={exp.value} value={exp.value}>
                      {exp.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Requirement 3: Category Filter */}
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  💼 Category:
                </label>
                <select
                  disabled={isSyncing}
                  value={syncOptions.categoryFilter}
                  onChange={(e) =>
                    setSyncOptions((o) => ({ ...o, categoryFilter: e.target.value }))
                  }
                  className="input w-full text-xs"
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Requirement 4: Country & Location Filter (Strict) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-text-primary">
                    🌍 Target Country / Location:
                  </label>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent-blue/15 text-accent-blue font-bold uppercase border border-accent-blue/30">
                    {syncOptions.country === 'all' ? 'Worldwide' : (syncOptions.country || 'all').toUpperCase()}
                  </span>
                </div>
                <select
                  disabled={isSyncing}
                  value={syncOptions.country || 'all'}
                  onChange={(e) =>
                    setSyncOptions((o) => ({ ...o, country: e.target.value }))
                  }
                  className="input w-full text-xs"
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>

                {syncOptions.country === 'custom' && (
                  <div className="pt-1 space-y-1">
                    <input
                      type="text"
                      disabled={isSyncing}
                      value={syncOptions.customLocations || ''}
                      onChange={(e) =>
                        setSyncOptions((o) => ({ ...o, customLocations: e.target.value }))
                      }
                      placeholder="e.g. Singapore, Australia, Dubai, Tokyo, Amsterdam"
                      className="input w-full text-xs py-1.5"
                    />
                    <p className="text-[10px] text-text-faint">
                      Comma-separated cities/countries. Only jobs matching these keywords will be scraped.
                    </p>
                  </div>
                )}

                {syncOptions.country !== 'all' && syncOptions.country !== 'remote' && (
                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={isSyncing}
                      checked={syncOptions.includeRemote !== false}
                      onChange={(e) =>
                        setSyncOptions((o) => ({ ...o, includeRemote: e.target.checked }))
                      }
                      className="rounded border-border text-accent-blue focus:ring-accent-blue"
                    />
                    <span className="text-[11px] text-text-muted">
                      Include global remote positions (alongside {syncOptions.country === 'custom' ? 'custom locations' : (syncOptions.country || '').toUpperCase()})
                    </span>
                  </label>
                )}
              </div>

              {/* Progress Indicator for Global Sync */}
              {isSyncing && globalProgress && (
                <div className="p-3 rounded-lg bg-bg-secondary border border-border space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-accent-blue">Processing Companies...</span>
                    <span className="text-text-muted">
                      {globalProgress.total} companies selected
                    </span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-accent-blue h-full transition-all duration-300 animate-pulse"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <p className="text-[11px] text-text-faint text-center">
                    Fetching ATS endpoints sequentially with rate-limit safety...
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2 bg-bg-secondary/30">
              <button
                type="button"
                disabled={isSyncing}
                onClick={() => setSyncModalTarget(null)}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSyncing}
                onClick={syncModalTarget === 'global' ? handleGlobalSync : handleSingleSync}
                className="btn btn-primary btn-sm flex items-center gap-2"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Syncing Jobs...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start Sync</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 2: Edit Company Info & Logo ──────────────────────────────── */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setEditingCompany(null)}
          />
          <div className="relative bg-bg-card border border-border rounded-xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-bg-secondary/40">
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  Edit Company: {editingCompany.name}
                </h3>
                <p className="text-xs text-text-muted">
                  Update company logo, original formatted name, and ATS board details.
                </p>
              </div>
              <button
                onClick={() => setEditingCompany(null)}
                className="p-1 rounded text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCompany} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Logo Preview & Upload */}
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Company Logo
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl border border-border bg-bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
                    {editForm.logo ? (
                      <img
                        src={editForm.logo}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-xl font-bold text-accent-blue">
                        {(editForm.name || 'C').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      value={editForm.logo}
                      onChange={(e) => setEditForm((f) => ({ ...f, logo: e.target.value }))}
                      placeholder="https://... direct logo image URL"
                      className="input w-full text-xs"
                    />
                    <div className="flex items-center gap-2">
                      <label className="btn btn-secondary btn-xs cursor-pointer flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingLogo ? 'Uploading...' : 'Upload Image'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[11px] text-text-faint">
                        Automatically cascades to all job cards for this company.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Official Company Name <span className="text-accent-red">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="input w-full text-sm"
                  placeholder="e.g. Stripe, Razorpay, Datadog"
                />
                <p className="text-[11px] text-text-faint mt-1">
                  Shown as the original formatted title on job cards instead of slug.
                </p>
              </div>

              {/* Website */}
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Company Website
                </label>
                <input
                  type="url"
                  value={editForm.website}
                  onChange={(e) => setEditForm((f) => ({ ...f, website: e.target.value }))}
                  className="input w-full text-sm"
                  placeholder="https://company.com"
                />
              </div>

              {/* ATS Platform & Board Token */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    ATS Platform
                  </label>
                  <select
                    value={editForm.platform}
                    onChange={(e) => setEditForm((f) => ({ ...f, platform: e.target.value }))}
                    className="input w-full text-xs"
                  >
                    <option value="">Select Platform</option>
                    {PLATFORMS.filter((p) => p.id !== 'all').map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Board Token / Slug
                  </label>
                  <input
                    type="text"
                    value={editForm.token}
                    onChange={(e) => setEditForm((f) => ({ ...f, token: e.target.value }))}
                    className="input w-full text-xs"
                    placeholder="e.g. stripe, datadog, figma"
                  />
                </div>
              </div>

              {/* Board URL */}
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Career Board Direct URL
                </label>
                <input
                  type="url"
                  value={editForm.boardUrl}
                  onChange={(e) => setEditForm((f) => ({ ...f, boardUrl: e.target.value }))}
                  className="input w-full text-xs"
                  placeholder="https://boards.greenhouse.io/stripe"
                />
              </div>

              {/* Industry & Auto-Sync Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isAutoSync}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, isAutoSync: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-border text-accent-blue focus:ring-accent-blue/30 cursor-pointer accent-accent-blue"
                  />
                  <span className="text-xs font-semibold text-text-primary">
                    Enable Daily Automated Scraper
                  </span>
                </label>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 3: Daily Auto-Sync Scheduler Settings ────────────────────── */}
      {showSchedulerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowSchedulerModal(false)}
          />
          <div className="relative bg-bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-bg-secondary/40">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-accent-blue" />
                <h3 className="text-sm font-bold text-text-primary">
                  Automated Daily Cron Job Settings
                </h3>
              </div>
              <button
                onClick={() => setShowSchedulerModal(false)}
                className="p-1 rounded text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedulerSettings} className="p-5 space-y-4">
              <p className="text-xs text-text-muted">
                Configure the daily cron job that automatically crawls and fetches the latest jobs for all
                companies where <strong>Daily Auto-Sync</strong> is enabled.
              </p>

              {/* Time Picker */}
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  ⏰ Daily Execution Time (24h format):
                </label>
                <input
                  type="time"
                  required
                  value={schedulerConfig.autoSyncScheduleTime}
                  onChange={(e) =>
                    setSchedulerConfig((c) => ({ ...c, autoSyncScheduleTime: e.target.value }))
                  }
                  className="input w-48 text-sm"
                />
                <p className="text-[11px] text-text-faint mt-1">
                  Runs automatically every day at this exact time (e.g. 02:00 AM).
                </p>
              </div>

              {/* Enable / Disable toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cronToggle"
                  checked={schedulerConfig.autoSyncEnabled}
                  onChange={(e) =>
                    setSchedulerConfig((c) => ({ ...c, autoSyncEnabled: e.target.checked }))
                  }
                  className="w-4 h-4 rounded border-border text-accent-blue focus:ring-accent-blue/30 cursor-pointer accent-accent-blue"
                />
                <label htmlFor="cronToggle" className="text-xs font-semibold text-text-primary cursor-pointer">
                  Enable Cron Scheduler Active
                </label>
              </div>

              {/* Default Filters for daily run */}
              <div className="p-3 rounded-lg bg-bg-secondary border border-border space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                  Default Daily Scrape Filters
                </span>

                <div>
                  <label className="block text-xs text-text-secondary mb-1">
                    Scrape Jobs Posted Within:
                  </label>
                  <select
                    value={schedulerConfig.autoSyncFilterPostedWithinDays}
                    onChange={(e) =>
                      setSchedulerConfig((c) => ({
                        ...c,
                        autoSyncFilterPostedWithinDays: Number(e.target.value),
                      }))
                    }
                    className="input w-full text-xs"
                  >
                    <option value="1">Last 24 Hours</option>
                    <option value="2">Last 2 Days (Recommended)</option>
                    <option value="7">Last 1 Week</option>
                    <option value="30">Last 1 Month</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-text-secondary mb-1">Experience Level:</label>
                  <select
                    value={schedulerConfig.autoSyncFilterExperience}
                    onChange={(e) =>
                      setSchedulerConfig((c) => ({
                        ...c,
                        autoSyncFilterExperience: e.target.value,
                      }))
                    }
                    className="input w-full text-xs"
                  >
                    {EXPERIENCE_OPTIONS.map((e) => (
                      <option key={e.value} value={e.value}>
                        {e.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Companies summary */}
              <div className="text-xs text-text-muted flex items-center justify-between p-2 rounded bg-bg-secondary/40">
                <span>Companies currently enabled for auto-sync:</span>
                <span className="font-bold text-accent-blue">
                  {schedulerConfig.autoSyncCompaniesCount || stats.autoSyncCount || 0}
                </span>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleTriggerAutoSyncNow}
                  className="btn btn-secondary btn-xs flex items-center gap-1.5"
                  title="Run cron job right now in background"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Run Now In Background</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSchedulerModal(false)}
                    className="btn btn-secondary btn-sm"
                  >
                    Close
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm">
                    Save Schedule
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
