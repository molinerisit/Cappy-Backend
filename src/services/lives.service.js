const User = require('../models/user.model');

const MAX_LIVES           = 3;
const LIFE_REFILL_INTERVAL = 2 * 60 * 60 * 1_000; // 2 horas en ms

/**
 * Calcula las vidas actuales en función del tiempo transcurrido.
 * Pura — sin side effects.
 *
 * @param {Date}   lastRefillDate  Última vez que se recargó una vida
 * @param {number} currentLives    Vidas actuales en BD
 * @returns {{ lives, needsUpdate, lastRefillDate?, nextRefillAt? }}
 */
exports.calculateCurrentLives = (lastRefillDate, currentLives) => {
  if (currentLives >= MAX_LIVES) {
    return { lives: MAX_LIVES, needsUpdate: false, nextRefillAt: null };
  }

  const now              = new Date();
  const timeSinceRefill  = now - lastRefillDate;
  const livesGained      = Math.floor(timeSinceRefill / LIFE_REFILL_INTERVAL);

  if (livesGained === 0) {
    return {
      lives: currentLives,
      needsUpdate: false,
      nextRefillAt: new Date(lastRefillDate.getTime() + LIFE_REFILL_INTERVAL),
    };
  }

  const newLives         = Math.min(currentLives + livesGained, MAX_LIVES);
  const newLastRefillAt  = new Date(
    lastRefillDate.getTime() + livesGained * LIFE_REFILL_INTERVAL
  );

  return {
    lives:         newLives,
    needsUpdate:   true,
    lastRefillDate: newLastRefillAt,
    nextRefillAt:  newLives >= MAX_LIVES
      ? null
      : new Date(newLastRefillAt.getTime() + LIFE_REFILL_INTERVAL),
  };
};

/**
 * Obtiene las vidas actuales del usuario.
 * Si hay auto-refill disponible, lo aplica con update atómico.
 *
 * @param {ObjectId} userId
 */
exports.getUserLives = async (userId) => {
  const user = await User.findById(userId).lean();
  if (!user) throw new Error('Usuario no encontrado');

  const livesData = exports.calculateCurrentLives(
    user.lastLifeRefillAt,
    user.lives
  );

  if (livesData.needsUpdate) {
    // Actualización atómica — evita race conditions
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          lives:              livesData.lives,
          lastLifeRefillAt:   livesData.lastRefillDate,
          lifesLocked:        livesData.lives === 0,
        },
      }
    );
  }

  return {
    lives:           livesData.lives,
    nextRefillAt:    livesData.nextRefillAt,
    lifesLocked:     livesData.lives === 0,
    lifesLockedUntil: livesData.lives === 0 && livesData.nextRefillAt
      ? livesData.nextRefillAt
      : null,
  };
};

/**
 * Pierde una vida — operación ATÓMICA para prevenir race conditions.
 *
 * El problema original: read → calculate → write podía ejecutarse
 * dos veces en paralelo, gastando 1 vida con 2 requests simultáneos.
 *
 * La solución: findOneAndUpdate atómico con condición { lives: { $gt: 0 } }.
 * MongoDB garantiza que solo UN request puede decrementar si lives > 0.
 *
 * @param {ObjectId} userId
 */
exports.loseLive = async (userId) => {
  // Paso 1: Calcular si hay auto-refill disponible (solo lectura)
  const user = await User.findById(userId).select('lives lastLifeRefillAt').lean();
  if (!user) throw new Error('Usuario no encontrado');

  const livesData = exports.calculateCurrentLives(
    user.lastLifeRefillAt,
    user.lives
  );

  // Las vidas "reales" en este momento (antes de perder una)
  const effectiveLives = livesData.lives;

  if (effectiveLives <= 0) {
    // Ya sin vidas — nada que decrementar
    return {
      lives:       0,
      lifesLocked: true,
      lifesLockedUntil: livesData.nextRefillAt,
    };
  }

  // Paso 2: UPDATE ATÓMICO — garantiza exactamente -1 aunque lleguen 100 requests
  // La condición { lives: { $gt: 0 } } actúa como lock optimista:
  // si otro request ya decrementó a 0, este update no encuentra el doc
  // y retorna null → manejamos el caso con gracia.
  const updated = await User.findOneAndUpdate(
    {
      _id:   userId,
      lives: { $gt: 0 },   // ← Condición atómica: solo si aún hay vidas
    },
    {
      $inc: { lives: -1 },
      $set: {
        // Aplicar auto-refill si corresponde (ajustar timestamp)
        ...(livesData.needsUpdate && {
          lastLifeRefillAt: livesData.lastRefillDate,
        }),
      },
    },
    {
      new:        true,  // Retornar documento DESPUÉS del update
      projection: { lives: 1, lastLifeRefillAt: 1 },
    }
  );

  if (!updated) {
    // Otro request simultáneo ya gastó la última vida — respuesta segura
    return {
      lives:       0,
      lifesLocked: true,
      lifesLockedUntil: livesData.nextRefillAt,
    };
  }

  const remainingLives = updated.lives;

  // Si quedó en 0, marcar locked en un segundo update (no necesita ser atómico)
  if (remainingLives === 0) {
    await User.updateOne({ _id: userId }, { $set: { lifesLocked: true } });
  }

  return {
    lives:       remainingLives,
    lifesLocked: remainingLives === 0,
    lifesLockedUntil: remainingLives === 0 ? livesData.nextRefillAt : null,
  };
};

/**
 * ¿Puede el usuario comenzar una lección? (tiene al menos 1 vida)
 * @param {ObjectId} userId
 */
exports.canStartLesson = async (userId) => {
  const livesData = await exports.getUserLives(userId);
  return livesData.lives > 0;
};

/**
 * Recarga todas las vidas (admin o tiempo cumplido).
 * @param {ObjectId} userId
 */
exports.refillAllLives = async (userId) => {
  const updated = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        lives:            MAX_LIVES,
        lastLifeRefillAt: new Date(),
        lifesLocked:      false,
      },
    },
    { new: true, projection: { lives: 1 } }
  );

  if (!updated) throw new Error('Usuario no encontrado');

  return {
    lives:        MAX_LIVES,
    nextRefillAt: null,
    lifesLocked:  false,
  };
};

/**
 * Milisegundos hasta la próxima vida disponible.
 * @param {ObjectId} userId
 * @returns {number} ms restantes (0 si ya tiene el máximo)
 */
exports.getTimeUntilNextLife = async (userId) => {
  const user = await User.findById(userId)
    .select('lives lastLifeRefillAt')
    .lean();
  if (!user) throw new Error('Usuario no encontrado');

  const livesData = exports.calculateCurrentLives(
    user.lastLifeRefillAt,
    user.lives
  );

  if (!livesData.nextRefillAt) return 0;

  return Math.max(0, livesData.nextRefillAt - new Date());
};
