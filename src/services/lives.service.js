const User = require("../models/user.model");

// Constants
const MAX_LIVES = 3;
const LIFE_REFILL_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
const LIFE_REFILL_HOURS = 2;

/**
 * Calculate how many lives a user should have based on time elapsed
 * @param {Date} lastRefillDate - Last time life was refilled
 * @param {Number} currentLives - Current number of lives
 * @returns {Object} { lives, needsUpdate, nextRefillAt }
 */
exports.calculateCurrentLives = (lastRefillDate, currentLives) => {
  if (currentLives >= MAX_LIVES) {
    return {
      lives: MAX_LIVES,
      needsUpdate: false,
      nextRefillAt: null,
    };
  }

  const now = new Date();
  const timeSinceLastRefill = now - lastRefillDate;
  const livesGained = Math.floor(timeSinceLastRefill / LIFE_REFILL_INTERVAL);

  if (livesGained === 0) {
    // Calculate when next life will be available
    const nextRefillAt = new Date(
      lastRefillDate.getTime() + LIFE_REFILL_INTERVAL
    );
    return {
      lives: currentLives,
      needsUpdate: false,
      nextRefillAt,
    };
  }

  const newLives = Math.min(currentLives + livesGained, MAX_LIVES);
  const newLastRefillDate = new Date(
    lastRefillDate.getTime() + livesGained * LIFE_REFILL_INTERVAL
  );

  return {
    lives: newLives,
    needsUpdate: true,
    lastRefillDate: newLastRefillDate,
    nextRefillAt:
      newLives >= MAX_LIVES
        ? null
        : new Date(
            newLastRefillDate.getTime() + LIFE_REFILL_INTERVAL
          ),
  };
};

/**
 * Get user's current lives (auto-refill if needed)
 * @param {ObjectId} userId
 * @returns {Promise<Object>} { lives, nextRefillAt, lifesLocked }
 */
exports.getUserLives = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  const livesData = exports.calculateCurrentLives(
    user.lastLifeRefillAt,
    user.lives
  );

  // Auto-update if needed
  if (livesData.needsUpdate) {
    user.lives = livesData.lives;
    user.lastLifeRefillAt = livesData.lastRefillDate;
    user.lifesLocked = livesData.lives === 0;
    await user.save();
  }

  return {
    lives: livesData.lives,
    nextRefillAt: livesData.nextRefillAt,
    lifesLocked: livesData.lives === 0,
    lifesLockedUntil:
      livesData.lives === 0 && livesData.nextRefillAt
        ? livesData.nextRefillAt
        : null,
  };
};

/**
 * Lose one life
 * @param {ObjectId} userId
 * @returns {Promise<Object>} { lives, lifesLocked }
 */
exports.loseLive = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  // First, calculate current lives (auto-refill)
  const livesData = exports.calculateCurrentLives(
    user.lastLifeRefillAt,
    user.lives
  );
  let currentLives = livesData.lives;

  // Update if auto-refill happened
  if (livesData.needsUpdate) {
    user.lives = livesData.lives;
    user.lastLifeRefillAt = livesData.lastRefillDate;
  }

  // Lose one life
  if (currentLives > 0) {
    user.lives -= 1;
    currentLives = user.lives;
  }

  // Mark as locked if out of lives
  user.lifesLocked = currentLives === 0;

  await user.save();

  return {
    lives: currentLives,
    lifesLocked: currentLives === 0,
    lifesLockedUntil: currentLives === 0 ? user.lastLifeRefillAt : null,
  };
};

/**
 * Check if user can start a lesson (must have at least 1 life)
 * @param {ObjectId} userId
 * @returns {Promise<Boolean>}
 */
exports.canStartLesson = async (userId) => {
  const livesData = await exports.getUserLives(userId);
  return livesData.lives > 0;
};

/**
 * Force refill all lives (admin only or when time is up)
 * @param {ObjectId} userId
 * @returns {Promise<Object>} { lives, nextRefillAt }
 */
exports.refillAllLives = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  user.lives = MAX_LIVES;
  user.lastLifeRefillAt = new Date();
  user.lifesLocked = false;
  await user.save();

  return {
    lives: MAX_LIVES,
    nextRefillAt: null,
    lifesLocked: false,
  };
};

/**
 * Get time remaining until next life (in milliseconds)
 * @param {ObjectId} userId
 * @returns {Promise<Number>} milliseconds until next life, 0 if full lives
 */
exports.getTimeUntilNextLife = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  const livesData = exports.calculateCurrentLives(
    user.lastLifeRefillAt,
    user.lives
  );

  if (!livesData.nextRefillAt) {
    return 0;
  }

  const now = new Date();
  const timeRemaining = livesData.nextRefillAt - now;

  return Math.max(0, timeRemaining);
};
