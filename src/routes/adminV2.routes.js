const express = require('express');
const router = express.Router();

// Controllers
const AdminGroupController = require('../controllers/adminGroup.controller');
const AdminNodeController = require('../controllers/adminNode.controller');
const AdminStepController = require('../controllers/adminStep.controller');
const AdminCardController = require('../controllers/adminCard.controller');
const AdminLibraryController = require('../controllers/adminLibrary.controller');

// Middleware (uncomment when authentication is ready)
// const { isAdmin } = require('../middleware/auth.middleware');

// ===================================================
// 🟢 NODE GROUPS
// ===================================================

// Crear grupo en un path
router.post(
  '/paths/:pathId/groups',
  // isAdmin,
  AdminGroupController.createGroup
);

// Obtener grupos de un path
router.get(
  '/paths/:pathId/groups',
  // isAdmin,
  AdminGroupController.getGroupsByPath
);

// Obtener grupo específico
router.get(
  '/groups/:groupId',
  // isAdmin,
  AdminGroupController.getGroup
);

// Actualizar grupo
router.put(
  '/groups/:groupId',
  // isAdmin,
  AdminGroupController.updateGroup
);

// Eliminar grupo (soft delete)
router.delete(
  '/groups/:groupId',
  // isAdmin,
  AdminGroupController.deleteGroup
);

// Reordenar grupos
router.post(
  '/paths/:pathId/groups/reorder',
  // isAdmin,
  AdminGroupController.reorderGroups
);

// ===================================================
// 🔵 LEARNING NODES
// ===================================================

// Crear nodo en un path
router.post(
  '/paths/:pathId/nodes',
  // isAdmin,
  AdminNodeController.createNode
);

// Obtener nodos de un path
router.get(
  '/paths/:pathId/nodes',
  // isAdmin,
  AdminNodeController.getNodesByPath
);

// Obtener nodo específico
router.get(
  '/nodes/:nodeId',
  // isAdmin,
  AdminNodeController.getNode
);

// Actualizar nodo
router.put(
  '/nodes/:nodeId',
  // isAdmin,
  AdminNodeController.updateNode
);

// Eliminar nodo (soft delete)
router.delete(
  '/nodes/:nodeId',
  // isAdmin,
  AdminNodeController.deleteNode
);

// Importar nodo como referencia (linked)
router.post(
  '/nodes/import/linked',
  // isAdmin,
  AdminNodeController.importNodeAsLinked
);

// Importar nodo como copia independiente
router.post(
  '/nodes/import/copy',
  // isAdmin,
  AdminNodeController.importNodeAsCopy
);

// Ver relaciones de un nodo
router.get(
  '/nodes/:nodeId/relations',
  // isAdmin,
  AdminNodeController.getNodeRelations
);

// Obtener estadísticas de un nodo
router.get(
  '/nodes/:nodeId/stats',
  // isAdmin,
  AdminNodeController.getNodeStats
);

// Mover nodo a otro nivel
router.post(
  '/nodes/:nodeId/move-level',
  // isAdmin,
  AdminNodeController.moveNodeToLevel
);

// Reordenar nodos por nivel
router.post(
  '/paths/:pathId/nodes/reorder-by-level',
  // isAdmin,
  AdminNodeController.reorderNodesByLevel
);

// ===================================================
// 🟡 NODE STEPS
// ===================================================

// Crear step en un nodo
router.post(
  '/nodes/:nodeId/steps',
  // isAdmin,
  AdminStepController.createStep
);

// Obtener steps de un nodo
router.get(
  '/nodes/:nodeId/steps',
  // isAdmin,
  AdminStepController.getStepsByNode
);

// Obtener step específico
router.get(
  '/steps/:stepId',
  // isAdmin,
  AdminStepController.getStepById
);

// Actualizar step
router.put(
  '/steps/:stepId',
  // isAdmin,
  AdminStepController.updateStep
);

// Eliminar step (soft delete)
router.delete(
  '/steps/:stepId',
  // isAdmin,
  AdminStepController.deleteStep
);

// Reordenar steps
router.post(
  '/nodes/:nodeId/steps/reorder',
  // isAdmin,
  AdminStepController.reorderSteps
);

// ===================================================
// 🟣 NODE CARDS
// ===================================================

// Crear card en un step
router.post(
  '/steps/:stepId/cards',
  // isAdmin,
  AdminCardController.createCard
);

// Obtener cards de un step
router.get(
  '/steps/:stepId/cards',
  // isAdmin,
  AdminCardController.getCardsByStep
);

// Obtener card específica
router.get(
  '/cards/:cardId',
  // isAdmin,
  AdminCardController.getCardById
);

// Actualizar card
router.put(
  '/cards/:cardId',
  // isAdmin,
  AdminCardController.updateCard
);

// Eliminar card (soft delete)
router.delete(
  '/cards/:cardId',
  // isAdmin,
  AdminCardController.deleteCard
);

// Reordenar cards
router.post(
  '/steps/:stepId/cards/reorder',
  // isAdmin,
  AdminCardController.reorderCards
);

// ===================================================
// 📚 BIBLIOTECA GLOBAL
// ===================================================

// Obtener todos los nodos (paginado)
router.get(
  '/library/nodes',
  // isAdmin,
  AdminLibraryController.getAllNodes
);

// Buscar nodos
router.get(
  '/library/search',
  // isAdmin,
  AdminLibraryController.searchNodes
);

// Obtener nodos por tipo
router.get(
  '/library/by-type/:type',
  // isAdmin,
  AdminLibraryController.getNodesByType
);

// Obtener nodos por path
router.get(
  '/library/by-path/:pathId',
  // isAdmin,
  AdminLibraryController.getNodesByPath
);

// Obtener nodos más reutilizados
router.get(
  '/library/most-reused',
  // isAdmin,
  AdminLibraryController.getMostReusedNodes
);

// Obtener nodos recientemente modificados
router.get(
  '/library/recent',
  // isAdmin,
  AdminLibraryController.getRecentlyModified
);

// Obtener estadísticas globales
router.get(
  '/library/stats',
  // isAdmin,
  AdminLibraryController.getLibraryStats
);

// Obtener dependencias de un nodo
router.get(
  '/nodes/:nodeId/dependencies',
  // isAdmin,
  AdminLibraryController.getNodeDependencies
);

// Exportar nodos como JSON
router.post(
  '/library/export',
  // isAdmin,
  AdminLibraryController.exportNodes
);

// ===================================================
// 404 - Route not found
// ===================================================
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint no encontrado: ${req.method} ${req.originalUrl}`
  });
});

module.exports = router;
