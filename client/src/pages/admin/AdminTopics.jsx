import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api';
import { Plus, Pencil, Trash2, Search, X, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';

const emptyForm = { name: '', slug: '', icon: '', color: '#3B82F6' };

const PRESET_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444',
  '#06B6D4', '#F97316', '#EC4899', '#6366F1', '#14B8A6',
];

/* ── Modal ── */
const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        <button onClick={onClose} className="btn-icon btn-ghost btn-sm"><X className="w-4 h-4" /></button>
      </div>
      <div className="overflow-y-auto p-6 flex-1">{children}</div>
    </div>
  </div>
);

const AdminTopics = () => {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-topics', page, search],
    queryFn: () => adminApi.getTopics({ page, limit: 20, search }),
    keepPreviousData: true,
  });

  const createMutation = useMutation({
    mutationFn: (data) => adminApi.createTopic(data),
    onSuccess: () => { toast.success('Topic created'); qc.invalidateQueries(['admin-topics']); closeModal(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateTopic(id, data),
    onSuccess: () => { toast.success('Topic updated'); qc.invalidateQueries(['admin-topics']); closeModal(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteTopic(id),
    onSuccess: () => { toast.success('Topic deleted'); qc.invalidateQueries(['admin-topics']); },
  });

  const closeModal = () => { setShowModal(false); setEditing(null); setForm(emptyForm); };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };

  const openEdit = (t) => {
    setEditing(t._id);
    setForm({ name: t.name || '', slug: t.slug || '', icon: t.icon || '', color: t.color || '#3B82F6' });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) updateMutation.mutate({ id: editing, data: form });
    else createMutation.mutate(form);
  };

  const topics = data?.data?.data || [];
  const pagination = data?.data?.pagination;
  const isSaving = createMutation.isLoading || updateMutation.isLoading;

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <h1 className="text-xl font-bold text-text-primary">Topics</h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search topics..."
                className="input pl-9 text-sm w-48"
                id="admin-topic-search"
              />
            </div>
            <button className="btn btn-primary btn-sm" onClick={openCreate}>
              <Plus className="w-4 h-4" /> Add Topic
            </button>
          </div>
        </div>

        {/* Grid / Table */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : topics.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-text-muted text-sm">No topics found.</p>
            <button className="btn btn-primary btn-sm mt-4" onClick={openCreate}><Plus className="w-4 h-4" /> Add First Topic</button>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Slug</th>
                  <th>Icon</th>
                  <th>Problems</th>
                  <th>Color</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {topics.map((t) => (
                  <tr key={t._id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: t.color || '#3B82F6' }}
                        />
                        <span className="font-medium text-text-primary">{t.name}</span>
                      </div>
                    </td>
                    <td><code className="text-2xs text-text-faint bg-bg-secondary px-1.5 py-0.5 rounded">{t.slug}</code></td>
                    <td><span className="text-text-secondary text-sm">{t.icon || <span className="text-text-faint">—</span>}</span></td>
                    <td><span className="text-text-secondary">{t.problemCount ?? 0}</span></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded border border-border" style={{ backgroundColor: t.color || '#3B82F6' }} />
                        <code className="text-2xs text-text-faint">{t.color}</code>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(t)} className="btn-icon btn-ghost btn-sm" aria-label="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => { if (confirm(`Delete "${t.name}"?`)) deleteMutation.mutate(t._id); }} className="btn-icon btn-danger btn-sm" aria-label="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
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
        <Modal title={editing ? 'Edit Topic' : 'Add Topic'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-text-muted mb-1">Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                placeholder="Dynamic Programming"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Slug *</label>
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="input"
                placeholder="dynamic-programming"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Icon (emoji or text)</label>
              <input
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className="input"
                placeholder="🧮"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-2">Color</label>
              <div className="flex items-center gap-3 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: form.color === c ? 'white' : 'transparent',
                      boxShadow: form.color === c ? `0 0 0 2px ${c}` : 'none',
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-7 h-7 rounded cursor-pointer border border-border bg-transparent"
                  title="Custom color"
                />
                <code className="text-xs text-text-faint">{form.color}</code>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn btn-primary btn-sm" disabled={isSaving}>
                {isSaving ? 'Saving...' : editing ? 'Update Topic' : 'Create Topic'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={closeModal}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};

export default AdminTopics;
