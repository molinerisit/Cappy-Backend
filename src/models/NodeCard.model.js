const mongoose = require('mongoose');

/**
 * NodeCard Schema
 * 
 * Cards dentro de un paso
 * Cada card es una unidad de contenido con un tipo específico
 * 
 * Tipos soportados:
 * - text: Texto simple
 * - list: Lista de items
 * - image: Imagen con caption
 * - video: Video embebido
 * - animation: Animación/SVG
 * - quiz: Pregunta con opciones
 * - timer: Temporizador
 */
const nodeCardSchema = new mongoose.Schema(
  {
    // Relación con el paso
    stepId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NodeStep',
      required: true,
      index: true
    },

    // Tipo de card (ENUM fijo)
    type: {
      type: String,
      enum: ['text', 'list', 'image', 'video', 'animation', 'quiz', 'timer'],
      required: true,
      index: true
    },

    // Orden dentro del paso
    order: {
      type: Number,
      required: true,
      index: true
    },

    // Datos específicos por tipo (Mixed)
    // No usar discriminator para permitir máxima flexibilidad
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},

      // Estructura esperada por tipo:
      // text: { content: String }
      // list: { items: [{ text: String, icon?: String }] }
      // image: { url: String, caption?: String }
      // video: { url: String, caption?: String, duration?: Number }
      // animation: { url: String, caption?: String }
      // quiz: { 
      //   question: String, 
      //   options: [{ text: String, isCorrect: Boolean }],
      //   explanation?: String 
      // }
      // timer: {
      //   duration: Number (seconds),
      //   autoStart?: Boolean,
      //   sound?: Boolean
      // }
    },

    // Validaciones personalizadas
    validationRules: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },

    // Feedback al usuario
    feedback: {
      correct: { type: String, default: null },
      incorrect: { type: String, default: null }
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
    collection: 'nodecards'
  }
);

// Índices para optimizar queries
nodeCardSchema.index({ stepId: 1, order: 1 });
nodeCardSchema.index({ stepId: 1, isDeleted: 1 });
nodeCardSchema.index({ type: 1 });

module.exports = mongoose.model('NodeCard', nodeCardSchema);
