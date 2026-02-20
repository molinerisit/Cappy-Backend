const UserProgress = require("../models/UserProgress.model");
const Lesson = require("../models/lesson.model");

const DAY_MS = 1000 * 60 * 60 * 24;

const calculateLevel = (xp) => Math.floor(xp / 100) + 1;

const updateStreak = (currentStreak, lastCompletedAt, now) => {
  if (!lastCompletedAt) {
    return 1;
  }

  const diffDays = Math.floor((now - new Date(lastCompletedAt)) / DAY_MS);

  if (diffDays === 1) {
    return currentStreak + 1;
  }

  if (diffDays > 1) {
    return 1;
  }

  return currentStreak;
};

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
  progress.streak = updateStreak(progress.streak, progress.lastCompletedAt, now);
  progress.lastCompletedAt = now;
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
  const lastDate = user.lastLessonDate;

  user.xp += xpGained;
  user.completedLessonsCount += 1;

  if (!lastDate) {
    user.streak = 1;
  } else {
    const diffDays = Math.floor(
      (today - new Date(lastDate)) / DAY_MS
    );

    if (diffDays === 1) {
      user.streak += 1;
    } else if (diffDays > 1) {
      user.streak = 1;
    }
  }

  user.lastLessonDate = today;

  return user;
};

exports.getOrCreatePathProgress = getOrCreatePathProgress;
exports.completePathLesson = completePathLesson;
