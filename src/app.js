const express = require('express');
const cors = require('cors');

// ========================================
// MAIN ROUTES (UNIFIED API)
// ========================================
const mainRoutes = require('./routes/main.routes');

// ========================================
// AUTH ROUTES
// ========================================
const authRoutes = require('./routes/auth.routes');

// ========================================
// ADMIN ROUTES
// ========================================
const adminRoutes = require("./routes/admin.routes");

// ========================================
// LEGACY ROUTES (for backward compatibility)
// ========================================
const pantryRoutes = require('./routes/pantry.routes');
const lessonRoutes = require('./routes/lesson.routes');
const techniqueRoutes = require('./routes/technique.routes');
const trackRoutes = require('./routes/track.routes');
const pathRoutes = require('./routes/path.routes');
const progressRoutes = require('./routes/progress.routes');
const recipeRoutes = require("./routes/recipe.routes");
const skillRoutes = require("./routes/skill.routes");
const countryRoutes = require("./routes/country.routes");
const inventoryRoutes = require("./routes/inventory.routes");
const learningNodeRoutes = require("./routes/learningNode.routes");
const learningPathRoutes = require("./routes/learningPath.routes");
const recipeStepRoutes = require('./routes/recipeStep.routes');
const cultureRoutes = require('./routes/culture.routes');
const livesRoutes = require('./routes/lives.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');

const app = express();

app.use(cors());
app.use(express.json());

// ========================================
// UNIFIED API (v2.0 - Clean Architecture)
// ========================================
app.use('/api', mainRoutes);

// ========================================
// Core Routes
// ========================================
app.use('/api/auth', authRoutes);
app.use("/api/admin", adminRoutes);
app.use('/api/lives', livesRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// ========================================
// Legacy Routes (v1.0 - Backward Compatibility)
// ========================================
app.use('/api/pantry', pantryRoutes);
app.use('/api/lesson', lessonRoutes);
app.use('/api/techniques', techniqueRoutes);
app.use('/api/tracks', trackRoutes);
app.use('/api/paths', pathRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/countries', countryRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/nodes', learningNodeRoutes);
app.use('/api/learning-paths', learningPathRoutes);
app.use('/api/recipe-steps', recipeStepRoutes);
app.use('/api/culture', cultureRoutes);

module.exports = app;
