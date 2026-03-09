const legacyAdminController = require('./legacy.controller');

module.exports = {
  createPath: legacyAdminController.createPath,
  getAllLearningPaths: legacyAdminController.getAllLearningPaths,
  createLearningPath: legacyAdminController.createLearningPath,
  updateLearningPath: legacyAdminController.updateLearningPath,
  deleteLearningPath: legacyAdminController.deleteLearningPath,
};
