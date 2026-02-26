const mongoose = require("mongoose");

// =====================================================
// LEGACY: Step schema for backward compatibility
// NEW NODES: Use NodeStep model instead
// =====================================================
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
    question: String,
    options: [String],
    correctAnswer: String,
    checklist: [{ item: String, required: Boolean }],
    validationLogic: mongoose.Schema.Types.Mixed,
    feedback: String,
    duration: { type: Number, default: 0 },
    tips: [String],
    media: String,
    cards: { type: [mongoose.Schema.Types.Mixed], default: [] }
  },
  { _id: false }
);

// Ingredient/Tool schema
const ingredientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, default: 'unit' },
    optional: { type: Boolean, default: false }
  },
  { _id: false }
);

/**
 * LearningNode Schema - REFACTORIZADO v2
 * 
 * Soporta:
 * - Nuevos tipos de nodos (recipe, explanation, tips, quiz, technique, cultural, challenge)
 * - Niveles paralelos (level + positionIndex)
 * - Linked nodes (originalNodeId + isLinked)
 * - Grupos (groupId)
 * - Steps como referencias separadas (nueva arquitectura)
 * - Compatibilidad con steps anidados (legacy)
 */
const learningNodeSchema = new mongoose.Schema(
  {
    // Relaciones PRINCIPALES
    pathId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LearningPath",
      required: true,
      index: true
    },

    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NodeGroup",
      default: null, // null = ungrouped
      index: true
    },

    // ========== CONTENIDO BÁSICO ==========
    title: { 
      type: String, 
      required: true,
      trim: true
    },

    description: {
      type: String,
      default: ''
    },

    // ========== TIPO DE NODO (ENUM FIJO) ==========
    type: {
      type: String,
      enum: ["recipe", "explanation", "tips", "quiz", "technique", "cultural", "challenge", "skill"],
      required: true,
      index: true
    },

    // Icon se genera automáticamente según type (NO editable manualmente)
    icon: {
      type: String,
      default: null // Se calcula en beforeSave hook
    },

    // ========== GAMIFICACIÓN ==========
    xpReward: { 
      type: Number, 
      default: 50,
      min: 0
    },

    difficulty: {
      type: Number,
      min: 1,
      max: 3,
      default: 1
    },

    // ========== ESTRUCTURA DEL ÁRBOL ==========
    // Para niveles paralelos (tipo Duolingo)
    level: { 
      type: Number, 
      default: 1,
      min: 1,
      index: true
    },

    positionIndex: {
      type: Number,
      default: 0,
      min: 0
    },

    // ========== ESTADO ==========
    status: {
      type: String,
      enum: ['active', 'draft', 'archived'],
      default: 'active',
      index: true
    },

    // ========== LINKED NODES (Reutilización) ==========
    originalNodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LearningNode",
      default: null
    },

    isLinked: {
      type: Boolean,
      default: false,
      index: true
    },

    // ========== REFERENCIAS A STEPS (Nueva arquitectura) ==========
    steps: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "NodeStep"
      }
    ],

    // ========== LEGACY: STEPS ANIDADOS (Compatibilidad) ==========
    // Mantener para compatibilidad con nodos antiguos
    legacySteps: [nodeStepSchema],

    // ========== UNLOCK SYSTEM ==========
    requiredNodes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LearningNode"
      }
    ],

    unlocksNodes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LearningNode"
      }
    ],

    // ========== METADATA MODERNA ==========
    category: {
      type: String,
      enum: ['knife_skills', 'heat_control', 'seasoning', 'technique', 'preparation', 'main_course', 'dessert', 'appetizer', 'beverage', 'other'],
      default: 'other'
    },

    order: { 
      type: Number, 
      default: 0 
    },

    // ========== LEGACY RECIPE FIELDS ==========
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

    // ========== GENERAL METADATA ==========
    tips: [String],
    tags: [String],
    isPremium: { type: Boolean, default: false },
    media: String, // Main image/video

    // ========== SEGUIMIENTO DE REUTILIZACIÓN ==========
    reuseCount: {
      type: Number,
      default: 0,
      min: 0
    },

    lastUsedAt: {
      type: Date,
      default: null
    },

    // ========== AUDITORÍA ==========
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // ========== SOFT DELETE ==========
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },

    deletedAt: {
      type: Date,
      default: null
    },

    // ========== TIMESTAMPS ==========
    createdAt: { 
      type: Date, 
      default: Date.now 
    },

    updatedAt: { 
      type: Date, 
      default: Date.now 
    }
  },
  { 
    timestamps: true,
    collection: 'learningnodes'
  }
);

// =====================================================
// ÍNDICES PARA OPTIMIZACIÓN
// =====================================================
learningNodeSchema.index({ pathId: 1, level: 1, positionIndex: 1 });
learningNodeSchema.index({ pathId: 1, groupId: 1 });
learningNodeSchema.index({ type: 1, status: 1 });
learningNodeSchema.index({ originalNodeId: 1 });
learningNodeSchema.index({ isLinked: 1 });
learningNodeSchema.index({ isDeleted: 1, createdAt: -1 });
learningNodeSchema.index({ tags: 1 });

// =====================================================
// HOOKS
// =====================================================

/**
 * Hook pre-save: Generar icon automáticamente según type
 */
learningNodeSchema.pre('save', function(next) {
  if (!this.isModified('type')) return next();

  const typeIconMap = {
    recipe: '🍽️',
    explanation: '📘',
    tips: '💡',
    quiz: '❓',
    technique: '🔪',
    cultural: '🌍',
    challenge: '🎯',
    skill: '⭐'
  };

  this.icon = typeIconMap[this.type] || '📌';
  next();
});

/**
 * Hook pre-save: Validar que steps sea array de ObjectIds (nueva arquitectura)
 */
learningNodeSchema.pre('save', function(next) {
  // Si tiene legacySteps, mover a steps field para migración
  if (this.legacySteps && this.legacySteps.length > 0 && (!this.steps || this.steps.length === 0)) {
    // Los legacySteps se mantienen en la DB para compatibilidad
  }
  next();
});

module.exports = mongoose.model("LearningNode", learningNodeSchema);
