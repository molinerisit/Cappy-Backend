/**
 * imageService.js
 * Validates, resizes (max 1024px) and compresses (70–80%) images
 * before sending them to the AI. Never stores the image.
 */

const sharp = require('sharp');

const MAX_DIMENSION = 1024;
const JPEG_QUALITY  = 75;
const MAX_SIZE_MB   = 10;

/**
 * Process a base64 image string.
 * @param {string} base64 - raw base64 WITHOUT 'data:...' prefix
 * @param {string} mime - e.g. 'image/jpeg'
 * @returns {{ base64: string, mime: 'image/jpeg', meta: { width, height, sizeKb } }}
 */
async function processBase64Image(base64, mime = 'image/jpeg') {
  // 1. Decode
  const buffer = Buffer.from(base64, 'base64');

  // 2. Size guard (before sharp, cheap check)
  const sizeMb = buffer.byteLength / (1024 * 1024);
  if (sizeMb > MAX_SIZE_MB) {
    throw new Error(`Imagen demasiado grande (${sizeMb.toFixed(1)} MB). Máximo ${MAX_SIZE_MB} MB.`);
  }

  // 3. Resize + compress with sharp
  const processed = await sharp(buffer)
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  const { data, info } = processed;

  return {
    base64: data.toString('base64'),
    mime:   'image/jpeg',
    meta: {
      width:  info.width,
      height: info.height,
      sizeKb: Math.round(data.byteLength / 1024),
    },
  };
}

/**
 * Process a file buffer (from multer memory storage).
 */
async function processFileBuffer(buffer) {
  const sizeMb = buffer.byteLength / (1024 * 1024);
  if (sizeMb > MAX_SIZE_MB) {
    throw new Error(`Imagen demasiado grande. Máximo ${MAX_SIZE_MB} MB.`);
  }

  const processed = await sharp(buffer)
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  const { data, info } = processed;

  return {
    base64: data.toString('base64'),
    mime:   'image/jpeg',
    meta: {
      width:  info.width,
      height: info.height,
      sizeKb: Math.round(data.byteLength / 1024),
    },
  };
}

module.exports = { processBase64Image, processFileBuffer };
