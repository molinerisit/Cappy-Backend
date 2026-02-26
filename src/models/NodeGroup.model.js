const mongoose = require('mongoose');

/**
 * NodeGroup Schema
 * 
 * Agrupa nodos visuales dentro de un árbol de aprendizaje
 * Ejemplo: "Salsas Rojas", "Técnicas Básicas"
 * 
 * Estructura:
 * LearningPath
 *   ├── NodeGroup (Grupo)
 *   │   └── contiene múltiples nodos
 */
const nodeGroupSchema = new mongoose.Schema(
  {
    // Relación con el path
    pathId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LearningPath',
      required: true,
      index: true
    },

    // Contenido
    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      default: ''
    },

    // Orden dentro del path
    order: {
      type: Number,
      default: 0,
      index: true
    },

    // Metadata visual (opcional)
    color: {
      type: String,
      default: null // e.g. "#FF6A3D"
    },

    icon: {
      type: String,
      default: null // e.g. "🍽️"
    },

    // Auditoría
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },

    deletedAt: {
      type: Date,
      default: null
    },

    // Timestamps
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
    collection: 'nodegroups'
  }
);

// Índices para optimizar queries
nodeGroupSchema.index({ pathId: 1, order: 1 });
nodeGroupSchema.index({ pathId: 1, isDeleted: 1 });

module.exports = mongoose.model('NodeGroup', nodeGroupSchema);
