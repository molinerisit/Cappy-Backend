/**
 * Upload Routes - Rutas para subida y gestión de archivos
 */

const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const uploadMiddleware = require('../middleware/upload.middleware');
const authMiddleware = require('../middleware/auth.middleware');
const isAdmin = require('../middleware/isAdmin');

/**
 * POST /api/admin/v2/upload/image
 * Sube una imagen
 * Requiere: Admin auth, multipart/form-data con campo 'image'
 */
router.post(
  '/image',
  authMiddleware,
  isAdmin,
  uploadMiddleware.single('image'),
  uploadController.uploadImage
);

/**
 * POST /api/admin/v2/upload/image/from-url
 * Importa una imagen remota por URL
 * Requiere: Admin auth, JSON body { url }
 */
router.post(
  '/image/from-url',
  authMiddleware,
  isAdmin,
  uploadController.importImageFromUrl
);

/**
 * DELETE /api/admin/v2/upload/image/:publicId
 * Elimina una imagen
 * Requiere: Admin auth
 */
router.delete(
  '/image/:publicId',
  authMiddleware,
  isAdmin,
  uploadController.deleteImage
);

module.exports = router;
