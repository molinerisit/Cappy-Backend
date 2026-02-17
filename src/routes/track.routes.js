const express = require("express");
const router = express.Router();
const trackController = require("../controllers/track.controller");

router.get("/", trackController.getAllTracks);
router.get("/:id/tree", trackController.getTrackTree);

module.exports = router;
