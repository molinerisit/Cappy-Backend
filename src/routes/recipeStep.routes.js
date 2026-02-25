const express = require('express');
const router = express.Router();
const recipeStepController = require('../controllers/recipeStep.controller');
const authMiddleware = require('../middleware/auth.middleware');
const isAdmin = require('../middleware/isAdmin');

// Public
router.get('/:recipeId', recipeStepController.getStepsByRecipe);

// Protected
router.post('/complete', authMiddleware, recipeStepController.completeStep);

// Admin
router.post('/', authMiddleware, isAdmin, recipeStepController.createStep);
router.put('/:stepId', authMiddleware, isAdmin, recipeStepController.updateStep);
router.delete('/:stepId', authMiddleware, isAdmin, recipeStepController.deleteStep);

module.exports = router;
