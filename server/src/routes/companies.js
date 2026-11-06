const express = require('express');
const router = express.Router();
const {
  getCompanies,
  getCompany,
  getCompanyProblems,
  getAdminCompanies,
  getCompanyJobs,
  syncSingleCompany,
  globalSync,
  updateCompanyInfo,
  toggleAutoSync,
  getSchedulerSettings,
  updateSchedulerSettings,
  triggerAutoSyncNow,
} = require('../controllers/companyController');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');

// ── Admin-Only ATS Companies Management ───────────────────────────────────────
router.get('/admin', protect, adminOnly, getAdminCompanies);
router.post('/global-sync', protect, adminOnly, globalSync);
router.post('/toggle-autosync', protect, adminOnly, toggleAutoSync);
router.get('/scheduler/settings', protect, adminOnly, getSchedulerSettings);
router.post('/scheduler/settings', protect, adminOnly, updateSchedulerSettings);
router.post('/scheduler/run-now', protect, adminOnly, triggerAutoSyncNow);
router.post('/:id/sync', protect, adminOnly, syncSingleCompany);
router.patch('/:id', protect, adminOnly, updateCompanyInfo);

// ── Public & Career Board Routes ─────────────────────────────────────────────
router.get('/', getCompanies);
router.get('/:slugOrId/jobs', optionalAuth, getCompanyJobs);
router.get('/:slug', getCompany);
router.get('/:slug/problems', optionalAuth, getCompanyProblems);

module.exports = router;
