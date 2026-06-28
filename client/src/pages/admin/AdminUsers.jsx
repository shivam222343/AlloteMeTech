import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api';
import { Pencil, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
import { formatDate, formatLastActive } from '../../utils/helpers';

const AdminUsers = () => {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: () => adminApi.getUsers({ page, limit: 20, search }),
    refetchInterval: 15000, // Refetch user list every 15s to keep online status real-time
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateUser(id, data),
    onSuccess: () => { toast.success('User updated'); qc.invalidateQueries(['admin-users']); },
    onError: () => toast.error('Failed to update user'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteUser(id),
    onSuccess: () => { toast.success('User deleted'); qc.invalidateQueries(['admin-users']); },
  });

  const users = data?.data?.data || [];
  const pagination = data?.data?.pagination;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Users</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint pointer-events-none" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search users..." className="input pl-9 text-sm w-56" id="admin-user-search" />
        </div>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <div className="card overflow-x-auto">
          <table className="data-table min-w-[560px]">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isActiveOnline = formatLastActive(u.lastActivityDate) === 'Online';
                return (
                  <tr key={u._id}>
                    <td>
                      <Link to={`/admin/users/${u._id}`} className="flex items-center gap-2 hover:opacity-80 group">
                        <div className="relative flex-shrink-0">
                          {u.isPremium ? (
                            <div className="premium-avatar-container" style={{ padding: '2px' }}>
                              {u.avatar ? (
                                <img src={u.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-accent-blue/10 flex items-center justify-center text-[10px] font-bold text-accent-blue">
                                  {u.name?.[0]}
                                </div>
                              )}
                            </div>
                          ) : (
                            u.avatar ? (
                              <img src={u.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-accent-blue/10 flex items-center justify-center text-xs font-medium text-accent-blue">
                                {u.name?.[0]}
                              </div>
                            )
                          )}
                          {isActiveOnline && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent-green ring-2 ring-bg-card animate-pulse" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary group-hover:text-accent-blue transition-colors flex items-center gap-1">
                            {u.name}
                            {u.isPremium && <span className="text-[10px]" title="Premium User">👑</span>}
                          </p>
                          <p className="text-2xs text-text-faint">{u.email}</p>
                          <p className="text-[10px] mt-0.5 leading-none">
                            {isActiveOnline ? (
                              <span className="text-accent-green font-bold">Online</span>
                            ) : (
                              <span className="text-text-muted font-medium">Active: {formatLastActive(u.lastActivityDate)}</span>
                            )}
                          </p>
                        </div>
                      </Link>
                    </td>
                  <td>
                    <select value={u.role} onChange={(e) => updateMutation.mutate({ id: u._id, data: { role: e.target.value } })}
                      className="text-xs bg-bg-secondary border border-border rounded px-2 py-1 text-text-muted focus:outline-none focus:border-accent-blue">
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <button onClick={() => updateMutation.mutate({ id: u._id, data: { isActive: !u.isActive } })}
                      className={`badge ${u.isActive ? 'badge-easy' : 'badge-gray'} cursor-pointer hover:opacity-80`}>
                      {u.isActive ? 'Active' : 'Suspended'}
                    </button>
                  </td>
                  <td><span className="text-xs text-text-faint">{formatDate(u.createdAt)}</span></td>
                  <td>
                    <button onClick={() => { if (confirm(`Delete ${u.name}?`)) deleteMutation.mutate(u._id); }}
                      className="btn-icon btn-danger btn-sm" aria-label="Delete user"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              );
            })}
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
  );
};

export default AdminUsers;
