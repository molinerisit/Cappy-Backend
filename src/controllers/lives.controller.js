const {
  getUserLives,
  loseLive,
  canStartLesson,
  refillAllLives,
  getTimeUntilNextLife,
} = require("../services/lives.service");

/**
 * GET /api/lives/status
 * Get user's current lives and refill info
 */
exports.getLivesStatus = async (req, res) => {
  try {
    const livesData = await getUserLives(req.user._id);

    res.json({
      success: true,
      data: livesData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * POST /api/lives/lose
 * Lose one life (called when user fails a quiz/question)
 */
exports.loseLife = async (req, res) => {
  try {
    const livesData = await loseLive(req.user._id);

    // Emit event or log for analytics
    console.log(
      `User ${req.user._id} lost a life. Lives remaining: ${livesData.lives}`
    );

    res.json({
      success: true,
      data: livesData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * PUT /api/lives/check-refill
 * Check if lives need to be refilled
 */
exports.checkRefill = async (req, res) => {
  try {
    const livesData = await getUserLives(req.user._id);

    res.json({
      success: true,
      data: livesData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * POST /api/lives/refill
 * Refill all lives (admin only or manual refill)
 */
exports.refillLives = async (req, res) => {
  try {
    // Check if admin
    if (req.user?.role !== "admin") {
      // Optional: could be called by user with some condition
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const livesData = await refillAllLives(req.user._id);

    res.json({
      success: true,
      data: livesData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/lives/can-start-lesson
 * Check if user can start a lesson (has at least 1 life)
 */
exports.canStartLessonCheck = async (req, res) => {
  try {
    const canStart = await canStartLesson(req.user._id);

    if (!canStart) {
      const timeUntilLive = await getTimeUntilNextLife(req.user._id);
      return res.json({
        success: true,
        canStart: false,
        message: "No tienes vidas disponibles",
        timeUntilNextLife: timeUntilLive,
      });
    }

    res.json({
      success: true,
      canStart: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/lives/time-until-next
 * Get time remaining until next life refill
 */
exports.getTimeUntilNextLifeEndpoint = async (req, res) => {
  try {
    const timeRemaining = await getTimeUntilNextLife(req.user._id);

    res.json({
      success: true,
      timeRemainingMs: timeRemaining,
      timeRemainingMinutes: Math.ceil(timeRemaining / 60000),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
