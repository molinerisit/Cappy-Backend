const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware");
const isAdmin = require("../middleware/isAdmin");

const adminController = require("../controllers/admin.controller");

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

// ==============================
// CULTURE ROUTES
// ==============================

// Get all culture content
router.get("/culture", adminController.getAllCulture);

// Get culture by country
router.get("/culture/country/:countryId", adminController.getCultureByCountry);

// Create culture content
router.post("/culture", adminController.createCulture);

// Update culture content
router.put("/culture/:cultureId", adminController.updateCulture);

// Delete culture content
router.delete("/culture/:cultureId", adminController.deleteCulture);

// Add step to culture
router.post("/culture/:cultureId/steps", adminController.addCultureStep);

// Update culture step
router.put("/culture/:cultureId/steps/:stepId", adminController.updateCultureStep);

// Delete culture step
router.delete("/culture/:cultureId/steps/:stepId", adminController.deleteCultureStep);

module.exports = router;
