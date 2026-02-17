const mongoose = require("mongoose");

const learningPathSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["country_recipe", "country_culture", "goal"],
      required: true
    },
    
    // For country-based paths
    countryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Country"
    },
    
    // For goal-based paths
    goalType: {
      type: String,
      enum: ["cooking_school", "lose_weight", "gain_muscle", "become_vegan"],
      description: "Type of goal (only for type: 'goal')"
    },
    
    // Common fields
    title: { type: String, required: true },
    description: String,
    icon: { type: String, default: "📚" },
    order: { type: Number, default: 0 },
    
    // Related learning nodes
    nodes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LearningNode"
      }
    ],
    
    metadata: {
      totalSteps: { type: Number, default: 0 },
      estimatedDuration: Number, // in minutes
      difficulty: {
        type: String,
        enum: ["beginner", "intermediate", "advanced"],
        default: "intermediate"
      }
    },
    
    isActive: { type: Boolean, default: true },
    isPremium: { type: Boolean, default: false },
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Indexes for efficient querying
learningPathSchema.index({ type: 1, countryId: 1 });
learningPathSchema.index({ type: 1, goalType: 1 });
learningPathSchema.index({ countryId: 1 });

module.exports = mongoose.model("LearningPath", learningPathSchema);
