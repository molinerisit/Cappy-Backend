/**
 * Upload Middleware - Configuración de Multer para manejo de archivos
 */

const multer = require('multer');
const path = require('path');

// Configuración de storage temporal
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/temp/'); // Directorio temporal
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

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
