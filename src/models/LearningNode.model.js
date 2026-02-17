const mongoose = require("mongoose");

// Step schema for interactive flow
const nodeStepSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    instruction: String,
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'quiz', 'interactive', 'checklist'],
      default: 'text'
    },
    image: String,
    video: String,
    animationUrl: String,
    // For quiz steps
    question: String,
    options: [String],
    correctAnswer: String,
    // For checklist steps (recipes)
    checklist: [{ item: String, required: Boolean }],
    // Validation logic
    validationLogic: mongoose.Schema.Types.Mixed,
    feedback: String,
    duration: { type: Number, default: 0 }, // in seconds
    tips: [String],
    media: String,
    cards: { type: [mongoose.Schema.Types.Mixed], default: [] }
  },
  { _id: false }
);

// Ingredient/Tool schema for recipes
const ingredientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, default: 'unit' },
    optional: { type: Boolean, default: false }
  },
  { _id: false }
);

const learningNodeSchema = new mongoose.Schema(
  {
    pathId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LearningPath",
      required: true
    },
    title: { type: String, required: true },
    description: String,
    type: {
      type: String,
      enum: ["recipe", "skill", "quiz"],
      required: true
    },
    difficulty: {
      type: Number,
      min: 1,
      max: 3,
      default: 2
    },
    xpReward: { type: Number, default: 50 },
    order: { type: Number, default: 0 },
    
    // Unlock system
    requiredNodes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LearningNode"
      }
    ],
    
    // Progressive metadata
    level: { type: Number, default: 1 },
    category: {
      type: String,
      enum: ['knife_skills', 'heat_control', 'seasoning', 'technique', 'preparation', 'main_course', 'dessert', 'appetizer', 'beverage'],
      default: 'technique'
    },
    
    // Interactive steps
    steps: [nodeStepSchema],
    
    // Recipe-specific
    servings: Number,
    prepTime: Number, // minutes
    cookTime: Number, // minutes
    ingredients: [ingredientSchema],
    tools: [{ name: String, optional: Boolean }],
    nutrition: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number
    },
    
    // General metadata
    tips: [String],
    tags: [String],
    isPremium: { type: Boolean, default: false },
    media: String, // Main image/video
    
    // Unlock other nodes upon completion
    unlocksNodes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LearningNode"
      }
    ],
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Indexes for efficient querying
learningNodeSchema.index({ pathId: 1, order: 1 });
learningNodeSchema.index({ type: 1 });
learningNodeSchema.index({ difficulty: 1 });

module.exports = mongoose.model("LearningNode", learningNodeSchema);
