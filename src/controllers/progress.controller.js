const UserProgress = require("../models/UserProgress.model");
const {
  getOrCreatePathProgress,
  completePathLesson
} = require("../services/progress.service");

exports.completeLesson = async (req, res) => {
  try {
    const { userId, lessonId, trackId } = req.body;

    if (!userId || !lessonId || !trackId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    let progress = await UserProgress.findOne({ userId, trackId });

    if (!progress) {
      progress = await UserProgress.create({ userId, trackId });
    }

    if (!progress.completedLessons.includes(lessonId)) {
      progress.completedLessons.push(lessonId);
      progress.xp += 10;
      await progress.save();
    }

    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPathProgress = async (req, res) => {
  try {
    const { pathId } = req.params;

    if (!pathId) {
      return res.status(400).json({ message: "Path id is required" });
    }

    const progress = await getOrCreatePathProgress(req.user._id, pathId);
    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.completePathLesson = async (req, res) => {
  try {
    const { lessonId } = req.body;

    if (!lessonId) {
      return res.status(400).json({ message: "Lesson id is required" });
    }

    const progress = await completePathLesson(req.user._id, lessonId);
    res.json(progress);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ message: error.message });
  }
};

exports.getProgress = async (req, res) => {
  try {
    const { userId, trackId } = req.params;

    const progress = await UserProgress.findOne({ userId, trackId });

    if (!progress) {
      return res.json({ xp: 0, completedLessons: [] });
    }

    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
