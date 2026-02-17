const express = require("express");
const router = express.Router();
const progressController = require("../controllers/progress.controller");
const authMiddleware = require("../middleware/auth.middleware");

router.post("/complete", authMiddleware, progressController.completePathLesson);
router.get("/:pathId", authMiddleware, progressController.getPathProgress);
router.post("/complete-lesson", progressController.completeLesson);
router.get("/:userId/:trackId", progressController.getProgress);

module.exports = router;
