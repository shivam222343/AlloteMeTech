import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles, PenLine, List, Loader2, Trash2, RefreshCw, Plus,
  ExternalLink, CheckCircle2, AlertCircle, X, MapPin, Briefcase,
  Banknote, ChevronDown, ChevronUp, Send, Eye, EyeOff,
  Building2, Check, Mail, Phone, Upload, Image, Link2, Key, Copy,
  Terminal, Clock,
} from 'lucide-react';
import { jobsApi } from '../../api';
import toast from 'react-hot-toast';
import {
  WhatsAppIcon,
  formatJobForWhatsApp,
  formatMultipleJobsForWhatsApp,
  shareOnWhatsApp,
  formatTimeAgo,
} from '../../components/jobs/whatsappHelper';

const formatCompanyName = (job) => {
  if (job?.company?.name && job.company.name.trim()) return job.company.name.trim();
  const raw = (job?.companyName || job?.companyTag || '').trim();
  if (!raw) return 'Company';
  if (raw === raw.toLowerCase()) {
    return raw.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return raw;
};

const JOB_TYPES = ['Full-time', 'Part-time', 'Internship', 'Contract', 'Freelance'];
const WORK_MODES = ['Remote', 'Hybrid', 'On-site'];

const EMPTY_FORM = {
  title: '', companyTag: '', companyName: '', companyLogo: '',
  category: 'Tech',
  location: 'Remote', workMode: 'Remote', jobType: 'Full-time',
  salary: '', experience: '', eligibleBatch: '',
  description: '', responsibilities: [], requirements: [],
  applyLink: '', applyEmail: '', contactPhone: '', tags: [],
  isFeatured: false, isActive: true, deadline: '',
};

// ── Shared sub-components ─────────────────────────────────────────────────────
function FieldRow({ label, children, required }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-muted mb-1">
        {label}{required && <span className="text-accent-red ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function ArrayField({ label, value, onChange, placeholder }) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (v) { onChange([...value, v]); setInput(''); }
  };
  return (
    <div>
      <label className="block text-xs font-medium text-text-muted mb-1">{label}</label>
      <div className="space-y-1 mb-2">
        {value.map((item, i) => (
          <div key={i} className="flex items-start gap-2 p-2 bg-bg-secondary rounded text-sm text-text-secondary">
            <span className="flex-1">{item}</span>
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-text-faint hover:text-accent-red">×</button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="input flex-1 text-sm"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={placeholder}
        />
        <button type="button" onClick={add} className="btn btn-ghost btn-sm">Add</button>
      </div>
    </div>
  );
}

function TagsField({ value, onChange }) {
  const [input, setInput] = useState('');
  const add = () => {
    const tags = input.split(',').map(t => t.trim()).filter(Boolean);
    onChange([...new Set([...value, ...tags])]);
    setInput('');
  };
  return (
    <div>
      <label className="block text-xs font-medium text-text-muted mb-1">Tags (comma separated)</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-bg-secondary border border-border rounded text-text-muted">
            {tag}
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="hover:text-accent-red">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="input flex-1 text-sm"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="e.g. React, Node.js, Python"
        />
        <button type="button" onClick={add} className="btn btn-ghost btn-sm">Add</button>
      </div>
    </div>
  );
}

function JobForm({ initialData = EMPTY_FORM, onSubmit, isLoading, submitLabel = 'Post Job' }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initialData });
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title) return toast.error('Job title is required');
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldRow label="Job Title" required>
          <input className="input w-full text-sm" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Software Engineer Intern" />
        </FieldRow>
        <FieldRow label="Company Tag (slug)">
          <input className="input w-full text-sm" value={form.companyTag} onChange={e => set('companyTag', e.target.value.toLowerCase())} placeholder="e.g. ibm, flipkart, google" />
          <p className="text-xs text-text-faint mt-1">Matches existing Company record to auto-load logo</p>
        </FieldRow>
        <FieldRow label="Company Name (fallback)">
          <input className="input w-full text-sm" value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="e.g. IBM" />
        </FieldRow>
        <FieldRow label="Company Logo URL (fallback)">
          <input className="input w-full text-sm" value={form.companyLogo} onChange={e => set('companyLogo', e.target.value)} placeholder="https://..." />
        </FieldRow>
        <FieldRow label="Category" required>
          <select className="input w-full text-sm font-medium" value={form.category || 'Tech'} onChange={e => set('category', e.target.value)}>
            <option value="Tech">💻 Tech Job</option>
            <option value="Non-Tech">💼 Non-Tech Job</option>
          </select>
        </FieldRow>
        <FieldRow label="Job Type" required>
          <select className="input w-full text-sm" value={form.jobType} onChange={e => set('jobType', e.target.value)}>
            {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </FieldRow>
        <FieldRow label="Work Mode" required>
          <select className="input w-full text-sm" value={form.workMode} onChange={e => set('workMode', e.target.value)}>
            {WORK_MODES.map(m => <option key={m}>{m}</option>)}
          </select>
        </FieldRow>
        <FieldRow label="Location">
          <input className="input w-full text-sm" value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Bangalore or Remote" />
        </FieldRow>
        <FieldRow label="Salary / Stipend">
          <input className="input w-full text-sm" value={form.salary} onChange={e => set('salary', e.target.value)} placeholder="e.g. ₹25,000-30,000/month" />
        </FieldRow>
        <FieldRow label="Experience Required">
          <input className="input w-full text-sm" value={form.experience} onChange={e => set('experience', e.target.value)} placeholder="e.g. Fresher or 2-4 years" />
        </FieldRow>
        <FieldRow label="Eligible Batch">
          <input className="input w-full text-sm" value={form.eligibleBatch} onChange={e => set('eligibleBatch', e.target.value)} placeholder="e.g. 2024-2026" />
        </FieldRow>
        <FieldRow label="Apply Link">
          <input className="input w-full text-sm" value={form.applyLink} onChange={e => set('applyLink', e.target.value)} placeholder="https://..." />
        </FieldRow>
        <FieldRow label="Apply Email">
          <input className="input w-full text-sm" value={form.applyEmail} onChange={e => set('applyEmail', e.target.value)} placeholder="hiring@company.com" />
        </FieldRow>
        <FieldRow label="Contact Phone / WhatsApp">
          <input className="input w-full text-sm" value={form.contactPhone || ''} onChange={e => set('contactPhone', e.target.value)} placeholder="+91 9876543210" />
        </FieldRow>
        <FieldRow label="Application Deadline">
          <input type="date" className="input w-full text-sm" value={form.deadline ? form.deadline.split('T')[0] : ''} onChange={e => set('deadline', e.target.value)} />
        </FieldRow>
      </div>
      <FieldRow label="Description">
        <textarea className="input w-full text-sm h-20 resize-none" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description of the role..." />
      </FieldRow>
      <ArrayField label="Responsibilities" value={form.responsibilities} onChange={v => set('responsibilities', v)} placeholder="Add a responsibility..." />
      <ArrayField label="Requirements" value={form.requirements} onChange={v => set('requirements', v)} placeholder="Add a requirement..." />
      <TagsField value={form.tags} onChange={v => set('tags', v)} />
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
          <input type="checkbox" checked={form.isFeatured} onChange={e => set('isFeatured', e.target.checked)} className="rounded" />
          Featured
        </label>
        <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
          <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="rounded" />
          Active
        </label>
      </div>
      <div className="flex justify-end pt-2 border-t border-border">
        <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

// ── Parsed Job Preview Card ───────────────────────────────────────────────────
const TYPE_COLORS = {
  'Full-time': 'text-accent-green bg-accent-green/10',
  'Internship': 'text-accent-blue bg-accent-blue/10',
  'Part-time': 'text-accent-yellow bg-accent-yellow/10',
  'Contract': 'text-purple-400 bg-purple-400/10',
  'Freelance': 'text-orange-400 bg-orange-400/10',
};
const MODE_COLORS = {
  Remote: 'text-accent-green bg-accent-green/10',
  Hybrid: 'text-accent-blue bg-accent-blue/10',
  'On-site': 'text-text-muted bg-bg-secondary',
};

function ParsedJobCard({ job, index, selected, onToggle, onEdit }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`border rounded-xl transition-colors overflow-hidden ${selected ? 'border-accent-blue bg-accent-blue/5' : 'border-border bg-bg-card'}`}>
      {/* Card header */}
      <div className="flex items-center gap-3 p-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(index)}
          className="w-4 h-4 accent-accent-blue flex-shrink-0 cursor-pointer"
        />

        {/* Company initial */}
        <div className="w-9 h-9 rounded-lg bg-bg-secondary border border-border flex items-center justify-center flex-shrink-0">
          <span className="text-base font-bold text-text-faint">
            {formatCompanyName(job).charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-accent-blue font-medium truncate">{formatCompanyName(job)}</p>
          <p className="text-sm font-semibold text-text-primary leading-tight line-clamp-1">{job.title}</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${TYPE_COLORS[job.jobType] || 'bg-bg-secondary text-text-muted'}`}>{job.jobType}</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${MODE_COLORS[job.workMode] || 'bg-bg-secondary text-text-muted'}`}>{job.workMode}</span>
            {job.eligibleBatch && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-secondary text-text-muted">Batch {job.eligibleBatch}</span>}
          </div>
        </div>

        {/* Salary + location */}
        <div className="hidden sm:block text-right flex-shrink-0 mr-1">
          {job.salary && <p className="text-xs font-semibold text-accent-green">{job.salary}</p>}
          {job.location && <p className="text-[11px] text-text-faint flex items-center justify-end gap-1 mt-0.5"><MapPin className="w-3 h-3" />{job.location}</p>}
        </div>

        {/* Expand / Edit */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => onEdit(index)}
            className="btn-icon btn-ghost w-7 h-7 text-accent-blue"
            title="Edit this job before posting"
          >
            <PenLine className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setExpanded(e => !e)}
            className="btn-icon btn-ghost w-7 h-7"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-3 border-t border-border pt-3 space-y-2 text-xs text-text-muted">
          {job.description && <p>{job.description}</p>}
          <div className="flex flex-wrap gap-3">
            {job.applyLink && <a href={job.applyLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-accent-blue hover:underline"><ExternalLink className="w-3 h-3" />Apply Link</a>}
            {job.applyEmail && <span className="text-text-faint">✉ {job.applyEmail}</span>}
            {job.experience && <span>Exp: {job.experience}</span>}
          </div>
          {job.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {job.tags.map((t, i) => <span key={i} className="px-2 py-0.5 rounded bg-bg-secondary border border-border">{t}</span>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tab 1: AI Bulk Editor ─────────────────────────────────────────────────────
function AIEditorTab({ onOpenGroqSettings }) {
  const queryClient = useQueryClient();

  // Step 1 state
  const [rawText, setRawText] = useState('');
  const [applyLinks, setApplyLinks] = useState('');
  const [parsing, setParsing] = useState(false);

  // Step 2 state
  const [parsedJobs, setParsedJobs] = useState(null); // null = not parsed yet
  const [selected, setSelected] = useState(new Set());
  const [editingIndex, setEditingIndex] = useState(null);

  // Step 3: posting
  const [posting, setPosting] = useState(false);

  // ── Step 1: Parse ──────────────────────────────────────────────────────────
  const handleParse = async () => {
    if (!rawText.trim() || rawText.trim().length < 30) {
      return toast.error('Please paste the job listing text first');
    }
    setParsing(true);
    try {
      const res = await jobsApi.aiBulkParse({ rawText, applyLinks });
      const jobs = res.data.data.jobs;
      setParsedJobs(jobs);
      // Select all by default
      setSelected(new Set(jobs.map((_, i) => i)));
      toast.success(`AI extracted ${jobs.length} job${jobs.length !== 1 ? 's' : ''}!`);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'AI parsing failed. Check your API key or reduce text size.');
    } finally {
      setParsing(false);
    }
  };

  // ── Step 2: Toggle selection ───────────────────────────────────────────────
  const toggleJob = (i) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(prev =>
      prev.size === parsedJobs.length ? new Set() : new Set(parsedJobs.map((_, i) => i))
    );
  };

  // ── Step 2: Inline edit ────────────────────────────────────────────────────
  const updateJob = (index, updated) => {
    setParsedJobs(prev => prev.map((j, i) => i === index ? { ...j, ...updated } : j));
    setEditingIndex(null);
    toast.success('Job updated');
  };

  // ── Step 3: Post selected ──────────────────────────────────────────────────
  const handlePost = async () => {
    if (selected.size === 0) return toast.error('Select at least one job to post');
    const jobsToPost = [...selected].map(i => parsedJobs[i]);
    setPosting(true);
    try {
      const res = await jobsApi.bulkCreate(jobsToPost);
      const { created, errors } = res.data.data;
      toast.success(`Posted ${created} job${created !== 1 ? 's' : ''}!`);
      if (errors?.length > 0) toast.error(`${errors.length} failed — check console`);
      queryClient.invalidateQueries(['admin-jobs']);
      // Reset
      setParsedJobs(null);
      setRawText('');
      setApplyLinks('');
      setSelected(new Set());
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to post jobs');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* ── STEP 1: Paste ── */}
      {!parsedJobs && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-accent-yellow" />
            <h3 className="text-sm font-semibold text-text-primary">AI Bulk Job Parser</h3>
          </div>
          <p className="text-xs text-text-muted mb-4">
            Copy the <strong>entire job listing page</strong> from HireDoor (or any job site) and paste it below.
            The AI will extract <em>all jobs</em> automatically.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Job Listings Text <span className="text-accent-red">*</span>
              </label>
              <textarea
                className="input w-full text-sm h-52 resize-y font-mono"
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder={`Paste the raw job listing text here. Example:\n\nCubiktech\nAI Software Engineering Intern\n5h ago\nInternship · Remote · Batches 2026-2028\n₹25,000–30,000/month\n\nIBM\nResearch Software Intern\n5h ago\nInternship · On-site · Batches 2026-2028\n₹30,000–40,000/month\nGurgaon / Bangalore\n\n...and so on for all jobs`}
              />
              <p className="text-xs text-text-faint mt-1">{rawText.length} characters pasted</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Apply Links / Emails (optional — paste the "How to apply" section)
              </label>
              <textarea
                className="input w-full text-sm h-28 resize-y font-mono"
                value={applyLinks}
                onChange={e => setApplyLinks(e.target.value)}
                placeholder={`Mail to hiring@cubiktech.com\nhttps://lseg.wd3.myworkdayjobs.com/...\nMail to recruitment@instaastro.in\nhttps://careers.ibm.com/...\n...`}
              />
              <p className="text-xs text-text-faint mt-1">The AI will match these to the correct jobs automatically.</p>
            </div>

            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
              <button
                type="button"
                onClick={onOpenGroqSettings}
                className="flex items-center gap-1.5 text-xs text-text-faint hover:text-accent-blue transition-colors text-left"
              >
                <Key className="w-3.5 h-3.5 text-accent-yellow flex-shrink-0" />
                <span>Configure Groq AI Key (Custom key overrides .env)</span>
              </button>
              <button
                onClick={handleParse}
                disabled={parsing || !rawText.trim()}
                className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {parsing ? 'Parsing with AI...' : 'Parse Jobs with AI'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Review parsed jobs ── */}
      {parsedJobs && (
        <div className="space-y-4">
          {/* Header bar */}
          <div className="card p-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent-green" />
              <span className="text-sm font-semibold text-text-primary">
                AI extracted {parsedJobs.length} jobs
              </span>
              <span className="text-xs text-text-faint">— {selected.size} selected</span>
            </div>

            <div className="ml-auto flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={toggleAll}
                className="btn btn-ghost btn-sm text-xs"
              >
                {selected.size === parsedJobs.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                type="button"
                onClick={() => { setParsedJobs(null); setRawText(''); setApplyLinks(''); setSelected(new Set()); }}
                className="btn btn-ghost btn-sm flex items-center gap-1 text-xs"
              >
                <X className="w-3 h-3" /> Start Over
              </button>
              <button
                onClick={handlePost}
                disabled={posting || selected.size === 0}
                className="btn btn-primary btn-sm flex items-center gap-2 disabled:opacity-50"
              >
                {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {posting ? 'Posting...' : `Post ${selected.size} Job${selected.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>

          {/* Job cards list */}
          <div className="space-y-2">
            {parsedJobs.map((job, i) => (
              <ParsedJobCard
                key={i}
                job={job}
                index={i}
                selected={selected.has(i)}
                onToggle={toggleJob}
                onEdit={(idx) => setEditingIndex(idx)}
              />
            ))}
          </div>

          {/* Bottom action */}
          <div className="flex justify-end">
            <button
              onClick={handlePost}
              disabled={posting || selected.size === 0}
              className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {posting ? 'Posting...' : `Post ${selected.size} Selected Job${selected.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* ── Edit modal ── */}
      {editingIndex !== null && parsedJobs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Edit Job Before Posting</h3>
              <button type="button" onClick={() => setEditingIndex(null)} className="btn-icon btn-ghost">
                <X className="w-4 h-4" />
              </button>
            </div>
            <JobForm
              initialData={{
                ...EMPTY_FORM,
                ...parsedJobs[editingIndex],
                responsibilities: parsedJobs[editingIndex].responsibilities || [],
                requirements: parsedJobs[editingIndex].requirements || [],
                tags: parsedJobs[editingIndex].tags || [],
              }}
              onSubmit={(data) => updateJob(editingIndex, data)}
              isLoading={false}
              submitLabel="Save Changes"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 2: Manual Form ────────────────────────────────────────────────────────
function ManualFormTab() {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (data) => jobsApi.create({ ...data, source: 'manual' }),
    onSuccess: () => { toast.success('Job posted!'); queryClient.invalidateQueries(['admin-jobs']); },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to post job'),
  });

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <PenLine className="w-4 h-4 text-accent-blue" />
        <h3 className="text-sm font-semibold text-text-primary">Post Job Manually</h3>
      </div>
      <JobForm onSubmit={(data) => createMutation.mutate(data)} isLoading={createMutation.isPending} />
    </div>
  );
}

// ── Component: Live Scraper Terminal Modal ─────────────────────────────────────
function LiveSyncTerminal({ isOpen, onClose, syncState, syncLogs, syncing, onStopSync, stoppingSync }) {
  const terminalEndRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [syncLogs, autoScroll]);

  if (!isOpen) return null;

  const handleCopyLogs = () => {
    const text = syncLogs.map(l => `[${l.time}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Terminal logs copied to clipboard!'))
      .catch(() => toast.error('Failed to copy logs'));
  };

  const statusColor = {
    running: 'bg-accent-blue/20 text-accent-blue border-accent-blue/30',
    completed: 'bg-accent-green/20 text-accent-green border-accent-green/30',
    stopped: 'bg-accent-yellow/20 text-accent-yellow border-accent-yellow/30',
    failed: 'bg-accent-red/20 text-accent-red border-accent-red/30',
    idle: 'bg-bg-secondary text-text-muted border-border',
  }[syncState?.status || (syncing ? 'running' : 'idle')];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0f141c] border border-border/80 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-text-primary">
        {/* Terminal Window Titlebar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-[#161b24] border-b border-border/60 flex-shrink-0">
          <div className="flex items-center justify-between sm:justify-start gap-2.5 min-w-0">
            {/* Mac style dots */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="w-3 h-3 rounded-full bg-[#ff5f56] hover:opacity-80 transition-opacity cursor-pointer"
                title="Close terminal"
              />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
            </div>

            <div className="flex items-center gap-1.5 min-w-0">
              <Terminal className="w-3.5 h-3.5 text-accent-blue flex-shrink-0" />
              <span className="font-mono text-xs font-bold text-text-primary truncate">
                <span className="hidden sm:inline">hiredoor-automation@</span>alloteme:~
              </span>
            </div>

            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold border flex-shrink-0 ${statusColor}`}>
              {syncState?.status || (syncing ? 'RUNNING' : 'IDLE')}
            </span>

            {/* Mobile-only Close button */}
            <button
              type="button"
              onClick={onClose}
              className="sm:hidden btn-icon btn-ghost text-text-primary hover:bg-white/10 w-7 h-7 flex-shrink-0 ml-auto border border-border/40 rounded-lg flex items-center justify-center"
              title="Close terminal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0">
            {syncState?.category && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                syncState.category === 'Non-Tech'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-accent-blue/20 text-accent-blue border-accent-blue/40'
              }`}>
                {syncState.category === 'Non-Tech' ? '💼 Non-Tech' : '💻 Tech'}
              </span>
            )}

            <button
              type="button"
              onClick={handleCopyLogs}
              className="btn btn-ghost btn-sm text-[11px] font-mono text-text-muted hover:text-text-primary py-1 px-2.5 border border-border/50 rounded-lg flex items-center gap-1.5"
              title="Copy all logs"
            >
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </button>

            {/* Desktop Close button */}
            <button
              type="button"
              onClick={onClose}
              className="hidden sm:flex btn btn-ghost btn-sm text-xs font-mono text-text-primary hover:bg-white/10 py-1 px-2.5 border border-border/50 rounded-lg items-center gap-1"
              title="Close terminal"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-[#111620] border-b border-border/40 text-xs font-mono">
          <div className="p-2 rounded-lg bg-[#18202d] border border-border/40">
            <div className="text-[10px] text-text-faint uppercase">Queued / Target</div>
            <div className="text-sm font-bold text-text-primary mt-0.5">
              {syncState?.totalToScrape || 0}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[#18202d] border border-border/40">
            <div className="text-[10px] text-text-faint uppercase">Processed</div>
            <div className="text-sm font-bold text-accent-blue mt-0.5">
              {syncState?.processedCount || 0}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[#18202d] border border-border/40">
            <div className="text-[10px] text-text-faint uppercase">Saved to DB</div>
            <div className="text-sm font-bold text-accent-green mt-0.5">
              {syncState?.savedCount || 0}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[#18202d] border border-border/40">
            <div className="text-[10px] text-text-faint uppercase">Duplicates Skipped</div>
            <div className="text-sm font-bold text-accent-yellow mt-0.5">
              {syncState?.duplicateCount || 0}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[#18202d] border border-border/40">
            <div className="text-[10px] text-text-faint uppercase">Errors</div>
            <div className="text-sm font-bold text-accent-red mt-0.5">
              {syncState?.errorsCount || 0}
            </div>
          </div>
        </div>

        {/* Current status banner */}
        {syncState?.currentStep && (
          <div className="px-4 py-2 bg-[#141b26] border-b border-border/40 flex items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 truncate text-accent-blue">
              <span className="w-2 h-2 rounded-full bg-accent-blue animate-ping" />
              <span className="truncate">{syncState.currentStep}</span>
            </div>
            {syncing && (
              <button
                type="button"
                onClick={onStopSync}
                disabled={stoppingSync}
                className="btn btn-sm py-1 px-3 bg-red-600/90 hover:bg-red-600 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 flex-shrink-0 shadow-sm"
              >
                <X className="w-3.5 h-3.5" />
                {stoppingSync ? 'Stopping...' : 'Stop Sync'}
              </button>
            )}
          </div>
        )}

        {/* Terminal Screen with Monospace logs */}
        <div className="flex-1 p-4 font-mono text-xs overflow-y-auto bg-[#0a0d14] space-y-1.5 min-h-[300px] max-h-[500px]">
          {syncLogs.length === 0 ? (
            <div className="text-text-faint py-8 text-center italic">
              Terminal idle. Start a sync or wait for background automation...
            </div>
          ) : (
            syncLogs.map((log) => {
              const colorClass = {
                step: 'text-cyan-400 font-bold',
                success: 'text-emerald-400 font-semibold',
                warn: 'text-amber-400',
                error: 'text-red-400 font-bold',
                info: 'text-slate-300',
              }[log.type] || 'text-slate-300';

              return (
                <div key={log.id} className="flex items-start gap-2.5 leading-relaxed hover:bg-white/[0.02] px-1 py-0.5 rounded">
                  <span className="text-slate-500 flex-shrink-0 select-none">[{log.time}]</span>
                  <span className="text-slate-600 select-none">&gt;</span>
                  <span className={`break-all ${colorClass}`}>{log.message}</span>
                </div>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </div>

        {/* Footer controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-[#161b24] border-t border-border/60 text-xs font-mono flex-shrink-0">
          <label className="flex items-center gap-2 cursor-pointer text-text-muted hover:text-text-primary select-none">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-border"
            />
            <span>Auto-scroll</span>
          </label>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-text-faint hidden sm:inline">
              {syncLogs.length} entries recorded
            </span>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost btn-sm text-xs font-mono py-1 px-3 border border-border/50 text-text-primary hover:bg-white/10 rounded-lg"
            >
              Close Terminal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab 3: Manage Jobs ────────────────────────────────────────────────────────
function ManageJobsTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [reviewFilter, setReviewFilter] = useState('all'); // 'all', 'unreviewed', 'reviewed'
  const [editingJob, setEditingJob] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [stoppingSync, setStoppingSync] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncCategory, setSyncCategory] = useState('Tech'); // 'Tech' or 'Non-Tech'
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [syncLogs, setSyncLogs] = useState([]);
  const [syncState, setSyncState] = useState(null);
  const [syncMode, setSyncMode] = useState('until_last_added'); // 'until_last_added', 'count', or 'pages'
  const [syncLimit, setSyncLimit] = useState(10);
  const [selectedPages, setSelectedPages] = useState([1, 2, 3, 4]);
  const [pagesInputText, setPagesInputText] = useState('1, 2, 3, 4');
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Poll sync status & live terminal logs when sync is running or terminal is open
  useEffect(() => {
    let intervalId;
    const pollSyncStatus = async () => {
      try {
        const res = await jobsApi.getSyncStatus();
        const data = res?.data?.data;
        if (data) {
          if (data.state) {
            setSyncState(data.state);
            if (data.state.isActive) {
              setSyncing(true);
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
      pollSyncStatus();
      intervalId = setInterval(pollSyncStatus, 1200);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [syncing, terminalOpen]);

  const togglePageSelection = (p) => {
    setSelectedPages(prev => {
      let next;
      if (prev.includes(p)) {
        next = prev.filter(x => x !== p);
      } else {
        next = [...prev, p].sort((a, b) => a - b);
      }
      if (next.length === 0) next = [p];
      setPagesInputText(next.join(', '));
      return next;
    });
  };

  const handlePagesInputChange = (txt) => {
    setPagesInputText(txt);
    const parsed = txt
      .split(/[,;\s]+/)
      .map(p => parseInt(p.trim(), 10))
      .filter(p => !isNaN(p) && p > 0);
    const deduped = Array.from(new Set(parsed)).sort((a, b) => a - b);
    if (deduped.length > 0) {
      setSelectedPages(deduped);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-jobs', page, search, categoryFilter, reviewFilter],
    queryFn: () =>
      jobsApi
        .adminGetAll({
          page,
          limit: 10,
          search,
          category: categoryFilter,
          isReviewed: reviewFilter === 'all' ? undefined : (reviewFilter === 'reviewed' ? 'true' : 'false'),
        })
        .then((r) => r.data),
  });

  const jobs = data?.data || [];
  const pagination = data?.pagination || {};

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allOnPageSelected = jobs.length > 0 && jobs.every((j) => selectedIds.has(j._id));

  const toggleSelectAllPage = () => {
    if (allOnPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        jobs.forEach((j) => next.delete(j._id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        jobs.forEach((j) => next.add(j._id));
        return next;
      });
    }
  };

  const selectedJobs = jobs.filter((j) => selectedIds.has(j._id));

  const handleShareSelectedWhatsApp = () => {
    if (selectedJobs.length === 0) return;
    const text =
      selectedJobs.length === 1
        ? formatJobForWhatsApp(selectedJobs[0], null, { isUserShare: false })
        : formatMultipleJobsForWhatsApp(selectedJobs, { isUserShare: false });

    navigator.clipboard.writeText(text).catch(() => {});
    shareOnWhatsApp(text);
    toast.success(`Opening WhatsApp with ${selectedJobs.length} job${selectedJobs.length > 1 ? 's' : ''}!`);
  };

  const handleCopySelectedWhatsApp = () => {
    if (selectedJobs.length === 0) return;
    const text =
      selectedJobs.length === 1
        ? formatJobForWhatsApp(selectedJobs[0], null, { isUserShare: false })
        : formatMultipleJobsForWhatsApp(selectedJobs, { isUserShare: false });

    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`Copied WhatsApp text for ${selectedJobs.length} job(s) to clipboard!`))
      .catch(() => toast.error('Failed to copy text'));
  };

  const handleShareSingleWhatsApp = (job) => {
    const text = formatJobForWhatsApp(job, null, { isUserShare: false });
    navigator.clipboard.writeText(text).catch(() => {});
    shareOnWhatsApp(text);
    toast.success(`Opening WhatsApp for ${job.title}!`);
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => jobsApi.delete(id),
    onSuccess: () => { toast.success('Job deleted'); queryClient.invalidateQueries(['admin-jobs']); },
    onError: () => toast.error('Delete failed'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => jobsApi.bulkDelete(ids),
    onSuccess: (res) => {
      toast.success(res?.data?.message || 'Selected jobs deleted');
      setSelectedIds(new Set());
      queryClient.invalidateQueries(['admin-jobs']);
      queryClient.invalidateQueries(['admin-job-companies']);
    },
    onError: () => toast.error('Failed to delete selected jobs'),
  });

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (
      window.confirm(
        `Are you sure you want to permanently delete all ${count} selected job${count > 1 ? 's' : ''}?`
      )
    ) {
      bulkDeleteMutation.mutate(Array.from(selectedIds));
    }
  };

  const reviewMutation = useMutation({
    mutationFn: ({ id, isReviewed }) => jobsApi.reviewJob(id, isReviewed),
    onSuccess: (res) => {
      toast.success(res?.data?.message || 'Review status updated');
      queryClient.invalidateQueries(['admin-jobs']);
      queryClient.invalidateQueries(['jobs']);
    },
    onError: () => toast.error('Failed to update review status'),
  });

  const bulkReviewMutation = useMutation({
    mutationFn: ({ ids, isReviewed }) => jobsApi.bulkReview(ids, isReviewed),
    onSuccess: (res) => {
      toast.success(res?.data?.message || 'Updated selected jobs');
      setSelectedIds(new Set());
      queryClient.invalidateQueries(['admin-jobs']);
      queryClient.invalidateQueries(['jobs']);
    },
    onError: () => toast.error('Failed to update selected jobs'),
  });

  const handleBulkReview = (isReviewed) => {
    if (selectedIds.size === 0) return;
    bulkReviewMutation.mutate({ ids: Array.from(selectedIds), isReviewed });
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => jobsApi.update(id, data),
    onSuccess: () => {
      toast.success('Job updated!');
      setEditingJob(null);
      queryClient.invalidateQueries(['admin-jobs']);
    },
    onError: () => toast.error('Update failed'),
  });

  const handleSync = async () => {
    setSyncing(true);
    setStoppingSync(false);
    setSyncModalOpen(false);
    setTerminalOpen(true);
    try {
      const res = await jobsApi.syncHireDoor({
        category: syncCategory,
        mode: syncMode,
        limit: syncLimit,
        pages: syncMode === 'pages' ? selectedPages : undefined,
      });
      const { scraped, saved, stoppedAtDuplicate, wasCancelled } = res.data.data;
      if (wasCancelled) {
        toast(`Sync stopped. Saved ${saved} new jobs.`);
      } else if (stoppedAtDuplicate) {
        toast.success(`Incremental sync: Saved ${saved} new ${syncCategory} jobs!`);
      } else {
        toast.success(`Synced! Scraped ${scraped}, saved ${saved} ${syncCategory} jobs.`);
      }
      queryClient.invalidateQueries(['admin-jobs']);
      queryClient.invalidateQueries(['admin-job-companies']);
      queryClient.invalidateQueries(['jobs']);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Sync failed');
    } finally {
      setSyncing(false);
      setStoppingSync(false);
    }
  };

  const handleStopSync = async () => {
    setStoppingSync(true);
    try {
      await jobsApi.stopSync();
      toast('Stopping sync... Scraper will finish current job and exit.');
    } catch (e) {
      toast.error('Failed to send stop signal');
    }
  };

  const SOURCE_BADGE = {
    manual: 'bg-bg-secondary text-text-muted',
    ai: 'bg-accent-yellow/10 text-accent-yellow',
    scraped: 'bg-accent-blue/10 text-accent-blue',
    ats: 'bg-accent-green/10 text-accent-green border border-accent-green/20',
  };

  return (
    <div className="space-y-4">
      {/* Active Sync Status Banner with Stop option */}
      {syncing && (
        <div className="p-3.5 rounded-xl bg-accent-blue/10 border border-accent-blue/30 flex items-center justify-between gap-3 shadow-sm flex-wrap">
          <div className="flex items-center gap-2.5 text-xs font-semibold text-text-primary">
            <Loader2 className="w-4 h-4 animate-spin text-accent-blue flex-shrink-0" />
            <div>
              <p className="font-bold">HireDoor Scraper is syncing {syncCategory} jobs...</p>
              <p className="text-[11px] text-text-muted font-normal mt-0.5">
                {syncState?.currentStep || 'Extracting verified job cards and company direct links.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTerminalOpen(true)}
              className="btn btn-sm px-3 py-1.5 bg-bg-card border border-border text-text-primary font-mono text-xs rounded-lg flex items-center gap-1.5 hover:border-accent-blue/50"
            >
              <Terminal className="w-3.5 h-3.5 text-accent-green" />
              View Terminal
            </button>
            <button
              type="button"
              onClick={handleStopSync}
              disabled={stoppingSync}
              className="btn btn-sm px-3.5 py-1.5 bg-red-500/90 hover:bg-red-600 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-all flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              {stoppingSync ? 'Stopping...' : 'Stop Sync'}
            </button>
          </div>
        </div>
      )}

      {/* Live Terminal Modal */}
      <LiveSyncTerminal
        isOpen={terminalOpen}
        onClose={() => setTerminalOpen(false)}
        syncState={syncState}
        syncLogs={syncLogs}
        syncing={syncing}
        onStopSync={handleStopSync}
        stoppingSync={stoppingSync}
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
        <input
          className="input text-sm py-1.5 w-full sm:w-60 flex-shrink-0"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search jobs..."
        />

        {/* Category Classification Filter Tabs */}
        <div className="flex items-center gap-1 bg-bg-secondary p-1 rounded-lg border border-border overflow-x-auto no-scrollbar flex-shrink-0">
          {[
            { id: 'all', label: 'All Categories' },
            { id: 'Tech', label: '💻 Tech' },
            { id: 'Non-Tech', label: '💼 Non-Tech' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => { setCategoryFilter(cat.id); setPage(1); }}
              className={`px-3 py-1 text-xs font-semibold rounded-md whitespace-nowrap transition-all ${
                categoryFilter === cat.id
                  ? 'bg-accent-blue text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Review Approval Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-bg-secondary p-1 rounded-lg border border-border overflow-x-auto no-scrollbar flex-shrink-0">
          {[
            { id: 'all', label: 'All Jobs' },
            { id: 'unreviewed', label: '⏳ Pending Review' },
            { id: 'reviewed', label: '✓ Verified & Published' },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => { setReviewFilter(st.id); setPage(1); }}
              className={`px-3 py-1 text-xs font-semibold rounded-md whitespace-nowrap transition-all ${
                reviewFilter === st.id
                  ? 'bg-emerald-600 text-white shadow-sm font-bold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 justify-between sm:justify-end sm:ml-auto flex-wrap">
          {/* Live Terminal toggle button */}
          <button
            type="button"
            onClick={() => setTerminalOpen(true)}
            className="btn btn-ghost btn-sm flex items-center gap-1.5 font-mono text-xs border border-border flex-shrink-0"
            title="Open live scraping terminal"
          >
            <Terminal className="w-3.5 h-3.5 text-accent-green" />
            Live Terminal
            {syncing && <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />}
          </button>

          {syncing ? (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="flex items-center gap-1.5 text-accent-blue font-semibold text-xs py-1.5 px-3 rounded-lg bg-accent-blue/10 border border-accent-blue/20">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing...
              </span>
              <button
                type="button"
                onClick={handleStopSync}
                disabled={stoppingSync}
                className="btn btn-sm py-1.5 px-3 bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition-colors text-xs font-semibold rounded-lg flex items-center gap-1"
                title="Stop active sync"
              >
                <X className="w-3 h-3" /> {stoppingSync ? 'Stopping...' : 'Stop'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSyncModalOpen(true)}
              className="btn btn-primary btn-sm flex items-center gap-1.5 flex-shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sync HireDoor
            </button>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 bg-bg-secondary rounded-lg border border-border text-xs text-text-muted">
        <AlertCircle className="w-3.5 h-3.5 text-accent-yellow flex-shrink-0 mt-0.5" />
        <p>"Sync HireDoor" logs into <strong>hiredoor.in</strong>, opens each verified job card, scrapes full descriptions and requirements, and clicks "Apply Now" to extract the direct application link.</p>
      </div>

      {/* Sync Modal (Landscape with Two Sections & Pinned Actions) */}
      {syncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-bg-secondary/40 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent-blue/10 border border-accent-blue/30 flex items-center justify-center text-accent-blue">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Sync Jobs from HireDoor</h3>
                  <p className="text-[11px] text-text-muted">Automated scraping with verified direct company links</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSyncModalOpen(false)}
                className="btn-icon btn-ghost w-8 h-8 text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Modal Body: Landscape 2 Sections */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                
                {/* ── Section 1: Left Column (Category & Features) ── */}
                <div className="md:col-span-5 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-text-primary flex items-center justify-between mb-1.5">
                      <span>1. Select Job Category:</span>
                      <span className="text-[10px] text-accent-blue font-mono font-medium">Toggles Vertical</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setSyncCategory('Tech')}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                          syncCategory === 'Tech'
                            ? 'bg-accent-blue/15 border-accent-blue text-accent-blue shadow-sm ring-2 ring-accent-blue/30 font-bold'
                            : 'bg-bg-secondary border-border text-text-muted hover:border-border-hover'
                        }`}
                      >
                        <span className="text-xl mb-1">💻</span>
                        <span className="text-xs text-text-primary font-bold">Tech Jobs</span>
                        <span className="text-[10px] text-text-muted mt-0.5">hiredoor.in/jobs</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSyncCategory('Non-Tech')}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                          syncCategory === 'Non-Tech'
                            ? 'bg-purple-600/15 border-purple-500 text-purple-400 shadow-sm ring-2 ring-purple-500/30 font-bold'
                            : 'bg-bg-secondary border-border text-text-muted hover:border-border-hover'
                        }`}
                      >
                        <span className="text-xl mb-1">💼</span>
                        <span className="text-xs text-text-primary font-bold">Non-Tech Jobs</span>
                        <span className="text-[10px] text-text-muted mt-0.5">hiredoor.in/non-tech</span>
                      </button>
                    </div>
                  </div>

                  {/* Feature Information Card */}
                  <div className="p-3.5 rounded-xl bg-bg-secondary/70 border border-border text-xs space-y-2">
                    <div className="font-semibold text-text-primary flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-text-faint">
                      <Sparkles className="w-3.5 h-3.5 text-accent-blue" />
                      Scraper Intelligence
                    </div>
                    <ul className="space-y-1.5 text-[11px] text-text-muted">
                      <li className="flex items-start gap-1.5">
                        <span className="text-accent-green font-bold">✓</span>
                        <span><strong>Direct Links:</strong> Clicks "Apply Now" to extract external company career URLs.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-accent-blue font-bold">✓</span>
                        <span><strong>Duplicate Filter:</strong> Skips cards already present in your database.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-purple-400 font-bold">✓</span>
                        <span><strong>Scraped Time:</strong> Stamps date/time and category on every saved job.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-accent-yellow font-bold">✓</span>
                        <span><strong>Live Terminal:</strong> Real-time streaming logs with stop capability.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* ── Section 2: Right Column (Sync Strategy & Options) ── */}
                <div className="md:col-span-7 space-y-3">
                  <label className="text-xs font-bold text-text-primary flex items-center justify-between">
                    <span>2. Select Crawling Strategy:</span>
                    <span className="text-[10px] text-text-muted font-normal">Choose scope</span>
                  </label>

                  {/* Mode 1: Until last added / incremental */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      syncMode === 'until_last_added'
                        ? 'bg-accent-blue/10 border-accent-blue/50 text-text-primary ring-1 ring-accent-blue/20'
                        : 'bg-bg-secondary/60 border-border text-text-muted hover:border-border-hover'
                    }`}
                  >
                    <input
                      type="radio"
                      name="syncMode"
                      value="until_last_added"
                      checked={syncMode === 'until_last_added'}
                      onChange={() => setSyncMode('until_last_added')}
                      className="mt-1 text-accent-blue"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-primary">Sync All New Jobs</span>
                        <span className="text-[9px] px-1.5 py-0.2 bg-accent-green/10 text-accent-green font-bold rounded">Recommended</span>
                      </div>
                      <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                        Scrapes recent job cards until it reaches the last job already added to your database (stops automatically when duplicate is found).
                      </p>
                    </div>
                  </label>

                  {/* Mode 2: Specific count */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      syncMode === 'count'
                        ? 'bg-accent-blue/10 border-accent-blue/50 text-text-primary ring-1 ring-accent-blue/20'
                        : 'bg-bg-secondary/60 border-border text-text-muted hover:border-border-hover'
                    }`}
                  >
                    <input
                      type="radio"
                      name="syncMode"
                      value="count"
                      checked={syncMode === 'count'}
                      onChange={() => setSyncMode('count')}
                      className="mt-1 text-accent-blue"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-primary">Scrape Specific Count</span>
                        {syncMode === 'count' && (
                          <span className="text-xs font-bold font-mono text-accent-blue">{syncLimit} jobs</span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                        Scrapes an exact batch of recent job cards, traversing multiple pages as needed and skipping existing jobs.
                      </p>
                      {syncMode === 'count' && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50" onClick={e => e.stopPropagation()}>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            className="input text-xs py-1 w-24 font-mono font-bold"
                            value={syncLimit}
                            onChange={(e) => setSyncLimit(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                          />
                          <span className="text-[11px] text-text-muted">recent cards (1 – 100)</span>
                        </div>
                      )}
                    </div>
                  </label>

                  {/* Mode 3: Specific Page Numbers */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      syncMode === 'pages'
                        ? 'bg-accent-blue/10 border-accent-blue/50 text-text-primary ring-1 ring-accent-blue/20'
                        : 'bg-bg-secondary/60 border-border text-text-muted hover:border-border-hover'
                    }`}
                  >
                    <input
                      type="radio"
                      name="syncMode"
                      value="pages"
                      checked={syncMode === 'pages'}
                      onChange={() => setSyncMode('pages')}
                      className="mt-1 text-accent-blue"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-primary">Select Specific Page Numbers (1, 2, 3...)</span>
                        {syncMode === 'pages' && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-accent-blue/20 text-accent-blue">
                            {selectedPages.length} {selectedPages.length === 1 ? 'page' : 'pages'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                        Scrapes jobs exclusively from the selected HireDoor page numbers one by one.
                      </p>

                      {syncMode === 'pages' && (
                        <div className="mt-2.5 pt-2.5 border-t border-border/50 space-y-2.5" onClick={e => e.stopPropagation()}>
                          {/* Clickable Quick Page Pills */}
                          <div>
                            <div className="text-[10px] text-text-faint uppercase font-bold mb-1.5">Toggle Page Numbers:</div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(pNum => (
                                <button
                                  key={pNum}
                                  type="button"
                                  onClick={() => togglePageSelection(pNum)}
                                  className={`w-7 h-7 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                    selectedPages.includes(pNum)
                                      ? 'bg-accent-blue text-white border-accent-blue shadow-sm'
                                      : 'bg-bg-card text-text-muted border-border hover:border-accent-blue/50'
                                  }`}
                                >
                                  {pNum}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Manual input for custom page numbers */}
                          <div>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="e.g. 1, 2, 3, 4"
                                value={pagesInputText}
                                onChange={(e) => handlePagesInputChange(e.target.value)}
                                className="input text-xs py-1 flex-1 font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPages([1, 2, 3, 4]);
                                  setPagesInputText('1, 2, 3, 4');
                                }}
                                className="btn btn-ghost btn-sm text-[11px] py-1 px-2 border border-border"
                              >
                                1 – 4
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPages([1, 2, 3, 4, 5]);
                                  setPagesInputText('1, 2, 3, 4, 5');
                                }}
                                className="btn btn-ghost btn-sm text-[11px] py-1 px-2 border border-border"
                              >
                                1 – 5
                              </button>
                            </div>
                          </div>

                          <p className="text-[11px] text-text-muted">
                            Pages to scrape one by one: <strong className="text-accent-blue font-bold font-mono">{selectedPages.join(', ')}</strong>
                          </p>
                        </div>
                      )}
                    </div>
                  </label>
                </div>

              </div>
            </div>

            {/* Modal Footer (Pinned at Bottom) */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-border bg-bg-secondary/40 flex-shrink-0">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-text-faint text-[11px]">Selected:</span>
                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                  syncCategory === 'Non-Tech'
                    ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                    : 'bg-accent-blue/15 text-accent-blue border-accent-blue/30'
                }`}>
                  {syncCategory === 'Non-Tech' ? '💼 Non-Tech' : '💻 Tech'}
                </span>
                <span className="text-text-muted text-[11px]">
                  {syncMode === 'until_last_added'
                    ? 'Sync All New'
                    : syncMode === 'count'
                    ? `Target ${syncLimit} cards`
                    : `Pages: ${selectedPages.join(', ')}`}
                </span>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setSyncModalOpen(false)}
                  className="btn btn-ghost btn-sm px-4"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSync}
                  className="btn btn-primary btn-sm px-4 flex items-center gap-1.5 font-bold shadow-md"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Start Sync
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Edit Job</h3>
              <button type="button" onClick={() => setEditingJob(null)} className="btn-icon btn-ghost">
                <X className="w-4 h-4" />
              </button>
            </div>
            <JobForm
              initialData={{
                ...EMPTY_FORM,
                ...editingJob,
                responsibilities: editingJob.responsibilities || [],
                requirements: editingJob.requirements || [],
                tags: editingJob.tags || [],
              }}
              onSubmit={(data) => updateMutation.mutate({ id: editingJob._id, data })}
              isLoading={updateMutation.isPending}
              submitLabel="Save Changes"
            />
          </div>
        </div>
      )}

      {/* Sticky Bulk Selection Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 p-3 bg-bg-card border-2 border-[#25D366]/40 rounded-xl shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#25D366]/20 text-[#25D366] font-bold text-xs flex items-center justify-center">
              {selectedIds.size}
            </span>
            <span className="text-sm font-semibold text-text-primary">
              {selectedIds.size} {selectedIds.size === 1 ? 'job' : 'jobs'} selected
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleBulkReview(true)}
              disabled={bulkReviewMutation.isPending}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Approve & Verify selected jobs to make them visible to users"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approve &amp; Verify ({selectedIds.size})
            </button>

            <button
              onClick={() => handleBulkReview(false)}
              disabled={bulkReviewMutation.isPending}
              className="btn btn-ghost btn-sm text-xs text-amber-400 hover:bg-amber-400/10 border border-amber-400/25 flex items-center gap-1.5"
              title="Unapprove selected jobs to hide them from users"
            >
              Unapprove ({selectedIds.size})
            </button>

            <button
              onClick={handleShareSelectedWhatsApp}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#25D366] hover:bg-[#20ba5a] transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <WhatsAppIcon className="w-4 h-4 fill-white" />
              Share on WhatsApp
            </button>

            <button
              onClick={handleCopySelectedWhatsApp}
              className="btn btn-ghost btn-sm text-xs flex items-center gap-1.5"
              title="Copy formatted message to clipboard"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Text
            </button>

            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              className="btn btn-ghost btn-sm text-xs text-accent-red hover:bg-accent-red/10 flex items-center gap-1.5 border border-accent-red/20"
              title="Permanently delete all selected jobs"
            >
              {bulkDeleteMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              Delete Selected ({selectedIds.size})
            </button>

            <button
              onClick={() => setSelectedIds(new Set())}
              className="btn btn-ghost btn-sm text-xs text-text-muted hover:text-accent-red"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Select all bar */}
      {!isLoading && jobs.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2 bg-bg-secondary rounded-lg border border-border text-xs text-text-muted">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allOnPageSelected}
              onChange={toggleSelectAllPage}
              className="w-4 h-4 rounded border-border text-accent-blue cursor-pointer"
            />
            <span className="font-medium text-text-secondary">
              Select all on this page ({jobs.length})
            </span>
          </label>
          {selectedIds.size > 0 && (
            <span className="text-[#25D366] font-semibold text-xs">
              {selectedIds.size} selected for WhatsApp
            </span>
          )}
        </div>
      )}

      {/* Jobs list */}
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-accent-blue animate-spin" /></div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-10 text-text-muted text-sm">No jobs yet</div>
      ) : (
        <div className="space-y-2">
          {jobs.map(job => (
            <div
              key={job._id}
              className={`card px-3 sm:px-4 py-3 flex items-start gap-2.5 sm:gap-3 transition-colors min-w-0 ${
                selectedIds.has(job._id) ? 'border-[#25D366]/40 bg-[#25D366]/5' : ''
              }`}
            >
              {/* Row Checkbox */}
              <input
                type="checkbox"
                checked={selectedIds.has(job._id)}
                onChange={() => toggleSelect(job._id)}
                className="mt-1 w-4 h-4 rounded border-border text-accent-blue cursor-pointer flex-shrink-0"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-text-primary leading-snug break-words">{job.title}</span>
                  {job.isReviewed ? (
                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1 whitespace-nowrap">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ✓ Verified
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1 whitespace-nowrap">
                      ⏳ Pending Review (Hidden)
                    </span>
                  )}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${
                    job.category === 'Non-Tech'
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                      : 'bg-accent-blue/10 text-accent-blue border-accent-blue/30'
                  }`}>
                    {job.category === 'Non-Tech' ? '💼 Non-Tech' : '💻 Tech'}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${SOURCE_BADGE[job.source] || SOURCE_BADGE.manual}`}>
                    {job.source}
                  </span>
                  {!job.isActive && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-accent-red/10 text-accent-red whitespace-nowrap">inactive</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs text-text-faint mt-1">
                  <span>{formatCompanyName(job)} · {job.jobType} · {job.workMode}</span>
                  {job.salary && <span className="font-medium text-accent-green">· {job.salary}</span>}
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-text-faint bg-bg-secondary px-2 py-0.5 rounded font-medium border border-border">
                    <Clock className="w-3 h-3 text-accent-blue" />
                    Posted {formatTimeAgo(job.postedAt || job.createdAt)} · <span className="text-accent-blue font-semibold">{formatTimeAgo(job.scrapedAt || job.createdAt)}</span>
                  </span>
                </div>
                {job.applyEmail && (
                  <p className="text-xs text-accent-blue mt-1 flex items-center gap-1 break-all">
                    <Mail className="w-3 h-3 flex-shrink-0" /> {job.applyEmail}
                  </p>
                )}
                {job.contactPhone && (
                  <p className="text-xs text-accent-green mt-0.5 flex items-center gap-1">
                    <Phone className="w-3 h-3 flex-shrink-0" /> {job.contactPhone}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0 self-start">
                {/* 1-Click Toggle Review/Approve */}
                <button
                  type="button"
                  onClick={() => reviewMutation.mutate({ id: job._id, isReviewed: !job.isReviewed })}
                  disabled={reviewMutation.isPending}
                  className={`btn-icon btn-ghost w-7 h-7 ${
                    job.isReviewed
                      ? 'text-emerald-400 hover:bg-emerald-400/10'
                      : 'text-amber-400 hover:bg-amber-400/10'
                  }`}
                  title={job.isReviewed ? 'Click to unapprove (hide from users)' : 'Click to approve & verify (show to users)'}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>

                {/* Single WhatsApp Share */}
                <button
                  type="button"
                  onClick={() => handleShareSingleWhatsApp(job)}
                  className="btn-icon btn-ghost w-7 h-7 text-[#25D366] hover:bg-[#25D366]/10"
                  title="Share to WhatsApp"
                >
                  <WhatsAppIcon className="w-4 h-4 fill-[#25D366]" />
                </button>

                {job.applyLink && (
                  <a href={job.applyLink} target="_blank" rel="noopener noreferrer" className="btn-icon btn-ghost w-7 h-7" title="Open apply link">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button onClick={() => setEditingJob(job)} className="btn-icon btn-ghost w-7 h-7 text-accent-blue" title="Edit">
                  <PenLine className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { if (window.confirm('Delete this job?')) deleteMutation.mutate(job._id); }}
                  className="btn-icon btn-ghost w-7 h-7 text-accent-red"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-ghost btn-sm disabled:opacity-40">← Prev</button>
          <span className="flex items-center px-3 text-sm text-text-muted">{page} / {pagination.pages}</span>
          <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="btn btn-ghost btn-sm disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}

// ── Tab 4: Companies & Logos ──────────────────────────────────────────────────
function CompaniesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingCompany, setEditingCompany] = useState(null);
  const [logoInput, setLogoInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['admin-job-companies', search],
    queryFn: () => jobsApi.getCompanies({ search }).then(r => r.data.data.companies),
  });

  const handleOpenEdit = (comp) => {
    setEditingCompany(comp);
    setLogoInput(comp.logo || '');
    setNameInput(comp.name || comp.tag);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoInput(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingCompany) return;
    setIsSaving(true);
    try {
      const res = await jobsApi.updateCompany(editingCompany.tag, {
        name: nameInput.trim() || editingCompany.name,
        logo: logoInput.trim(),
      });
      const { updatedJobsCount } = res.data.data;
      toast.success(`Logo saved and synced across ${updatedJobsCount} job cards!`);
      queryClient.invalidateQueries(['admin-job-companies']);
      queryClient.invalidateQueries(['admin-jobs']);
      queryClient.invalidateQueries(['jobs']);
      setEditingCompany(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update company logo');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <input
            className="input text-sm py-1.5 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company by name or tag..."
          />
        </div>
        <div className="text-xs text-text-muted">
          Showing <span className="font-semibold text-text-primary">{companies.length}</span> companies (deduplicated by tag)
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 bg-bg-secondary rounded-lg border border-border text-xs text-text-muted">
        <AlertCircle className="w-3.5 h-3.5 text-accent-blue flex-shrink-0 mt-0.5" />
        <p>
          Each company is unique by its <strong>companyTag</strong>. When you upload or provide a direct logo link for a company, <strong>all current and future job cards with that tag automatically share that exact same logo</strong>.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-accent-blue animate-spin" />
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm card">
          No companies found {search ? `matching "${search}"` : ''}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {companies.map((c) => (
            <div
              key={c.tag}
              className="card p-3.5 flex flex-col justify-between gap-3 hover:border-accent-blue/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-bg-secondary border border-border flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
                  {c.logo ? (
                    <img src={c.logo} alt={c.name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xl font-bold text-text-faint uppercase">
                      {c.name?.charAt(0) || c.tag.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-text-primary truncate">{c.name}</h4>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-bg-secondary text-text-muted border border-border">
                      tag: {c.tag}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-accent-blue/10 text-accent-blue">
                      {c.jobCount} {c.jobCount === 1 ? 'job' : 'jobs'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border mt-1">
                <span className="text-[11px] text-text-faint truncate max-w-[140px]">
                  {c.logo ? 'Logo configured' : 'No logo set'}
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(c)}
                  className="btn btn-ghost btn-xs text-accent-blue hover:text-accent-blue flex items-center gap-1"
                >
                  <PenLine className="w-3 h-3" />
                  {c.logo ? 'Change Logo' : 'Add Logo'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Logo Modal */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-bg-card border border-border rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">
                  Edit Company Logo
                </h3>
                <p className="text-xs text-text-muted mt-0.5 font-mono">
                  Tag: <span className="text-accent-blue">{editingCompany.tag}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCompany(null)}
                className="btn-icon btn-ghost"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Preview Box */}
            <div className="p-3 bg-bg-secondary rounded-lg border border-border flex items-center gap-4">
              <div className="w-14 h-14 rounded-lg bg-bg-card border border-border flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
                {logoInput ? (
                  <img src={logoInput} alt="Preview" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-2xl font-bold text-text-faint uppercase">
                    {nameInput?.charAt(0) || editingCompany.tag.charAt(0)}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-text-primary truncate">{nameInput || editingCompany.name}</p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Syncs to all <span className="text-accent-blue font-semibold">{editingCompany.jobCount}</span> job cards with this tag.
                </p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <FieldRow label="Company Display Name">
                <input
                  className="input w-full text-sm"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Google, Flipkart, Eiffage"
                />
              </FieldRow>

              <FieldRow label="Direct Logo Link (URL)">
                <input
                  className="input w-full text-sm"
                  value={logoInput}
                  onChange={(e) => setLogoInput(e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </FieldRow>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Or Upload Logo Image
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleFileUpload}
                  className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-medium file:bg-bg-secondary file:text-text-primary hover:file:bg-border cursor-pointer w-full"
                />
                <p className="text-[10px] text-text-faint mt-1">PNG, JPG, SVG or WebP up to 2MB</p>
              </div>

              <div className="flex justify-end items-center gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
                  className="btn btn-ghost btn-sm"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm flex items-center gap-1.5"
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Save Logo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Groq API Key Settings Modal ───────────────────────────────────────────────
// ── Job Settings Modal (Groq API Key & HireDoor Scraper Credentials) ──────────
function JobSettingsModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hiredoorEmailInput, setHiredoorEmailInput] = useState('');
  const [hiredoorPasswordInput, setHiredoorPasswordInput] = useState('');

  const { data: settingsData } = useQuery({
    queryKey: ['admin-job-settings'],
    queryFn: () => jobsApi.getSettings().then((r) => r.data.data),
    enabled: isOpen,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => jobsApi.updateSettings(data),
    onSuccess: (res) => {
      toast.success(res?.data?.message || 'Settings updated successfully');
      queryClient.invalidateQueries(['admin-job-settings']);
      setApiKeyInput('');
      setHiredoorEmailInput('');
      setHiredoorPasswordInput('');
      onClose();
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to update settings'),
  });

  if (!isOpen) return null;

  const {
    hasCustomKey,
    source,
    activeKeyMasked,
    hasCustomHiredoor,
    hiredoorSource,
    hiredoorEmailMasked,
  } = settingsData || {};

  const handleSave = (e) => {
    e.preventDefault();
    const payload = {};
    if (apiKeyInput.trim()) payload.groqApiKey = apiKeyInput.trim();
    if (hiredoorEmailInput.trim()) payload.hiredoorEmail = hiredoorEmailInput.trim();
    if (hiredoorPasswordInput.trim()) payload.hiredoorPassword = hiredoorPasswordInput.trim();

    if (Object.keys(payload).length === 0) {
      toast('No new values provided to save');
      return;
    }

    updateMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-bg-card border border-border rounded-xl w-full max-w-lg p-6 space-y-5 shadow-xl my-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Key className="w-4 h-4 text-accent-yellow" />
            Job &amp; Scraper Settings
          </h3>
          <button type="button" onClick={onClose} className="btn-icon btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: HireDoor Scraper Credentials */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-accent-blue" />
              HireDoor Scraper Credentials
            </label>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                hiredoorSource === 'database'
                  ? 'bg-accent-green/15 text-accent-green'
                  : hiredoorSource === 'env'
                  ? 'bg-accent-blue/15 text-accent-blue'
                  : 'bg-accent-red/15 text-accent-red'
              }`}
            >
              {hiredoorSource === 'database'
                ? 'Custom (Database)'
                : hiredoorSource === 'env'
                ? 'Server .env'
                : 'Not Set'}
            </span>
          </div>
          <p className="text-[11px] text-text-muted leading-relaxed">
            Used by the scraper to log into HireDoor to browse verified jobs, navigate across pages, and extract direct apply links. Overrides server <code className="text-accent-blue bg-bg-secondary px-1 py-0.5 rounded">.env</code> when set.
          </p>

          {hiredoorEmailMasked && (
            <div className="p-2.5 bg-bg-secondary rounded-lg border border-border text-xs flex items-center justify-between">
              <span className="text-text-muted">Active HireDoor Account:</span>
              <span className="font-mono text-text-primary font-medium">{hiredoorEmailMasked}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-text-muted mb-1">HireDoor Email</label>
              <input
                type="email"
                className="input w-full text-xs"
                placeholder="hiredoor@example.com"
                value={hiredoorEmailInput}
                onChange={(e) => setHiredoorEmailInput(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] text-text-muted mb-1">HireDoor Password</label>
              <input
                type="password"
                className="input w-full text-xs"
                placeholder="••••••••"
                value={hiredoorPasswordInput}
                onChange={(e) => setHiredoorPasswordInput(e.target.value)}
              />
            </div>
          </div>

          {hasCustomHiredoor && (
            <button
              type="button"
              onClick={() => updateMutation.mutate({ hiredoorEmail: '', hiredoorPassword: '' })}
              disabled={updateMutation.isPending}
              className="text-[11px] text-accent-red hover:underline block"
            >
              Reset HireDoor credentials to .env
            </button>
          )}
        </div>

        <div className="border-t border-border" />

        {/* Section 2: Groq AI Key */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-accent-yellow" />
              Groq AI API Key
            </label>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                source === 'database'
                  ? 'bg-accent-green/15 text-accent-green'
                  : source === 'env'
                  ? 'bg-accent-blue/15 text-accent-blue'
                  : 'bg-accent-red/15 text-accent-red'
              }`}
            >
              {source === 'database'
                ? 'Custom (Database)'
                : source === 'env'
                ? 'Server .env'
                : 'Not Set'}
            </span>
          </div>
          <p className="text-[11px] text-text-muted leading-relaxed">
            Powers the AI Bulk Parser with fast LLaMA models. If set, this key overrides the server <code className="text-accent-blue bg-bg-secondary px-1 py-0.5 rounded">.env</code>.
          </p>

          {activeKeyMasked && (
            <div className="p-2.5 bg-bg-secondary rounded-lg border border-border text-xs flex items-center justify-between">
              <span className="text-text-muted">Active Groq Key:</span>
              <span className="font-mono text-text-primary font-medium">{activeKeyMasked}</span>
            </div>
          )}

          <div>
            <input
              type="password"
              className="input w-full text-xs font-mono"
              placeholder="gsk_..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
            />
            <p className="text-[10px] text-text-faint mt-1">
              Get your free key from{' '}
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-blue hover:underline"
              >
                console.groq.com/keys
              </a>
            </p>
          </div>

          {hasCustomKey && (
            <button
              type="button"
              onClick={() => updateMutation.mutate({ groqApiKey: '' })}
              disabled={updateMutation.isPending}
              className="text-[11px] text-accent-red hover:underline block"
            >
              Reset Groq API key to .env
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm text-xs"
            disabled={updateMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={updateMutation.isPending || (!apiKeyInput.trim() && !hiredoorEmailInput.trim() && !hiredoorPasswordInput.trim())}
            className="btn btn-primary btn-sm text-xs flex items-center gap-1.5"
          >
            {updateMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main AdminJobs ────────────────────────────────────────────────────────────
export default function AdminJobs() {
  const [activeTab, setActiveTab] = useState('ai');
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const { data: jobSettings } = useQuery({
    queryKey: ['admin-job-settings'],
    queryFn: () => jobsApi.getSettings().then((r) => r.data.data),
  });

  const tabs = [
    { id: 'ai', label: 'AI Bulk Parser', icon: Sparkles },
    { id: 'manual', label: 'Manual Form', icon: PenLine },
    { id: 'manage', label: 'Manage Jobs', icon: List },
    { id: 'companies', label: 'Companies', icon: Building2 },
  ];

  return (
    <div className="max-w-5xl w-full min-w-0 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">Jobs Management</h1>
          <p className="text-text-muted text-xs sm:text-sm mt-0.5">Post and manage job listings — Multi-page HireDoor scraper, WhatsApp sharing &amp; settings</p>
        </div>

        <button
          onClick={() => setSettingsModalOpen(true)}
          className="btn btn-ghost btn-sm flex items-center gap-2 border border-border bg-bg-card hover:border-accent-blue/50 self-start sm:self-auto flex-shrink-0"
          title="Configure Groq AI Key and HireDoor Scraper Credentials"
        >
          <Key className="w-3.5 h-3.5 text-accent-yellow" />
          <span className="text-xs font-medium">Scraper &amp; AI Settings</span>
          {jobSettings?.hiredoorSource === 'database' && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-accent-green/10 text-accent-green font-semibold">HireDoor ✓</span>
          )}
          {jobSettings?.source === 'database' && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-accent-blue/10 text-accent-blue font-semibold">Groq ✓</span>
          )}
        </button>
      </div>

      {/* Responsive Horizontal Tabs */}
      <div className="flex gap-1 p-1 bg-bg-secondary rounded-lg mb-6 max-w-full overflow-x-auto no-scrollbar scroll-smooth">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded text-xs sm:text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              activeTab === id ? 'bg-bg-card text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'ai' && <AIEditorTab onOpenGroqSettings={() => setSettingsModalOpen(true)} />}
      {activeTab === 'manual' && <ManualFormTab />}
      {activeTab === 'manage' && <ManageJobsTab />}
      {activeTab === 'companies' && <CompaniesTab />}

      {/* Job Settings Configuration Modal (Groq AI & HireDoor Credentials) */}
      <JobSettingsModal isOpen={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} />
    </div>
  );
}
