require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const seedTechniques = require('./config/seedTechniques');
const seedPaths = require('./config/seedPaths');
const { ensureCoreIndexes } = require('./models');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    await ensureCoreIndexes();
    await seedTechniques();
    await seedPaths();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();

