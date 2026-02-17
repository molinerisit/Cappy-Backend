const Ingredient = require('../models/ingredient.model');
const Lesson = require('../models/lesson.model');
const { findBestTechnique } = require('../services/matching.service');
const { buildLesson } = require('../services/lessonBuilder.service');
const { updateProgress } = require('../services/progress.service');
const User = require('../models/user.model');

exports.generateLesson = async (req, res) => {
  try {
    const { timeLimit } = req.body;

    const pantry = await Ingredient.find({ user: req.user._id });

    if (pantry.length === 0) {
      return res.status(400).json({ message: "Pantry is empty" });
    }

    const userTimePreference = req.user.timePreference || 20;
    const technique = await findBestTechnique(
      req.user,
      pantry,
      timeLimit || userTimePreference
    );

    if (!technique) {
      return res.status(404).json({ message: "No suitable lesson found" });
    }

    const lessonData = buildLesson(technique, req.user);

    const lesson = await Lesson.create({
      user: req.user._id,
      technique: technique._id,
      ...lessonData
    });

    res.json({
      lessonId: lesson._id,
      title: lesson.title,
      technique: technique.name,
      estimatedTime: lesson.estimatedTime,
      steps: lesson.steps,
      xp: lesson.xpAwarded
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.completeLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    const user = await User.findById(req.user._id);

    updateProgress(user, lesson.xpAwarded);

    await user.save();

    res.json({
      xpTotal: user.xp,
      streak: user.streak,
      completedLessons: user.completedLessonsCount
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
