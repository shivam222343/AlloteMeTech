const express = require('express');
const router = express.Router();
const { getCompanies, getCompany, getCompanyProblems } = require('../controllers/companyController');
const { optionalAuth } = require('../middleware/auth');

router.get('/', getCompanies);
router.get('/:slug', getCompany);
router.get('/:slug/problems', optionalAuth, getCompanyProblems);

module.exports = router;

