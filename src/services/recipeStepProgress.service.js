const UserProgress = require('../models/UserProgress.model');
const RecipeStep = require('../models/RecipeStep.model');

const calculateLevel = (xp) => Math.floor(xp / 100) + 1;

const completeRecipeStep = async (userId, stepId) => {
  const step = await RecipeStep.findById(stepId);
  if (!step) throw new Error('Micropaso no encontrado');

  // Buscar progreso del usuario para la receta
  let progress = await UserProgress.findOne({ userId, recipeId: step.recipeId });
  if (!progress) {
    progress = new UserProgress({ userId, recipeId: step.recipeId, completedSteps: [], xp: 0, level: 1 });
  }

  // Validar si ya completó el paso
  const alreadyCompleted = progress.completedSteps?.includes(stepId);
  if (!alreadyCompleted) {
    progress.completedSteps = progress.completedSteps || [];
    progress.completedSteps.push(stepId);
    progress.xp += step.xpReward || 0;
    progress.level = calculateLevel(progress.xp);
    progress.lastCompletedAt = new Date();
    await progress.save();
  }

  return progress;
};

module.exports = { completeRecipeStep };
