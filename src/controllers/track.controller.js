const Track = require("../models/Track.model");
const Unit = require("../models/Unit.model");
const Skill = require("../models/Skill.model");
const Lesson = require("../models/lesson.model");

exports.getAllTracks = async (req, res) => {
  try {
    const tracks = await Track.find().sort("order");
    res.json(tracks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTrackTree = async (req, res) => {
  try {
    const { id } = req.params;

    const track = await Track.findById(id);
    if (!track) {
      return res.status(404).json({ message: "Track not found" });
    }

    const units = await Unit.find({ trackId: id }).sort("order");

    const tree = [];

    for (let unit of units) {
      const skills = await Skill.find({ unitId: unit._id }).sort("order");

      const skillData = [];

      for (let skill of skills) {
        const lessons = await Lesson.find({ skillId: skill._id });

        skillData.push({
          ...skill.toObject(),
          lessons
        });
      }

      tree.push({
        ...unit.toObject(),
        skills: skillData
      });
    }

    res.json({ track, tree });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};