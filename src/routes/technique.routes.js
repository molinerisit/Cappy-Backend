const express = require('express');
const router = express.Router();
const techniqueController = require('../controllers/technique.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/skill-tree', techniqueController.getSkillTree);

module.exports = router;
