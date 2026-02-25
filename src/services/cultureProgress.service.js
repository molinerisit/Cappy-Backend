const UserProgress = require('../models/UserProgress.model');
const CultureNode = require('../models/CultureNode.model');
const CultureStep = require('../models/CultureStep.model');

const calculateLevel = (xp) => Math.floor(xp / 100) + 1;

const completeCultureStep = async (userId, stepId) => {
  const step = await CultureStep.findById(stepId);
  if (!step) throw new Error('Micropaso cultural no encontrado');

  let progress = await UserProgress.findOne({ userId, cultureNodeId: step.cultureNodeId });
  if (!progress) {
    progress = new UserProgress({ userId, cultureNodeId: step.cultureNodeId, completedCultureSteps: [], xp: 0, level: 1 });
  }

  const alreadyCompleted = progress.completedCultureSteps?.includes(stepId);
  if (!alreadyCompleted) {
    progress.completedCultureSteps = progress.completedCultureSteps || [];
    progress.completedCultureSteps.push(stepId);
    progress.xp += step.xp || 0;
    progress.level = calculateLevel(progress.xp);
    progress.lastCompletedAt = new Date();
    await progress.save();
  }

  return progress;
};

module.exports = { completeCultureStep };
