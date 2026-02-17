require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const seedTechniques = require('./config/seedTechniques');
const seedPaths = require('./config/seedPaths');

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  seedTechniques();
  seedPaths();
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

