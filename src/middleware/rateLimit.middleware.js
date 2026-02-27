const rateLimit = require('express-rate-limit');

const oneMinuteMs = 60 * 1000;

function buildLimiter(max, message) {
  return rateLimit({
    windowMs: oneMinuteMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
  });
}

const baseApiLimiter = buildLimiter(
  240,
  'Demasiadas solicitudes al API. Intenta nuevamente en un minuto.'
);

const authLimiter = buildLimiter(
  40,
  'Demasiados intentos de autenticación. Intenta nuevamente en un minuto.'
);

const adminLimiter = buildLimiter(
  600,
  'Demasiadas solicitudes al panel admin. Intenta nuevamente en un minuto.'
);

const publicCatalogLimiter = buildLimiter(
  90,
  'Demasiadas solicitudes al catálogo público. Intenta nuevamente en un minuto.'
);

module.exports = {
  baseApiLimiter,
  authLimiter,
  adminLimiter,
  publicCatalogLimiter,
};
