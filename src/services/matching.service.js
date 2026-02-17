const Technique = require("../models/technique.model");

exports.findBestTechnique = async (user, pantry, timeLimit) => {
  const techniques = await Technique.find();

  const pantryNames = pantry.map((i) => i.name.toLowerCase());

  const candidates = techniques.filter((t) => {
    const userCompletedLessons = user.completedLessonsCount || 0;
    const userSkillLevel = user.skillLevel || 1;

    if (userCompletedLessons < t.unlockRequirement) return false;
    if (t.difficulty > userSkillLevel) return false;
    if (t.estimatedTime > timeLimit) return false;
    if (!t.dietCompatibility.includes(user.dietType)) return false;

    return true;
  });

  let bestTechnique = null;
  let bestScore = 0;

  candidates.forEach((t) => {
    if (!t.compatibleIngredients || t.compatibleIngredients.length === 0) {
      return;
    }

    const matches = t.compatibleIngredients.filter((ing) =>
      pantryNames.includes(ing.toLowerCase()),
    );

    const matchPercentage = matches.length / t.compatibleIngredients.length;

    if (matchPercentage < 0.6) return;

    const score =
      matchPercentage * 0.6 +
      (2 - t.difficulty) * 0.2 +
      ((timeLimit - t.estimatedTime) / timeLimit) * 0.2;

    if (score > bestScore) {
      bestScore = score;
      bestTechnique = t;
    }
  });

  return bestTechnique;
};
