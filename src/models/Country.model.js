const mongoose = require('mongoose');

const countrySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true }, // e.g., 'IT' for Italy
  icon: { type: String }, // emoji or URL
  description: { type: String },
  flagUrl: { type: String },

  // Hub presentation (admin editable)
  presentationHeadline: { type: String },
  presentationSummary: { type: String },
  heroImageUrl: { type: String },
  iconicDishes: [{ type: String }],

  // Unlock rules (progression gating)
  unlockLevel: { type: Number, default: 1, min: 1 },
  requiredGroupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'NodeGroup' }],
  unlockRequiresAnyGroup: { type: Boolean, default: false },

  // Legacy section toggles (kept for backward compatibility)
  hasRecipes: { type: Boolean, default: true },
  hasCookingSchool: { type: Boolean, default: false },
  hasCulture: { type: Boolean, default: false },
  
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
