const express = require("express");
const router = express.Router();
const skillController = require("../controllers/skill.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Public routes
router.get("/tree/:countryId", skillController.getSkillTree);
router.get("/:skillId", skillController.getSkill);
router.get("/:skillId/unlock", authMiddleware, skillController.checkSkillUnlock);

// Protected routes (learner actions)
router.post("/learn", authMiddleware, skillController.learnSkill);
router.post("/:skillId/progress", authMiddleware, skillController.updateSkillProgress);

// Admin routes
router.post("/", authMiddleware, skillController.createSkill);
router.put("/:skillId", authMiddleware, skillController.updateSkill);
router.delete("/:skillId", authMiddleware, skillController.deleteSkill);

module.exports = router;
