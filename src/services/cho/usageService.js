/**
 * usageService.js
 * Controls daily usage limits for Cho.
 * Free: 3 text / 1 image per day.
 * Premium: unlimited text / 3 images per day.
 */

const ChoUsage = require('../../models/ChoUsage.model');

function todayKey() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

async function getOrCreate(userId) {
  const date = todayKey();
  let doc = await ChoUsage.findOne({ userId, date });
  if (!doc) {
    doc = await ChoUsage.create({ userId, date, textCount: 0, imageCount: 0 });
  }
  return doc;
}

/**
 * Check if user can make a request (before actually doing it).
 * @returns {{ allowed: boolean, reason?: string, remaining: { text: number, images: number } }}
 */
async function check(userId, isPremium, hasImage) {
  const usage = await getOrCreate(userId);

  const textLimit  = isPremium ? Infinity : 3;
  const imageLimit = isPremium ? 3 : 1;

  const textRemaining  = Math.max(0, textLimit  === Infinity ? 999 : textLimit  - usage.textCount);
  const imageRemaining = Math.max(0, imageLimit - usage.imageCount);

  if (usage.textCount >= textLimit) {
    return {
      allowed: false,
      reason: 'Llegaste al límite diario de consultas. Volvé mañana o pasate a Premium 🌟',
      remaining: { text: 0, images: imageRemaining },
    };
  }

  if (hasImage && usage.imageCount >= imageLimit) {
    return {
      allowed: false,
      reason: isPremium
        ? 'Usaste tus 3 análisis de imagen de hoy. Volvé mañana.'
        : 'El plan gratis incluye 1 análisis de imagen por día. Pasate a Premium para más 🌟',
      remaining: { text: textRemaining, images: 0 },
    };
  }

  return {
    allowed: true,
    remaining: { text: textRemaining - 1, images: hasImage ? imageRemaining - 1 : imageRemaining },
  };
}

/**
 * Record usage after a successful request.
 */
async function record(userId, hasImage) {
  const date = todayKey();
  const inc = { textCount: 1 };
  if (hasImage) inc.imageCount = 1;
  await ChoUsage.updateOne(
    { userId, date },
    { $inc: inc },
    { upsert: true }
  );
}

/**
 * Get today's usage for a user (for UI display).
 */
async function getRemaining(userId, isPremium) {
  const usage = await getOrCreate(userId);
  const textLimit  = isPremium ? Infinity : 3;
  const imageLimit = isPremium ? 3 : 1;
  return {
    text:   textLimit  === Infinity ? 999 : Math.max(0, textLimit  - usage.textCount),
    images: Math.max(0, imageLimit - usage.imageCount),
    isPremium,
  };
}

module.exports = { check, record, getRemaining };
