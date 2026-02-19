const LearningNode = require('../models/LearningNode.model');
const UserProgress = require('../models/UserProgress.model');

const getFirstNodeForPath = async (pathId) => {
  return LearningNode.findOne({ pathId }).sort('order');
};

const ensureFirstNodeUnlocked = async (progress, pathId) => {
  const firstNode = await getFirstNodeForPath(pathId);
  if (!firstNode) {
    return progress;
  }

  if (!progress.unlockedLessons || progress.unlockedLessons.length === 0) {
    progress.unlockedLessons = [firstNode._id];
    await progress.save();
    return progress;
  }

  const alreadyUnlocked = progress.unlockedLessons.some(
    (id) => id.toString() === firstNode._id.toString()
  );
  if (!alreadyUnlocked) {
    progress.unlockedLessons.push(firstNode._id);
    await progress.save();
  }

  return progress;
};

const getOrCreateNodeProgress = async (userId, pathId) => {
  let progress = await UserProgress.findOne({ userId, pathId });

  if (!progress) {
    const firstNode = await getFirstNodeForPath(pathId);
    progress = new UserProgress({
      userId,
      pathId,
      unlockedLessons: firstNode ? [firstNode._id] : [],
      completedLessons: [],
      streak: 0
    });

    await progress.save();
    return progress;
  }

  return ensureFirstNodeUnlocked(progress, pathId);
};

module.exports = {
  getOrCreateNodeProgress,
  getFirstNodeForPath
};
