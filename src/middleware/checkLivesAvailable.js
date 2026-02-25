const { canStartLesson } = require("../services/lives.service");

/**
 * Middleware para validar que el usuario tenga vidas disponibles
 * Debe usarse en rutas protegidas de lecciones
 */
const checkLivesAvailable = async (req, res, next) => {
  try {
    const hasLives = await canStartLesson(req.user._id);

    if (!hasLives) {
      return res.status(403).json({
        success: false,
        message: "No tienes vidas disponibles para acceder a lecciones",
        code: "NO_LIVES_AVAILABLE",
      });
    }

    // Proceed to next middleware
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = checkLivesAvailable;
