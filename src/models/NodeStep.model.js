const mongoose = require('mongoose');

/**
 * NodeStep Schema
 * 
 * Pasos dentro de un nodo de aprendizaje
 * Cada paso contiene múltiples cards con contenido
 * 
 * Estructura:
 * LearningNode
 *   ├── NodeStep (Paso)
 *   │   └── NodeCard (Card - contenido)
 * 
 * Ejemplo:
 * Nodo: "Salsa Pomarola"
 *   ├── Paso 1: "Ingredientes"
 *   │   ├── Card: Lista de ingredientes
 *   │   ├── Card: Imagen de ingredientes
 *   ├── Paso 2: "Preparación"
 *   │   ├── Card: Video
 *   │   ├── Card: Texto con instrucciones
 *   │   ├── Card: Timer
 */
const nodeStepSchema = new mongoose.Schema(
  {
    // Relación con el nodo
    nodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LearningNode',
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

    // Orden dentro del nodo
    order: {
      type: Number,
      required: true,
      index: true
    },

    // Metadata
    estimatedTime: {
      type: Number,
      default: null, // en segundos
    },

    // Cards dentro del paso (referencias)
    cards: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NodeCard'
      }
    ],

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
    collection: 'nodesteps'
  }
);

// Índices para optimizar queries
nodeStepSchema.index({ nodeId: 1, order: 1 });
nodeStepSchema.index({ nodeId: 1, isDeleted: 1 });

module.exports = mongoose.model('NodeStep', nodeStepSchema);
