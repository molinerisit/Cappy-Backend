const LearningNodeService = require('../services/learningNode.service');

/**
 * AdminNodeController
 * Maneja operaciones CRUD para LearningNodes con linked nodes y niveles paralelos
 */
class AdminNodeController {
  // POST /api/admin/v2/paths/:pathId/nodes
  static async createNode(req, res) {
    try {
      const { pathId } = req.params;
      const { title, description, type, xpReward, difficulty, level, positionIndex, groupId, status, tags } = req.body;

      const node = await LearningNodeService.createNode(pathId, {
        title, description, type, xpReward, difficulty, level, positionIndex, groupId, status, tags,
        lastModifiedBy: req.user?._id || null
      });

      res.status(201).json({ success: true, message: 'Nodo creado', data: node });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /api/admin/v2/paths/:pathId/nodes
  static async getNodesByPath(req, res) {
    try {
      const { pathId } = req.params;
      const includeDeleted = req.query.includeDeleted === 'true';

      const nodes = await LearningNodeService.getNodesByPath(pathId, includeDeleted);

      res.json({ success: true, data: nodes });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /api/admin/v2/nodes/:nodeId
  static async getNode(req, res) {
    try {
      const { nodeId } = req.params;

      const node = await LearningNodeService.getNodeById(nodeId);

      res.json({ success: true, data: node });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  // PUT /api/admin/v2/nodes/:nodeId
  static async updateNode(req, res) {
    try {
      const { nodeId } = req.params;
      const updates = { ...req.body };

      delete updates._id;
      delete updates.pathId;
      delete updates.createdAt;

      const node = await LearningNodeService.updateNode(nodeId, {
        ...updates,
        lastModifiedBy: req.user?._id || null
      });

      res.json({ success: true, message: 'Nodo actualizado', data: node });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // DELETE /api/admin/v2/nodes/:nodeId
  static async deleteNode(req, res) {
    try {
      const { nodeId } = req.params;

      const node = await LearningNodeService.deleteNode(nodeId);

      res.json({ success: true, message: 'Nodo eliminado', data: node });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /api/admin/v2/nodes/import/linked
  static async importNodeAsLinked(req, res) {
    try {
      const { sourceNodeId, targetPathId, title, groupId, level, positionIndex, status } = req.body;

      if (!sourceNodeId || !targetPathId) {
        return res.status(400).json({
          success: false,
          message: 'sourceNodeId y targetPathId son requeridos'
        });
      }

      const node = await LearningNodeService.importNodeAsLinked(sourceNodeId, targetPathId, {
        title, groupId, level, positionIndex, status
      });

      res.status(201).json({
        success: true,
        message: 'Nodo importado como referencia',
        data: node
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /api/admin/v2/nodes/import/copy
  static async importNodeAsCopy(req, res) {
    try {
      const { sourceNodeId, targetPathId, title, groupId, level, positionIndex, status } = req.body;

      if (!sourceNodeId || !targetPathId) {
        return res.status(400).json({
          success: false,
          message: 'sourceNodeId y targetPathId son requeridos'
        });
      }

      const node = await LearningNodeService.importNodeAsCopy(sourceNodeId, targetPathId, {
        title, groupId, level, positionIndex, status
      });

      res.status(201).json({
        success: true,
        message: 'Nodo importado como copia',
        data: node
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /api/admin/v2/nodes/:nodeId/relations
  static async getNodeRelations(req, res) {
    try {
      const { nodeId } = req.params;

      const relations = await LearningNodeService.getNodeRelations(nodeId);

      res.json({
        success: true,
        message: 'Relaciones del nodo',
        data: relations
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /api/admin/v2/nodes/:nodeId/move-level
  static async moveNodeToLevel(req, res) {
    try {
      const { nodeId } = req.params;
      const { newLevel, newPositionIndex } = req.body;

      if (!newLevel) {
        return res.status(400).json({
          success: false,
          message: 'newLevel es requerido'
        });
      }

      const node = await LearningNodeService.moveNodeToLevel(
        nodeId,
        newLevel,
        newPositionIndex || 0
      );

      res.json({
        success: true,
        message: 'Nodo movido a nuevo nivel',
        data: node
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /api/admin/v2/paths/:pathId/nodes/reorder-by-level
  static async reorderNodesByLevel(req, res) {
    try {
      const { pathId } = req.params;
      const { level, nodeOrders } = req.body;

      if (!level || !Array.isArray(nodeOrders)) {
        return res.status(400).json({
          success: false,
          message: 'level y nodeOrders son requeridos'
        });
      }

      const nodes = await LearningNodeService.reorderNodesByLevel(pathId, level, nodeOrders);

      res.json({
        success: true,
        message: 'Nodos reordenados',
        data: nodes
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /api/admin/v2/nodes/:nodeId/stats
  static async getNodeStats(req, res) {
    try {
      const { nodeId } = req.params;

      const stats = await LearningNodeService.getNodeStats(nodeId);

      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = AdminNodeController;
