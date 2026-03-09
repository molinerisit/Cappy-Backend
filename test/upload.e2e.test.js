const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = require('../src/app');
const User = require('../src/models/user.model');
const Country = require('../src/models/Country.model');
const Recipe = require('../src/models/Recipe.model');
const UploadAsset = require('../src/models/UploadAsset.model');

const PNG_1X1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7B3tsAAAAASUVORK5CYII=';

const shouldRunSmoke = process.env.RUN_CLOUDINARY_SMOKE === 'true';
const cloudinaryTest = shouldRunSmoke ? test : test.skip;

describe('Cloudinary smoke test E2E', () => {
  beforeAll(async () => {
    if (!shouldRunSmoke) {
      return;
    }
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is required when RUN_CLOUDINARY_SMOKE=true');
    }
    await mongoose.connect(process.env.MONGO_URI);
  });

  afterEach(async () => {
    if (!shouldRunSmoke || mongoose.connection.readyState !== 1) {
      return;
    }
    const db = mongoose.connection.db;
    if (db) {
      await db.dropDatabase();
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  });

  cloudinaryTest('upload/delete flow and MongoDB URL persistence for recipe and user', async () => {
    const requiredEnv = [
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
      'JWT_SECRET',
    ];

    for (const key of requiredEnv) {
      if (!process.env[key]) {
        throw new Error(`Missing required env var for smoke test: ${key}`);
      }
    }

    const adminUser = await User.create({
      email: 'smoke-admin@cooklevel.dev',
      password: '$2b$12$M4SazxMiQgrvQ.gnNw4Ea.JRaAzn4jOfAWx/Clx0kRKZ77N8D66fW',
      role: 'admin',
      forcePasswordChange: false,
      isTempPassword: false,
    });

    const token = jwt.sign(
      { id: adminUser._id.toString(), role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    const uploadResponse = await request(app)
      .post('/api/admin/v2/upload/image')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', Buffer.from(PNG_1X1_BASE64, 'base64'), 'smoke-test.png');

    expect(uploadResponse.status).toBe(200);
    expect(uploadResponse.body.success).toBe(true);

    const cloudinaryUrl = uploadResponse.body?.data?.url;
    const cloudinaryPublicId = uploadResponse.body?.data?.publicId;

    expect(cloudinaryUrl).toContain('https://res.cloudinary.com/');
    expect(cloudinaryPublicId).toBeTruthy();

    const persistedUpload = await UploadAsset.findOne({ publicId: cloudinaryPublicId }).lean();
    expect(persistedUpload).toBeTruthy();
    expect(persistedUpload.url).toBe(cloudinaryUrl);

    const profileResponse = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ avatarUrl: cloudinaryUrl });

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.avatarUrl).toBe(cloudinaryUrl);

    const updatedUser = await User.findById(adminUser._id).lean();
    expect(updatedUser.avatarUrl).toBe(cloudinaryUrl);

    const country = await Country.create({
      name: 'SmokeTestLand',
      code: 'ST',
      icon: '??',
    });

    const createRecipeResponse = await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        countryId: country._id.toString(),
        title: 'Cloudinary Smoke Recipe',
        imageUrl: cloudinaryUrl,
        steps: [
          {
            id: 's1',
            order: 1,
            title: 'Step 1',
            instruction: 'Do a smoke test step',
          },
        ],
      });

    expect(createRecipeResponse.status).toBe(201);
    expect(createRecipeResponse.body.imageUrl).toBe(cloudinaryUrl);

    const persistedRecipe = await Recipe.findById(createRecipeResponse.body._id).lean();
    expect(persistedRecipe.imageUrl).toBe(cloudinaryUrl);

    const deleteResponse = await request(app)
      .delete(`/api/admin/v2/upload/image/${encodeURIComponent(cloudinaryPublicId)}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.success).toBe(true);

    const deletedUpload = await UploadAsset.findOne({ publicId: cloudinaryPublicId }).lean();
    expect(deletedUpload).toBeNull();
  }, 60000);
});
