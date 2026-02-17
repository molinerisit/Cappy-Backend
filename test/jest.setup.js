const mongoose = require('mongoose');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;

jest.setTimeout(30000);

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  process.env.MONGOMS_DOWNLOAD_DIR = path.join(__dirname, '.mongodb-binaries');
  process.env.MONGOMS_VERSION = process.env.MONGOMS_VERSION || '7.0.12';
  mongo = await MongoMemoryServer.create({
    binary: {
      version: process.env.MONGOMS_VERSION,
      downloadDir: process.env.MONGOMS_DOWNLOAD_DIR
    }
  });
  await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
});
