const rateLimit = require('express-rate-limit');

const oneMinuteMs = 60 * 1000;

function buildLimiter({ max, message, keyGenerator, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs: oneMinuteMs,
    max,
    keyGenerator,
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
      res.status(options.statusCode).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
        },
      });
    },
  });
}

const resolveClientIp = (req) => req.ip || req.socket?.remoteAddress || 'unknown';

const baseApiLimiter = buildLimiter({
  max: 240,
  message: 'Demasiadas solicitudes al API. Intenta nuevamente en un minuto.',
});

const authLimiter = buildLimiter({
  max: 30,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email =
      typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';

    if (email) {
      return `email:${email}`;
    }

    return `ip:${resolveClientIp(req)}`;
  },
  message: 'Demasiados intentos de autenticacion. Intenta nuevamente en un minuto.',
});

const adminLimiter = buildLimiter({
  max: 600,
  message: 'Demasiadas solicitudes al panel admin. Intenta nuevamente en un minuto.',
});

const uploadLimiter = buildLimiter({
  max: (req) => {
    if (req.user?.role === 'admin') {
      return 120;
    }
    return 30;
  },
  keyGenerator: (req) => {
    if (req.user?._id) {
      return `user:${req.user._id.toString()}`;
    }
    return `ip:${resolveClientIp(req)}`;
  },
  message: 'Demasiadas subidas de imagen. Intenta nuevamente en un minuto.',
});

const publicCatalogLimiter = buildLimiter({
  max: 90,
  message: 'Demasiadas solicitudes al catalogo publico. Intenta nuevamente en un minuto.',
});

module.exports = {
  baseApiLimiter,
  authLimiter,
  adminLimiter,
  uploadLimiter,
  publicCatalogLimiter,
};
