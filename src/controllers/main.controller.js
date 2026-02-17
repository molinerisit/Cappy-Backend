const Country = require('../models/Country.model');
const LearningPath = require('../models/LearningPath.model');
const LearningNode = require('../models/LearningNode.model');
const UserProgress = require('../models/UserProgress.model');
const User = require('../models/user.model');

// ========================================
// GET ALL COUNTRIES (Experiencia Culinaria)
// ========================================
exports.getAllCountries = async (req, res) => {
  try {
    const countries = await Country.find({ isActive: true })
      .select('name code icon description order isPremium')
      .sort('order');

    res.json(countries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========================================
// GET COUNTRY HUB (Recipes + Culture tabs)
// ========================================
exports.getCountryHub = async (req, res) => {
  try {
    const { countryId } = req.params;
    const userId = req.user?.id;

    const country = await Country.findById(countryId);
    if (!country) {
      return res.status(404).json({ message: 'País no encontrado' });
    }

    // Get both paths for this country
    const recipePath = await LearningPath.findOne({
      countryId,
      type: 'country_recipe',
      isActive: true
    }).populate('nodes');

    const culturePath = await LearningPath.findOne({
      countryId,
      type: 'country_culture',
      isActive: true
    }).populate('nodes');

    // Get user progress for both paths (if authenticated)
    let recipeProgress = null;
    let cultureProgress = null;

    if (userId) {
      if (recipePath) {
        recipeProgress = await UserProgress.findOne({
          userId,
          pathId: recipePath._id
        });
      }
      if (culturePath) {
        cultureProgress = await UserProgress.findOne({
          userId,
          pathId: culturePath._id
        });
      }
    }

    // Build response with node statuses
    const response = {
      country: {
        id: country._id,
        name: country.name,
        icon: country.icon,
        description: country.description,
        isPremium: country.isPremium
      },
      recipes: null,
      culture: null
    };

    // Process recipe path
    if (recipePath) {
      const unlockedIds = recipeProgress?.unlockedLessons || [];
      const completedIds = recipeProgress?.completedLessons || [];

      response.recipes = {
        pathId: recipePath._id,
        title: recipePath.title,
        description: recipePath.description,
        nodes: recipePath.nodes.map(node => ({
          ...node.toObject(),
          status: completedIds.includes(node._id.toString())
            ? 'completed'
            : unlockedIds.includes(node._id.toString())
            ? 'unlocked'
            : 'locked'
        }))
      };
    }

    // Process culture path
    if (culturePath) {
      const unlockedIds = cultureProgress?.unlockedLessons || [];
      const completedIds = cultureProgress?.completedLessons || [];

      response.culture = {
        pathId: culturePath._id,
        title: culturePath.title,
        description: culturePath.description,
        nodes: culturePath.nodes.map(node => ({
          ...node.toObject(),
          status: completedIds.includes(node._id.toString())
            ? 'completed'
            : unlockedIds.includes(node._id.toString())
            ? 'unlocked'
            : 'locked'
        }))
      };
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========================================
// GET ALL GOAL PATHS (Seguir Objetivos)
// ========================================
exports.getGoalPaths = async (req, res) => {
  try {
    const userId = req.user?.id;

    const goalPaths = await LearningPath.find({
      type: 'goal',
      isActive: true
    })
      .populate('nodes')
      .sort('order');

    // If user is authenticated, get progress
    const response = [];
    for (const path of goalPaths) {
      let progress = null;
      if (userId) {
        progress = await UserProgress.findOne({
          userId,
          pathId: path._id
        });
      }

      const unlockedIds = progress?.unlockedLessons || [];
      const completedIds = progress?.completedLessons || [];

      response.push({
        _id: path._id,
        goalType: path.goalType,
        title: path.title,
        description: path.description,
        icon: path.icon,
        isPremium: path.isPremium,
        totalNodes: path.nodes.length,
        completedNodes: completedIds.length,
        nodes: path.nodes.map(node => ({
          ...node.toObject(),
          status: completedIds.includes(node._id.toString())
            ? 'completed'
            : unlockedIds.includes(node._id.toString())
            ? 'unlocked'
            : 'locked'
        }))
      });
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========================================
// GET PATH WITH NODES (Generic)
// ========================================
exports.getPathWithNodes = async (req, res) => {
  try {
    const { pathId } = req.params;
    const userId = req.user?.id;

    const path = await LearningPath.findById(pathId).populate('nodes');
    if (!path) {
      return res.status(404).json({ message: 'Path no encontrado' });
    }

    // Get user progress
    let progress = null;
    if (userId) {
      progress = await UserProgress.findOne({ userId, pathId });
    }

    const unlockedIds = progress?.unlockedLessons || [];
    const completedIds = progress?.completedLessons || [];

    const response = {
      ...path.toObject(),
      nodes: path.nodes.map(node => ({
        ...node.toObject(),
        status: completedIds.includes(node._id.toString())
          ? 'completed'
          : unlockedIds.includes(node._id.toString())
          ? 'unlocked'
          : 'locked'
      }))
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========================================
// COMPLETE NODE (Progression Logic)
// ========================================
exports.completeNode = async (req, res) => {
  try {
    const { nodeId } = req.body;
    const userId = req.user.id;

    // 1. Verify node exists
    const node = await LearningNode.findById(nodeId);
    if (!node) {
      return res.status(404).json({ message: 'Nodo no encontrado' });
    }

    // 2. Verify path exists
    const path = await LearningPath.findById(node.pathId);
    if (!path) {
      return res.status(404).json({ message: 'Path no encontrado' });
    }

    // 3. Get or create user progress
    let progress = await UserProgress.findOne({
      userId,
      pathId: node.pathId
    });

    if (!progress) {
      // First time user accesses this path
      progress = await UserProgress.create({
        userId,
        pathId: node.pathId,
        unlockedLessons: [node._id],
        completedLessons: [],
        streak: 0
      });
    }

    // 4. Verify node is unlocked
    const isUnlocked = progress.unlockedLessons.some(
      id => id.toString() === nodeId
    );
    if (!isUnlocked) {
      return res.status(403).json({ message: 'Nodo bloqueado' });
    }

    // 5. Verify node is not already completed
    const isCompleted = progress.completedLessons.some(
      id => id.toString() === nodeId
    );
    if (isCompleted) {
      return res.status(400).json({ message: 'Nodo ya completado' });
    }

    // 6. Mark as completed
    progress.completedLessons.push(node._id);
    progress.lastCompletedAt = new Date();

    // 7. Update streak
    const now = new Date();
    const lastCompleted = progress.lastCompletedAt;
    const hoursSinceLastCompleted = lastCompleted
      ? (now - lastCompleted) / 1000 / 60 / 60
      : 999;

    if (hoursSinceLastCompleted < 48) {
      progress.streak += 1;
    } else {
      progress.streak = 1;
    }

    // 8. Unlock next node(s) by order
    const allNodes = await LearningNode.find({ pathId: node.pathId }).sort('order');
    const currentNodeIndex = allNodes.findIndex(n => n._id.toString() === nodeId);
    
    if (currentNodeIndex < allNodes.length - 1) {
      const nextNode = allNodes[currentNodeIndex + 1];
      // Check if all required nodes are completed
      const requiredCompleted = nextNode.requiredNodes.every(reqId =>
        progress.completedLessons.some(id => id.toString() === reqId.toString())
      );

      if (requiredCompleted) {
        const alreadyUnlocked = progress.unlockedLessons.some(
          id => id.toString() === nextNode._id.toString()
        );
        if (!alreadyUnlocked) {
          progress.unlockedLessons.push(nextNode._id);
        }
      }
    }

    await progress.save();

    // 9. Add XP to user (GLOBAL)
    const user = await User.findById(userId);
    user.totalXP += node.xpReward;
    user.level = Math.floor(user.totalXP / 100) + 1;
    await user.save();

    // 10. Return updated data
    res.json({
      message: 'Nodo completado',
      xpEarned: node.xpReward,
      totalXP: user.totalXP,
      level: user.level,
      progress: {
        completedLessons: progress.completedLessons,
        unlockedLessons: progress.unlockedLessons,
        streak: progress.streak
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========================================
// GET USER PROGRESS FOR PATH
// ========================================
exports.getPathProgress = async (req, res) => {
  try {
    const { pathId } = req.params;
    const userId = req.user.id;

    const progress = await UserProgress.findOne({ userId, pathId });
    if (!progress) {
      return res.json({
        pathId,
        unlockedLessons: [],
        completedLessons: [],
        streak: 0
      });
    }

    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========================================
// GET GLOBAL RANKING
// ========================================
exports.getGlobalRanking = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    const ranking = await User.find()
      .select('name totalXP level')
      .sort('-totalXP')
      .limit(limit);

    res.json(ranking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
