/**
 * Upload Service - Uploads image buffers directly to Cloudinary.
 */

const { randomUUID } = require('crypto');
const {
  uploadBufferToCloudinary,
  uploadBufferToCloudinaryVideo,
  deleteFromCloudinary,
} = require('../config/cloudinary.config');

const MAX_IMPORT_BYTES = 8 * 1024 * 1024; // 8MB

const imageExtensionFromType = (contentType) => {
  const mime = (contentType || '').toLowerCase().split(';')[0].trim();
  const map = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/avif': 'avif',
  };
  return map[mime] || 'jpg';
};

const validateImageSourceUrl = (imageUrl) => {
  let parsed;
  try {
    parsed = new URL(imageUrl);
  } catch (_) {
    throw new Error('URL de imagen invalida');
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
    throw new Error('La URL no apunta a una imagen valida');
  }

  const contentLengthHeader = response.headers.get('content-length');
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0;
  if (Number.isFinite(contentLength) && contentLength > MAX_IMPORT_BYTES) {
    throw new Error('La imagen supera el tamano maximo permitido (8MB)');
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_IMPORT_BYTES) {
    throw new Error('La imagen supera el tamano maximo permitido (8MB)');
  }

  return { buffer, contentType };
};

const inferMediaType = (result) => {
  const resourceType = (result?.resource_type || '').toLowerCase();
  return resourceType === 'video' ? 'video' : 'image';
};

const toUploadResponse = (result, fallbackSize = null) => ({
  url: result.secure_url,
  publicId: result.public_id,
  format: result.format || null,
  width: result.width || null,
  height: result.height || null,
  duration: result.duration || null,
  mediaType: inferMediaType(result),
  size: result.bytes || fallbackSize,
});

const uploadImage = async (file) => {
  if (!file || !file.buffer) {
    throw new Error('No se recibio un buffer de imagen valido');
  }

  const result = await uploadBufferToCloudinary(file.buffer, {
    public_id: `image-${Date.now()}-${randomUUID().slice(0, 8)}`,
  });

  return toUploadResponse(result, file.size || null);
};

const uploadImageFromUrl = async (url) => {
  const imageUrl = validateImageSourceUrl(url);
  const { buffer, contentType } = await fetchImageBufferFromUrl(imageUrl);
  const extension = imageExtensionFromType(contentType);

  const result = await uploadBufferToCloudinary(buffer, {
    public_id: `import-${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`,
  });

  return toUploadResponse(result, buffer.length);
};

const uploadVideo = async (file) => {
  if (!file || !file.buffer) {
    throw new Error('No se recibio un buffer de video valido');
  }

  const result = await uploadBufferToCloudinaryVideo(file.buffer, {
    public_id: `video-${Date.now()}-${randomUUID().slice(0, 8)}`,
  });

  return toUploadResponse(result, file.size || null);
};

const deleteImage = async (publicId) => {
  if (!publicId) {
    throw new Error('Se requiere publicId para eliminar una imagen');
  }
  return deleteFromCloudinary(publicId);
};

module.exports = {
  uploadImage,
  uploadImageFromUrl,
  uploadVideo,
  deleteImage,
};
