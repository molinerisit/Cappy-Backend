const DAY_MS = 1000 * 60 * 60 * 24;

const toUtcDayStart = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

const getDiffDaysUtc = (previousDate, currentDate) => {
  if (!previousDate) return null;

  const prevDayStart = toUtcDayStart(previousDate);
  const currentDayStart = toUtcDayStart(currentDate);

  return Math.floor((currentDayStart - prevDayStart) / DAY_MS);
};

const calculateNextStreak = (currentStreak, lastActivityAt, now = new Date()) => {
  const streakValue = Number.isFinite(Number(currentStreak))
    ? Math.max(0, Number(currentStreak))
    : 0;

  const diffDays = getDiffDaysUtc(lastActivityAt, now);

  if (diffDays === null) {
    return 1;
  }

  if (diffDays === 0) {
    return streakValue;
  }

  if (diffDays === 1) {
    return streakValue + 1;
  }

  return 1;
};

const applyUserDailyStreak = (user, now = new Date()) => {
  user.streak = calculateNextStreak(user.streak, user.lastLessonDate, now);
  user.lastLessonDate = now;
  return user.streak;
};

const applyProgressDailyStreak = (progress, now = new Date()) => {
  progress.streak = calculateNextStreak(progress.streak, progress.lastCompletedAt, now);
  progress.lastCompletedAt = now;
  return progress.streak;
};

module.exports = {
  calculateNextStreak,
  applyUserDailyStreak,
  applyProgressDailyStreak,
};