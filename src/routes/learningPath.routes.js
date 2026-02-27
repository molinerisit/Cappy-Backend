const express = require("express");
const router = express.Router();
const learningPathController = require("../controllers/learningPath.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Public routes
// Get all paths (culinary + goals)
router.get("/", learningPathController.getAllPaths);

// Get country hub (recipes for a country)
router.get("/country/:countryId/hub", learningPathController.getCountryHub);

// Get single path with nodes
router.get("/:pathId", authMiddleware, learningPathController.getPath);

// Get paths by type
router.get("/type/:type", learningPathController.getPathsByType);

// Get goal paths
router.get("/goals/all", learningPathController.getGoalPaths);

// Admin routes
// Create path
router.post("/", authMiddleware, learningPathController.createPath);

// Update path
router.put("/:pathId", authMiddleware, learningPathController.updatePath);

// Add node to path
router.post("/:pathId/add-node", authMiddleware, learningPathController.addNodeToPath);

// Remove node from path
router.post("/:pathId/remove-node", authMiddleware, learningPathController.removeNodeFromPath);

// Delete path
router.delete("/:pathId", authMiddleware, learningPathController.deletePath);

module.exports = router;
