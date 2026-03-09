const legacyAdminController = require('./legacy.controller');

module.exports = {
  getGroupsByPath: legacyAdminController.getGroupsByPath,
  createGroup: legacyAdminController.createGroup,
  updateGroup: legacyAdminController.updateGroup,
  deleteGroup: legacyAdminController.deleteGroup,

  getNodesByPathV2: legacyAdminController.getNodesByPathV2,
  createNodeV2: legacyAdminController.createNodeV2,
  updateNodeV2: legacyAdminController.updateNodeV2,
  deleteNodeV2: legacyAdminController.deleteNodeV2,
  reorderNodesV2: legacyAdminController.reorderNodesV2,
  importNodeV2: legacyAdminController.importNodeV2,
  archiveNodeV2: legacyAdminController.archiveNodeV2,
  duplicateNodeV2: legacyAdminController.duplicateNodeV2,
  getNodeRelations: legacyAdminController.getNodeRelations,
  listNodeLibrary: legacyAdminController.listNodeLibrary,

  addNodeStep: legacyAdminController.addNodeStep,
  updateNodeStep: legacyAdminController.updateNodeStep,
  deleteNodeStep: legacyAdminController.deleteNodeStep,
  addStepCard: legacyAdminController.addStepCard,
  updateStepCard: legacyAdminController.updateStepCard,
  deleteStepCard: legacyAdminController.deleteStepCard,

  getNodesByPath: legacyAdminController.getNodesByPath,
  getAllLearningNodes: legacyAdminController.getAllLearningNodes,
  createLearningNode: legacyAdminController.createLearningNode,
  updateLearningNode: legacyAdminController.updateLearningNode,
  deleteLearningNode: legacyAdminController.deleteLearningNode,
  setRequiredNodes: legacyAdminController.setRequiredNodes,
  reorderNodes: legacyAdminController.reorderNodes,
  importModule: legacyAdminController.importModule,
  removeModule: legacyAdminController.removeModule,
};
