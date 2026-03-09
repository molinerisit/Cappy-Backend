const User = require('./user.model');
const UserProgress = require('./UserProgress.model');
const LearningNode = require('./LearningNode.model');

async function ensureCoreIndexes() {
  await Promise.all([
    User.collection.createIndex({ role: 1 }),
    UserProgress.collection.createIndex({ userId: 1 }),
    LearningNode.collection.createIndex({ category: 1 }),
  ]);

  console.log('Core scalability indexes ensured successfully');
}

module.exports = {
  ensureCoreIndexes,
};
