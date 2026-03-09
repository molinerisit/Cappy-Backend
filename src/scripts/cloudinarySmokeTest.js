/* eslint-disable no-console */
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const app = require('../app');
const User = require('../models/user.model');
const Country = require('../models/Country.model');
const Recipe = require('../models/Recipe.model');
const UploadAsset = require('../models/UploadAsset.model');

const PNG_1X1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7B3tsAAAAASUVORK5CYII=';

async function run() {
  const requiredEnv = [
    'MONGO_URI',
    'JWT_SECRET',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ];

  for (const key of requiredEnv) {
    if (!process.env[key]) {
      throw new Error(`Missing required env var: ${key}`);
    }
  }

  let userId;
  let countryId;
  let recipeId;
  let uploadedPublicId;

  try {
    await mongoose.connect(process.env.MONGO_URI);

    const uniqueSuffix = Date.now();
    const user = await User.create({
      email: `smoke-admin-${uniqueSuffix}@cooklevel.dev`,
      password: '$2b$12$M4SazxMiQgrvQ.gnNw4Ea.JRaAzn4jOfAWx/Clx0kRKZ77N8D66fW', // TempPass123!@
      role: 'admin',
    });
    userId = user._id;

    const token = jwt.sign(
      { id: user._id.toString(), role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    const uploadResponse = await request(app)
      .post('/api/admin/v2/upload/image')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', Buffer.from(PNG_1X1_BASE64, 'base64'), 'smoke-test.png');

    if (uploadResponse.status !== 200 || !uploadResponse.body?.data?.url) {
      throw new Error(`Upload failed: ${uploadResponse.status} ${JSON.stringify(uploadResponse.body)}`);
    }

    const uploadUrl = uploadResponse.body.data.url;
    uploadedPublicId = uploadResponse.body.data.publicId;

    const uploadAsset = await UploadAsset.findOne({ publicId: uploadedPublicId }).lean();
    if (!uploadAsset?.url) {
      throw new Error('UploadAsset persistence failed');
    }

    const profileResponse = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ avatarUrl: uploadUrl });

    if (profileResponse.status !== 200) {
      throw new Error(`Profile update failed: ${profileResponse.status} ${JSON.stringify(profileResponse.body)}`);
    }

    const userAfterUpdate = await User.findById(user._id).lean();
    if (userAfterUpdate.avatarUrl !== uploadUrl) {
      throw new Error('User avatarUrl persistence failed');
    }

    const country = await Country.create({
      name: `SmokeLand-${uniqueSuffix}`,
      code: `S${String(uniqueSuffix).slice(-1)}${String(uniqueSuffix).slice(-2, -1)}`,
      icon: '🏴',
    });
    countryId = country._id;

    const recipeResponse = await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        countryId: country._id.toString(),
        title: `Cloudinary Smoke Recipe ${uniqueSuffix}`,
        imageUrl: uploadUrl,
        steps: [
          {
            id: 's1',
            order: 1,
            title: 'Paso 1',
            instruction: 'Smoke test',
          },
        ],
      });

    if (recipeResponse.status !== 201) {
      throw new Error(`Recipe create failed: ${recipeResponse.status} ${JSON.stringify(recipeResponse.body)}`);
    }

    recipeId = recipeResponse.body._id;
    const savedRecipe = await Recipe.findById(recipeId).lean();
    if (savedRecipe.imageUrl !== uploadUrl) {
      throw new Error('Recipe imageUrl persistence failed');
    }

    const deleteResponse = await request(app)
      .delete(`/api/admin/v2/upload/image/${encodeURIComponent(uploadedPublicId)}`)
      .set('Authorization', `Bearer ${token}`);

    if (deleteResponse.status !== 200) {
      throw new Error(`Delete failed: ${deleteResponse.status} ${JSON.stringify(deleteResponse.body)}`);
    }

    const deletedAsset = await UploadAsset.findOne({ publicId: uploadedPublicId }).lean();
    if (deletedAsset) {
      throw new Error('UploadAsset was not removed from MongoDB after delete');
    }

    console.log('SMOKE_TEST_OK');
    console.log(`Uploaded URL: ${uploadUrl}`);
    console.log(`Deleted publicId: ${uploadedPublicId}`);
  } finally {
    if (recipeId) {
      await Recipe.findByIdAndDelete(recipeId);
    }
    if (countryId) {
      await Country.findByIdAndDelete(countryId);
    }
    if (userId) {
      await User.findByIdAndDelete(userId);
    }
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('SMOKE_TEST_FAILED');
  console.error(error.message);
  process.exit(1);
});
