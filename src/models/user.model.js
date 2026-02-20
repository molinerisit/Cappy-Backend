const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
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
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
