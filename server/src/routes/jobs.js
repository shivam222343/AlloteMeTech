const express = require('express');
const router = express.Router();
const {
  getJobs,
  getJob,
  serveJobOgHtml,
  adminGetJobs,
  adminGetCompanies,
  adminUpdateCompany,
  createJob,
  updateJob,
  deleteJob,
  reviewJob,
  adminBulkReview,
  aiParseJob,
  aiBulkParse,
  bulkCreateJobs,
  syncHireDoor,
  stopSync,
  getSyncStatus,
  streamSyncLogs,
  adminGetSettings,
  adminUpdateSettings,
  adminBulkDelete,
  getApplyStatus,
  trackJobApply,
  getJobLocations,
} = require('../controllers/jobController');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');

// Admin routes (must be before /:slug to avoid param conflicts)
router.get('/admin/all', protect, adminOnly, adminGetJobs);
router.get('/admin/companies', protect, adminOnly, adminGetCompanies);
router.put('/admin/companies/:tag', protect, adminOnly, adminUpdateCompany);
router.get('/admin/settings', protect, adminOnly, adminGetSettings);
router.put('/admin/settings', protect, adminOnly, adminUpdateSettings);
router.post('/admin/ai-parse', protect, adminOnly, aiParseJob);
router.post('/admin/ai-bulk-parse', protect, adminOnly, aiBulkParse);
router.post('/admin/bulk-create', protect, adminOnly, bulkCreateJobs);
router.post('/admin/bulk-delete', protect, adminOnly, adminBulkDelete);
router.post('/admin/bulk-review', protect, adminOnly, adminBulkReview);
router.post('/admin/sync-hiredoor', protect, adminOnly, syncHireDoor);
router.post('/admin/stop-sync', protect, adminOnly, stopSync);
router.get('/admin/sync-status', protect, adminOnly, getSyncStatus);
router.get('/admin/sync-logs/stream', protect, adminOnly, streamSyncLogs);

// Job Application limit and tracking routes (optionalAuth: supports both guests and logged-in users)
router.get('/apply/status', optionalAuth, getApplyStatus);
router.post('/apply/track', optionalAuth, trackJobApply);

// Location and Country filters metadata (available to both users and admin)
router.get('/meta/locations', optionalAuth, getJobLocations);
router.get('/locations', optionalAuth, getJobLocations);

// Public routes (with optionalAuth to determine free vs premium user gating)
router.get('/', optionalAuth, getJobs);
router.get('/og/:slug', serveJobOgHtml);
router.get('/:slug', optionalAuth, getJob);

// Admin CRUD routes
router.post('/', protect, adminOnly, createJob);
router.patch('/:id/review', protect, adminOnly, reviewJob);
router.put('/:id', protect, adminOnly, updateJob);
router.delete('/:id', protect, adminOnly, deleteJob);

module.exports = router;
