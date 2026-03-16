const cloudinary = require('cloudinary').v2;
const fs = require('fs').promises;
const path = require('path');
const { randomUUID } = require('crypto');

let isConfigured = false;
let cloudinaryDisabledWarned = false;
let cloudinaryStartupStatusLogged = false;

const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
  '.avif',
]);

const VIDEO_EXTENSIONS = new Set([
  '.mp4',
  '.webm',
  '.mov',
  '.avi',
  '.mkv',
  '.m4v',
]);

function getCloudinaryCredentials() {
  return {
    cloudName: (process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
    apiKey: (process.env.CLOUDINARY_API_KEY || '').trim(),
    apiSecret: (process.env.CLOUDINARY_API_SECRET || '').trim(),
  };
}

function hasPlaceholderValue(value) {
  const normalized = (value || '').toLowerCase();
  return (
    normalized.startsWith('your-') ||
    normalized.includes('example') ||
    normalized.includes('placeholder')
  );
}

function getCloudinaryReadiness() {
  const uploadProvider = (process.env.UPLOAD_PROVIDER || '').trim().toLowerCase();
  const { cloudName, apiKey, apiSecret } = getCloudinaryCredentials();

  const missingVars = [];
  const placeholderVars = [];

  if (!cloudName) {
    missingVars.push('CLOUDINARY_CLOUD_NAME');
  } else if (hasPlaceholderValue(cloudName)) {
    placeholderVars.push('CLOUDINARY_CLOUD_NAME');
  }

  if (!apiKey) {
    missingVars.push('CLOUDINARY_API_KEY');
  } else if (hasPlaceholderValue(apiKey)) {
    placeholderVars.push('CLOUDINARY_API_KEY');
  }

  if (!apiSecret) {
    missingVars.push('CLOUDINARY_API_SECRET');
  } else if (hasPlaceholderValue(apiSecret)) {
    placeholderVars.push('CLOUDINARY_API_SECRET');
  }

  if (uploadProvider === 'local') {
    return {
      enabled: false,
      reason: 'UPLOAD_PROVIDER=local',
      missingVars,
      placeholderVars,
    };
  }

  if (missingVars.length > 0) {
    return {
      enabled: false,
      reason: `variables faltantes: ${missingVars.join(', ')}`,
      missingVars,
      placeholderVars,
    };
  }

  if (placeholderVars.length > 0) {
    return {
      enabled: false,
      reason: `placeholders detectados: ${placeholderVars.join(', ')}`,
      missingVars,
      placeholderVars,
    };
  }

  return {
    enabled: true,
    reason: null,
    missingVars,
    placeholderVars,
  };
}

function canUseCloudinary() {
  return getCloudinaryReadiness().enabled;
}

function warnCloudinaryDisabled(reason) {
  if (cloudinaryDisabledWarned) {
    return;
  }
  cloudinaryDisabledWarned = true;
  console.warn(
    `⚠️ Cloudinary no disponible (${reason}). Usando storage local en /uploads.`
  );
}

function logCloudinaryStartupStatus() {
  if (cloudinaryStartupStatusLogged) {
    return;
  }
  cloudinaryStartupStatusLogged = true;

  const readiness = getCloudinaryReadiness();
  if (readiness.enabled) {
    console.log('☁️ Cloudinary habilitado para uploads de imagen y video.');
    return;
  }

  console.warn(
    `⚠️ Cloudinary deshabilitado al arrancar (${readiness.reason}). Uploads irán a storage local en /uploads.`
  );
}

function sanitizeName(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function resolveExtensionFromPublicId(publicId, allowedExtensions, fallbackExtension) {
  const ext = path.extname(publicId || '').toLowerCase();
  if (allowedExtensions.has(ext)) {
    return ext;
  }
  return fallbackExtension;
}

function resolveImageExtensionFromPublicId(publicId) {
  return resolveExtensionFromPublicId(publicId, IMAGE_EXTENSIONS, '.jpg');
}

function resolveVideoExtensionFromPublicId(publicId) {
  return resolveExtensionFromPublicId(publicId, VIDEO_EXTENSIONS, '.mp4');
}

function getPublicBaseUrl() {
  const base = (process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`).trim();
  return base.replace(/\/+$/, '');
}

async function uploadBufferToLocal(buffer, options = {}) {
  const uploadsDir = path.join(__dirname, '../../uploads/images');
  await fs.mkdir(uploadsDir, { recursive: true });

  const ext = resolveImageExtensionFromPublicId(options.public_id);
  const publicIdBase = options.public_id
    ? path.basename(options.public_id, path.extname(options.public_id))
    : `image-${Date.now()}-${randomUUID().slice(0, 8)}`;

  const safeBase = sanitizeName(publicIdBase) || `image-${Date.now()}`;
  const fileName = `${safeBase}${ext}`;
  const absolutePath = path.join(uploadsDir, fileName);

  await fs.writeFile(absolutePath, buffer);

  return {
    secure_url: `${getPublicBaseUrl()}/uploads/images/${fileName}`,
    public_id: `local:${fileName}`,
    format: ext.replace('.', ''),
    width: null,
    height: null,
    bytes: buffer.length,
  };
}

async function uploadVideoBufferToLocal(buffer, options = {}) {
  const uploadsDir = path.join(__dirname, '../../uploads/videos');
  await fs.mkdir(uploadsDir, { recursive: true });

  const ext = resolveVideoExtensionFromPublicId(options.public_id);
  const publicIdBase = options.public_id
    ? path.basename(options.public_id, path.extname(options.public_id))
    : `video-${Date.now()}-${randomUUID().slice(0, 8)}`;

  const safeBase = sanitizeName(publicIdBase) || `video-${Date.now()}`;
  const fileName = `${safeBase}${ext}`;
  const absolutePath = path.join(uploadsDir, fileName);

  await fs.writeFile(absolutePath, buffer);

  return {
    secure_url: `${getPublicBaseUrl()}/uploads/videos/${fileName}`,
    public_id: `local:videos/${fileName}`,
    format: ext.replace('.', ''),
    width: null,
    height: null,
    duration: null,
    bytes: buffer.length,
    resource_type: 'video',
  };
}

function ensureCloudinaryConfigured() {
  if (isConfigured) {
    return;
  }

  if (!canUseCloudinary()) {
    throw new Error('Cloudinary is not configured for this environment');
  }

  const { cloudName, apiKey, apiSecret } = getCloudinaryCredentials();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary credentials are missing in environment variables');
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  isConfigured = true;
}

async function uploadBufferToCloudinary(buffer, options = {}) {
  if (!canUseCloudinary()) {
    warnCloudinaryDisabled(getCloudinaryReadiness().reason || 'no configurado');
    return uploadBufferToLocal(buffer, options);
  }

  ensureCloudinaryConfigured();
  const cloudinaryFolder = process.env.CLOUDINARY_FOLDER || 'cooklevel';

  const uploadOptions = {
    folder: cloudinaryFolder,
    resource_type: 'image',
    transformation: [
      { width: 1920, height: 1920, crop: 'limit' },
      { quality: 'auto:good' },
      { fetch_format: 'auto' },
    ],
    ...options,
  };

  try {
    return await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });

      stream.end(buffer);
    });
  } catch (error) {
    const cloudinaryMessage = (error?.message || '').toLowerCase();
    if (cloudinaryMessage.includes('cloud_name is disabled')) {
      warnCloudinaryDisabled('cloud_name is disabled');
      return uploadBufferToLocal(buffer, options);
    }

    throw error;
  }
}

async function uploadBufferToCloudinaryVideo(buffer, options = {}) {
  if (!canUseCloudinary()) {
    warnCloudinaryDisabled(getCloudinaryReadiness().reason || 'no configurado');
    return uploadVideoBufferToLocal(buffer, options);
  }

  ensureCloudinaryConfigured();
  const cloudinaryFolder = process.env.CLOUDINARY_FOLDER || 'cooklevel';

  const uploadOptions = {
    folder: cloudinaryFolder,
    resource_type: 'video',
    chunk_size: 6000000,
    ...options,
  };

  try {
    return await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });

      stream.end(buffer);
    });
  } catch (error) {
    const cloudinaryMessage = (error?.message || '').toLowerCase();
    if (cloudinaryMessage.includes('cloud_name is disabled')) {
      warnCloudinaryDisabled('cloud_name is disabled');
      return uploadVideoBufferToLocal(buffer, options);
    }

    throw error;
  }
}

async function deleteLocalAsset(publicId) {
  const relativePath = (publicId || '').replace(/^local:/, '').trim();
  if (!relativePath) {
    return { result: 'not found' };
  }

  const normalized = relativePath.replace(/\\/g, '/');
  const segments = normalized
    .split('/')
    .filter(Boolean)
    .map((segment) => path.basename(segment));

  if (segments.length === 0) {
    return { result: 'not found' };
  }

  if (segments.length === 1) {
    segments.unshift('images');
  }

  const filePath = path.join(__dirname, '../../uploads', ...segments);
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  return { result: 'ok' };
}

async function deleteFromCloudinary(publicId, options = {}) {
  const resourceType = options.resourceType || 'image';

  if ((publicId || '').startsWith('local:')) {
    return deleteLocalAsset(publicId);
  }

  if (!canUseCloudinary()) {
    warnCloudinaryDisabled(getCloudinaryReadiness().reason || 'no configurado');
    return { result: 'not found' };
  }

  ensureCloudinaryConfigured();
  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  });
}

module.exports = {
  uploadBufferToCloudinary,
  uploadBufferToCloudinaryVideo,
  deleteFromCloudinary,
  getCloudinaryReadiness,
  logCloudinaryStartupStatus,
};
