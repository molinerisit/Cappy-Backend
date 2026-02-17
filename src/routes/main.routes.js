const express = require('express');
const router = express.Router();
const mainController = require('../controllers/main.controller');
const authMiddleware = require('../middleware/auth.middleware');

// ========================================
// PUBLIC ROUTES
// ========================================

// Get all countries for Experiencia Culinaria
router.get('/countries', mainController.getAllCountries);

// Get country hub (recipes + culture)
router.get('/countries/:countryId/hub', mainController.getCountryHub);

// Get all goal paths for Seguir Objetivos
router.get('/goals', mainController.getGoalPaths);

// Get path with nodes (generic, public preview)
router.get('/paths/:pathId', mainController.getPathWithNodes);

// Get global ranking
router.get('/ranking', mainController.getGlobalRanking);

// ========================================
// PROTECTED ROUTES (require authentication)
// ========================================

// Complete a node (progression)
router.post('/nodes/complete', authMiddleware, mainController.completeNode);

// Get user progress for a specific path
router.get('/paths/:pathId/progress', authMiddleware, mainController.getPathProgress);

module.exports = router;
