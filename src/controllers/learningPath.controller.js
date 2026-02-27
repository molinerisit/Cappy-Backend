const LearningPath = require("../models/LearningPath.model");
const LearningNode = require("../models/LearningNode.model");
const NodeGroup = require("../models/NodeGroup.model");
const Country = require("../models/Country.model");
const UserProgress = require("../models/UserProgress.model");
const Recipe = require("../models/Recipe.model");
const nodeProgressService = require("../services/nodeProgress.service");
const { invalidateCatalogCaches } = require("../services/catalogCache.service");

// ==============================
// GET ALL PATHS FOR NAVIGATION
// ==============================
exports.getAllPaths = async (req, res) => {
  try {
    const paths = await LearningPath.find({ isActive: true })
      .populate('nodes', 'title type difficulty xpReward order')
      .populate('countryId', 'name code icon')
      .sort({ type: 1, order: 1 });

    // Group by type for easier frontend consumption
    const grouped = {
      culinaryCountries: [],
      goals: []
    };

    for (const path of paths) {
      if (path.type === 'country_recipe' || path.type === 'country_culture') {
        grouped.culinaryCountries.push({
          ...path.toObject(),
          country: path.countryId
        });
      } else if (path.type === 'goal') {
        grouped.goals.push(path);
      }
    }

    res.json(grouped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// GET COUNTRY HUB (Recipes only)
// ==============================
exports.getCountryHub = async (req, res) => {
  try {
    const { countryId } = req.params;

    const country = await Country.findById(countryId);
    if (!country) {
      return res.status(404).json({ message: "País no encontrado" });
    }

    // Get recipe path for this country
    const recipePath = await LearningPath.findOne({
      countryId,
      type: 'country_recipe'
    }).populate('nodes');

    res.json({
      country: {
        id: country._id,
        name: country.name,
        code: country.code,
        icon: country.icon,
        description: country.description
      },
      recipes: recipePath || { nodes: [] },
      culture: null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// GET SINGLE PATH WITH NODES
// ==============================
exports.getPath = async (req, res) => {
  try {
    const { pathId } = req.params;
    const userId = req.user?.id;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const rawLimit = parseInt(req.query.limit, 10) || 24;
    const limit = Math.min(Math.max(rawLimit, 1), 100);
    const skip = (page - 1) * limit;
    const includeSteps = req.query.includeSteps === 'true';

    const path = await LearningPath.findById(pathId)
      .select('_id type title description icon countryId')
      .lean();
    if (!path) {
      return res.status(404).json({ message: "Ruta no encontrada" });
    }

    const groupsPromise = NodeGroup.find({
      pathId,
      isDeleted: { $ne: true }
    })
      .select('_id title order')
      .sort({ order: 1 })
      .lean();

    // Get user progress if authenticated
    let unlockedNodeIds = [];
    let completedNodeIds = [];
    if (userId) {
      // Ensure user has progress for this path (creates if needed and unlocks first node)
      const userProgress = await nodeProgressService.getOrCreateNodeProgress(userId, pathId);
      unlockedNodeIds = userProgress.unlockedLessons?.map(n => n.toString()) || [];
      completedNodeIds = userProgress.completedLessons?.map(n => n.toString()) || [];
    }

    // Prefer LearningNode collection (v2) over embedded path.nodes
    const baseNodeFilter = {
      pathId,
      isDeleted: { $ne: true },
      status: 'active'
    };

    const [groups, totalNodes, pathNodes] = await Promise.all([
      groupsPromise,
      LearningNode.countDocuments(baseNodeFilter),
      LearningNode.find(baseNodeFilter)
        .select(
          includeSteps
              ? '_id title description type difficulty xpReward order groupId groupTitle positionIndex level icon media status steps'
              : '_id title description type difficulty xpReward order groupId groupTitle positionIndex level icon media status'
        )
        .populate('groupId', '_id title order')
        .sort({ level: 1, positionIndex: 1, order: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // If path has no nodes and is country-based, load recipes/culture as virtual nodes
    let nodesWithStatus = [];

    if (totalNodes === 0 && path.countryId) {
      if (path.type === 'country_recipe') {
        const recipeFilter = { countryId: path.countryId };
        const totalRecipes = await Recipe.countDocuments(recipeFilter);
        const recipes = await Recipe.find(recipeFilter)
          .select('_id title description difficulty xpReward steps createdAt')
          .sort({ createdAt: 1 })
          .skip(skip)
          .limit(limit)
          .lean();
        nodesWithStatus = recipes.map((recipe, index) => ({
          _id: recipe._id,
          title: recipe.title,
          description: recipe.description || `Aprende a preparar ${recipe.title}`,
          type: 'lesson',
          difficulty: recipe.difficulty || 2,
          xpReward: recipe.xpReward || 50,
          order: skip + index + 1,
          steps: includeSteps ? (recipe.steps || []) : [],
          status: skip + index === 0 ? 'active' : 'locked'
        }));

        return res.json({
          path,
          groups,
          nodes: nodesWithStatus,
          pagination: {
            page,
            limit,
            total: totalRecipes,
            totalPages: Math.max(Math.ceil(totalRecipes / limit), 1),
            hasMore: skip + nodesWithStatus.length < totalRecipes
          }
        });
      } else if (path.type === 'country_culture') {
        const cultureFilter = { countryId: path.countryId };
        const totalCultureItems = await Culture.countDocuments(cultureFilter);
        const cultureItems = await Culture.find(cultureFilter)
          .select('_id title description xpReward steps createdAt')
          .sort({ createdAt: 1 })
          .skip(skip)
          .limit(limit)
          .lean();
        nodesWithStatus = cultureItems.map((item, index) => ({
          _id: item._id,
          title: item.title,
          description: item.description || `Explora ${item.title}`,
          type: 'explanation',
          difficulty: 1,
          xpReward: item.xpReward || 30,
          order: skip + index + 1,
          steps: includeSteps ? (item.steps || []) : [],
          status: skip + index === 0 ? 'active' : 'locked'
        }));

        return res.json({
          path,
          groups,
          nodes: nodesWithStatus,
          pagination: {
            page,
            limit,
            total: totalCultureItems,
            totalPages: Math.max(Math.ceil(totalCultureItems / limit), 1),
            hasMore: skip + nodesWithStatus.length < totalCultureItems
          }
        });
      }
    } else {
      // Add status to each node based on unlock state
      nodesWithStatus = pathNodes.map((node) => {
        const nodeIdStr = node._id.toString();
        let status = 'locked';

        if (completedNodeIds.includes(nodeIdStr)) {
          status = 'completed';
        } else if (unlockedNodeIds.includes(nodeIdStr)) {
          status = 'active';
        }

        const populatedGroup =
          node.groupId && typeof node.groupId === 'object' ? node.groupId : null;
        const resolvedGroupId = populatedGroup?._id || node.groupId || null;
        const resolvedGroupTitle =
          populatedGroup?.title || node.groupTitle || '';

        return {
          ...node,
          groupId: resolvedGroupId,
          groupTitle: resolvedGroupTitle,
          status,
        };
      });
    }

    res.json({
      path,
      groups,
      nodes: nodesWithStatus,
      pagination: {
        page,
        limit,
        total: totalNodes,
        totalPages: Math.max(Math.ceil(totalNodes / limit), 1),
        hasMore: skip + nodesWithStatus.length < totalNodes
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// CREATE PATH (Admin)
// ==============================
exports.createPath = async (req, res) => {
  try {
    const {
      type,
      countryId,
      goalType,
      title,
      description,
      icon,
      order,
      metadata,
      isPremium
    } = req.body;

    if (!type || !title) {
      return res.status(400).json({ 
        message: "type y title son obligatorios" 
      });
    }

    if (!['country_recipe', 'country_culture', 'goal'].includes(type)) {
      return res.status(400).json({ 
        message: "type debe ser: country_recipe, country_culture, o goal" 
      });
    }

    // Validate type-specific requirements
    if ((type === 'country_recipe' || type === 'country_culture') && !countryId) {
      return res.status(400).json({ 
        message: "countryId requerido para paths de país" 
      });
    }

    if (type === 'goal' && !goalType) {
      return res.status(400).json({ 
        message: "goalType requerido para paths de objetivos" 
      });
    }

    const path = await LearningPath.create({
      type,
      countryId: countryId || undefined,
      goalType: goalType || undefined,
      title,
      description: description || '',
      icon: icon || '📚',
      order: order || 0,
      metadata: metadata || {},
      nodes: [],
      isPremium: isPremium || false
    });

    invalidateCatalogCaches();

    res.status(201).json(path);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// UPDATE PATH (Admin)
// ==============================
exports.updatePath = async (req, res) => {
  try {
    const { pathId } = req.params;
    const updates = req.body;

    const path = await LearningPath.findByIdAndUpdate(pathId, updates, {
      new: true,
      runValidators: true
    }).populate('nodes');

    if (!path) {
      return res.status(404).json({ message: "Ruta no encontrada" });
    }

    invalidateCatalogCaches();

    res.json(path);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// ADD NODE TO PATH (Admin)
// ==============================
exports.addNodeToPath = async (req, res) => {
  try {
    const { pathId, nodeId } = req.body;

    const path = await LearningPath.findById(pathId);
    if (!path) {
      return res.status(404).json({ message: "Ruta no encontrada" });
    }

    const node = await LearningNode.findById(nodeId);
    if (!node) {
      return res.status(404).json({ message: "Nodo no encontrado" });
    }

    if (!path.nodes.includes(nodeId)) {
      path.nodes.push(nodeId);
      await path.save();
    }

    res.json(path);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// REMOVE NODE FROM PATH (Admin)
// ==============================
exports.removeNodeFromPath = async (req, res) => {
  try {
    const { pathId, nodeId } = req.body;

    const path = await LearningPath.findById(pathId);
    if (!path) {
      return res.status(404).json({ message: "Ruta no encontrada" });
    }

    path.nodes = path.nodes.filter(n => n.toString() !== nodeId);
    await path.save();

    res.json(path);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// DELETE PATH (Admin)
// ==============================
exports.deletePath = async (req, res) => {
  try {
    const { pathId } = req.params;

    const path = await LearningPath.findByIdAndDelete(pathId);
    if (!path) {
      return res.status(404).json({ message: "Ruta no encontrada" });
    }

    // Remove associated nodes
    await LearningNode.deleteMany({ pathId });

    invalidateCatalogCaches();

    res.json({ message: "Ruta y nodos asociados eliminados" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// GET PATHS BY TYPE
// ==============================
exports.getPathsByType = async (req, res) => {
  try {
    const { type } = req.params;

    const validTypes = ['country_recipe', 'country_culture', 'goal'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        message: `type debe ser: ${validTypes.join(', ')}` 
      });
    }

    const paths = await LearningPath.find({
      type,
      isActive: true
    })
    .populate('nodes', 'title type difficulty xpReward')
    .sort({ order: 1 });

    res.json(paths);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// GET GOAL PATHS
// ==============================
exports.getGoalPaths = async (req, res) => {
  try {
    const goals = await LearningPath.find({
      type: 'goal',
      isActive: true
    })
    .populate('nodes', 'title type difficulty xpReward order')
    .sort({ order: 1 });

    const grouped = {};
    for (const goal of goals) {
      if (!grouped[goal.goalType]) {
        grouped[goal.goalType] = [];
      }
      grouped[goal.goalType].push(goal);
    }

    res.json(grouped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
