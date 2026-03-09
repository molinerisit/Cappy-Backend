const cloudinary = require('cloudinary').v2;

let isConfigured = false;

function ensureCloudinaryConfigured() {
  if (isConfigured) {
    return;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

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

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(result);
    });

    stream.end(buffer);
  });
}

async function deleteFromCloudinary(publicId) {
  ensureCloudinaryConfigured();
  return cloudinary.uploader.destroy(publicId, {
    resource_type: 'image',
    invalidate: true,
  });
}

module.exports = {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
};
