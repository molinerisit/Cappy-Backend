const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');
const forcePasswordChangeMiddleware = require('../middleware/forcePasswordChange.middleware');
const {
  validate,
  validatePasswordStrengthMiddleware,
  registerSchema,
  loginSchema,
  changePasswordSchema,
} = require('../middleware/validators/auth.validators');

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Autenticación y perfil de usuario
 */

// 🔐 RUTAS PÚBLICAS (sin autenticación)

// Register: validar email fuerte + password fuerte + zxcvbn
/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Registrar usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *             required: [email, password, confirmPassword]
 *     responses:
 *       201:
 *         description: Usuario creado
 *       400:
 *         description: Validación fallida
 */
router.post(
  '/register',
  validate(registerSchema),
  validatePasswordStrengthMiddleware,
  authController.register
);

// Login: validar email + password
/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Iniciar sesión
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *             required: [email, password]
 *     responses:
 *       200:
 *         description: Login exitoso
 *       401:
 *         description: Credenciales inválidas
 */
router.post(
  '/login',
  validate(loginSchema),
  validatePasswordStrengthMiddleware,
  authController.login
);

// 🔐 RUTAS PROTEGIDAS (requieren JWT)

// Cambiar contraseña: validar nueva password + verificar fuerza con zxcvbn
/**
 * @swagger
 * /auth/change-password:
 *   patch:
 *     tags: [Auth]
 *     summary: Cambiar contraseña
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *             required: [newPassword, confirmPassword]
 *     responses:
 *       200:
 *         description: Contraseña actualizada
 *       401:
 *         description: No autorizado
 */
router.patch(
  '/change-password',
  authMiddleware,
  validate(changePasswordSchema),
  validatePasswordStrengthMiddleware,
  authController.changePassword
);

// Profile analytics
router.get(
  '/profile/analytics',
  authMiddleware,
  forcePasswordChangeMiddleware,
  authController.getProfileAnalytics
);

// Get profile
/**
 * @swagger
 * /auth/profile:
 *   get:
 *     tags: [Auth]
 *     summary: Obtener perfil
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario
 */
router.get(
  '/profile',
  authMiddleware,
  authController.getProfile
);

// Update profile
/**
 * @swagger
 * /auth/profile:
 *   patch:
 *     tags: [Auth]
 *     summary: Actualizar perfil (username, avatarIcon, avatarUrl)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               avatarIcon:
 *                 type: string
 *               avatarUrl:
 *                 type: string
 *               avatarAssetId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Perfil actualizado
 */
router.patch(
  '/profile',
  authMiddleware,
  forcePasswordChangeMiddleware,
  authController.updateProfile
);

// Change learning path
router.post(
  '/change-path',
  authMiddleware,
  forcePasswordChangeMiddleware,
  authController.changeCurrentPath
);

module.exports = router;
