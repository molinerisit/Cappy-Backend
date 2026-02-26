const mongoose = require("mongoose");

/**
 * LearningPath Schema - REFACTORIZADO v2
 * 
 * Camino de aprendizaje que contiene:
 * - Grupos (NodeGroup)
 * - Nodos (LearningNode)
 * - Pasos y Cards dentro de nodos
 */
const learningPathSchema = new mongoose.Schema(
  {
    // ========== TIPO DE CAMINO ==========
    type: {
      type: String,
      enum: ["country_recipe", "country_culture", "goal"],
      required: true,
      index: true
    },
    
    // ========== RELACIONES ==========
    // Para country-based paths
    countryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Country",
      index: true
    },
    
    // Para goal-based paths
    goalType: {
      type: String,
      enum: ["cooking_school", "lose_weight", "gain_muscle", "become_vegan"],
      description: "Type of goal (only for type: 'goal')"
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

    icon: { 
      type: String, 
      default: "📚" 
    },

    order: { 
      type: Number, 
      default: 0,
      index: true
    },

    // ========== ESTRUCTURA JERÁRQUICA (NUEVA) ==========
    // Grupos dentro del camino (nueva arquitectura modular)
    groups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "NodeGroup"
      }
    ],
    
    // Related learning nodes (legacy + nueva)
    nodes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LearningNode"
      }
    ],

    // ========== METADATA ==========
    metadata: {
      totalSteps: { type: Number, default: 0 },
      estimatedDuration: Number, // in minutes
      difficulty: {
        type: String,
        enum: ["beginner", "intermediate", "advanced"],
        default: "intermediate"
      }
    },

    // ========== ESTADO ==========
    isActive: { 
      type: Boolean, 
      default: true,
      index: true
    },

    isPremium: { 
      type: Boolean, 
      default: false 
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
    collection: 'learningpaths'
  }
);

// =====================================================
// ÍNDICES PARA OPTIMIZACIÓN
// =====================================================
learningPathSchema.index({ type: 1, countryId: 1 });
learningPathSchema.index({ type: 1, goalType: 1 });
learningPathSchema.index({ countryId: 1 });
learningPathSchema.index({ isActive: 1, isDeleted: 1 });
learningPathSchema.index({ createdAt: -1 });

module.exports = mongoose.model("LearningPath", learningPathSchema);
