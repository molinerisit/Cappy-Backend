const express = require("express");
const router = express.Router();
const pathController = require("../controllers/path.controller");
const authMiddleware = require("../middleware/auth.middleware");

router.get("/", pathController.getPaths);
router.get("/:id", pathController.getPathById);
router.get("/:pathId/lessons", authMiddleware, pathController.getPathLessons);

module.exports = router;
