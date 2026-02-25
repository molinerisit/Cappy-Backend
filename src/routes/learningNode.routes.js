const express = require("express");
const router = express.Router();
const learningNodeController = require("../controllers/learningNode.controller");
const authMiddleware = require("../middleware/auth.middleware");
const checkLivesAvailable = require("../middleware/checkLivesAvailable");

// Public routes
// Get country's learning map (with status)
router.get("/country/:countryId", authMiddleware, learningNodeController.getCountryMap);

// Get single node details
router.get("/:nodeId", learningNodeController.getNode);

// Check if user can unlock this node
router.get("/:nodeId/unlock", authMiddleware, learningNodeController.checkNodeUnlock);

// Get nodes by type in a country
router.get("/type/:countryId/:type", learningNodeController.getNodesByType);

// Search nodes
router.get("/search/:countryId", learningNodeController.searchNodes);

// Protected routes (learner actions)
// Complete a node - REQUIRES LIVES
router.post("/complete", authMiddleware, checkLivesAvailable, learningNodeController.completeNode);
// Create node
router.post("/", authMiddleware, learningNodeController.createNode);

// Update node
router.put("/:nodeId", authMiddleware, learningNodeController.updateNode);

// Delete node
router.delete("/:nodeId", authMiddleware, learningNodeController.deleteNode);

module.exports = router;
