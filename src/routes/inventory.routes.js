const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventory.controller");
const authMiddleware = require("../middleware/auth.middleware");

// All inventory routes require authentication
router.use(authMiddleware);

// Get user inventory
router.get("/", inventoryController.getInventory);

// Add item to inventory
router.post("/add", inventoryController.addToInventory);

// Remove item from inventory
router.post("/remove", inventoryController.removeFromInventory);

// Check if user has ingredients for a recipe
router.get("/:recipeId/check", inventoryController.checkRecipeIngredients);

// Use ingredients for recipe (consume them)
router.post("/use-for-recipe", inventoryController.useIngredientsForRecipe);

// Clear inventory (admin/debug)
router.post("/clear", inventoryController.clearInventory);

module.exports = router;
