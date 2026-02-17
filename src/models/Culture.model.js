const mongoose = require('mongoose');

const cultureStepSchema = new mongoose.Schema({
  id: { type: String, required: true },
  order: { type: Number, required: true },
  type: { type: String, enum: ['text', 'image', 'video', 'audio', 'multiple_choice', 'interactive'], default: 'text' },
  title: { type: String, required: true },
  content: { type: String }, // Text content
  imageUrl: { type: String },
  videoUrl: { type: String },
  audioUrl: { type: String },
  
  // For multiple choice steps
  question: { type: String },
  options: [{
    id: String,
    text: String,
    imageUrl: String,
    isCorrect: Boolean,
    feedback: String
  }],
  
  duration: { type: Number }, // in seconds
  feedback: {
    correct: { type: String },
    incorrect: { type: String }
  }
}, { _id: false });

const cultureSchema = new mongoose.Schema({
  countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String, default: 'tradition' }, // traditions, history, cuisine, etc
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  xpReward: { type: Number, default: 50, min: 10 },
  imageUrl: { type: String }, // Cover image
  
  steps: [cultureStepSchema],
  
  // Cultural context
  culturalSignificance: String,
  historicalBackground: String,
  relatedRecipes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' }],
  
  tags: [String],
  isPremium: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Culture', cultureSchema);
