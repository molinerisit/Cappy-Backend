const express = require("express");
const router = express.Router();
const countryController = require("../controllers/country.controller");
const countriesController = require("../controllers/countries.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Gamification - countries visited through recipes (MUST BE BEFORE /:countryId routes)
router.post("/mark-visited", authMiddleware, countriesController.markCountryVisited);
router.get("/my-visited", authMiddleware, countriesController.getMyVisitedCountries);

// Public routes
router.get("/", countryController.getAllCountries);
router.get("/:countryId/hub", countryController.getCountryHub);
router.get("/:countryId/sections", countryController.getCountrySections);

// Protected routes (user progress)
router.get("/:countryId/progress", authMiddleware, countryController.getUserCountryProgress);
router.get("/:countryId", countryController.getCountry);

// Admin routes
router.post("/", authMiddleware, countryController.createCountry);
router.put("/:countryId", authMiddleware, countryController.updateCountry);
router.post("/:countryId/toggle-section", authMiddleware, countryController.toggleSection);
router.delete("/:countryId", authMiddleware, countryController.deleteCountry);

module.exports = router;
