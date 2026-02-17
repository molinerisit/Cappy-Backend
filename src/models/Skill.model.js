const mongoose = require("mongoose");

const skillStepSchema = new mongoose.Schema({
  id: { type: String, required: true },
  order: { type: Number, required: true },
  title: { type: String, required: true },
  instruction: { type: String, required: true },
  imageUrl: { type: String },
  animationUrl: { type: String },
  validationLogic: { type: String }, // JSON string with validation rules
  feedback: {
    correct: { type: String },
    incorrect: { type: String }
  },
  duration: { type: Number } // in seconds
}, { _id: false });

const skillSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  description: { type: String },
  category: { type: String, enum: ['knife_skills', 'heat_control', 'seasoning', 'technique', 'preparation'], default: 'technique' },
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  level: { type: Number, default: 1 }, // 1-10 progression
  xpReward: { type: Number, default: 30, min: 10 },
  order: { type: Number }, // to show skill progression visually
  icon: String,
  
  // Steps to learn the skill
  steps: [skillStepSchema],
  
  // Unlock requirements
  prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }], // required skills to unlock this
  unlocksRecipes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' }], // recipes this skill unlocks
  unlocksSkills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }], // skills this skill unlocks
  
  // Content
  tips: [String],
  commonMistakes: [String],
  tags: [String],
  
  isPremium: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Skill", skillSchema);
