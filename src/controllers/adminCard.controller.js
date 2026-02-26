const NodeCardService = require('../services/nodeCard.service');

/**
 * AdminCardController
 * 
 * Controlador para gestionar cards dentro de steps
 */
class AdminCardController {
  /**
   * Crear una nueva card en un step
   */
  static async createCard(req, res) {
    try {
      const { stepId } = req.params;
      const cardData = req.body;

      const card = await NodeCardService.createCard(stepId, cardData);

      res.status(201).json({
        success: true,
        message: 'Card creada exitosamente',
        data: card
      });
    } catch (error) {
      console.error('Error creating card:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtener cards de un step
   */
  static async getCardsByStep(req, res) {
    try {
      const { stepId } = req.params;
      const { includeDeleted } = req.query;

      const cards = await NodeCardService.getCardsByStep(
        stepId,
        includeDeleted === 'true'
      );

      res.json({
        success: true,
        data: cards
      });
    } catch (error) {
      console.error('Error fetching cards:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtener una card específica
   */
  static async getCardById(req, res) {
    try {
      const { cardId } = req.params;

      const card = await NodeCardService.getCardById(cardId);

      if (!card) {
        return res.status(404).json({
          success: false,
          message: 'Card no encontrada'
        });
      }

      res.json({
        success: true,
        data: card
      });
    } catch (error) {
      console.error('Error fetching card:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Actualizar una card
   */
  static async updateCard(req, res) {
    try {
      const { cardId } = req.params;
      const updateData = req.body;

      const card = await NodeCardService.updateCard(cardId, updateData);

      if (!card) {
        return res.status(404).json({
          success: false,
          message: 'Card no encontrada'
        });
      }

      res.json({
        success: true,
        message: 'Card actualizada exitosamente',
        data: card
      });
    } catch (error) {
      console.error('Error updating card:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Eliminar una card (soft delete)
   */
  static async deleteCard(req, res) {
    try {
      const { cardId } = req.params;

      const card = await NodeCardService.deleteCard(cardId);

      if (!card) {
        return res.status(404).json({
          success: false,
          message: 'Card no encontrada'
        });
      }

      res.json({
        success: true,
        message: 'Card eliminada exitosamente',
        data: card
      });
    } catch (error) {
      console.error('Error deleting card:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Reordenar cards dentro de un step
   */
  static async reorderCards(req, res) {
    try {
      const { stepId } = req.params;
      const { cardOrders } = req.body;

      if (!Array.isArray(cardOrders)) {
        return res.status(400).json({
          success: false,
          message: 'cardOrders debe ser un array de { cardId, order }'
        });
      }

      await NodeCardService.reorderCards(stepId, cardOrders);

      res.json({
        success: true,
        message: 'Cards reordenadas exitosamente'
      });
    } catch (error) {
      console.error('Error reordering cards:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = AdminCardController;
