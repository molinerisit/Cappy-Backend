const express = require('express');
const router = express.Router();
const livesController = require('../controllers/lives.controller');
const authMiddleware = require('../middleware/auth.middleware');

// All routes require authentication
router.get('/status', authMiddleware, livesController.getLivesStatus);
router.post('/lose', authMiddleware, livesController.loseLife);
router.put('/check-refill', authMiddleware, livesController.checkRefill);
router.get('/can-start-lesson', authMiddleware, livesController.canStartLesson);
router.get('/time-until-next', authMiddleware, livesController.getTimeUntilNext);

module.exports = router;
