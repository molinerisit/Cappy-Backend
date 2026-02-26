const mongoose = require('mongoose');
const LearningNode = require('../models/LearningNode.model');
const LearningPath = require('../models/LearningPath.model');
const NodeGroup = require('../models/NodeGroup.model');

/**
 * LearningNodeService
 * 
 * Operaciones CRUD para nodos de aprendizaje
 * Soporta:
 * - Linked nodes (reutilización con referencias)
 * - Niveles paralelos (level + positionIndex)
 * - Importación de nodos
 * - Búsqueda y relaciones
 */
class LearningNodeService {
  // Mapeo automático de tipo a icon
  static TYPE_ICONS = {
    recipe: '🍽️',
    explanation: '📘',
    tips: '💡',
    quiz: '❓',
    technique: '🔪',
    cultural: '🌍',
    challenge: '🎯',
    skill: '⭐'
  };

  /**
   * Crear un nodo nuevo
   */
  static async createNode(pathId, data) {
    try {
      // Validar que el path existe
      const path = await LearningPath.findById(pathId);
      if (!path) {
        throw new Error('Path no encontrado');
      }

      // Validar groupId si se proporciona
      if (data.groupId) {
        const groupIsValid = await NodeGroup.findOne({
          _id: data.groupId,
          pathId
        });

        if (!groupIsValid) {
          throw new Error('Grupo no pertenece a este path');
        }
      }

      // Validar tipo
      const validTypes = Object.keys(this.TYPE_ICONS);
      if (data.type && !validTypes.includes(data.type)) {
        throw new Error(`Tipo de nodo inválido: ${data.type}`);
      }

      // Crear nodo
      const node = new LearningNode({
        pathId,
        groupId: data.groupId || null,
        title: data.title || 'Nuevo Nodo',
        description: data.description || '',
        type: data.type || 'skill',
        icon: this.TYPE_ICONS[data.type] || '📌',
        xpReward: data.xpReward || 50,
        difficulty: data.difficulty || 1,
        level: data.level || 1,
        positionIndex: data.positionIndex ?? 0,
        status: data.status || 'active',
        originalNodeId: data.originalNodeId || null,
        isLinked: data.isLinked || false,
        order: data.order ?? 0,
        tags: data.tags || [],
        lastModifiedBy: data.lastModifiedBy || null
      });

      await node.save();

      // Agregar nodo a la lista del path
      if (!path.nodes) {
        path.nodes = [];
      }
      path.nodes.push(node._id);
      await path.save();

      return node;
    } catch (error) {
      throw new Error(`Error creando nodo: ${error.message}`);
    }
  }

  /**
   * Obtener todos los nodos de un path
   */
  static async getNodesByPath(pathId, includeDeleted = false) {
    try {
      const filter = { pathId };
      if (!includeDeleted) {
        filter.isDeleted = false;
      }

      const nodes = await LearningNode.find(filter)
        .populate('groupId')
        .populate('steps')
        .sort({ level: 1, positionIndex: 1, order: 1 });

      return nodes;
    } catch (error) {
      throw new Error(`Error obteniendo nodos: ${error.message}`);
    }
  }

  /**
   * Obtener nodos por nivel (para niveles paralelos)
   */
  static async getNodesByLevel(pathId, level) {
    try {
      const nodes = await LearningNode.find({
        pathId,
        level,
        isDeleted: false
      })
        .populate('groupId')
        .sort({ positionIndex: 1 });

      return nodes;
    } catch (error) {
      throw new Error(`Error obteniendo nodos por nivel: ${error.message}`);
    }
  }

  /**
   * Obtener un nodo por ID
   */
  static async getNodeById(nodeId) {
    try {
      const node = await LearningNode.findById(nodeId)
        .populate('groupId')
        .populate('steps');

      if (!node) {
        throw new Error('Nodo no encontrado');
      }

      return node;
    } catch (error) {
      throw new Error(`Error obteniendo nodo: ${error.message}`);
    }
  }

  /**
   * Actualizar un nodo
   */
  static async updateNode(nodeId, updates) {
    try {
      // Validar tipo si se está cambiando
      if (updates.type) {
        if (!Object.keys(this.TYPE_ICONS).includes(updates.type)) {
          throw new Error(`Tipo de nodo inválido: ${updates.type}`);
        }
        // Auto-actualizar icon si cambia el tipo
        updates.icon = this.TYPE_ICONS[updates.type];
      }

      const node = await LearningNode.findByIdAndUpdate(
        nodeId,
        {
          ...updates,
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      )
        .populate('groupId')
        .populate('steps');

      if (!node) {
        throw new Error('Nodo no encontrado');
      }

      return node;
    } catch (error) {
      throw new Error(`Error actualizando nodo: ${error.message}`);
    }
  }

  /**
   * Eliminar un nodo (soft delete)
   */
  static async deleteNode(nodeId) {
    try {
      const node = await LearningNode.findByIdAndUpdate(
        nodeId,
        {
          isDeleted: true,
          deletedAt: new Date()
        },
        { new: true }
      );

      if (!node) {
        throw new Error('Nodo no encontrado');
      }

      return node;
    } catch (error) {
      throw new Error(`Error eliminando nodo: ${error.message}`);
    }
  }

  /**
   * IMPORTAR NODO COMO REFERENCIA (Linked)
   * 
   * Crea un nuevo documento que referencia al original
   * Si el original se edita, el linked se queda con su propia copia
   */
  static async importNodeAsLinked(sourceNodeId, targetPathId, data = {}) {
    try {
      // Obtener nodo original
      const originalNode = await this.getNodeById(sourceNodeId);

      // Validar que el target path existe
      const targetPath = await LearningPath.findById(targetPathId);
      if (!targetPath) {
        throw new Error('Path de destino no encontrado');
      }

      // Crear nuevo nodo con datos copiados
      const newNode = new LearningNode({
        pathId: targetPathId,
        groupId: data.groupId || null,
        title: data.title || `${originalNode.title} (linked)`,
        description: originalNode.description,
        type: originalNode.type,
        icon: originalNode.icon,
        xpReward: originalNode.xpReward,
        difficulty: originalNode.difficulty,
        level: data.level || 1,
        positionIndex: data.positionIndex ?? 0,
        status: data.status || 'active',
        
        // Marcar como linked
        originalNodeId: sourceNodeId,
        isLinked: true,
        
        tags: originalNode.tags || [],
        order: data.order ?? 0
      });

      await newNode.save();

      // Agregar a path
      if (!targetPath.nodes) {
        targetPath.nodes = [];
      }
      targetPath.nodes.push(newNode._id);
      await targetPath.save();

      // Incrementar contador de uso del original
      await LearningNode.findByIdAndUpdate(sourceNodeId, {
        reuseCount: (originalNode.reuseCount || 0) + 1,
        lastUsedAt: new Date()
      });

      return newNode;
    } catch (error) {
      throw new Error(`Error importando nodo como linked: ${error.message}`);
    }
  }

  /**
   * IMPORTAR NODO COMO COPIA (Copy)
   * 
   * Crea una copia completamente independiente del nodo
   * Incluyendo sus steps y cards
   */
  static async importNodeAsCopy(sourceNodeId, targetPathId, data = {}) {
    try {
      // Obtener nodo original con sus papás
      const originalNode = await LearningNode.findById(sourceNodeId)
        .populate('steps');

      if (!originalNode) {
        throw new Error('Nodo original no encontrado');
      }

      // Validar path
      const targetPath = await LearningPath.findById(targetPathId);
      if (!targetPath) {
        throw new Error('Path de destino no encontrado');
      }

      // Crear nuevo nodo (sin originalNodeId ni isLinked)
      const newNode = new LearningNode({
        pathId: targetPathId,
        groupId: data.groupId || null,
        title: data.title || `${originalNode.title} (copy)`,
        description: originalNode.description,
        type: originalNode.type,
        icon: originalNode.icon,
        xpReward: originalNode.xpReward,
        difficulty: originalNode.difficulty,
        level: data.level || 1,
        positionIndex: data.positionIndex ?? 0,
        status: data.status || 'active',
        
        // NO marcar como linked
        originalNodeId: null,
        isLinked: false,
        
        tags: originalNode.tags || [],
        order: data.order ?? 0,
        isCopy: true
      });

      await newNode.save();

      // Copiar steps (si existen)
      // TODO: Implementar copia de steps y cards
      // Por ahora solo copiar la estructura básica

      // Agregar a path
      if (!targetPath.nodes) {
        targetPath.nodes = [];
      }
      targetPath.nodes.push(newNode._id);
      await targetPath.save();

      return newNode;
    } catch (error) {
      throw new Error(`Error importando nodo como copia: ${error.message}`);
    }
  }

  /**
   * Mover nodo a otro level (niveles paralelos)
   */
  static async moveNodeToLevel(nodeId, newLevel, newPositionIndex = 0) {
    try {
      const node = await LearningNode.findById(nodeId);
      if (!node) {
        throw new Error('Nodo no encontrado');
      }

      // Actualizar nivel y posición
      node.level = newLevel;
      node.positionIndex = newPositionIndex;
      await node.save();

      return node;
    } catch (error) {
      throw new Error(`Error moviendo nodo a nivel: ${error.message}`);
    }
  }

  /**
   * Reordenar nodos dentro del mismo level
   */
  static async reorderNodesByLevel(pathId, level, nodeOrders) {
    try {
      // nodeOrders: [{ nodeId, positionIndex: 0 }, ...]
      const updates = [];

      for (const item of nodeOrders) {
        updates.push({
          updateOne: {
            filter: { _id: item.nodeId, pathId, level },
            update: { $set: { positionIndex: item.positionIndex } }
          }
        });
      }

      if (updates.length > 0) {
        await LearningNode.bulkWrite(updates);
      }

      return this.getNodesByLevel(pathId, level);
    } catch (error) {
      throw new Error(`Error reordenando nodos: ${error.message}`);
    }
  }

  /**
   * Obtener dónde se usa un nodo (relaciones)
   */
  static async getNodeRelations(originalNodeId) {
    try {
      const linkedNodes = await LearningNode.find({
        originalNodeId,
        isDeleted: false
      })
        .populate('pathId', 'title')
        .select('_id title pathId level positionIndex');

      return linkedNodes;
    } catch (error) {
      throw new Error(`Error obteniendo relaciones: ${error.message}`);
    }
  }

  /**
   * Buscar nodos por búsqueda de texto
   */
  static async searchNodes(pathId, searchTerm, filters = {}) {
    try {
      const query = {
        pathId,
        isDeleted: false,
        $or: [
          { title: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { tags: { $regex: searchTerm, $options: 'i' } }
        ]
      };

      // Aplicar filtros adicionales
      if (filters.type) query.type = filters.type;
      if (filters.status) query.status = filters.status;
      if (filters.difficulty) query.difficulty = filters.difficulty;
      if (filters.groupId) query.groupId = filters.groupId;

      const nodes = await LearningNode.find(query)
        .populate('groupId')
        .limit(50);

      return nodes;
    } catch (error) {
      throw new Error(`Error buscando nodos: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas de un nodo
   */
  static async getNodeStats(nodeId) {
    try {
      const node = await LearningNode.findById(nodeId);
      if (!node) {
        throw new Error('Nodo no encontrado');
      }

      const linkedCount = await LearningNode.countDocuments({
        originalNodeId: nodeId,
        isDeleted: false
      });

      const stats = {
        nodeId,
        title: node.title,
        type: node.type,
        totalLinks: linkedCount,
        reuseCount: node.reuseCount || 0,
        lastUsedAt: node.lastUsedAt,
        createdAt: node.createdAt,
        updatedAt: node.updatedAt
      };

      return stats;
    } catch (error) {
      throw new Error(`Error obteniendo stats: ${error.message}`);
    }
  }

  /**
   * Validar que un nodo pertenece a un path
   */
  static async validateNodeBelongsToPath(nodeId, pathId) {
    try {
      const node = await LearningNode.findOne({
        _id: nodeId,
        pathId
      });

      return !!node;
    } catch (error) {
      throw new Error(`Error validando nodo: ${error.message}`);
    }
  }
}

module.exports = LearningNodeService;
