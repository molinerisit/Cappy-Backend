const Recipe = require("../models/Recipe.model");
const Country = require("../models/Country.model");
const UserProgress = require("../models/UserProgress.model");
const User = require('../models/user.model');
const UploadAsset = require('../models/UploadAsset.model');
const {
  applyProgressDailyStreak,
  applyUserDailyStreak,
} = require('../services/streak.service');

const isCloudinaryUrl = (value) => {
  try {
    const parsed = new URL(String(value || '').trim());
    return parsed.protocol === 'https:' && parsed.hostname === 'res.cloudinary.com';
  } catch (_error) {
    return false;
  }
};

const resolveMediaUrl = async ({ imageUrl, imageAssetId }) => {
  if (imageUrl) {
    return String(imageUrl).trim() || undefined;
  }
  if (!imageAssetId) return undefined;
  const asset = await UploadAsset.findById(imageAssetId).select('url').lean();
  return asset?.url ?? undefined;
};

// Keep old name as alias so existing calls don't break
const resolveRecipeImageUrl = resolveMediaUrl;

// Auto-fill id and order on steps that are missing them
const normalizeSteps = (steps) => {
  if (!Array.isArray(steps)) return [];
  return steps.map((s, i) => ({
    ...s,
    id: s.id || `step_${i + 1}`,
    order: s.order ?? i + 1,
  }));
};

// ==============================
// GET RECIPES BY COUNTRY
// ==============================
exports.getRecipesByCountry = async (req, res) => {
  try {
    const { countryId } = req.params;

    const country = await Country.findById(countryId);
    if (!country) {
      return res.status(404).json({ message: "País no encontrado" });
    }

    const recipes = await Recipe.find({ countryId }).sort({ createdAt: -1 });

    res.json(recipes);
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } });
  }
};

// ==============================
// GET SINGLE RECIPE
// ==============================
exports.getRecipe = async (req, res) => {
  try {
    const { recipeId } = req.params;

    const recipe = await Recipe.findById(recipeId)
      .populate('requiredSkills')
      .populate('requiredRecipes');

    if (!recipe) {
      return res.status(404).json({ message: "Receta no encontrada" });
    }

    res.json(recipe);
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } });
  }
};

// ==============================
// GET ALL RECIPES (Admin)
// ==============================
exports.getAllRecipes = async (req, res) => {
  try {
    const recipes = await Recipe.find()
      .populate('countryId', 'name code icon')
      .populate('requiredSkills', 'name')
      .sort({ createdAt: -1 });

    res.json(recipes);
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } });
  }
};

// ==============================
// CHECK RECIPE UNLOCK STATUS
// ==============================
exports.checkRecipeUnlock = async (req, res) => {
  try {
    const { recipeId } = req.params;
    const userId = req.user.id;

    const recipe = await Recipe.findById(recipeId)
      .populate('requiredSkills')
      .populate('requiredRecipes');

    if (!recipe) {
      return res.status(404).json({ message: "Receta no encontrada" });
    }

    const userProgress = await UserProgress.findOne({ userId });
    if (!userProgress) {
      return res.status(404).json({ message: "Progreso no encontrado" });
    }

    // Check if user has completed required skills
    const learnedSkillIds = userProgress.learnedSkills.map(s => s.skillId.toString());
    const requiredSkillsMet = recipe.requiredSkills.every(skill => 
      learnedSkillIds.includes(skill._id.toString())
    );

    // Check if user has completed required recipes
    const completedRecipeIds = userProgress.completedRecipes.map(r => r.recipeId.toString());
    const requiredRecipesMet = recipe.requiredRecipes.every(recipe => 
      completedRecipeIds.includes(recipe._id.toString())
    );

    const isUnlocked = requiredSkillsMet && requiredRecipesMet;

    res.json({
      isUnlocked,
      requiredSkillsMet,
      requiredRecipesMet,
      missingSkills: recipe.requiredSkills.filter(s => 
        !learnedSkillIds.includes(s._id.toString())
      ),
      missingRecipes: recipe.requiredRecipes.filter(r => 
        !completedRecipeIds.includes(r._id.toString())
      )
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } });
  }
};

// ==============================
// COMPLETE RECIPE
// ==============================
exports.completeRecipe = async (req, res) => {
  try {
    const { recipeId } = req.body;
    const userId = req.user.id;

    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(404).json({ message: "Receta no encontrada" });
    }

    let userProgress = await UserProgress.findOne({ userId });
    if (!userProgress) {
      userProgress = new UserProgress({ userId, xp: 0, level: 1 });
    }

    // Check if already completed
    const alreadyCompleted = userProgress.completedRecipes.find(r => 
      r.recipeId.toString() === recipeId
    );

    const completionNow = new Date();

    if (!alreadyCompleted) {
      userProgress.completedRecipes.push({
        recipeId,
        completedAt: completionNow,
        attempts: 1
      });

      // Award XP
      userProgress.xp += recipe.xpReward;
    } else {
      alreadyCompleted.attempts += 1;
    }

    applyProgressDailyStreak(userProgress, completionNow);

    // Check level up (every 100 XP = 1 level)
    const newLevel = Math.floor(userProgress.xp / 100) + 1;
    if (newLevel > userProgress.level) {
      userProgress.level = newLevel;
    }

    await userProgress.save();

    const user = await User.findById(userId);
    if (user) {
      user.totalXP = (user.totalXP || 0) + recipe.xpReward;
      user.level = Math.floor(user.totalXP / 100) + 1;
      applyUserDailyStreak(user, completionNow);
      await user.save();
    }

    res.json({
      message: "Receta completada",
      xpEarned: recipe.xpReward,
      totalXp: userProgress.xp,
      level: userProgress.level,
      streak: user?.streak || userProgress.streak || 0,
      totalXP: user?.totalXP || 0,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } });
  }
};

// ==============================
// CREATE RECIPE (Admin)
// ==============================
exports.createRecipe = async (req, res) => {
  try {
    const {
      countryId,
      title,
      description,
      imageUrl,
      videoUrl,
      imageAssetId,
      difficulty,
      xpReward,
      servings,
      prepTime,
      cookTime,
      ingredients,
      tools,
      steps,
      requiredSkills,
      requiredRecipes,
      nutrition,
      tips,
      tags,
      isPremium
    } = req.body;

    if (!countryId || !title) {
      return res.status(400).json({ message: 'countryId y title son obligatorios' });
    }

    const country = await Country.findById(countryId);
    if (!country) {
      return res.status(404).json({ message: 'País no encontrado' });
    }

    const resolvedImageUrl = await resolveMediaUrl({ imageUrl, imageAssetId });

    const recipe = await Recipe.create({
      countryId,
      title,
      description,
      imageUrl: resolvedImageUrl,
      videoUrl: videoUrl || undefined,
      difficulty: difficulty || 2,
      xpReward: xpReward || 50,
      servings,
      prepTime,
      cookTime,
      ingredients: ingredients || [],
      tools: tools || [],
      steps: normalizeSteps(steps),
      requiredSkills: requiredSkills || [],
      requiredRecipes: requiredRecipes || [],
      nutrition: nutrition || {},
      tips: tips || [],
      tags: tags || [],
      isPremium: isPremium || false
    });

    res.status(201).json(recipe);
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } });
  }
};

// ==============================
// UPDATE RECIPE (Admin)
// ==============================
exports.updateRecipe = async (req, res) => {
  try {
    const { recipeId } = req.params;
    const updates = { ...req.body };

    if (updates.imageUrl !== undefined || updates.imageAssetId) {
      updates.imageUrl = await resolveMediaUrl({
        imageUrl: updates.imageUrl,
        imageAssetId: updates.imageAssetId,
      });
    }
    delete updates.imageAssetId;

    if (updates.steps) {
      updates.steps = normalizeSteps(updates.steps);
    }

    const recipe = await Recipe.findByIdAndUpdate(recipeId, updates, {
      new: true,
      runValidators: true
    });

    if (!recipe) {
      return res.status(404).json({ message: "Receta no encontrada" });
    }

    res.json(recipe);
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } });
  }
};

// ==============================
// DELETE RECIPE (Admin)
// ==============================
exports.deleteRecipe = async (req, res) => {
  try {
    const { recipeId } = req.params;

    const recipe = await Recipe.findByIdAndDelete(recipeId);
    if (!recipe) {
      return res.status(404).json({ message: "Receta no encontrada" });
    }

    res.json({ message: "Receta eliminada" });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } });
  }
};
