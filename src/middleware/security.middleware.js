/**
 * 🛡️ Security Middleware — Cappy Backend
 *
 * Implementa sin dependencias externas:
 * - Security headers (equivalente a helmet)
 * - Sanitización de inputs NoSQL
 * - Limpieza de payloads maliciosos
 * - Request ID para trazabilidad
 */

const { randomBytes } = require('crypto');

// ─────────────────────────────────────────────────────────────
// 1. SECURITY HEADERS
//    Equivalente a helmet() sin dependencia extra
// ─────────────────────────────────────────────────────────────
const securityHeaders = (req, res, next) => {
  // Previene MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Previene clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Deshabilita el XSS filter roto de browsers viejos (recomendación moderna)
  res.setHeader('X-XSS-Protection', '0');

  // Previene que IE abra descargas en contexto del sitio
  res.setHeader('X-Download-Options', 'noopen');

  // No permite que el browser prefetchee DNS
  res.setHeader('X-DNS-Prefetch-Control', 'off');

  // Controla cuánta info se envía en el header Referer
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Elimina fingerprinting de Express
  res.removeHeader('X-Powered-By');

  // Permisos de features del browser
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()'
  );

  // HSTS: solo en producción (fuerza HTTPS)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  next();
};

// ─────────────────────────────────────────────────────────────
// 2. SANITIZACIÓN DE INPUTS NOSQL
//    Previene inyección MongoDB: { "$where": "...", "$gt": "" }
//    Strip recursivo de keys que empiezan con $ o contienen .
// ─────────────────────────────────────────────────────────────
function _sanitize(obj, depth = 0) {
  // Evitar recursión infinita (objetos circulares / muy anidados)
  if (depth > 10 || !obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return;
  }

  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
      continue;
    }
    if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      _sanitize(obj[key], depth + 1);
    }
  }
}

const sanitizeInputs = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    _sanitize(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    _sanitize(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    _sanitize(req.params);
  }
  next();
};

// ─────────────────────────────────────────────────────────────
// 3. REQUEST TIMEOUT
//    Previene requests colgadas que agotan el servidor.
//    default: 30s para API general, configurable por ruta.
// ─────────────────────────────────────────────────────────────
const requestTimeout = (ms = 30_000) => (req, res, next) => {
  const timer = setTimeout(() => {
    if (res.headersSent) return;
    res.status(503).json({
      success: false,
      error: {
        code: 'REQUEST_TIMEOUT',
        message: 'La solicitud tardó demasiado. Intenta nuevamente.',
      },
    });
  }, ms);

  const clear = () => clearTimeout(timer);
  res.on('finish', clear);
  res.on('close', clear);

  next();
};

// ─────────────────────────────────────────────────────────────
// 4. REQUEST ID
//    Agrega un ID único a cada request para trazabilidad en logs.
// ─────────────────────────────────────────────────────────────
const requestId = (req, res, next) => {
  const id = randomBytes(8).toString('hex');
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
};

module.exports = {
  securityHeaders,
  sanitizeInputs,
  requestTimeout,
  requestId,
};
