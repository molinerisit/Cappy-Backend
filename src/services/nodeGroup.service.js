const mongoose = require('mongoose');
const NodeGroup = require('../models/NodeGroup.model');
const LearningPath = require('../models/LearningPath.model');

/**
 * NodeGroupService
 * 
 * Operaciones CRUD para NodeGroup
 * Maneja grupos dentro de caminos
 */
class NodeGroupService {
  /**
   * Crear un grupo nuevo
   */
  static async createGroup(pathId, data) {
    try {
      // Validar que el path existe
      const path = await LearningPath.findById(pathId);
      if (!path) {
        throw new Error('Path no encontrado');
      }

      // Crear grupo
      const group = new NodeGroup({
        pathId,
        title: data.title || 'Nuevo Grupo',
        description: data.description || '',
        order: data.order ?? 0,
        color: data.color || null,
        icon: data.icon || null,
        lastModifiedBy: data.lastModifiedBy || null
      });

      await group.save();

      // Agregar grupo a la lista del path
      if (!path.groups) {
        path.groups = [];
      }
      path.groups.push(group._id);
      await path.save();

      return group;
    } catch (error) {
      throw new Error(`Error creando grupo: ${error.message}`);
    }
  }

  /**
   * Obtener todos los grupos de un path
   */
  static async getGroupsByPath(pathId) {
    try {
      const groups = await NodeGroup.find({
        pathId,
        isDeleted: false
      }).sort({ order: 1 });

      return groups;
    } catch (error) {
      throw new Error(`Error obteniendo grupos: ${error.message}`);
    }
  }

  /**
   * Obtener un grupo por ID
   */
  static async getGroupById(groupId) {
    try {
      const group = await NodeGroup.findById(groupId);
      if (!group) {
        throw new Error('Grupo no encontrado');
      }
      return group;
    } catch (error) {
      throw new Error(`Error obteniendo grupo: ${error.message}`);
    }
  }

  /**
   * Actualizar un grupo
   */
  static async updateGroup(groupId, updates) {
    try {
      const group = await NodeGroup.findByIdAndUpdate(
        groupId,
        {
          ...updates,
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );

      if (!group) {
        throw new Error('Grupo no encontrado');
      }

      return group;
    } catch (error) {
      throw new Error(`Error actualizando grupo: ${error.message}`);
    }
  }

  /**
   * Eliminar un grupo (soft delete)
   */
  static async deleteGroup(groupId) {
    try {
      const group = await NodeGroup.findByIdAndUpdate(
        groupId,
        {
          isDeleted: true,
          deletedAt: new Date()
        },
        { new: true }
      );

      if (!group) {
        throw new Error('Grupo no encontrado');
      }

      return group;
    } catch (error) {
      throw new Error(`Error eliminando grupo: ${error.message}`);
    }
  }

  /**
   * Reordenar grupos dentro de un path
   */
  static async reorderGroups(pathId, groupOrders) {
    try {
      // groupOrders: [{ groupId, order: 0 }, { groupId, order: 1 }, ...]
      const updates = [];

      for (const item of groupOrders) {
        updates.push({
          updateOne: {
            filter: { _id: item.groupId, pathId },
            update: { $set: { order: item.order } }
          }
        });
      }

      if (updates.length > 0) {
        await NodeGroup.bulkWrite(updates);
      }

      // Retornar grupos reordenados
      return this.getGroupsByPath(pathId);
    } catch (error) {
      throw new Error(`Error reordenando grupos: ${error.message}`);
    }
  }

  /**
   * Validar que un grupo pertenece a un path
   */
  static async validateGroupBelongsToPath(groupId, pathId) {
    try {
      const group = await NodeGroup.findOne({
        _id: groupId,
        pathId
      });

      return !!group;
    } catch (error) {
      throw new Error(`Error validando grupo: ${error.message}`);
    }
  }
}

module.exports = NodeGroupService;
