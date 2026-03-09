const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

/**
 * 🔐 Middleware de Autenticación JWT
 * 
 * Valida tokens JWT y diferencia entre tipos de error:
 * - Token expirado → 401 con código TOKEN_EXPIRED
 * - Token inválido/manipulado → 401 con código INVALID_TOKEN
 * - Usuario no encontrado → 401 con código USER_NOT_FOUND
 * - Sin autorización → 401 con código NO_AUTHORIZATION
 * - Error interno → 500 (nunca debe ocurrir)
 */

module.exports = async (req, res, next) => {
  try {
    // 1️⃣ Validar que JWT_SECRET esté configurado
    if (!process.env.JWT_SECRET) {
      console.error('🚨 CRÍTICO: JWT_SECRET no está configurado en .env');
      return res.status(500).json({
        success: false,
        error: {
          code: 'JWT_SECRET_MISSING',
          message: 'Error interno del servidor'
        }
      });
    }

    // 2️⃣ Validar header de autorización
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_AUTHORIZATION',
          message: 'Authorization header requerido'
        }
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_AUTH_FORMAT',
          message: 'Formato debe ser: Bearer <token>'
        }
      });
    }

    // 3️⃣ Extraer y verificar token
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'Token no proporcionado'
        }
      });
    }

    // 4️⃣ Verificar JWT y diferencia tipos de error
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (tokenError) {
      // Errores específicos de JWT
      if (tokenError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Token ha expirado',
            expiredAt: tokenError.expiredAt,
            hint: 'Use endpoint /api/auth/refresh-token para obtener nuevo token'
          }
        });
      }

      if (tokenError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Token inválido o manipulado'
          }
        });
      }

      if (tokenError.name === 'NotBeforeError') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_NOT_BEFORE',
            message: 'Token aún no es válido'
          }
        });
      }

      // Error desconocido de JWT
      throw tokenError;
    }

    // 5️⃣ Validar que el payload contiene el userId
    if (!decoded.id) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN_PAYLOAD',
          message: 'Token no contiene información de usuario válida'
        }
      });
    }

    // 6️⃣ Verificar que el usuario existe en BD
    const user = await User.findById(decoded.id).select('-password -__v');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Usuario no encontrado o fue eliminado'
        }
      });
    }

    // 7️⃣ Verificar que usuario no está bloqueado/inactivo
    if (user.status === 'blocked') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'USER_BLOCKED',
          message: 'Usuario ha sido bloqueado'
        }
      });
    }

    // 8️⃣ Forzar cambio de contraseña temporal en primer login
    if (user.forcePasswordChange || user.isTempPassword) {
      const requestPath = (req.originalUrl || '').split('?')[0];
      const allowedRoutes = [
        { method: 'PATCH', path: /^\/api\/auth\/change-password\/?$/ },
        { method: 'GET', path: /^\/api\/auth\/profile\/?$/ },
        { method: 'POST', path: /^\/api\/auth\/logout\/?$/ },
      ];

      const isAllowed = allowedRoutes.some(
        (route) => route.method === req.method && route.path.test(requestPath)
      );

      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'CHANGE_PASSWORD_REQUIRED',
            message: 'Debe cambiar su contraseña temporal antes de continuar',
            requiresPasswordChange: true,
          },
        });
      }
    }

    // ✅ Token válido - Attach user a request
    req.user = user;
    req.token = token;

    next();

  } catch (error) {
    // Error inesperado - Loggear sin exponer detalles
    console.error('⚠️  Auth middleware error:', {
      name: error.name,
      message: error.message,
      timestamp: new Date().toISOString()
    });

    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Error validando token'
      }
    });
  }
};
