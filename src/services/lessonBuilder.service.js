exports.buildLesson = (technique, user) => {

  const steps = technique.stepsTemplate.map(step => ({
    order: step.order,
    instruction: step.instruction,
    timer: step.timer
  }));

  const xp =
    10 +
    (technique.difficulty * 5) +
    (technique.estimatedTime / 5);

  return {
    title: technique.name + " Lesson",
    estimatedTime: technique.estimatedTime,
    steps,
    xpAwarded: Math.round(xp)
  };
};
