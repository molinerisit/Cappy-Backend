const express = require("express");
const router = express.Router();
const recipeController = require("../controllers/recipe.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Public routes
router.get("/", recipeController.getAllRecipes); // Get all recipes (admin view)
router.get("/country/:countryId", recipeController.getRecipesByCountry);
router.get("/:recipeId", recipeController.getRecipe);
router.get("/:recipeId/unlock", authMiddleware, recipeController.checkRecipeUnlock);

// Protected routes (learner actions)
router.post("/complete", authMiddleware, recipeController.completeRecipe);

// Admin routes
router.post("/", authMiddleware, recipeController.createRecipe);
router.put("/:recipeId", authMiddleware, recipeController.updateRecipe);
router.delete("/:recipeId", authMiddleware, recipeController.deleteRecipe);

module.exports = router;
