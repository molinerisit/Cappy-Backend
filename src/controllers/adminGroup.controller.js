const NodeGroupService = require('../services/nodeGroup.service');

/**
 * AdminGroupController
 * 
 * Maneja operaciones CRUD para NodeGroups
 */
class AdminGroupController {
  /**
   * POST /api/admin/v2/paths/:pathId/groups
   * Crear un grupo nuevo
   */
  static async createGroup(req, res) {
    try {
      const { pathId } = req.params;
      const { title, description, order, color, icon } = req.body;

      if (!title) {
        return res.status(400).json({ message: 'title es requerido' });
      }

      const group = await NodeGroupService.createGroup(pathId, {
        title,
        description,
        order,
        color,
        icon,
        lastModifiedBy: req.user?._id || null
      });

      res.status(201).json({
        success: true,
        message: 'Grupo creado exitosamente',
        data: group
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/admin/v2/paths/:pathId/groups
   * Obtener todos los grupos de un path
   */
  static async getGroupsByPath(req, res) {
    try {
      const { pathId } = req.params;

      const groups = await NodeGroupService.getGroupsByPath(pathId);

      res.json({
        success: true,
        data: groups
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/admin/v2/groups/:groupId
   * Obtener un grupo específico
   */
  static async getGroup(req, res) {
    try {
      const { groupId } = req.params;

      const group = await NodeGroupService.getGroupById(groupId);

      res.json({
        success: true,
        data: group
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * PUT /api/admin/v2/groups/:groupId
   * Actualizar un grupo
   */
  static async updateGroup(req, res) {
    try {
      const { groupId } = req.params;
      const updates = { ...req.body };

      // No permitir cambiar pathId
      delete updates.pathId;
      delete updates._id;
      delete updates.createdAt;

      const group = await NodeGroupService.updateGroup(groupId, {
        ...updates,
        lastModifiedBy: req.user?._id || null
      });

      res.json({
        success: true,
        message: 'Grupo actualizado exitosamente',
        data: group
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * DELETE /api/admin/v2/groups/:groupId
   * Eliminar un grupo
   */
  static async deleteGroup(req, res) {
    try {
      const { groupId } = req.params;

      const group = await NodeGroupService.deleteGroup(groupId);

      res.json({
        success: true,
        message: 'Grupo eliminado exitosamente',
        data: group
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /api/admin/v2/paths/:pathId/groups/reorder
   * Reordenar grupos
   */
  static async reorderGroups(req, res) {
    try {
      const { pathId } = req.params;
      const { groupOrders } = req.body; // [{ groupId, order }, ...]

      if (!Array.isArray(groupOrders) || groupOrders.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'groupOrders debe ser un array con items { groupId, order }'
        });
      }

      const groups = await NodeGroupService.reorderGroups(pathId, groupOrders);

      res.json({
        success: true,
        message: 'Grupos reordenados exitosamente',
        data: groups
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = AdminGroupController;
