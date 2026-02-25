const mongoose = require("mongoose");

const NODE_TYPES = [
  'recipe',
  'explanation',
  'tips',
  'quiz',
  'technique',
  'cultural',
  'challenge',
  // Legacy types (keep for backward compatibility)
  'skill'
];

const NODE_STATUS = ['active', 'draft', 'archived'];

const nodeTypeToIconKey = {
  recipe: 'recipe',
  explanation: 'explanation',
  tips: 'tips',
  quiz: 'quiz',
  technique: 'technique',
  cultural: 'cultural',
  challenge: 'challenge',
  skill: 'technique'
};

const nodeCardSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['text', 'list', 'image', 'video', 'animation', 'quiz', 'timer'],
      required: true
    },
    data: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { _id: true }
);

const nodeStepSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    order: { type: Number, default: 1 },
    description: String,
    estimatedTime: Number,
    // Legacy fields kept for compatibility
    instruction: String,
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'quiz', 'interactive', 'checklist'],
      default: 'text'
    },
    image: String,
    video: String,
    animationUrl: String,
    question: String,
    options: [String],
    correctAnswer: String,
    checklist: [{ item: String, required: Boolean }],
    validationLogic: mongoose.Schema.Types.Mixed,
    feedback: String,
    duration: { type: Number, default: 0 },
    tips: [String],
    media: String,
    cards: { type: [nodeCardSchema], default: [] }
  },
  { _id: true }
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
      ref: "LearningPath"
    },
    title: { type: String, required: true },
    description: String,
    type: { type: String, enum: NODE_TYPES, required: true },
    iconKey: { type: String, default: 'recipe' },
    status: { type: String, enum: NODE_STATUS, default: 'active' },
    difficulty: {
      type: Number,
      min: 1,
      max: 3,
      default: 2
    },
    xpReward: { type: Number, default: 50 },
    order: { type: Number, default: 0 },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'NodeGroup' },
    positionIndex: { type: Number, default: 1 },
    groupTitle: { type: String, default: '' },
    
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
    metadata: {
      difficulty: String,
      estimatedTime: Number,
      tags: [String],
      locale: String,
      source: String
    },
    isPremium: { type: Boolean, default: false },
    media: String, // Main image/video
    
    // Unlock other nodes upon completion
    unlocksNodes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LearningNode"
      }
    ],
    
    // Module references (imported content)
    referencedRecipes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Recipe"
      }
    ],
    referencedCulture: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Culture"
      }
    ],
    referencedNodes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LearningNode"
      }
    ],
    originalNodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LearningNode',
      default: null
    },
    isLinked: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

learningNodeSchema.pre('validate', function() {
  if (this.type) {
    this.iconKey = nodeTypeToIconKey[this.type] || this.iconKey;
  }
});

// Indexes for efficient querying
learningNodeSchema.index({ pathId: 1, order: 1 });
learningNodeSchema.index({ pathId: 1, level: 1, positionIndex: 1 });
learningNodeSchema.index({ originalNodeId: 1, isLinked: 1 });
learningNodeSchema.index({ type: 1 });
learningNodeSchema.index({ difficulty: 1 });

module.exports = mongoose.model("LearningNode", learningNodeSchema);
