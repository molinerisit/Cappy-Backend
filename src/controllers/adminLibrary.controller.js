const NodeLibraryService = require('../services/nodeLibrary.service');

/**
 * AdminLibraryController
 * 
 * Controlador para la biblioteca global de nodos
 * - Búsqueda
 * - Filtrado
 * - Estadísticas
 * - Exportación
 */
class AdminLibraryController {
  /**
   * Obtener todos los nodos con paginación
   */
  static async getAllNodes(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        type,
        status,
        difficulty,
        pathId,
        groupId,
        isLinked
      } = req.query;

      const filters = {};
      if (type) filters.type = type;
      if (status) filters.status = status;
      if (difficulty) filters.difficulty = parseInt(difficulty);
      if (pathId) filters.pathId = pathId;
      if (groupId) filters.groupId = groupId;
      if (isLinked !== undefined) filters.isLinked = isLinked === 'true';

      const result = await NodeLibraryService.getAllNodes(
        filters,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        data: result.nodes,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error fetching library nodes:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Buscar nodos
   */
  static async searchNodes(req, res) {
    try {
      const {
        q,
        page = 1,
        limit = 20,
        type,
        status,
        difficulty,
        pathId
      } = req.query;

      if (!q || q.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Parámetro de búsqueda "q" es requerido'
        });
      }

      const filters = {};
      if (type) filters.type = type;
      if (status) filters.status = status;
      if (difficulty) filters.difficulty = parseInt(difficulty);
      if (pathId) filters.pathId = pathId;

      const result = await NodeLibraryService.searchNodes(
        q,
        filters,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        query: q,
        data: result.nodes,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error searching nodes:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtener nodos por tipo
   */
  static async getNodesByType(req, res) {
    try {
      const { type } = req.params;
      const { page = 1, limit = 50 } = req.query;

      const result = await NodeLibraryService.getNodesByType(
        type,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        type,
        data: result.nodes,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error fetching nodes by type:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtener nodos por path
   */
  static async getNodesByPath(req, res) {
    try {
      const { pathId } = req.params;
      const { page = 1, limit = 50 } = req.query;

      const result = await NodeLibraryService.getNodesByPath(
        pathId,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        pathId,
        data: result.nodes,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error fetching nodes by path:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtener nodos más reutilizados
   */
  static async getMostReusedNodes(req, res) {
    try {
      const { limit = 20 } = req.query;

      const nodes = await NodeLibraryService.getMostReusedNodes(
        parseInt(limit)
      );

      res.json({
        success: true,
        data: nodes
      });
    } catch (error) {
      console.error('Error fetching most reused nodes:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtener nodos recientemente modificados
   */
  static async getRecentlyModified(req, res) {
    try {
      const { limit = 20 } = req.query;

      const nodes = await NodeLibraryService.getRecentlyModified(
        parseInt(limit)
      );

      res.json({
        success: true,
        data: nodes
      });
    } catch (error) {
      console.error('Error fetching recently modified nodes:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtener estadísticas globales
   */
  static async getLibraryStats(req, res) {
    try {
      const stats = await NodeLibraryService.getLibraryStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching library stats:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtener dependencias de un nodo
   */
  static async getNodeDependencies(req, res) {
    try {
      const { nodeId } = req.params;

      const dependencies = await NodeLibraryService.getNodeDependencies(nodeId);

      res.json({
        success: true,
        data: dependencies
      });
    } catch (error) {
      console.error('Error fetching node dependencies:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Exportar nodos como JSON
   */
  static async exportNodes(req, res) {
    try {
      const { pathId } = req.body;

      const exportData = await NodeLibraryService.exportNodesToJSON(pathId);

      res.json({
        success: true,
        data: exportData
      });
    } catch (error) {
      console.error('Error exporting nodes:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = AdminLibraryController;
