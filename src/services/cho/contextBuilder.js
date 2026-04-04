/**
 * contextBuilder.js
 * Builds the structured context object sent to every Cho AI request.
 * This ensures the AI always knows: who, what recipe, what step, when.
 */

const Recipe = require('../../models/Recipe.model');

/**
 * @param {Object} user - req.user (from auth middleware)
 * @param {Object} payload - { recipeId, stepIndex, elapsedTime, message, hasImage }
 * @returns {Object} structured context
 */
async function buildContext(user, payload) {
  const {
    recipeId,
    stepIndex = 0,
    elapsedTime = 0,
    message = '',
    hasImage = false,
  } = payload;

  // Load recipe from DB if ID provided
  let recipeName = payload.recipeName ?? '';
  let stepDescription = payload.stepDescription ?? '';
  let stepTitle = '';
  let totalSteps = 0;
  let ingredients = [];

  if (recipeId) {
    try {
      const recipe = await Recipe.findById(recipeId).lean();
      if (recipe) {
        recipeName = recipe.title ?? recipeName;
        totalSteps = recipe.steps?.length ?? 0;
        ingredients = (recipe.ingredients ?? []).map(i => `${i.quantity ?? ''} ${i.unit ?? ''} ${i.name}`.trim());
        const step = recipe.steps?.[stepIndex];
        if (step) {
          stepTitle = step.title ?? '';
          stepDescription = step.instruction ?? stepDescription;
        }
      }
    } catch (_) {
      // Non-fatal: proceed with what was sent from client
    }
  }

  const now = new Date();
  const hour = now.getHours();
  const timeOfDay =
    hour < 12 ? 'mañana' : hour < 19 ? 'tarde' : 'noche';

  return {
    user: {
      id:    String(user._id),
      level: user.skillLevel ?? 'principiante',
      isPremium: user.isPremium ?? false,
    },
    recipe: {
      id:              recipeId ?? null,
      name:            recipeName,
      stepIndex:       stepIndex,
      stepTitle:       stepTitle,
      stepDescription: stepDescription,
      totalSteps:      totalSteps,
      elapsedTime:     elapsedTime,  // seconds
      ingredients:     ingredients,
    },
    environment: {
      time:    timeOfDay,
      isoTime: now.toISOString(),
    },
    interaction: {
      message:  message,
      hasImage: hasImage,
    },
  };
}

module.exports = { buildContext };
