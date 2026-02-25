const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboard.controller');
const auth = require('../middleware/auth.middleware');

// Public route - anyone can view global leaderboard
router.get('/', leaderboardController.getGlobalLeaderboard);

// Protected routes - require authentication
router.get('/my-rank', auth, leaderboardController.getMyRank);
router.get('/around-me', auth, leaderboardController.getLeaderboardAroundMe);

module.exports = router;
