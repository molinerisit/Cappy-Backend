const express = require('express');
const router = express.Router();
const countriesController = require('../controllers/countries.controller');
const auth = require('../middleware/auth.middleware');

// Protected routes - require authentication
router.post('/mark-visited', auth, countriesController.markCountryVisited);
router.get('/my-visited', auth, countriesController.getMyVisitedCountries);

module.exports = router;
