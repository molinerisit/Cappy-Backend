/**
 * Upload Middleware - Configuración de Multer para manejo de archivos
 * Note: No fileFilter here — the controller validates MIME type and size
 * so multer always receives the file and req.file is always populated.
 */

const multer = require('multer');

// Keep files in memory to stream them directly to Cloudinary.
const storage = multer.memoryStorage();

// Configuración de límites
const limits = {
  fileSize: 15 * 1024 * 1024, // 15MB — controller enforces this limit too
  files: 1
};

// No fileFilter: multer accepts everything, controller validates type/size
const upload = multer({ storage, limits });

module.exports = upload;
