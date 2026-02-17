const mongoose = require("mongoose");

const userProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  pathId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Path"
  },
  trackId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Track"
  },
  
  // Lessons (Legacy - Culture section)
  completedLessons: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lesson"
  }],
  unlockedLessons: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lesson"
  }],
  
  // Learning Nodes (unified system)
  completedNodes: [{
    nodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningNode' },
    completedAt: { type: Date },
    score: { type: Number, default: 0 }, // 0-100
    attempts: { type: Number, default: 1 }
  }],
  
  // Inventory (new)
  inventory: [{
    name: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    addedAt: { type: Date, default: Date.now }
  }],
  
  // Existing progress
  completedSkills: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Skill"
  }],
  
  // Stats
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  streak: { type: Number, default: 0 },
  lastCompletedAt: { type: Date }
}, { timestamps: true });

userProgressSchema.index(
  { userId: 1, pathId: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model("UserProgress", userProgressSchema);
