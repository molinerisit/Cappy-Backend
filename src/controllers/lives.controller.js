const {
  getUserLives,
  loseLive,
  canStartLesson,
  refillAllLives,
  getTimeUntilNextLife,
} = require('../services/lives.service');

/**
 * GET /api/lives/status
 */
exports.getLivesStatus = async (req, res) => {
  try {
    const livesData = await getUserLives(req.user._id);
    return res.json({ success: true, data: livesData });
  } catch (error) {
    console.error('getLivesStatus error:', { requestId: req.requestId, error: error.message });
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al obtener las vidas' },
    });
  }
};

/**
 * POST /api/lives/lose
 */
exports.loseLife = async (req, res) => {
  try {
    const livesData = await loseLive(req.user._id);
    console.log(`User ${req.user._id} lost a life. Lives remaining: ${livesData.lives}`);
    return res.json({ success: true, data: livesData });
  } catch (error) {
    console.error('loseLife error:', { requestId: req.requestId, error: error.message });
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al procesar la pérdida de vida' },
    });
  }
};

/**
 * PUT /api/lives/check-refill
 */
exports.checkRefill = async (req, res) => {
  try {
    const livesData = await getUserLives(req.user._id);
    return res.json({ success: true, data: livesData });
  } catch (error) {
    console.error('checkRefill error:', { requestId: req.requestId, error: error.message });
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al verificar recarga de vidas' },
    });
  }
};

/**
 * POST /api/lives/refill — Admin only
 */
exports.refillLives = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Acceso solo para administradores' },
      });
    }

    const livesData = await refillAllLives(req.user._id);
    return res.json({ success: true, data: livesData });
  } catch (error) {
    console.error('refillLives error:', { requestId: req.requestId, error: error.message });
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al recargar las vidas' },
    });
  }
};

/**
 * GET /api/lives/can-start-lesson
 */
exports.canStartLessonCheck = async (req, res) => {
  try {
    const canStart = await canStartLesson(req.user._id);

    if (!canStart) {
      const timeUntilLive = await getTimeUntilNextLife(req.user._id);
      return res.json({
        success: true,
        canStart: false,
        message: 'No tienes vidas disponibles',
        timeUntilNextLife: timeUntilLive,
      });
    }

    return res.json({ success: true, canStart: true });
  } catch (error) {
    console.error('canStartLessonCheck error:', { requestId: req.requestId, error: error.message });
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al verificar disponibilidad' },
    });
  }
};

/**
 * GET /api/lives/time-until-next
 */
exports.getTimeUntilNextLifeEndpoint = async (req, res) => {
  try {
    const timeRemaining = await getTimeUntilNextLife(req.user._id);
    return res.json({
      success: true,
      timeRemainingMs: timeRemaining,
      timeRemainingMinutes: Math.ceil(timeRemaining / 60_000),
    });
  } catch (error) {
    console.error('getTimeUntilNextLife error:', { requestId: req.requestId, error: error.message });
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al calcular tiempo restante' },
    });
  }
};
