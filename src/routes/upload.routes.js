/**
 * Upload Routes - Rutas para subida y gestión de archivos
 */

const express = require('express');
const multer = require('multer');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const uploadMiddleware = require('../middleware/upload.middleware');
const authMiddleware = require('../middleware/auth.middleware');
const isAdmin = require('../middleware/isAdmin');
const { uploadLimiter } = require('../middleware/rateLimit.middleware');

const singleImageUpload = (req, res, next) => {
  uploadMiddleware.single('image')(req, res, (err) => {
    if (!err) {
      return next();
    }

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'El archivo es demasiado grande. Máximo 5MB',
        });
      }

      return res.status(400).json({
        success: false,
        message: `Error de subida: ${err.message}`,
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message || 'Archivo de imagen inválido',
    });
  });
};

const videoUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 1,
  },
});

const singleVideoUpload = (req, res, next) => {
  videoUploadMiddleware.single('video')(req, res, (err) => {
    if (!err) {
      return next();
    }

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'El archivo es demasiado grande. Máximo 100MB',
        });
      }

      return res.status(400).json({
        success: false,
        message: `Error de subida: ${err.message}`,
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message || 'Archivo de video inválido',
    });
  });
};

/**
 * POST /api/admin/v2/upload/image
 * Sube una imagen
 * Requiere: Admin auth, multipart/form-data con campo 'image'
 */
router.post(
  '/image',
  authMiddleware,
  isAdmin,
  uploadLimiter,
  singleImageUpload,
  uploadController.uploadImage
);

/**
 * POST /api/admin/v2/upload/video
 * Sube un video
 * Requiere: Admin auth, multipart/form-data con campo 'video'
 */
router.post(
  '/video',
  authMiddleware,
  isAdmin,
  uploadLimiter,
  singleVideoUpload,
  uploadController.uploadVideo
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
  uploadLimiter,
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
  uploadLimiter,
  uploadController.deleteImage
);

module.exports = router;
