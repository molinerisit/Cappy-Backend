const express = require('express');
const router = express.Router();
const cultureController = require('../controllers/culture.controller');
const authMiddleware = require('../middleware/auth.middleware');
const isAdmin = require('../middleware/isAdmin');

// Árbol gamificado
router.get('/tree/:countryId', cultureController.getCultureTree);
router.get('/node/:nodeId', cultureController.getCultureNode);
router.get('/node/:nodeId/steps', cultureController.getCultureSteps);

// Progreso
router.post('/node/:nodeId/complete', authMiddleware, cultureController.completeCultureNode);
router.post('/step/:stepId/complete', authMiddleware, cultureController.completeCultureStep);

// Admin
router.post('/node', authMiddleware, isAdmin, cultureController.createCultureNode);
router.put('/node/:nodeId', authMiddleware, isAdmin, cultureController.updateCultureNode);
router.delete('/node/:nodeId', authMiddleware, isAdmin, cultureController.deleteCultureNode);

router.post('/step', authMiddleware, isAdmin, cultureController.createCultureStep);
router.put('/step/:stepId', authMiddleware, isAdmin, cultureController.updateCultureStep);
router.delete('/step/:stepId', authMiddleware, isAdmin, cultureController.deleteCultureStep);

module.exports = router;
