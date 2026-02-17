const Path = require("../models/Path.model");
const Lesson = require("../models/lesson.model");
const { getOrCreatePathProgress } = require("../services/progress.service");

const normalizeSteps = (steps) => {
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps.map((step) => {
    if (typeof step === "string") {
      return step;
    }

    if (step && typeof step === "object" && step.instruction) {
      return step.instruction;
    }

    return String(step);
  });
};

exports.getPaths = async (req, res) => {
  try {
    const { type } = req.query;

    if (type && !["country", "goal"].includes(type)) {
      return res.status(400).json({ message: "Invalid path type" });
    }

    const filter = type ? { type } : {};
    const paths = await Path.find(filter).sort("difficultyOrder");

    res.json(paths);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPathById = async (req, res) => {
  try {
    const path = await Path.findById(req.params.id);

    if (!path) {
      return res.status(404).json({ message: "Path not found" });
    }

    res.json(path);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPathLessons = async (req, res) => {
  try {
    const { pathId } = req.params;

    const path = await Path.findById(pathId);
    if (!path) {
      return res.status(404).json({ message: "Path not found" });
    }

    const lessons = await Lesson.find({ pathId }).sort("order");
    const progress = await getOrCreatePathProgress(req.user._id, pathId);

    const completedSet = new Set(
      progress.completedLessons.map((id) => id.toString())
    );
    const unlockedSet = new Set(
      progress.unlockedLessons.map((id) => id.toString())
    );

    const payload = lessons.map((lesson) => {
      const lessonId = lesson._id.toString();
      let status = "locked";

      if (completedSet.has(lessonId)) {
        status = "completed";
      } else if (unlockedSet.has(lessonId)) {
        status = "unlocked";
      }

      return {
        id: lesson._id,
        title: lesson.title,
        description: lesson.description,
        order: lesson.order,
        xpReward: lesson.xpReward ?? lesson.xpAwarded ?? 0,
        ingredients: lesson.ingredients || [],
        steps: normalizeSteps(lesson.steps),
        nutrition: lesson.nutrition,
        tips: lesson.tips || [],
        isPremium: lesson.isPremium || false,
        status
      };
    });

    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
