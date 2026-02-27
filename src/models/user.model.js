const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    username: { type: String, default: function() { return this.email.split('@')[0]; } }, // Display name for leaderboard
    avatarIcon: { type: String, default: '👨‍🍳' },
    skillLevel: { type: Number, default: 1 },
    dietType: { type: String, default: "none" },
    timePreference: { type: Number, default: 20 },
    xp: { type: Number, default: 0 },
    totalXP: { type: Number, default: 0 }, // Global XP across all paths
    level: { type: Number, default: 1 }, // Global level
    streak: { type: Number, default: 0 },
    lastLessonDate: { type: Date },
    completedLessonsCount: { type: Number, default: 0 },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    unlockedTechniques: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Technique" },
    ],

    // Countries visited through recipes (gamification map)
    completedCountries: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Country" },
    ],

    // Lives system (Duolingo-like)
    lives: { type: Number, default: 3, min: 0, max: 3 },
    lastLifeRefillAt: { type: Date, default: Date.now },
    lifesLocked: { type: Boolean, default: false }, // true if user has 0 lives

    // Current learning path (like Duolingo's course selection)
    currentPathId: { type: mongoose.Schema.Types.ObjectId, ref: "LearningPath", default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
