/**
 * Upload Controller - Manejo de subida de archivos (imágenes, videos)
 * Soporta storage local y Cloudinary
 */

const uploadService = require('../services/upload.service');

/**
 * POST /api/admin/v2/upload/image
 * Sube una imagen y retorna la URL pública
 */
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se recibió ningún archivo'
      });
    }

    // Validar que sea una imagen
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de archivo no válido. Solo se permiten: JPEG, PNG, GIF, WEBP'
      });
    }

    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'El archivo es demasiado grande. Máximo 5MB'
      });
    }

    const result = await uploadService.uploadImage(req.file);

    res.status(200).json({
      success: true,
      message: 'Imagen subida exitosamente',
      data: {
        url: result.url,
        publicId: result.publicId || null,
        format: result.format,
        width: result.width,
        height: result.height,
        size: result.size
      }
    });
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir la imagen',
      error: error.message
    });
  }
};

/**
 * POST /api/admin/v2/upload/image/from-url
 * Importa una imagen remota por URL y la sube al storage configurado
 */
const importImageFromUrl = async (req, res) => {
  try {
    const { url } = req.body || {};

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Se requiere una URL de imagen válida'
      });
    }

    const result = await uploadService.uploadImageFromUrl(url.trim());

    res.status(200).json({
      success: true,
      message: 'Imagen importada exitosamente',
      data: {
        url: result.url,
        publicId: result.publicId || null,
        format: result.format,
        width: result.width,
        height: result.height,
        size: result.size
      }
    });
  } catch (error) {
    console.error('❌ Error importing image from URL:', error);

    const isValidationError =
      error.message?.includes('URL') ||
      error.message?.includes('imagen') ||
      error.message?.includes('http/https') ||
      error.message?.includes('status');

    res.status(isValidationError ? 400 : 500).json({
      success: false,
      message: 'Error al importar la imagen desde URL',
      error: error.message
    });
  }
};

/**
 * DELETE /api/admin/v2/upload/image/:publicId
 * Elimina una imagen del storage
 */
const deleteImage = async (req, res) => {
  try {
    const { publicId } = req.params;
    
    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el publicId de la imagen'
      });
    }

    await uploadService.deleteImage(publicId);

    res.status(200).json({
      success: true,
      message: 'Imagen eliminada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error deleting image:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la imagen',
      error: error.message
    });
  }
};

module.exports = {
  uploadImage,
  importImageFromUrl,
  deleteImage
};
