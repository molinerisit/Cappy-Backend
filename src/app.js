const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');

const {
  baseApiLimiter,
  authLimiter,
  adminLimiter,
} = require('./middleware/rateLimit.middleware');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler.middleware');
const {
  securityHeaders,
  sanitizeInputs,
  requestTimeout,
  requestId,
} = require('./middleware/security.middleware');

// ── Routes ────────────────────────────────────────────────────────────────────
const mainRoutes         = require('./routes/main.routes');
const authRoutes         = require('./routes/auth.routes');
const adminRoutes        = require('./routes/admin.routes');
const pantryRoutes       = require('./routes/pantry.routes');
const lessonRoutes       = require('./routes/lesson.routes');
const techniqueRoutes    = require('./routes/technique.routes');
const trackRoutes        = require('./routes/track.routes');
const pathRoutes         = require('./routes/path.routes');
const progressRoutes     = require('./routes/progress.routes');
const recipeRoutes       = require('./routes/recipe.routes');
const skillRoutes        = require('./routes/skill.routes');
const countryRoutes      = require('./routes/country.routes');
const inventoryRoutes    = require('./routes/inventory.routes');
const learningNodeRoutes = require('./routes/learningNode.routes');
const learningPathRoutes = require('./routes/learningPath.routes');
const recipeStepRoutes   = require('./routes/recipeStep.routes');
const cultureRoutes      = require('./routes/culture.routes');
const livesRoutes        = require('./routes/lives.routes');
const leaderboardRoutes  = require('./routes/leaderboard.routes');
const { userRouter: choUserRoutes, adminRouter: choAdminRoutes } = require('./routes/cho.routes');
const uploadRoutes       = require('./routes/upload.routes');

const setupSwagger = require('./swagger');

// ─────────────────────────────────────────────────────────────
// CORS — Solo permite orígenes autorizados
// Para apps móviles nativas, origin es null → siempre permitido.
// Para Flutter Web, configurar ALLOWED_ORIGINS en .env.
// ─────────────────────────────────────────────────────────────
const rawOrigins = process.env.ALLOWED_ORIGINS || '';
const allowedOrigins = rawOrigins
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Sin origin → app nativa, Postman, curl, servidor a servidor → permitido
    if (!origin) return callback(null, true);

    // Origin en whitelist → permitido
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // En desarrollo sin lista → permitido (facilita dev local)
    if (process.env.NODE_ENV !== 'production' && allowedOrigins.length === 0) {
      return callback(null, true);
    }

    // Bloqueado
    callback(new Error(`CORS: Origin no autorizado — ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id', 'RateLimit-Limit', 'RateLimit-Remaining'],
  maxAge: 86_400, // 24h — el browser cachea la preflight
};

// ─────────────────────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────────────────────
const app = express();

// Confiar en 1 proxy (Nginx, Railway, Render, etc.)
// Necesario para que req.ip sea correcto detrás de un reverse proxy
app.set('trust proxy', 1);

// ─────────────────────────────────────────────────────────────
// MIDDLEWARES GLOBALES — Orden importa
// ─────────────────────────────────────────────────────────────
app.use(requestId);           // ID único por request (trazabilidad)
app.use(securityHeaders);     // Headers de seguridad (equivalente a helmet)
app.use(cors(corsOptions));   // CORS configurado
app.options(/.*/, cors(corsOptions)); // Preflight para todos los routes (Express 5: regex evita PathError)

app.use(compression());       // Gzip — reduce payload ~70%

// Body parsers con límites explícitos para prevenir DoS
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

app.use(sanitizeInputs);      // Sanitización NoSQL — strip $, . de keys

// Timeout global: 30s para API general
// Los endpoints de upload tienen su propio timeout más largo
app.use('/api', requestTimeout(30_000));

// ─────────────────────────────────────────────────────────────
// DOCS — Solo en no-producción
// ─────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  setupSwagger(app);
}

// ─────────────────────────────────────────────────────────────
// UPLOADS ESTÁTICOS — Solo si no se usa Cloudinary
// ─────────────────────────────────────────────────────────────
if (process.env.UPLOAD_PROVIDER !== 'cloudinary') {
  app.use(
    '/uploads',
    express.static(path.join(__dirname, '../uploads'), {
      // Headers de cache para assets estáticos
      maxAge: '7d',
      immutable: false,
    })
  );
}

// ─────────────────────────────────────────────────────────────
// RATE LIMITING BASE — Antes de todos los routes
// ─────────────────────────────────────────────────────────────
app.use('/api', baseApiLimiter);

// ─────────────────────────────────────────────────────────────
// ROUTES — API v2.0 (nueva arquitectura unificada)
// ─────────────────────────────────────────────────────────────
app.use('/api', mainRoutes);

// Core routes
app.use('/api/auth',             authLimiter,  authRoutes);
app.use('/api/admin',            adminLimiter, adminRoutes);
app.use('/api/admin/cho',                      choAdminRoutes);
app.use('/api/admin/v2/upload',                uploadRoutes);
app.use('/api/cho',                            choUserRoutes);
app.use('/api/lives',                          livesRoutes);
app.use('/api/leaderboard',                    leaderboardRoutes);

// ─────────────────────────────────────────────────────────────
// ROUTES — Legacy v1.0 (backward compatibility)
// ─────────────────────────────────────────────────────────────
app.use('/api/pantry',         pantryRoutes);
app.use('/api/lesson',         lessonRoutes);
app.use('/api/techniques',     techniqueRoutes);
app.use('/api/tracks',         trackRoutes);
app.use('/api/paths',          pathRoutes);
app.use('/api/progress',       progressRoutes);
app.use('/api/recipes',        recipeRoutes);
app.use('/api/skills',         skillRoutes);
app.use('/api/countries',      countryRoutes);
app.use('/api/inventory',      inventoryRoutes);
app.use('/api/nodes',          learningNodeRoutes);
app.use('/api/learning-paths', learningPathRoutes);
app.use('/api/recipe-steps',   recipeStepRoutes);
app.use('/api/culture',        cultureRoutes);

// ─────────────────────────────────────────────────────────────
// ERROR HANDLERS — Siempre al final
// ─────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
