const app = require('../src/app');
const connectDB = require('../src/config/db');
const { logCloudinaryStartupStatus } = require('../src/config/cloudinary.config');
const { ensureCoreIndexes } = require('../src/models');
const seedTechniques = require('../src/config/seedTechniques');
const seedPaths = require('../src/config/seedPaths');

let initialized = false;
let initPromise = null;

async function initialize() {
  if (initialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      logCloudinaryStartupStatus();
      await connectDB();
      await ensureCoreIndexes();
      await seedTechniques();
      await seedPaths();
      initialized = true;
    })();
  }
  await initPromise;
}

module.exports = async (req, res) => {
  await initialize();
  return app(req, res);
};
