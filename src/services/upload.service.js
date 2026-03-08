/**
 * Upload Service - Lógica de negocio para subida de archivos
 * Soporta Cloudinary (cloud) y filesystem local (fallback)
 */

const fs = require('fs').promises;
const path = require('path');
const { randomUUID } = require('crypto');

// Configuración de storage
const STORAGE_MODE = process.env.STORAGE_MODE || 'local'; // 'local' | 'cloudinary'
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const MAX_IMPORT_BYTES = 8 * 1024 * 1024; // 8MB

// Inicializar Cloudinary si está configurado
let cloudinary = null;
if (STORAGE_MODE === 'cloudinary') {
  try {
    cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    console.log('☁️  Cloudinary configurado correctamente');
  } catch (error) {
    console.warn('⚠️  Cloudinary no disponible, usando storage local');
  }
}

/**
 * Asegura que el directorio de uploads existe
 */
const ensureUploadDir = async () => {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.mkdir(path.join(UPLOAD_DIR, 'images'), { recursive: true });
  } catch (error) {
    console.error('Error creating upload directories:', error);
  }
};

const imageExtensionFromType = (contentType) => {
  const mime = (contentType || '').toLowerCase().split(';')[0].trim();
  const map = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
    'image/avif': '.avif',
  };
  return map[mime] || '.jpg';
};

const validateImageSourceUrl = (imageUrl) => {
  let parsed;
  try {
    parsed = new URL(imageUrl);
  } catch (_) {
    throw new Error('URL de imagen inválida');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Solo se permiten URLs http/https');
  }

  return parsed.toString();
};

const fetchImageBufferFromUrl = async (imageUrl) => {
  const response = await fetch(imageUrl, { redirect: 'follow' });

  if (!response.ok) {
    throw new Error(`No se pudo descargar la imagen (status ${response.status})`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('image/')) {
    throw new Error('La URL no apunta a una imagen válida');
  }

  const contentLengthHeader = response.headers.get('content-length');
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0;
  if (Number.isFinite(contentLength) && contentLength > MAX_IMPORT_BYTES) {
    throw new Error('La imagen supera el tamaño máximo permitido (8MB)');
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_IMPORT_BYTES) {
    throw new Error('La imagen supera el tamaño máximo permitido (8MB)');
  }

  return { buffer, contentType };
};

/**
 * Sube imagen a Cloudinary
 */
const uploadToCloudinary = async (file) => {
  if (!cloudinary) {
    throw new Error('Cloudinary no está configurado');
  }

  const result = await cloudinary.uploader.upload(file.path, {
    folder: 'cooklevel',
    resource_type: 'image',
    transformation: [
      { width: 1200, height: 1200, crop: 'limit' }, // Max dimensions
      { quality: 'auto:good' }, // Auto quality
      { fetch_format: 'auto' } // Auto format (WebP cuando posible)
    ]
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    format: result.format,
    width: result.width,
    height: result.height,
    size: result.bytes
  };
};

/**
 * Sube imagen a filesystem local
 */
const uploadToLocal = async (file) => {
  await ensureUploadDir();

  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(file.originalname);
  const filename = `${timestamp}-${randomStr}${ext}`;
  const filepath = path.join(UPLOAD_DIR, 'images', filename);

  // Mover archivo temporal al directorio de uploads
  await fs.rename(file.path, filepath);

  const url = `${BASE_URL}/uploads/images/${filename}`;

  return {
    url,
    publicId: filename,
    format: ext.replace('.', ''),
    width: null, // No disponible sin procesamiento adicional
    height: null,
    size: file.size
  };
};

/**
 * Sube una imagen (puede usar Cloudinary o local)
 */
const uploadImage = async (file) => {
  if (STORAGE_MODE === 'cloudinary' && cloudinary) {
    return await uploadToCloudinary(file);
  } else {
    return await uploadToLocal(file);
  }
};

/**
 * Importa y sube una imagen desde URL
 */
const uploadImageFromUrl = async (url) => {
  const imageUrl = validateImageSourceUrl(url);

  if (STORAGE_MODE === 'cloudinary' && cloudinary) {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: 'cooklevel',
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      size: result.bytes
    };
  }

  await ensureUploadDir();

  const { buffer, contentType } = await fetchImageBufferFromUrl(imageUrl);
  const extension = imageExtensionFromType(contentType);
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}${extension}`;
  const filepath = path.join(UPLOAD_DIR, 'images', filename);

  await fs.writeFile(filepath, buffer);

  return {
    url: `${BASE_URL}/uploads/images/${filename}`,
    publicId: filename,
    format: extension.replace('.', ''),
    width: null,
    height: null,
    size: buffer.length
  };
};

/**
 * Elimina imagen de Cloudinary
 */
const deleteFromCloudinary = async (publicId) => {
  if (!cloudinary) {
    throw new Error('Cloudinary no está configurado');
  }

  await cloudinary.uploader.destroy(publicId);
};

/**
 * Elimina imagen del filesystem local
 */
const deleteFromLocal = async (filename) => {
  const filepath = path.join(UPLOAD_DIR, 'images', filename);
  
  try {
    await fs.unlink(filepath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    // Si el archivo no existe, no es un error crítico
  }
};

/**
 * Elimina una imagen
 */
const deleteImage = async (publicId) => {
  if (STORAGE_MODE === 'cloudinary' && cloudinary) {
    return await deleteFromCloudinary(publicId);
  } else {
    return await deleteFromLocal(publicId);
  }
};

module.exports = {
  uploadImage,
  uploadImageFromUrl,
  deleteImage
};
