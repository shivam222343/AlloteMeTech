import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, companiesApi } from '../../api';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';

const ALPHABET = ['#', ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))];

const emptyForm = { name: '', slug: '', logo: '', website: '', industry: '', isPopular: false, hasWhiteBg: false };

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

const AdminCompanies = () => {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [startingWith, setStartingWith] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
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
        setForm((f) => ({ ...f, logo: data.secure_url }));
        toast.success('Image uploaded successfully');
      } else {
        throw new Error(data.error?.message || 'Upload failed');
      }
    } catch (err) {
      toast.error(err.message || 'Error uploading image');
    } finally {
      setUploading(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['companies-admin', { page, startingWith }],
    queryFn: () => companiesApi.getAll({ page, limit: 20, sort: 'name', startingWith }),
    keepPreviousData: true,
  });

  const createMutation = useMutation({
    mutationFn: (data) => adminApi.createCompany(data),
    onSuccess: () => { toast.success('Company created'); qc.invalidateQueries({ queryKey: ['companies-admin'] }); closeModal(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateCompany(id, data),
    onSuccess: () => { toast.success('Company updated'); qc.invalidateQueries({ queryKey: ['companies-admin'] }); closeModal(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteCompany(id),
    onSuccess: () => { toast.success('Company deleted'); qc.invalidateQueries({ queryKey: ['companies-admin'] }); },
  });

  const closeModal = () => { setShowModal(false); setEditing(null); setForm(emptyForm); };

  const handleEdit = (c) => {
    setEditing(c._id);
    setForm({ name: c.name, slug: c.slug, logo: c.logo || '', website: c.website || '', industry: c.industry || '', isPopular: c.isPopular || false, hasWhiteBg: c.hasWhiteBg || false });
    setShowModal(true);
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) updateMutation.mutate({ id: editing, data: form });
    else createMutation.mutate(form);
  };

  const companies = data?.data?.data || [];
  const pagination = data?.data?.pagination;
  const isSaving = createMutation.isLoading || updateMutation.isLoading;

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-text-primary">Companies</h1>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Add Company
          </button>
        </div>

        {/* Alphabet Scroller */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
          <button
            onClick={() => { setStartingWith(''); setPage(1); }}
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors border ${
              startingWith === '' ? 'bg-accent-blue text-white border-accent-blue' : 'bg-bg-secondary text-text-secondary border-border hover:border-border-strong hover:text-text-primary'
            }`}
          >
            All
          </button>
          {ALPHABET.map((letter) => (
            <button
              key={letter}
              onClick={() => { setStartingWith(letter); setPage(1); }}
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors border ${
                startingWith === letter ? 'bg-accent-blue text-white border-accent-blue' : 'bg-bg-secondary text-text-secondary border-border hover:border-border-strong hover:text-text-primary'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>

        {/* Table */}
        {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
          <div className="card overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Slug</th>
                  <th>Questions</th>
                  <th>Industry</th>
                  <th>Popular</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <div className="flex items-center gap-2">
                        {c.logo && <img src={c.logo} alt="" className="w-6 h-6 object-contain rounded bg-white p-0.5" onError={(e) => { e.target.style.display = 'none'; }} />}
                        <span className="font-medium text-text-primary">{c.name}</span>
                      </div>
                    </td>
                    <td><code className="text-2xs text-text-faint bg-bg-secondary px-1.5 py-0.5 rounded">{c.slug}</code></td>
                    <td><span className="text-text-secondary">{c.totalQuestions}</span></td>
                    <td><span className="text-text-muted text-xs">{c.industry || '—'}</span></td>
                    <td>{c.isPopular ? <span className="badge badge-easy">Yes</span> : <span className="text-text-faint text-xs">—</span>}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(c)} className="btn-icon btn-ghost btn-sm" aria-label="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => { if (confirm('Delete this company?')) deleteMutation.mutate(c._id); }} className="btn-icon btn-danger btn-sm" aria-label="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
        <Modal title={editing ? 'Edit Company' : 'Add Company'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'name', label: 'Name *', placeholder: 'Google' },
              { key: 'slug', label: 'Slug *', placeholder: 'google' },
              { key: 'logo', label: 'Logo URL', placeholder: 'https://...' },
              { key: 'website', label: 'Website', placeholder: 'https://...' },
              { key: 'industry', label: 'Industry', placeholder: 'Technology' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-text-muted mb-1">{label}</label>
                {key === 'logo' ? (
                  <div className="flex gap-2">
                    <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="input flex-1" placeholder={placeholder} />
                    <label className="btn btn-secondary btn-sm cursor-pointer whitespace-nowrap">
                      {uploading ? 'Uploading...' : 'Upload'}
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                    </label>
                  </div>
                ) : (
                  <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="input" placeholder={placeholder}
                    required={label.includes('*')} />
                )}
              </div>
            ))}

            {/* Logo preview */}
            {form.logo && (
              <div className="sm:col-span-2 flex items-center gap-3">
                <img src={form.logo} alt="Logo preview" className="w-10 h-10 object-contain rounded border border-border bg-white p-1"
                  onError={(e) => { e.target.style.display = 'none'; }} />
                <span className="text-xs text-text-muted">Logo preview</span>
              </div>
            )}

            <div className="flex items-center gap-6 sm:col-span-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isPopular" checked={form.isPopular}
                  onChange={(e) => setForm({ ...form, isPopular: e.target.checked })} className="w-4 h-4" />
                <label htmlFor="isPopular" className="text-sm text-text-muted">Popular (featured)</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="hasWhiteBg" checked={form.hasWhiteBg}
                  onChange={(e) => setForm({ ...form, hasWhiteBg: e.target.checked })} className="w-4 h-4" />
                <label htmlFor="hasWhiteBg" className="text-sm text-text-muted">White Logo Background</label>
              </div>
            </div>

            <div className="sm:col-span-2 flex gap-3 pt-2">
              <button type="submit" className="btn btn-primary btn-sm" disabled={isSaving}>
                {isSaving ? 'Saving...' : editing ? 'Update Company' : 'Create Company'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={closeModal}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};

export default AdminCompanies;
