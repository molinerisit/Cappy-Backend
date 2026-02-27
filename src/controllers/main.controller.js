const Country = require('../models/Country.model');
const LearningPath = require('../models/LearningPath.model');
const LearningNode = require('../models/LearningNode.model');
const UserProgress = require('../models/UserProgress.model');
const User = require('../models/user.model');
const Recipe = require('../models/Recipe.model');
const Culture = require('../models/Culture.model');
const {
  getOrCreateNodeProgress,
  getNextNodeForPath,
  syncUnlockState,
} = require('../services/nodeProgress.service');
const {
  getCatalogCacheKey,
  getCachedCatalogResponse,
  setCachedCatalogResponse,
} = require('../services/catalogCache.service');

// ========================================
// GET ALL COUNTRIES (Experiencia Culinaria)
// ========================================
exports.getAllCountries = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const rawLimit = parseInt(req.query.limit, 10) || 20;
    const limit = Math.min(Math.max(rawLimit, 1), 100);
    const skip = (page - 1) * limit;
    const cacheKey = getCatalogCacheKey('countries', page, limit);

    const cachedResponse = getCachedCatalogResponse(cacheKey);
    if (cachedResponse) {
      res.set('Cache-Control', 'public, max-age=60');
      return res.json(cachedResponse);
    }

    const filter = { isActive: true };

    const [total, countries] = await Promise.all([
      Country.countDocuments(filter),
      Country.find(filter)
        .select('name code icon description order isPremium')
        .sort({ order: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const response = {
      data: countries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
        hasMore: skip + countries.length < total
      }
    };

    setCachedCatalogResponse(cacheKey, response);
    res.set('Cache-Control', 'public, max-age=60');
    res.json(response);
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

    // Get or create recipe path for this country
    let recipePath = await LearningPath.findOne({
      countryId,
      type: 'country_recipe',
      isActive: true
    }).populate('nodes');

    // Auto-create recipe path if it doesn't exist
    if (!recipePath) {
      recipePath = await LearningPath.create({
        type: 'country_recipe',
        countryId,
        title: `Recetas de ${country.name}`,
        description: `Aprende a cocinar los platos típicos de ${country.name}`,
        icon: '🍽️',
        order: 1,
        nodes: [],
        metadata: {
          totalSteps: 0,
          estimatedDuration: 0,
          difficulty: 'intermediate'
        },
        isActive: true,
        isPremium: country.isPremium || false
      });
      console.log(`✓ Auto-created recipe path for ${country.name}`);
    }

    // Get or create culture path for this country
    let culturePath = await LearningPath.findOne({
      countryId,
      type: 'country_culture',
      isActive: true
    }).populate('nodes');

    // Auto-create culture path if it doesn't exist
    if (!culturePath) {
      culturePath = await LearningPath.create({
        type: 'country_culture',
        countryId,
        title: `Cultura de ${country.name}`,
        description: `Descubre la historia y tradiciones culinarias de ${country.name}`,
        icon: '📚',
        order: 2,
        nodes: [],
        metadata: {
          totalSteps: 0,
          estimatedDuration: 0,
          difficulty: 'easy'
        },
        isActive: true,
        isPremium: country.isPremium || false
      });
      console.log(`✓ Auto-created culture path for ${country.name}`);
    }

    // Get user progress for both paths (if authenticated)
    let recipeProgress = null;
    let cultureProgress = null;

    if (userId) {
      if (recipePath) {
        recipeProgress = await getOrCreateNodeProgress(
          userId,
          recipePath._id
        );
      }
      if (culturePath) {
        cultureProgress = await getOrCreateNodeProgress(
          userId,
          culturePath._id
        );
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

      // If path has no nodes, load recipes as virtual nodes
      let nodesData = recipePath.nodes || [];
      
      if (nodesData.length === 0) {
        const recipes = await Recipe.find({ countryId }).sort({ createdAt: 1 });
        nodesData = recipes.map((recipe, index) => ({
          _id: recipe._id,
          title: recipe.title,
          description: recipe.description || `Aprende a preparar ${recipe.title}`,
          type: 'lesson',
          difficulty: recipe.difficulty || 2,
          xpReward: recipe.xpReward || 50,
          order: index + 1,
          steps: recipe.steps || [],
          // Mark first recipe as active, rest locked
          status: index === 0 ? 'active' : 'locked'
        }));
      } else {
        nodesData = nodesData.map(node => ({
          ...node.toObject(),
          status: completedIds.includes(node._id.toString())
            ? 'completed'
            : unlockedIds.includes(node._id.toString())
            ? 'active'
            : 'locked'
        }));
      }

      response.recipes = {
        _id: recipePath._id,
        type: recipePath.type,
        countryId: recipePath.countryId,
        title: recipePath.title,
        description: recipePath.description,
        icon: recipePath.icon || '🍽️',
        order: recipePath.order,
        isPremium: recipePath.isPremium,
        isActive: recipePath.isActive,
        createdAt: recipePath.createdAt,
        nodes: nodesData
      };
    }

    // Process culture path
    if (culturePath) {
      const unlockedIds = cultureProgress?.unlockedLessons || [];
      const completedIds = cultureProgress?.completedLessons || [];

      // If path has no nodes, load culture as virtual nodes
      let nodesData = culturePath.nodes || [];
      
      if (nodesData.length === 0) {
        const cultureItems = await Culture.find({ countryId }).sort({ createdAt: 1 });
        nodesData = cultureItems.map((item, index) => ({
          _id: item._id,
          title: item.title,
          description: item.description || `Explora ${item.title}`,
          type: 'explanation',
          difficulty: 1,
          xpReward: item.xpReward || 30,
          order: index + 1,
          steps: item.steps || [],
          // Mark first culture item as active, rest locked
          status: index === 0 ? 'active' : 'locked'
        }));
      } else {
        nodesData = nodesData.map(node => ({
          ...node.toObject(),
          status: completedIds.includes(node._id.toString())
            ? 'completed'
            : unlockedIds.includes(node._id.toString())
            ? 'active'
            : 'locked'
        }));
      }

      response.culture = {
        _id: culturePath._id,
        type: culturePath.type,
        countryId: culturePath.countryId,
        title: culturePath.title,
        description: culturePath.description,
        icon: culturePath.icon || '📚',
        order: culturePath.order,
        isPremium: culturePath.isPremium,
        isActive: culturePath.isActive,
        createdAt: culturePath.createdAt,
        nodes: nodesData
      };
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========================================
// GET RECIPES BY COUNTRY (Public)
// ========================================
exports.getRecipesByCountry = async (req, res) => {
  try {
    const { countryId } = req.params;

    const recipes = await Recipe.find({ countryId })
      .sort({ createdAt: 1 })
      .select('title description difficulty xpReward prepTime cookTime imageUrl steps');

    res.json(recipes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========================================
// GET CULTURE BY COUNTRY (Public)
// ========================================
exports.getCultureByCountry = async (req, res) => {
  try {
    const { countryId } = req.params;

    const cultureItems = await Culture.find({ countryId })
      .sort({ createdAt: 1 })
      .select('title description xpReward imageUrl steps');

    res.json(cultureItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========================================
// GET SINGLE RECIPE (Public)
// ========================================
exports.getRecipeDetail = async (req, res) => {
  try {
    const { recipeId } = req.params;

    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(404).json({ message: 'Receta no encontrada' });
    }

    // Find the node that references this recipe
    const node = await LearningNode.findOne({
      referencedRecipes: recipeId
    });

    // Return recipe with associated node (if exists)
    res.json({
      recipe,
      node: node || null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========================================
// GET SINGLE CULTURE (Public)
// ========================================
exports.getCultureDetail = async (req, res) => {
  try {
    const { cultureId } = req.params;

    const cultureItem = await Culture.findById(cultureId);
    if (!cultureItem) {
      return res.status(404).json({ message: 'Artículo cultural no encontrado' });
    }

    res.json(cultureItem);
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
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const rawLimit = parseInt(req.query.limit, 10) || 12;
    const limit = Math.min(Math.max(rawLimit, 1), 100);
    const skip = (page - 1) * limit;
    const isCacheable = !userId;
    const cacheKey = getCatalogCacheKey('goals', page, limit);

    if (isCacheable) {
      const cachedResponse = getCachedCatalogResponse(cacheKey);
      if (cachedResponse) {
        res.set('Cache-Control', 'public, max-age=60');
        return res.json(cachedResponse);
      }
    }

    const filter = {
      type: 'goal',
      isActive: true
    };

    const [total, goalPaths] = await Promise.all([
      LearningPath.countDocuments(filter),
      LearningPath.find(filter)
        .select('goalType title description icon isPremium order nodes')
        .sort({ order: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const progressList = userId
      ? await Promise.all(
          goalPaths.map((path) => getOrCreateNodeProgress(userId, path._id))
        )
      : [];

    const response = goalPaths.map((path, index) => {
      const progress = userId ? progressList[index] : null;
      const completedIds = progress?.completedLessons || [];

      return {
        _id: path._id,
        goalType: path.goalType,
        title: path.title,
        description: path.description,
        icon: path.icon,
        isPremium: path.isPremium,
        totalNodes: Array.isArray(path.nodes) ? path.nodes.length : 0,
        completedNodes: completedIds.length,
        nodes: []
      };
    });

    const payload = {
      data: response,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
        hasMore: skip + response.length < total
      }
    };

    if (isCacheable) {
      setCachedCatalogResponse(cacheKey, payload);
      res.set('Cache-Control', 'public, max-age=60');
    }

    res.json(payload);
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
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const rawLimit = parseInt(req.query.limit, 10) || 24;
    const limit = Math.min(Math.max(rawLimit, 1), 100);
    const skip = (page - 1) * limit;

    const baseFilter = {
      pathId,
      isDeleted: { $ne: true },
      status: 'active'
    };

    const [path, totalNodes, nodes] = await Promise.all([
      LearningPath.findById(pathId)
        .select('_id type title description icon groups')
        .populate({
          path: 'groups',
          match: { isDeleted: false },
          select: '_id title order',
          options: { sort: { order: 1 } }
        })
        .lean(),
      LearningNode.countDocuments(baseFilter),
      LearningNode.find(baseFilter)
        .select('_id title description type difficulty xpReward order groupId groupTitle level positionIndex icon media')
        .sort({ level: 1, positionIndex: 1, order: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    if (!path) {
      return res.status(404).json({ message: 'Path no encontrado' });
    }

    // Get user progress
    let progress = null;
    if (userId) {
      progress = await getOrCreateNodeProgress(userId, pathId);
    }

    const unlockedIds =
      progress?.unlockedLessons?.map((id) => id.toString()) || [];
    const completedIds =
      progress?.completedLessons?.map((id) => id.toString()) || [];

    const response = {
      ...path,
      nodes: nodes.map(node => ({
        ...node,
        status: completedIds.includes(node._id.toString())
          ? 'completed'
          : unlockedIds.includes(node._id.toString())
          ? 'active'
          : 'locked'
      })),
      pagination: {
        page,
        limit,
        total: totalNodes,
        totalPages: Math.max(Math.ceil(totalNodes / limit), 1),
        hasMore: skip + nodes.length < totalNodes
      }
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
    let progress = await getOrCreateNodeProgress(userId, node.pathId);

    // 4. Verify node is unlocked
    const isUnlocked = progress.unlockedLessons.some(
      id => id.toString() === nodeId
    );
    if (!isUnlocked) {
      return res.status(403).json({ message: 'Nodo bloqueado' });
    }

    // 5. Check if already completed (for tracking purposes only)
    const isAlreadyCompleted = progress.completedLessons.some(
      id => id.toString() === nodeId
    );

    // 6. Mark as completed (allow multiple completions)
    if (!isAlreadyCompleted) {
      progress.completedLessons.push(node._id);
    }
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

    // 8. Synchronize unlock state using deterministic sequence
    progress = await syncUnlockState(progress, node.pathId);

    await progress.save();

    // 10. Add XP to user (GLOBAL) - Always awarded, even on repeat completions
    const user = await User.findById(userId);
    user.totalXP = (user.totalXP || 0) + node.xpReward;
    user.level = Math.floor(user.totalXP / 100) + 1;
    await user.save();

    // 11. Return updated data
    const nextNode = await getNextNodeForPath(node.pathId, nodeId);
    
    res.json({
      message: isAlreadyCompleted 
        ? `Nodo completado de nuevo! +${node.xpReward} XP` 
        : 'Nodo completado',
      xpEarned: node.xpReward,
      totalXP: user.totalXP,
      level: user.level,
      isRepeat: isAlreadyCompleted,
      nextNodeId: !isAlreadyCompleted && nextNode ? nextNode._id : null,
      progress: {
        completedLessons: progress.completedLessons.map(id => id.toString()),
        unlockedLessons: progress.unlockedLessons.map(id => id.toString()),
        streak: progress.streak,
        lastCompletedAt: progress.lastCompletedAt
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
