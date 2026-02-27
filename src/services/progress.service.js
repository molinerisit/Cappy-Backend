const UserProgress = require("../models/UserProgress.model");
const Lesson = require("../models/lesson.model");
const {
  calculateNextStreak,
  applyUserDailyStreak,
  applyProgressDailyStreak,
} = require('./streak.service');

const calculateLevel = (xp) => Math.floor(xp / 100) + 1;

const getFirstLessonForPath = async (pathId) => {
  return Lesson.findOne({ pathId }).sort("order");
};

const getOrCreatePathProgress = async (userId, pathId) => {
  let progress = await UserProgress.findOne({ userId, pathId });

  if (!progress) {
    progress = new UserProgress({
      userId,
      pathId,
      unlockedLessons: [],
      completedLessons: [],
      xp: 0,
      level: 1,
      streak: 0
    });

    const firstLesson = await getFirstLessonForPath(pathId);
    if (firstLesson) {
      progress.unlockedLessons.push(firstLesson._id);
    }

    await progress.save();
  }

  if (!progress.level) {
    progress.level = calculateLevel(progress.xp || 0);
    await progress.save();
  }

  return progress;
};

const completePathLesson = async (userId, lessonId) => {
  const lesson = await Lesson.findById(lessonId);

  if (!lesson || !lesson.pathId) {
    const error = new Error("Lesson not found");
    error.statusCode = 404;
    throw error;
  }

  const pathId = lesson.pathId.toString();
  const progress = await getOrCreatePathProgress(userId, pathId);

  const isUnlocked = progress.unlockedLessons.some(
    (id) => id.toString() === lessonId.toString()
  );

  if (!isUnlocked) {
    const error = new Error("Lesson is locked");
    error.statusCode = 403;
    throw error;
  }

  const isAlreadyCompleted = progress.completedLessons.some(
    (id) => id.toString() === lessonId.toString()
  );

  const xpGained = lesson.xpReward ?? lesson.xpAwarded ?? 0;
  const now = new Date();

  // Add to completed lessons only if not already completed (track first completion)
  if (!isAlreadyCompleted) {
    progress.completedLessons.push(lesson._id);
  }
  
  // Always award XP even on repeat completions
  progress.xp += xpGained;
  applyProgressDailyStreak(progress, now);
  progress.level = calculateLevel(progress.xp);

  // Unlock next lesson only on first completion
  if (!isAlreadyCompleted && typeof lesson.order === "number") {
    const nextLesson = await Lesson.findOne({
      pathId: lesson.pathId,
      order: { $gt: lesson.order }
    }).sort("order");

    if (nextLesson) {
      const alreadyUnlocked = progress.unlockedLessons.some(
        (id) => id.toString() === nextLesson._id.toString()
      );

      if (!alreadyUnlocked) {
        progress.unlockedLessons.push(nextLesson._id);
      }
    }
  }

  await progress.save();
  return progress;
};

exports.updateProgress = (user, xpGained) => {
  const today = new Date();

  user.xp += xpGained;
  user.completedLessonsCount += 1;

  applyUserDailyStreak(user, today);

  return user;
};

exports.updateStreak = calculateNextStreak;

exports.getOrCreatePathProgress = getOrCreatePathProgress;
exports.completePathLesson = completePathLesson;
