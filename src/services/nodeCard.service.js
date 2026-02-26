const mongoose = require('mongoose');
const NodeCard = require('../models/NodeCard.model');
const NodeStep = require('../models/NodeStep.model');

/**
 * NodeCardService
 * 
 * Operaciones CRUD para cards dentro de pasos
 * Tipos soportados: text, list, image, video, animation, quiz, timer
 */
class NodeCardService {
  /**
   * Crear una card nueva
   */
  static async createCard(stepId, data) {
    try {
      // Validar que el paso existe
      const step = await NodeStep.findById(stepId);
      if (!step) {
        throw new Error('Paso no encontrado');
      }

      // Validar tipo
      const validTypes = ['text', 'list', 'image', 'video', 'animation', 'quiz', 'timer'];
      if (!validTypes.includes(data.type)) {
        throw new Error(`Tipo de card inválido: ${data.type}`);
      }

      // Si no existe cards array, crearlo
      if (!step.cards) {
        step.cards = [];
      }

      // Crear card
      const card = new NodeCard({
        stepId,
        type: data.type,
        order: data.order ?? step.cards.length,
        data: data.data || {},
        feedback: data.feedback || null,
        lastModifiedBy: data.lastModifiedBy || null
      });

      await card.save();

      // Agregar card a la lista del paso
      step.cards.push(card._id);
      await step.save();

      return card;
    } catch (error) {
      throw new Error(`Error creando card: ${error.message}`);
    }
  }

  /**
   * Obtener todas las cards de un paso
   */
  static async getCardsByStep(stepId) {
    try {
      const cards = await NodeCard.find({
        stepId,
        isDeleted: false
      }).sort({ order: 1 });

      return cards;
    } catch (error) {
      throw new Error(`Error obteniendo cards: ${error.message}`);
    }
  }

  /**
   * Obtener una card por ID
   */
  static async getCardById(cardId) {
    try {
      const card = await NodeCard.findById(cardId);
      if (!card) {
        throw new Error('Card no encontrada');
      }
      return card;
    } catch (error) {
      throw new Error(`Error obteniendo card: ${error.message}`);
    }
  }

  /**
   * Actualizar una card
   */
  static async updateCard(cardId, updates) {
    try {
      // Validar tipo si se está cambiando
      if (updates.type) {
        const validTypes = ['text', 'list', 'image', 'video', 'animation', 'quiz', 'timer'];
        if (!validTypes.includes(updates.type)) {
          throw new Error(`Tipo de card inválido: ${updates.type}`);
        }
      }

      const card = await NodeCard.findByIdAndUpdate(
        cardId,
        {
          ...updates,
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );

      if (!card) {
        throw new Error('Card no encontrada');
      }

      return card;
    } catch (error) {
      throw new Error(`Error actualizando card: ${error.message}`);
    }
  }

  /**
   * Eliminar una card (soft delete)
   */
  static async deleteCard(cardId) {
    try {
      const card = await NodeCard.findByIdAndUpdate(
        cardId,
        {
          isDeleted: true,
          deletedAt: new Date()
        },
        { new: true }
      );

      if (!card) {
        throw new Error('Card no encontrada');
      }

      // Remover card de paso
      await NodeStep.updateOne(
        { _id: card.stepId },
        { $pull: { cards: cardId } }
      );

      return card;
    } catch (error) {
      throw new Error(`Error eliminando card: ${error.message}`);
    }
  }

  /**
   * Reordenar cards dentro de un paso
   */
  static async reorderCards(stepId, cardOrders) {
    try {
      // cardOrders: [{ cardId, order: 0 }, ...]
      const updates = [];

      for (const item of cardOrders) {
        updates.push({
          updateOne: {
            filter: { _id: item.cardId, stepId },
            update: { $set: { order: item.order } }
          }
        });
      }

      if (updates.length > 0) {
        await NodeCard.bulkWrite(updates);
      }

      return this.getCardsByStep(stepId);
    } catch (error) {
      throw new Error(`Error reordenando cards: ${error.message}`);
    }
  }

  /**
   * Validar estructura de data según tipo
   */
  static validateCardData(type, data) {
    try {
      if (!data) return true;

      // Validaciones simples por tipo
      switch (type) {
        case 'text':
          if (data.content === undefined) {
            throw new Error('Card text requiere: content');
          }
          break;

        case 'list':
          if (!Array.isArray(data.items)) {
            throw new Error('Card list requiere: items (array)');
          }
          break;

        case 'image':
        case 'video':
        case 'animation':
          if (!data.url) {
            throw new Error(`Card ${type} requiere: url`);
          }
          break;

        case 'quiz':
          if (!data.question || !Array.isArray(data.options)) {
            throw new Error('Card quiz requiere: question, options (array)');
          }
          break;

        case 'timer':
          if (!data.duration || typeof data.duration !== 'number') {
            throw new Error('Card timer requiere: duration (number en segundos)');
          }
          break;
      }

      return true;
    } catch (error) {
      throw new Error(`Error validando data: ${error.message}`);
    }
  }

  /**
   * Validar que una card pertenece a un paso
   */
  static async validateCardBelongsToStep(cardId, stepId) {
    try {
      const card = await NodeCard.findOne({
        _id: cardId,
        stepId
      });

      return !!card;
    } catch (error) {
      throw new Error(`Error validando card: ${error.message}`);
    }
  }

  /**
   * Obtener cards por tipo
   */
  static async getCardsByType(stepId, type) {
    try {
      const cards = await NodeCard.find({
        stepId,
        type,
        isDeleted: false
      });

      return cards;
    } catch (error) {
      throw new Error(`Error obteniendo cards por tipo: ${error.message}`);
    }
  }
}

module.exports = NodeCardService;
