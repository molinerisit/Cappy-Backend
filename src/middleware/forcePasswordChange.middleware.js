/**
 * 🔐 Middleware: Fuerza cambio de contraseña en primer login
 * 
 * Este middleware se aplica DESPUÉS de auth.middleware.
 * Si el usuario tiene forcePasswordChange = true, solo permite acceso a:
 * - PATCH /auth/change-password (cambiar contraseña)
 * - GET /auth/profile (ver su perfil)
 * - POST /auth/logout (cerrar sesión)
 * 
 * Todas las demás rutas retornan 403 FORBIDDEN con código CHANGE_PASSWORD_REQUIRED
 */

const User = require('../models/user.model');

module.exports = async (req, res, next) => {
  try {
    // El middleware de auth ya verifica el token y setea req.user.id
    const userId = req.user?._id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Usuario no identificado'
        }
      });
    }

    // Obtener estado actual del usuario
    const user = await User.findById(userId).select('forcePasswordChange isTempPassword');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_DELETED',
          message: 'Usuario no encontrado'
        }
      });
    }

    // Si usuario no requiere cambio, continuar normalmente
    if (!user.forcePasswordChange && !user.isTempPassword) {
      return next();
    }

    // Lista de rutas permitidas cuando forcePasswordChange = true
    const allowedPaths = [
      { method: 'PATCH', path: /^\/change-password\/?$/ },
      { method: 'GET', path: /^\/profile\/?$/ },
      { method: 'GET', path: /^\/me\/?$/ },
      { method: 'POST', path: /^\/logout\/?$/ },
    ];

    // Verificar si ruta actual está permitida
    const isAllowedRoute = allowedPaths.some(
      allowed => allowed.method === req.method && allowed.path.test(req.path)
    );

    if (!isAllowedRoute) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'CHANGE_PASSWORD_REQUIRED',
          message: 'Debe cambiar su contraseña temporal en el primer login. Acceda a PATCH /auth/change-password',
          requiresPasswordChange: true,
        }
      });
    }

    // Continuar si ruta está permitida
    next();

  } catch (error) {
    console.error('❌ Error en forcePasswordChange middleware:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error interno del servidor'
      }
    });
  }
};
