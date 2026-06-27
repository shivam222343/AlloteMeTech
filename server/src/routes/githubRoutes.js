const express = require('express');
const router = express.Router();
const githubSync = require('../github/github.sync');
const githubScheduler = require('../github/github.scheduler');

// POST /api/admin/github/sync
router.post('/sync', async (req, res) => {
  try {
    const result = await githubSync.runSync();
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/github/status
router.get('/status', (req, res) => {
  const status = githubScheduler.getSyncStatus();
  res.status(200).json({ success: true, data: status });
});

// POST /api/admin/github/company/:slug
router.post('/company/:slug', async (req, res) => {
  // Syncing a single company is an optimization that can be added later.
  // For now, we return 501 Not Implemented, or trigger a full sync.
  res.status(501).json({ success: false, message: 'Single company sync not fully implemented yet. Use /sync for full sync.' });
});

module.exports = router;
