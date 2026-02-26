const mongoose = require('mongoose');
const NodeStep = require('../models/NodeStep.model');
const LearningNode = require('../models/LearningNode.model');

/**
 * NodeStepService
 * 
 * Operaciones CRUD para pasos dentro de nodos
 */
class NodeStepService {
  /**
   * Crear un paso nuevo
   */
  static async createStep(nodeId, data) {
    try {
      // Validar que el nodo existe
      const node = await LearningNode.findById(nodeId);
      if (!node) {
        throw new Error('Nodo no encontrado');
      }

      // Si no existe steps array, crearlo
      if (!node.steps) {
        node.steps = [];
      }

      // Crear paso
      const step = new NodeStep({
        nodeId,
        title: data.title || 'Nuevo Paso',
        description: data.description || '',
        order: data.order ?? node.steps.length,
        estimatedTime: data.estimatedTime || null,
        cards: [],
        lastModifiedBy: data.lastModifiedBy || null
      });

      await step.save();

      // Agregar paso a la lista del nodo
      node.steps.push(step._id);
      await node.save();

      return step;
    } catch (error) {
      throw new Error(`Error creando paso: ${error.message}`);
    }
  }

  /**
   * Obtener todos los pasos de un nodo
   */
  static async getStepsByNode(nodeId) {
    try {
      const steps = await NodeStep.find({
        nodeId,
        isDeleted: false
      })
        .populate('cards')
        .sort({ order: 1 });

      return steps;
    } catch (error) {
      throw new Error(`Error obteniendo pasos: ${error.message}`);
    }
  }

  /**
   * Obtener un paso por ID
   */
  static async getStepById(stepId) {
    try {
      const step = await NodeStep.findById(stepId).populate('cards');
      if (!step) {
        throw new Error('Paso no encontrado');
      }
      return step;
    } catch (error) {
      throw new Error(`Error obteniendo paso: ${error.message}`);
    }
  }

  /**
   * Actualizar un paso
   */
  static async updateStep(stepId, updates) {
    try {
      const step = await NodeStep.findByIdAndUpdate(
        stepId,
        {
          ...updates,
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      ).populate('cards');

      if (!step) {
        throw new Error('Paso no encontrado');
      }

      return step;
    } catch (error) {
      throw new Error(`Error actualizando paso: ${error.message}`);
    }
  }

  /**
   * Eliminar un paso (soft delete)
   */
  static async deleteStep(stepId) {
    try {
      const step = await NodeStep.findByIdAndUpdate(
        stepId,
        {
          isDeleted: true,
          deletedAt: new Date()
        },
        { new: true }
      );

      if (!step) {
        throw new Error('Paso no encontrado');
      }

      // Opcionalmente: eliminar las cards del paso también
      // const NodeCard = require('../models/NodeCard.model');
      // await NodeCard.updateMany(
      //   { stepId },
      //   { isDeleted: true, deletedAt: new Date() }
      // );

      return step;
    } catch (error) {
      throw new Error(`Error eliminando paso: ${error.message}`);
    }
  }

  /**
   * Reordenar pasos dentro de un nodo
   */
  static async reorderSteps(nodeId, stepOrders) {
    try {
      // stepOrders: [{ stepId, order: 0 }, ...]
      const updates = [];

      for (const item of stepOrders) {
        updates.push({
          updateOne: {
            filter: { _id: item.stepId, nodeId },
            update: { $set: { order: item.order } }
          }
        });
      }

      if (updates.length > 0) {
        await NodeStep.bulkWrite(updates);
      }

      return this.getStepsByNode(nodeId);
    } catch (error) {
      throw new Error(`Error reordenando pasos: ${error.message}`);
    }
  }

  /**
   * Agregar card a un paso
   */
  static async addCardToStep(stepId, cardId) {
    try {
      const step = await NodeStep.findByIdAndUpdate(
        stepId,
        { $push: { cards: cardId } },
        { new: true }
      );

      if (!step) {
        throw new Error('Paso no encontrado');
      }

      return step;
    } catch (error) {
      throw new Error(`Error agregando card: ${error.message}`);
    }
  }

  /**
   * Remover card de un paso
   */
  static async removeCardFromStep(stepId, cardId) {
    try {
      const step = await NodeStep.findByIdAndUpdate(
        stepId,
        { $pull: { cards: cardId } },
        { new: true }
      );

      if (!step) {
        throw new Error('Paso no encontrado');
      }

      return step;
    } catch (error) {
      throw new Error(`Error removiendo card: ${error.message}`);
    }
  }

  /**
   * Validar que un paso pertenece a un nodo
   */
  static async validateStepBelongsToNode(stepId, nodeId) {
    try {
      const step = await NodeStep.findOne({
        _id: stepId,
        nodeId
      });

      return !!step;
    } catch (error) {
      throw new Error(`Error validando paso: ${error.message}`);
    }
  }
}

module.exports = NodeStepService;
