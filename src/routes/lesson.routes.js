const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lesson.controller');
const authMiddleware = require('../middleware/auth.middleware');
const checkLivesAvailable = require('../middleware/checkLivesAvailable');

router.use(authMiddleware);

// Check lives availability before generating lessons
router.post('/generate', checkLivesAvailable, lessonController.generateLesson);

module.exports = router;
