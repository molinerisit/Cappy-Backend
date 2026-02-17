const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  id: { type: String, required: true },
  question: { type: String, required: true },
  type: { type: String, enum: ['multiple_choice', 'translation'], required: true },
  correctAnswer: { type: String, required: true },
  options: [String], // For multiple choice: array of options
  hint: String,
  explanation: String
}, { _id: false });

const lessonSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  technique: { type: mongoose.Schema.Types.ObjectId, ref: 'Technique' },
  skillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
  pathId: { type: mongoose.Schema.Types.ObjectId, ref: 'Path' },
  title: { type: String, required: true },
  description: { type: String },
  language: { type: String, default: 'English' },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  order: { type: Number },
  estimatedTime: { type: Number },
  steps: { type: [mongoose.Schema.Types.Mixed], default: [] },
  xpAwarded: { type: Number },
  xpReward: { type: Number },
  ingredients: [{
    name: String,
    quantity: String
  }],
  nutrition: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number
  },
  tips: [String],
  exercises: [exerciseSchema],
  isPremium: { type: Boolean, default: false },
  completed: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Lesson', lessonSchema);
