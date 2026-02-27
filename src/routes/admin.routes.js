const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware");
const isAdmin = require("../middleware/isAdmin");

const adminController = require("../controllers/admin.controller");

const cultureDisabled = (_req, res) => {
  return res.status(410).json({
    message: "El módulo de Cultura está deshabilitado",
    code: "CULTURE_DISABLED"
  });
};

router.use(auth, isAdmin);

// ==============================
// LEGACY ROUTES
// ==============================
router.post("/paths", adminController.createPath);
router.post("/lessons", adminController.createLesson);
router.put("/lessons/:id", adminController.updateLesson);
router.delete("/lessons/:id", adminController.deleteLesson);
router.put("/lessons/reorder", adminController.reorderLesson);
router.get("/paths/:pathId/lessons", adminController.getLessonsByPath);

// ==============================
// NEW LEARNING PATH ROUTES
// ==============================

// Get all paths (admin view)
router.get("/learning-paths", adminController.getAllLearningPaths);

// Create learning path
router.post("/learning-paths", adminController.createLearningPath);

// Update learning path
router.put("/learning-paths/:pathId", adminController.updateLearningPath);

// Delete learning path
router.delete("/learning-paths/:pathId", adminController.deleteLearningPath);

// ==============================
// LEARNING NODE ROUTES
// ==============================

// Get ALL nodes (global, for import)
router.get("/learning-nodes", adminController.getAllLearningNodes);

// Get nodes by path
router.get("/learning-paths/:pathId/nodes", adminController.getNodesByPath);

// Create learning node
router.post("/learning-nodes", adminController.createLearningNode);

// Update learning node
router.put("/learning-nodes/:nodeId", adminController.updateLearningNode);

// Delete learning node
router.delete("/learning-nodes/:nodeId", adminController.deleteLearningNode);

// Set required nodes (unlock logic)
router.post("/learning-nodes/:nodeId/required", adminController.setRequiredNodes);

// Reorder nodes in a path
router.post("/learning-paths/:pathId/reorder-nodes", adminController.reorderNodes);

// Import module (recipe, node) into a learning node
router.post("/learning-nodes/:nodeId/import-module", adminController.importModule);

// Remove module (recipe, node) from a learning node
router.post("/learning-nodes/:nodeId/remove-module", adminController.removeModule);

// ==============================
// CONTENT V2 ROUTES (Groups + Nodes)
// ==============================

router.get("/paths/:pathId/groups", adminController.getGroupsByPath);
router.post("/paths/:pathId/groups", adminController.createGroup);
router.put("/groups/:groupId", adminController.updateGroup);
router.delete("/groups/:groupId", adminController.deleteGroup);

router.get("/paths/:pathId/nodes", adminController.getNodesByPathV2);
router.post("/nodes", adminController.createNodeV2);
router.put("/nodes/:nodeId", adminController.updateNodeV2);
router.delete("/nodes/:nodeId", adminController.deleteNodeV2);
router.post("/paths/:pathId/nodes/reorder", adminController.reorderNodesV2);
router.post("/nodes/import", adminController.importNodeV2);
router.put("/nodes/:nodeId/archive", adminController.archiveNodeV2);
router.post("/nodes/:nodeId/duplicate", adminController.duplicateNodeV2);
router.get("/nodes/:nodeId/relations", adminController.getNodeRelations);

router.get("/node-library", adminController.listNodeLibrary);

router.post("/nodes/:nodeId/steps", adminController.addNodeStep);
router.put("/nodes/:nodeId/steps/:stepId", adminController.updateNodeStep);
router.delete("/nodes/:nodeId/steps/:stepId", adminController.deleteNodeStep);

router.post(
	"/nodes/:nodeId/steps/:stepId/cards",
	adminController.addStepCard
);
router.put(
	"/nodes/:nodeId/steps/:stepId/cards/:cardId",
	adminController.updateStepCard
);
router.delete(
	"/nodes/:nodeId/steps/:stepId/cards/:cardId",
	adminController.deleteStepCard
);

// ==============================
// CULTURE ROUTES (DISABLED)
// ==============================

// Get all culture content (disabled)
router.get("/culture", cultureDisabled);

// Get culture by country (disabled)
router.get("/culture/country/:countryId", cultureDisabled);

// Create culture content (disabled)
router.post("/culture", cultureDisabled);

// Update culture content (disabled)
router.put("/culture/:cultureId", cultureDisabled);

// Delete culture content (disabled)
router.delete("/culture/:cultureId", cultureDisabled);

// Add step to culture (disabled)
router.post("/culture/:cultureId/steps", cultureDisabled);

// Update culture step (disabled)
router.put("/culture/:cultureId/steps/:stepId", cultureDisabled);

// Delete culture step (disabled)
router.delete("/culture/:cultureId/steps/:stepId", cultureDisabled);

// ==============================
// RECIPES BY COUNTRY (for PathContentScreen)
// ==============================

// List recipes by country
router.get("/countries/:countryId/recipes", adminController.listRecipesByCountry);

// Get recipe details
router.get("/recipes/:recipeId", adminController.getRecipeDetails);

// List recipes by country (consistent with client API)
router.get("/recipes/country/:countryId", adminController.listRecipesByCountry);

// ==============================
// CULTURE NODES BY COUNTRY (DISABLED)
// ==============================

// List culture nodes by country (disabled)
router.get("/countries/:countryId/culture-nodes", cultureDisabled);

// List culture by country (disabled)
router.get("/culture/country/:countryId", cultureDisabled);

// ==============================
// COUNTRIES ROUTES (ADMIN)
// ==============================
const countryController = require("../controllers/country.controller");

// Get all countries (admin view)
router.get("/countries", countryController.getAllCountries);

// Get countries paginated with filters (admin view)
router.get("/countries/paginated", countryController.getCountriesPaginated);

// Get unlock group options for country rules
router.get("/countries/unlock-groups", countryController.getUnlockGroupOptions);

// Create country
router.post("/countries", countryController.createCountry);

// Update country
router.put("/countries/:countryId", countryController.updateCountry);

// Delete country
router.delete("/countries/:countryId", countryController.deleteCountry);

// ==============================
// DEBUG ENDPOINT
// ==============================
router.get("/debug/path-nodes/:pathId", async (req, res) => {
  try {
    const LearningNode = require('../models/LearningNode.model');
    const LearningPath = require('../models/LearningPath.model');
    const { pathId } = req.params;

    // Check path exists
    const path = await LearningPath.findById(pathId).select('_id title nodes');
    if (!path) return res.status(404).json({ error: 'Path not found' });

    // Get ALL nodes for this path (regardless of isDeleted or groupId)
    const allNodes = await LearningNode.find({ pathId }).select('_id title pathId groupId isDeleted');
    
    // Get ONLY nodes in path.nodes array
    const linkedNodes = await LearningNode.find({ _id: { $in: path.nodes || [] } }).select('_id title');

    res.json({
      pathId,
      pathTitle: path.title,
      linkedInPath: path.nodes?.length || 0,
      totalWithPathId: allNodes.length,
      linkedData: linkedNodes,
      allData: allNodes,
      summary: {
        "nodes_in_path.nodes_array": path.nodes?.length || 0,
        "nodes_with_matching_pathId": allNodes.length,
        "deleted_nodes": allNodes.filter(n => n.isDeleted).length,
        "active_nodes": allNodes.filter(n => !n.isDeleted).length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
