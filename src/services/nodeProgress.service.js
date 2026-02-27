const LearningNode = require('../models/LearningNode.model');
const UserProgress = require('../models/UserProgress.model');

const getOrderedNodesForPath = async (pathId) => {
  return LearningNode.find({
    pathId,
    isDeleted: { $ne: true },
    status: 'active'
  }).sort({ level: 1, positionIndex: 1, order: 1, createdAt: 1, _id: 1 });
};

const toIdString = (value) => value?.toString();

const computeUnlockedNodeIds = (orderedNodes, completedIds) => {
  if (!orderedNodes.length) {
    return [];
  }

  const unlocked = new Set();
  const levelToNodeIds = new Map();

  for (const node of orderedNodes) {
    const level = Number(node.level) || 1;
    const nodeId = toIdString(node._id);
    if (!nodeId) continue;

    if (!levelToNodeIds.has(level)) {
      levelToNodeIds.set(level, []);
    }
    levelToNodeIds.get(level).push(nodeId);
  }

  const sortedLevels = Array.from(levelToNodeIds.keys()).sort((a, b) => a - b);
  const baseLevel = sortedLevels[0];

  if (baseLevel != null) {
    for (const nodeId of levelToNodeIds.get(baseLevel) || []) {
      unlocked.add(nodeId);
    }
  }

  const firstNodeId = toIdString(orderedNodes[0]._id);
  if (firstNodeId) {
    unlocked.add(firstNodeId);
  }

  for (const node of orderedNodes) {
    if (node.isLockedByDefault === false) {
      const nodeId = toIdString(node._id);
      if (nodeId) unlocked.add(nodeId);
    }
  }

  for (const node of orderedNodes) {
    const nodeId = toIdString(node._id);
    if (!nodeId) continue;

    const requiredNodeIds = (node.requiredNodes || [])
      .map((id) => toIdString(id))
      .filter(Boolean);

    if (requiredNodeIds.length > 0) {
      const allRequirementsCompleted = requiredNodeIds.every((id) =>
        completedIds.has(id)
      );
      if (allRequirementsCompleted) {
        unlocked.add(nodeId);
      }
      continue;
    }

    const level = Number(node.level) || 1;
    if (level <= baseLevel) {
      unlocked.add(nodeId);
      continue;
    }

    const previousLevels = sortedLevels.filter((candidate) => candidate < level);
    const previousLevel = previousLevels[previousLevels.length - 1];
    if (previousLevel == null) continue;

    const previousNodeIds = levelToNodeIds.get(previousLevel) || [];
    const hasCompletedPreviousLevelNode = previousNodeIds.some((id) =>
      completedIds.has(id)
    );

    if (hasCompletedPreviousLevelNode) {
      unlocked.add(nodeId);
    }
  }

  for (let index = 0; index < orderedNodes.length; index += 1) {
    const currentId = toIdString(orderedNodes[index]._id);
    const nextNode = orderedNodes[index + 1];
    if (!currentId || !nextNode) continue;
    if (completedIds.has(currentId)) {
      const nextId = toIdString(nextNode._id);
      if (nextId) unlocked.add(nextId);
    }

    if (completedIds.has(currentId) && Array.isArray(orderedNodes[index].unlocksNodes)) {
      for (const unlockedNodeId of orderedNodes[index].unlocksNodes) {
        const mappedUnlockedId = toIdString(unlockedNodeId);
        if (mappedUnlockedId) {
          unlocked.add(mappedUnlockedId);
        }
      }
    }
  }

  return Array.from(unlocked);
};

const syncUnlockState = async (progress, pathId) => {
  const orderedNodes = await getOrderedNodesForPath(pathId);
  if (!orderedNodes.length) {
    return progress;
  }

  const completedIds = new Set(
    (progress.completedLessons || []).map((id) => toIdString(id)).filter(Boolean)
  );
  const expectedUnlockedIds = computeUnlockedNodeIds(orderedNodes, completedIds);

  const currentUnlockedIds = new Set(
    (progress.unlockedLessons || []).map((id) => toIdString(id)).filter(Boolean)
  );

  const hasSameSize = currentUnlockedIds.size === expectedUnlockedIds.length;
  const isSameSet = hasSameSize
    ? expectedUnlockedIds.every((id) => currentUnlockedIds.has(id))
    : false;

  if (!isSameSet) {
    progress.unlockedLessons = expectedUnlockedIds;
    await progress.save();
  }

  return progress;
};

const getFirstNodeForPath = async (pathId) => {
  const orderedNodes = await getOrderedNodesForPath(pathId);
  return orderedNodes[0] || null;
};

const getNextNodeForPath = async (pathId, currentNodeId) => {
  const orderedNodes = await getOrderedNodesForPath(pathId);
  const currentIndex = orderedNodes.findIndex(
    (node) => toIdString(node._id) === toIdString(currentNodeId)
  );

  if (currentIndex === -1 || currentIndex >= orderedNodes.length - 1) {
    return null;
  }

  return orderedNodes[currentIndex + 1];
};

const getOrCreateNodeProgress = async (userId, pathId) => {
  let progress = await UserProgress.findOne({ userId, pathId });

  if (!progress) {
    const orderedNodes = await getOrderedNodesForPath(pathId);
    const initialUnlockedIds = computeUnlockedNodeIds(orderedNodes, new Set());

    progress = new UserProgress({
      userId,
      pathId,
      unlockedLessons: initialUnlockedIds,
      completedLessons: [],
      streak: 0
    });

    await progress.save();
    return progress;
  }

  return syncUnlockState(progress, pathId);
};

module.exports = {
  getOrCreateNodeProgress,
  getFirstNodeForPath,
  getNextNodeForPath,
  syncUnlockState
};
