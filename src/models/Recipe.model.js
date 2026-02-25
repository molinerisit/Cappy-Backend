const mongoose = require('mongoose');

const recipeStepSchema = new mongoose.Schema({
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
  requiredTools: [String],
  requiredIngredients: [String],
  duration: { type: Number } // in seconds
}, { _id: false });

const recipeSchema = new mongoose.Schema({
  countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },
  title: { type: String, required: true },
  description: { type: String },
  difficulty: { type: Number, min: 1, max: 3, default: 2 },
  xpReward: { type: Number, default: 50, min: 10 },
  servings: { type: Number },
  prepTime: { type: Number }, // minutes
  cookTime: { type: Number }, // minutes
  imageUrl: { type: String },
  
  ingredients: [{
    name: { type: String, required: true },
    quantity: { type: String },
    unit: { type: String }
  }],
  
  tools: [{
    name: { type: String, required: true },
    optional: { type: Boolean, default: false }
  }],
  
  steps: [recipeStepSchema],
  
  // Unlock requirements
  requiredSkills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
  requiredRecipes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' }],
  
  // Content
  nutrition: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number
  },
  
  tips: [String],
  tags: [String],
  
  isPremium: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Recipe', recipeSchema);
