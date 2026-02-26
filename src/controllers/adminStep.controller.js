const NodeStepService = require('../services/nodeStep.service');

/**
 * AdminStepController
 * 
 * Controlador para gestionar pasos (steps) dentro de nodos
 */
class AdminStepController {
  /**
   * Crear un nuevo paso en un nodo
   */
  static async createStep(req, res) {
    try {
      const { nodeId } = req.params;
      const stepData = req.body;

      const step = await NodeStepService.createStep(nodeId, stepData);

      res.status(201).json({
        success: true,
        message: 'Paso creado exitosamente',
        data: step
      });
    } catch (error) {
      console.error('Error creating step:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtener pasos de un nodo
   */
  static async getStepsByNode(req, res) {
    try {
      const { nodeId } = req.params;
      const { includeDeleted } = req.query;

      const steps = await NodeStepService.getStepsByNode(
        nodeId,
        includeDeleted === 'true'
      );

      res.json({
        success: true,
        data: steps
      });
    } catch (error) {
      console.error('Error fetching steps:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtener un paso específico
   */
  static async getStepById(req, res) {
    try {
      const { stepId } = req.params;

      const step = await NodeStepService.getStepById(stepId);

      if (!step) {
        return res.status(404).json({
          success: false,
          message: 'Paso no encontrado'
        });
      }

      res.json({
        success: true,
        data: step
      });
    } catch (error) {
      console.error('Error fetching step:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Actualizar un paso
   */
  static async updateStep(req, res) {
    try {
      const { stepId } = req.params;
      const updateData = req.body;

      const step = await NodeStepService.updateStep(stepId, updateData);

      if (!step) {
        return res.status(404).json({
          success: false,
          message: 'Paso no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Paso actualizado exitosamente',
        data: step
      });
    } catch (error) {
      console.error('Error updating step:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Eliminar un paso (soft delete)
   */
  static async deleteStep(req, res) {
    try {
      const { stepId } = req.params;

      const step = await NodeStepService.deleteStep(stepId);

      if (!step) {
        return res.status(404).json({
          success: false,
          message: 'Paso no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Paso eliminado exitosamente',
        data: step
      });
    } catch (error) {
      console.error('Error deleting step:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Reordenar pasos dentro de un nodo
   */
  static async reorderSteps(req, res) {
    try {
      const { nodeId } = req.params;
      const { stepOrders } = req.body;

      if (!Array.isArray(stepOrders)) {
        return res.status(400).json({
          success: false,
          message: 'stepOrders debe ser un array de { stepId, order }'
        });
      }

      await NodeStepService.reorderSteps(nodeId, stepOrders);

      res.json({
        success: true,
        message: 'Pasos reordenados exitosamente'
      });
    } catch (error) {
      console.error('Error reordering steps:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = AdminStepController;
