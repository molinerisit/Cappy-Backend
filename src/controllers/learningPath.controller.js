const LearningPath = require("../models/LearningPath.model");
const LearningNode = require("../models/LearningNode.model");
const Country = require("../models/Country.model");
const UserProgress = require("../models/UserProgress.model");

// ==============================
// GET ALL PATHS FOR NAVIGATION
// ==============================
exports.getAllPaths = async (req, res) => {
  try {
    const paths = await LearningPath.find({ isActive: true })
      .populate('nodes', 'title type difficulty xpReward order')
      .sort({ type: 1, order: 1 });

    // Group by type for easier frontend consumption
    const grouped = {
      culinaryCountries: [],
      goals: []
    };

    for (const path of paths) {
      if (path.type === 'country_recipe' || path.type === 'country_culture') {
        // Get country details
        const country = await Country.findById(path.countryId).select('name code icon');
        grouped.culinaryCountries.push({
          ...path.toObject(),
          country
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
// GET COUNTRY HUB (Recipes + Culture)
// ==============================
exports.getCountryHub = async (req, res) => {
  try {
    const { countryId } = req.params;

    const country = await Country.findById(countryId);
    if (!country) {
      return res.status(404).json({ message: "País no encontrado" });
    }

    // Get both recipe and culture paths for this country
    const recipePath = await LearningPath.findOne({
      countryId,
      type: 'country_recipe'
    }).populate('nodes');

    const culturePath = await LearningPath.findOne({
      countryId,
      type: 'country_culture'
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
      culture: culturePath || { nodes: [] }
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

    const path = await LearningPath.findById(pathId).populate('nodes');
    if (!path) {
      return res.status(404).json({ message: "Ruta no encontrada" });
    }

    // Get user progress if authenticated
    let unlockedNodeIds = [];
    let completedNodeIds = [];
    if (userId) {
      const userProgress = await UserProgress.findOne({ userId, pathId });
      if (userProgress) {
        unlockedNodeIds = userProgress.unlockedLessons?.map(n => n.toString()) || [];
        completedNodeIds = userProgress.completedLessons?.map(n => n.toString()) || [];
      }
    }

    // Add status to each node based on unlock state
    const nodesWithStatus = path.nodes.map((node) => {
      const nodeIdStr = node._id.toString();
      let status = 'locked';
      
      if (completedNodeIds.includes(nodeIdStr)) {
        status = 'completed';
      } else if (unlockedNodeIds.includes(nodeIdStr)) {
        status = 'active';
      }

      return {
        ...node.toObject(),
        status: status
      };
    });

    res.json({
      path: {
        _id: path._id,
        type: path.type,
        title: path.title,
        description: path.description,
        icon: path.icon
      },
      nodes: nodesWithStatus
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
