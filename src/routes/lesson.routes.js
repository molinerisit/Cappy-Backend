const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lesson.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.post('/generate', lessonController.generateLesson);
router.post('/:id/complete', lessonController.completeLesson);

module.exports = router;
