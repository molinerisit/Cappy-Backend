/**
 * 🔐 Validadores Joi para Autenticación
 * 
 * Incluye:
 * - Validación de Email
 * - Validación de Passwords (fuertes + check debilidad con zxcvbn)
 * - Validación de Registro
 * - Validación de Login
 * - Validación de Cambio de Contraseña
 */

const Joi = require('joi');
const zxcvbn = require('zxcvbn');

/**
 * 🔐 Esquema para validar fortaleza de contraseña
 * 
 * Reglas:
 * - Mínimo 12 caracteres
 * - Debe contener mayúsculas, minúsculas, números y símbolos
 * - Score de zxcvbn debe ser >= 3 (no débil)
 * - No puede contener secuencias comunes
 */
const passwordSchema = Joi.string()
  .min(12)
  .max(128)
  .required()
  .pattern(/[A-Z]/) // Mayúscula
  .pattern(/[a-z]/) // Minúscula
  .pattern(/[0-9]/) // Número
  .pattern(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/) // Símbolo
  .messages({
    'string.pattern.base': 'La contraseña debe contener mayúsculas, minúsculas, números y símbolos',
    'string.min': 'La contraseña debe tener al menos 12 caracteres',
    'string.max': 'La contraseña no puede exceder 128 caracteres',
    'any.required': 'La contraseña es requerida',
  });

/**
 * 🔐 Email schema
 */
const emailSchema = Joi.string()
  .email()
  .required()
  .messages({
    'string.email': 'Email inválido',
    'any.required': 'Email es requerido',
  });

/**
 * 📋 Validar fortaleza de contraseña con zxcvbn
 * 
 * Retorna:
 * - { valid: true, score: 4, feedback: '...' } si es fuerte
 * - { valid: false, score: 1, feedback: '...', reason: 'Es demasiado débil...' }
 */
function validatePasswordStrength(password) {
  const result = zxcvbn(password);
  
  // score: 0-4 (0=muy débil, 4=muy fuerte)
  // Requerimos score >= 3 (fuerte)
  const isStrong = result.score >= 3;
  
  return {
    valid: isStrong,
    score: result.score,
    feedback: result.feedback.warning || result.feedback.suggestions?.[0] || 'Contraseña válida',
    guessesLog10: result.guesses_log10,
    crackTime: result.crack_times_display.online_no_throttling_10_per_second,
  };
}

/**
 * 📋 Validar Registro (register)
 * 
 * POST /auth/register
 * Body: { email, password, confirmPassword }
 */
const registerSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Las contraseñas no coinciden',
    }),
});

/**
 * 📋 Validar Login
 * 
 * POST /auth/login
 * Body: { email, password }
 */
const loginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Contraseña es requerida',
    }),
});

/**
 * 📋 Validar Cambio de Contraseña
 * 
 * PATCH /auth/change-password
 * Body: { currentPassword, newPassword, confirmPassword }
 */
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .optional()
    .allow(null)
    .messages({
      'string.base': 'currentPassword debe ser un string',
    }),
  newPassword: passwordSchema,
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Las contraseñas no coinciden',
    }),
});

/**
 * 🔐 Middleware validador genérico
 * 
 * Uso:
 * router.post('/register', validate(registerSchema), authController.register);
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      convert: true,
    });

    if (error) {
      const details = error.details.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validación fallida',
          details,
        }
      });
    }

    req.validatedBody = value;
    next();
  };
}

/**
 * 🔐 Middleware validador de fortaleza de contraseña
 * 
 * Se aplica DESPUÉS de validación Joi básica.
 * Usa zxcvbn para validar que contraseña sea lo suficientemente fuerte.
 */
function validatePasswordStrengthMiddleware(req, res, next) {
  const password = req.validatedBody?.newPassword || req.validatedBody?.password;
  
  if (!password) {
    return next();
  }

  const strengthCheck = validatePasswordStrength(password);

  if (!strengthCheck.valid) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'WEAK_PASSWORD',
        message: 'La contraseña es demasiado débil',
        details: {
          score: strengthCheck.score,
          maxScore: 4,
          feedback: strengthCheck.feedback,
          crackTime: strengthCheck.crackTime,
        }
      }
    });
  }

  // Pasar información de fuerza al request
  req.passwordStrength = strengthCheck;
  next();
}

module.exports = {
  // Esquemas
  registerSchema,
  loginSchema,
  changePasswordSchema,
  
  // Funciones
  validatePasswordStrength,
  validate,
  validatePasswordStrengthMiddleware,
  
  // Útil para exportar los schemas individualmente si es necesario
  passwordSchema,
  emailSchema,
};
