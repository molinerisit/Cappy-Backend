const Technique = require('../models/technique.model');

exports.getSkillTree = async (req, res) => {
  try {
    const techniques = await Technique.find();

    const userCompletedLessons = req.user.completedLessonsCount || 0;

    const tree = techniques.map(t => {
      const unlocked = userCompletedLessons >= t.unlockRequirement;

      return {
        id: t._id,
        name: t.name,
        difficulty: t.difficulty,
        estimatedTime: t.estimatedTime,
        unlockRequirement: t.unlockRequirement,
        unlocked
      };
    });

    res.json(tree);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
