const express = require("express");
const router = express.Router();
const livesController = require("../controllers/lives.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Admin middleware inline
const isAdminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "No autenticado" });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Acceso solo admin" });
  }
  next();
};

// All lives routes require authentication
router.use(authMiddleware);

// Get current lives status
router.get("/status", livesController.getLivesStatus);

// Check if user can start a lesson
router.get("/can-start-lesson", livesController.canStartLessonCheck);

// Get time until next life
router.get("/time-until-next", livesController.getTimeUntilNextLifeEndpoint);

// Lose a life (called when user fails a question)
router.post("/lose", livesController.loseLife);

// Check and auto-refill if needed
router.put("/check-refill", livesController.checkRefill);

// Refill all lives (admin only or promotional)
router.post("/refill", isAdminMiddleware, livesController.refillLives);

module.exports = router;
