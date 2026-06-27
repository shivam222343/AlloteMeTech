import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api';
import { Plus, Pencil, Trash2, Search, X, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const emptyForm = {
  title: '',
  slug: '',
  leetcodeUrl: '',
  leetcodeId: '',
  difficulty: 'Medium',
  acceptanceRate: '',
  frequency: '',
  isPremium: false,
  description: '',
};

const diffBadge = {
  Easy: 'badge-easy',
  Medium: 'badge-medium',
  Hard: 'badge-hard',
};

/* ── Modal ── */
const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        <button onClick={onClose} className="btn-icon btn-ghost btn-sm"><X className="w-4 h-4" /></button>
      </div>
      <div className="overflow-y-auto p-6 flex-1">{children}</div>
    </div>
  </div>
);

const AdminProblems = () => {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null); // null = create mode
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-problems', page, search, difficulty],
    queryFn: () => adminApi.getProblems({ page, limit: 20, search, difficulty }),
    keepPreviousData: true,
  });

  const createMutation = useMutation({
    mutationFn: (data) => adminApi.createProblem(data),
    onSuccess: () => { toast.success('Problem created'); qc.invalidateQueries(['admin-problems']); closeModal(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateProblem(id, data),
    onSuccess: () => { toast.success('Problem updated'); qc.invalidateQueries(['admin-problems']); closeModal(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteProblem(id),
    onSuccess: () => { toast.success('Problem deleted'); qc.invalidateQueries(['admin-problems']); },
  });

  const closeModal = () => { setShowModal(false); setEditing(null); setForm(emptyForm); };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };

  const openEdit = (p) => {
    setEditing(p._id);
    setForm({
      title: p.title || '',
      slug: p.slug || '',
      leetcodeUrl: p.leetcodeUrl || '',
      leetcodeId: p.leetcodeId || '',
      difficulty: p.difficulty || 'Medium',
      acceptanceRate: p.acceptanceRate || '',
      frequency: p.frequency || '',
      isPremium: p.isPremium || false,
      description: p.description || '',
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      leetcodeId: form.leetcodeId !== '' ? Number(form.leetcodeId) : null,
      acceptanceRate: form.acceptanceRate !== '' ? Number(form.acceptanceRate) : 0,
      frequency: form.frequency !== '' ? Number(form.frequency) : 0,
    };
    if (editing) updateMutation.mutate({ id: editing, data: payload });
    else createMutation.mutate(payload);
  };

  const problems = data?.data?.data || [];
  const pagination = data?.data?.pagination;
  const isSaving = createMutation.isLoading || updateMutation.isLoading;

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <h1 className="text-xl font-bold text-text-primary">Problems</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search problems..."
                className="input pl-9 text-sm w-48"
                id="admin-problem-search"
              />
            </div>
            {/* Difficulty filter */}
            <select
              value={difficulty}
              onChange={(e) => { setDifficulty(e.target.value); setPage(1); }}
              className="text-xs bg-bg-secondary border border-border rounded px-3 py-2 text-text-muted focus:outline-none focus:border-accent-blue"
            >
              <option value="">All Difficulties</option>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" onClick={openCreate}>
              <Plus className="w-4 h-4" /> Add Problem
            </button>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : problems.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-text-muted text-sm">No problems found.</p>
            <button className="btn btn-primary btn-sm mt-4" onClick={openCreate}><Plus className="w-4 h-4" /> Add First Problem</button>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Difficulty</th>
                  <th>Acceptance</th>
                  <th>Frequency</th>
                  <th>Premium</th>
                  <th>LeetCode</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {problems.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <p className="font-medium text-text-primary text-sm max-w-xs truncate">{p.title}</p>
                      <code className="text-2xs text-text-faint">{p.slug}</code>
                    </td>
                    <td><span className={`badge ${diffBadge[p.difficulty]}`}>{p.difficulty}</span></td>
                    <td><span className="text-text-secondary text-xs">{p.acceptanceRate ? `${p.acceptanceRate}%` : '—'}</span></td>
                    <td><span className="text-text-secondary text-xs">{p.frequency ?? '—'}</span></td>
                    <td>
                      {p.isPremium
                        ? <span className="badge badge-purple">Premium</span>
                        : <span className="text-text-faint text-xs">Free</span>}
                    </td>
                    <td>
                      {p.leetcodeUrl
                        ? <a href={p.leetcodeUrl} target="_blank" rel="noreferrer" className="text-accent-blue hover:underline flex items-center gap-1 text-xs"><ExternalLink className="w-3 h-3" />Open</a>
                        : <span className="text-text-faint text-xs">—</span>}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(p)} className="btn-icon btn-ghost btn-sm" aria-label="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => { if (confirm(`Delete "${p.title}"?`)) deleteMutation.mutate(p._id); }} className="btn-icon btn-danger btn-sm" aria-label="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="btn btn-secondary btn-sm disabled:opacity-40">Prev</button>
            <span className="text-xs text-text-muted">{page} / {pagination.pages}</span>
            <button onClick={() => setPage((p) => p + 1)} disabled={page === pagination.pages} className="btn btn-secondary btn-sm disabled:opacity-40">Next</button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <Modal title={editing ? 'Edit Problem' : 'Add Problem'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'title', label: 'Title *', placeholder: 'Two Sum', full: true },
              { key: 'slug', label: 'Slug *', placeholder: 'two-sum' },
              { key: 'leetcodeUrl', label: 'LeetCode URL *', placeholder: 'https://leetcode.com/problems/...' },
              { key: 'leetcodeId', label: 'LeetCode ID', placeholder: '1', type: 'number' },
              { key: 'acceptanceRate', label: 'Acceptance Rate (%)', placeholder: '54.5', type: 'number' },
              { key: 'frequency', label: 'Frequency (0–100)', placeholder: '75', type: 'number' },
            ].map(({ key, label, placeholder, full, type }) => (
              <div key={key} className={full ? 'sm:col-span-2' : ''}>
                <label className="block text-xs text-text-muted mb-1">{label}</label>
                <input
                  type={type || 'text'}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="input"
                  placeholder={placeholder}
                  required={label.includes('*')}
                />
              </div>
            ))}

            {/* Difficulty */}
            <div>
              <label className="block text-xs text-text-muted mb-1">Difficulty *</label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                className="input"
                required
              >
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Premium toggle */}
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="isPremium"
                checked={form.isPremium}
                onChange={(e) => setForm({ ...form, isPremium: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="isPremium" className="text-sm text-text-muted">Premium problem</label>
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs text-text-muted mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input min-h-[80px] resize-y"
                placeholder="Optional short description..."
              />
            </div>

            <div className="sm:col-span-2 flex gap-3 pt-2">
              <button type="submit" className="btn btn-primary btn-sm" disabled={isSaving}>
                {isSaving ? 'Saving...' : editing ? 'Update Problem' : 'Create Problem'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={closeModal}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};

export default AdminProblems;
