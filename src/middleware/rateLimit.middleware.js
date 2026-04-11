const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;

const oneMinuteMs  = 60 * 1_000;
const fiveMinMs    = 5  * 60 * 1_000;
const fifteenMinMs = 15 * 60 * 1_000;

/**
 * Construye un limiter estándar con respuesta JSON consistente.
 */
function buildLimiter({
  windowMs = oneMinuteMs,
  limit,
  message,
  keyGenerator,
  skipSuccessfulRequests = false,
}) {
  return rateLimit({
    windowMs,
    limit,
    keyGenerator,
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, _next, options) => {
      res.status(options.statusCode).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          retryAfter: Math.ceil(options.windowMs / 1_000),
        },
      });
    },
  });
}

// Resuelve IP real detrás de proxy usando ipKeyGenerator (IPv6-safe)
const resolveClientIp = (req) =>
  ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0');

// ─────────────────────────────────────────────────────────────
// BASE API LIMITER — Todas las rutas /api
// 240 req/min por IP
// ─────────────────────────────────────────────────────────────
const baseApiLimiter = buildLimiter({
  windowMs: oneMinuteMs,
  limit: 240,
  keyGenerator: resolveClientIp,
  message: 'Demasiadas solicitudes. Intenta nuevamente en un minuto.',
});

// ─────────────────────────────────────────────────────────────
// AUTH LIMITER — /api/auth
// 10 intentos fallidos / 15 min por email
// ─────────────────────────────────────────────────────────────
const authLimiter = buildLimiter({
  windowMs: fifteenMinMs,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email =
      typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';
    return email
      ? `auth:email:${email}`
      : `auth:ip:${ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0')}`;
  },
  message:
    'Demasiados intentos de autenticación. Espera 15 minutos e intenta nuevamente.',
});

// ─────────────────────────────────────────────────────────────
// ADMIN LIMITER — /api/admin
// 60 req/min por usuario autenticado
// ─────────────────────────────────────────────────────────────
const adminLimiter = buildLimiter({
  windowMs: oneMinuteMs,
  limit: 60,
  keyGenerator: (req) =>
    req.user?._id
      ? `admin:user:${req.user._id}`
      : `admin:ip:${ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0')}`,
  message: 'Límite de solicitudes admin alcanzado. Espera un minuto.',
});

// ─────────────────────────────────────────────────────────────
// UPLOAD LIMITER — /api/admin/v2/upload
// Admins: 120/min | Users: 20/min
// ─────────────────────────────────────────────────────────────
const uploadLimiter = buildLimiter({
  windowMs: oneMinuteMs,
  limit: (req) => (req.user?.role === 'admin' ? 120 : 20),
  keyGenerator: (req) =>
    req.user?._id
      ? `upload:user:${req.user._id}`
      : `upload:ip:${ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0')}`,
  message: 'Demasiadas subidas. Espera un minuto e intenta nuevamente.',
});

// ─────────────────────────────────────────────────────────────
// PUBLIC CATALOG LIMITER — endpoints públicos
// 90 req/min por IP
// ─────────────────────────────────────────────────────────────
const publicCatalogLimiter = buildLimiter({
  windowMs: oneMinuteMs,
  limit: 90,
  keyGenerator: resolveClientIp,
  message: 'Demasiadas solicitudes al catálogo. Espera un minuto.',
});

// ─────────────────────────────────────────────────────────────
// LESSON COMPLETION LIMITER — POST /api/nodes/complete
// Máx 30 lecciones completadas / 5 min por usuario
// ─────────────────────────────────────────────────────────────
const lessonCompletionLimiter = buildLimiter({
  windowMs: fiveMinMs,
  limit: 30,
  keyGenerator: (req) =>
    req.user?._id
      ? `lesson:user:${req.user._id}`
      : `lesson:ip:${ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0')}`,
  message:
    'Completaste muchas lecciones muy rápido. Espera unos minutos.',
});

// ─────────────────────────────────────────────────────────────
// LIVES LIMITER — POST /api/lives/lose
// Máx 20 pérdidas de vida / 5 min
// ─────────────────────────────────────────────────────────────
const livesLimiter = buildLimiter({
  windowMs: fiveMinMs,
  limit: 20,
  keyGenerator: (req) =>
    req.user?._id
      ? `lives:user:${req.user._id}`
      : `lives:ip:${ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0')}`,
  message: 'Demasiadas solicitudes de vidas. Espera unos minutos.',
});

module.exports = {
  baseApiLimiter,
  authLimiter,
  adminLimiter,
  uploadLimiter,
  publicCatalogLimiter,
  lessonCompletionLimiter,
  livesLimiter,
};
