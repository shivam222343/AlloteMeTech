const express = require('express');
const router = express.Router();
const { getCompanies, getCompany, getCompanyProblems } = require('../controllers/companyController');

router.get('/', getCompanies);
router.get('/:slug', getCompany);
router.get('/:slug/problems', getCompanyProblems);

module.exports = router;
