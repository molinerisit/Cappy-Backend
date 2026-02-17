const express = require("express");
const router = express.Router();
const countryController = require("../controllers/country.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Public routes
router.get("/", countryController.getAllCountries);
router.get("/:countryId", countryController.getCountry);
router.get("/:countryId/sections", countryController.getCountrySections);

// Protected routes (user progress)
router.get("/:countryId/progress", authMiddleware, countryController.getUserCountryProgress);

// Admin routes
router.post("/", authMiddleware, countryController.createCountry);
router.put("/:countryId", authMiddleware, countryController.updateCountry);
router.post("/:countryId/toggle-section", authMiddleware, countryController.toggleSection);
router.delete("/:countryId", authMiddleware, countryController.deleteCountry);

module.exports = router;
