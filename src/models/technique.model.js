const mongoose = require('mongoose');

const stepTemplateSchema = new mongoose.Schema({
  order: Number,
  instruction: String,
  timer: Number
}, { _id: false });

const techniqueSchema = new mongoose.Schema({
  name: { type: String, required: true },
  difficulty: { type: Number, required: true },
  estimatedTime: { type: Number, required: true },
  dietCompatibility: [{ type: String }],
  compatibleIngredients: [{ type: String }],
  unlockRequirement: { type: Number, default: 0 },
  stepsTemplate: [stepTemplateSchema]
}, { timestamps: true });

module.exports = mongoose.model('Technique', techniqueSchema);
