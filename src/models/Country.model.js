const mongoose = require('mongoose');

const countrySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true }, // e.g., 'IT' for Italy
  icon: { type: String }, // emoji or URL
  description: { type: String },
  flagUrl: { type: String },
  
  // Unified learning nodes (replaces separate recipes/skills)
  learningNodes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LearningNode' }],
  
  // Culture section (legacy lessons)
  lessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
  
  // Metadata
  order: { type: Number },
  isActive: { type: Boolean, default: true },
  isPremium: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Country', countrySchema);
