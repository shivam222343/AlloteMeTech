import api from './axios';

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  updatePassword: (data) => api.put('/auth/update-password', data),
};

// ── Companies ─────────────────────────────────────────────────────────────────
export const companiesApi = {
  getAll: (params) => api.get('/companies', { params }),
  getOne: (slug) => api.get(`/companies/${slug}`),
  getProblems: (slug, params) => api.get(`/companies/${slug}/problems`, { params }),
  getJobs: (slugOrId, params) => api.get(`/companies/${slugOrId}/jobs`, { params }),
  // Admin ATS management
  adminGetAll: (params) => api.get('/companies/admin', { params }),
  syncCompany: (id, data) => api.post(`/companies/${id}/sync`, data),
  globalSync: (data) => api.post('/companies/global-sync', data),
  updateInfo: (id, data) => api.patch(`/companies/${id}`, data),
  toggleAutoSync: (data) => api.post('/companies/toggle-autosync', data),
  getSchedulerSettings: () => api.get('/companies/scheduler/settings'),
  updateSchedulerSettings: (data) => api.post('/companies/scheduler/settings', data),
  runSchedulerNow: () => api.post('/companies/scheduler/run-now'),
};

// ── Topics ────────────────────────────────────────────────────────────────────
export const topicsApi = {
  getAll: () => api.get('/topics'),
  getOne: (slug) => api.get(`/topics/${slug}`),
  getTopic: (slug) => api.get(`/topics/${slug}`),
  getProblems: (slug, params) => api.get(`/topics/${slug}/problems`, { params }),
};

// ── Search ────────────────────────────────────────────────────────────────────
export const searchApi = {
  global: (q) => api.get('/search', { params: { q } }),
};

// ── Progress ──────────────────────────────────────────────────────────────────
export const progressApi = {
  getAll: (params) => api.get('/progress', { params }),
  upsert: (data) => api.post('/progress', data),
  getScheduled: () => api.get('/progress/scheduled'),
  getDashboard: (year) => api.get('/progress/dashboard', { params: { year } }),
  getRecommendation: () => api.get('/progress/recommendation'),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getAnalytics: () => api.get('/admin/analytics'),

  // Users
  getUsers: (params) => api.get('/admin/users', { params }),
  getUserDetail: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),

  // Companies
  createCompany: (data) => api.post('/admin/companies', data),
  updateCompany: (id, data) => api.put(`/admin/companies/${id}`, data),
  deleteCompany: (id) => api.delete(`/admin/companies/${id}`),

  // Problems
  getProblems: (params) => api.get('/admin/problems', { params }),
  createProblem: (data) => api.post('/admin/problems', data),
  updateProblem: (id, data) => api.put(`/admin/problems/${id}`, data),
  deleteProblem: (id) => api.delete(`/admin/problems/${id}`),

  // Topics
  getTopics: (params) => api.get('/admin/topics', { params }),
  createTopic: (data) => api.post('/admin/topics', data),
  updateTopic: (id, data) => api.put(`/admin/topics/${id}`, data),
  deleteTopic: (id) => api.delete(`/admin/topics/${id}`),

  // GitHub Sync
  syncGithub: () => api.post('/admin/github/sync'),
};

// ── Discussion ────────────────────────────────────────────────────────────────
export const discussionApi = {
  getMessages: (params) => api.get('/discussion', { params }),
  createMessage: (data) => api.post('/discussion', data),
  editMessage: (id, data) => api.put(`/discussion/${id}`, data),
  deleteMessage: (id) => api.delete(`/discussion/${id}`),
  reactMessage: (id, emoji) => api.post(`/discussion/${id}/react`, { emoji }),
  searchMentions: (q) => api.get('/discussion/mentions/search', { params: { q } }),
};

// ── Public ────────────────────────────────────────────────────────────────────
export const publicApi = {
  getStats: () => api.get('/public-stats'),
};

// ── Payment ───────────────────────────────────────────────────────────────────
export const paymentApi = {
  getConfig: () => api.get('/payment/config'),
  validateCoupon: (code) => api.post('/payment/validate-coupon', { code }),
  createOrder: (payload) => {
    const body = typeof payload === 'string' ? { couponCode: payload } : (payload || {});
    return api.post('/payment/create-order', body);
  },
  verify: (data) => api.post('/payment/verify', data),
  
  // Admin pricing and coupon management
  updateConfig: (data) => api.put('/payment/config', data),
  getCoupons: () => api.get('/payment/coupons'),
  createCoupon: (data) => api.post('/payment/coupons', data),
  deleteCoupon: (id) => api.delete(`/payment/coupons/${id}`),
};

// ── Jobs ──────────────────────────────────────────────────────────────────────
export const jobsApi = {
  getAll: (params) => api.get('/jobs', { params }),
  getOne: (slug) => api.get(`/jobs/${slug}`),
  getApplyStatus: () => api.get('/jobs/apply/status'),
  trackApply: (jobId) => api.post('/jobs/apply/track', { jobId }),
  // Admin
  adminGetAll: (params) => api.get('/jobs/admin/all', { params }),
  create: (data) => api.post('/jobs', data),
  update: (id, data) => api.put(`/jobs/${id}`, data),
  delete: (id) => api.delete(`/jobs/${id}`),
  bulkDelete: (ids) => api.post('/jobs/admin/bulk-delete', { ids }),
  aiParse: (data) => api.post('/jobs/admin/ai-parse', data),
  aiBulkParse: (data) => api.post('/jobs/admin/ai-bulk-parse', data),
  bulkCreate: (jobs) => api.post('/jobs/admin/bulk-create', { jobs }),
  syncHireDoor: (options = {}) => {
    const payload = typeof options === 'number' ? { limit: options, mode: 'count' } : options;
    return api.post('/jobs/admin/sync-hiredoor', payload);
  },
  stopSync: () => api.post('/jobs/admin/stop-sync'),
  getSyncStatus: () => api.get('/jobs/admin/sync-status'),
  getCompanies: (params) => api.get('/jobs/admin/companies', { params }),
  updateCompany: (tag, data) => api.put(`/jobs/admin/companies/${tag}`, data),
  getSettings: () => api.get('/jobs/admin/settings'),
  updateSettings: (data) => api.put('/jobs/admin/settings', data),
};

