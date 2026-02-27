const express = require('express');
const router = express.Router();
const mainController = require('../controllers/main.controller');
const authMiddleware = require('../middleware/auth.middleware');
const optionalAuth = require('../middleware/optionalAuth.middleware');
const { publicCatalogLimiter } = require('../middleware/rateLimit.middleware');

const cultureDisabled = (_req, res) => {
	return res.status(410).json({
		message: 'El módulo de Cultura está deshabilitado',
		code: 'CULTURE_DISABLED'
	});
};

// ========================================
// PUBLIC ROUTES
// ========================================

// Get all countries for Experiencia Culinaria
router.get('/countries', optionalAuth, publicCatalogLimiter, mainController.getAllCountries);

// Get country hub (recipes only)
router.get('/countries/:countryId/hub', optionalAuth, publicCatalogLimiter, mainController.getCountryHub);

// Get recipes by country
router.get('/recipes/country/:countryId', mainController.getRecipesByCountry);

// Get single recipe
router.get('/recipes/:recipeId', mainController.getRecipeDetail);

// Get culture by country
router.get('/culture/country/:countryId', cultureDisabled);

// Get single culture
router.get('/culture/:cultureId', cultureDisabled);

// Get all goal paths for Seguir Objetivos
router.get('/goals', publicCatalogLimiter, mainController.getGoalPaths);

// Get path with nodes (generic, public preview)
router.get('/paths/:pathId', publicCatalogLimiter, mainController.getPathWithNodes);

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
