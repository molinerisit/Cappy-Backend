/**
 * Upload Middleware - Configuración de Multer para manejo de archivos
 */

const multer = require('multer');

// Keep files in memory to stream them directly to Cloudinary.
const storage = multer.memoryStorage();

// Filtro de tipos de archivo
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se aceptan imágenes.'), false);
  }
};

// Configuración de límites
const limits = {
  fileSize: 5 * 1024 * 1024, // 5MB
  files: 1 // Solo 1 archivo a la vez
};

// Configuración de Multer
const upload = multer({
  storage,
  fileFilter,
  limits
});

module.exports = upload;
