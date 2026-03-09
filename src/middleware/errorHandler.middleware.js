/**
 * 🛡️ Error Handler Middleware Centralizado
 * 
 * Maneja todos los errores del backend sin exponer detalles internos.
 * 
 * Beneficios:
 * - Previene information leakage (MongoDB, mongoose, stack traces)
 * - Respuestas consistentes en formato JSON
 * - Logging detallado interno pero respuesta genérica al cliente
 * - Diferencia entre entornos (dev muestra más info)
 */

/**
 * 🔴 Clase de Error Personalizada
 * 
 * Uso:
 * throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true; // Error esperado vs. bug
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 🔍 Detectar tipo de error y generar respuesta segura
 */
function getClientSafeError(error, isDevelopment) {
  // Si es un AppError (error controlado)
  if (error.isOperational) {
    return {
      code: error.code,
      message: error.message,
      ...(error.details && { details: error.details }),
    };
  }

  // Errores de Mongoose/MongoDB (NO exponer detalles)
  if (error.name === 'ValidationError') {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Datos inválidos en la solicitud',
      ...(isDevelopment && {
        debug: {
          mongooseErrors: Object.keys(error.errors || {}),
        }
      }),
    };
  }

  if (error.name === 'CastError') {
    return {
      code: 'INVALID_ID',
      message: 'ID inválido proporcionado',
      ...(isDevelopment && {
        debug: {
          path: error.path,
          value: error.value,
        }
      }),
    };
  }

  if (error.code === 11000) {
    // Duplicate key error
    const field = Object.keys(error.keyValue || {})[0] || 'campo';
    return {
      code: 'DUPLICATE_ENTRY',
      message: `Ya existe un registro con ese ${field}`,
      ...(isDevelopment && {
        debug: {
          duplicateFields: Object.keys(error.keyValue || {}),
        }
      }),
    };
  }

  // Error desconocido (bug) - respuesta genérica
  return {
    code: 'INTERNAL_ERROR',
    message: 'Error interno del servidor',
    ...(isDevelopment && {
      debug: {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5), // Solo primeras 5 líneas del stack
      }
    }),
  };
}

/**
 * 🛡️ Middleware de Manejo de Errores
 * 
 * Se instala al final de app.js:
 * app.use(errorHandler);
 */
const errorHandler = (err, req, res, next) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const statusCode = err.statusCode || 500;

  // 🔍 Logging detallado interno (solo servidor)
  if (statusCode === 500 || !err.isOperational) {
    console.error('🚨 ERROR NO CONTROLADO:', {
      name: err.name,
      message: err.message,
      code: err.code,
      stack: err.stack,
      timestamp: new Date().toISOString(),
      userId: req.user?._id,
      path: req.path,
      method: req.method,
      ip: req.ip || req.socket?.remoteAddress,
    });
  } else {
    console.warn('⚠️ Error operacional:', {
      code: err.code,
      message: err.message,
      path: req.path,
      userId: req.user?._id,
    });
  }

  // 📤 Respuesta segura al cliente
  const clientError = getClientSafeError(err, isDevelopment);

  res.status(statusCode).json({
    success: false,
    error: clientError,
    timestamp: new Date().toISOString(),
  });
};

/**
 * 🔍 Middleware de 404 Not Found
 * 
 * Se instala antes del errorHandler:
 * app.use(notFoundHandler);
 * app.use(errorHandler);
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Ruta no encontrada: ${req.method} ${req.path}`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};

/**
 * 🔄 Wrapper async para controllers
 * 
 * Evita try-catch en cada controller.
 * 
 * Uso:
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await User.find();
 *   res.json(users);
 * }));
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 🔐 Validar ObjectId de MongoDB
 * 
 * Uso en rutas:
 * router.get('/users/:id', validateObjectId('id'), userController.getUser);
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const mongoose = require('mongoose');
    const id = req.params[paramName];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(
        new AppError(
          `ID inválido: ${paramName}`,
          400,
          'INVALID_OBJECT_ID',
          { param: paramName, value: id }
        )
      );
    }

    next();
  };
};

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  validateObjectId,
};
