const LearningNode = require("../models/LearningNode.model");
const LearningPath = require("../models/LearningPath.model");
const Country = require("../models/Country.model");
const UserProgress = require("../models/UserProgress.model");

// ==============================
// ==============================
// IMPORT NODES/RECIPES (Admin)
// ==============================
exports.importContent = async (req, res) => {
  try {
    const { targetPathId, nodeIds = [], recipeIds = [] } = req.body;
    if (!targetPathId || (!nodeIds.length && !recipeIds.length)) {
      return res.status(400).json({ message: "targetPathId y nodeIds/recipeIds requeridos" });
    }
    const importedNodes = [];
    for (const nodeId of nodeIds) {
      const node = await LearningNode.findById(nodeId);
      if (node) {
        const clone = node.toObject();
        delete clone._id;
        clone.pathId = targetPathId;
        clone.title = clone.title + " (importado)";
        const newNode = await LearningNode.create(clone);
        importedNodes.push(newNode);
      }
    }
    // Import recipes as nodes
    for (const recipeId of recipeIds) {
      const Recipe = require('../models/Recipe.model');
      const recipe = await Recipe.findById(recipeId);
      if (recipe) {
        const nodeData = {
          pathId: targetPathId,
          title: recipe.title + " (importado)",
          type: "recipe",
          steps: recipe.steps || [],
          ingredients: recipe.ingredients || [],
          prepTime: recipe.prepTime || 0,
          cookTime: recipe.cookTime || 0,
          servings: recipe.servings || 1,
          xpReward: 50,
        };
        const newNode = await LearningNode.create(nodeData);
        importedNodes.push(newNode);
      }
    }
    res.json({ imported: importedNodes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// GET MAP NODES BY COUNTRY (LEGACY - for backward compatibility)
// ==============================
exports.getCountryMap = async (req, res) => {
  try {
    const { countryId } = req.params;
    const userId = req.user?.id;

    // Try to get nodes from LearningPath instead of Country
    const paths = await LearningPath.find({ countryId })
      .populate('nodes');
    
    if (!paths || paths.length === 0) {
      return res.status(404).json({ message: "No learning paths found for this country" });
    }

    // Combine all nodes from all paths
    const allNodes = [];
    paths.forEach(path => {
      if (path.nodes) {
        allNodes.push(...path.nodes);
      }
    });

    // Sort nodes by order
    const nodes = allNodes.sort((a, b) => a.order - b.order);

    // Get user progress if authenticated
    let userProgress = null;
    let completedNodeIds = [];
    if (userId) {
      userProgress = await UserProgress.findOne({ userId });
      completedNodeIds = userProgress?.completedNodes?.map(n => n.nodeId.toString()) || [];
    }

    // Determine node status
    const mapData = nodes.map((node, index) => ({
      ...node.toObject(),
      status: completedNodeIds.includes(node._id.toString()) ? 'completed' : 
              index === 0 || nodes.slice(0, index).some(n => completedNodeIds.includes(n._id.toString())) ? 'available' :
              'locked',
      position: index % 2 === 0 ? 'left' : 'right' // Alternating left/right
    }));

    const country = await Country.findById(countryId).select('name code icon');

    res.json({
      country: {
        id: country._id,
        name: country.name,
        icon: country.icon,
        code: country.code
      },
      nodes: mapData
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// GET SINGLE NODE WITH DETAILS
// ==============================
exports.getNode = async (req, res) => {
  try {
    const { nodeId } = req.params;

    const node = await LearningNode.findById(nodeId)
      .populate('requiredNodes')
      .populate('unlocksNodes');

    if (!node) {
      return res.status(404).json({ message: "Nodo no encontrado" });
    }

    res.json(node);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// CHECK NODE UNLOCK STATUS
// ==============================
exports.checkNodeUnlock = async (req, res) => {
  try {
    const { nodeId } = req.params;
    const userId = req.user.id;

    const node = await LearningNode.findById(nodeId).populate('requiredNodes');
    if (!node) {
      return res.status(404).json({ message: "Nodo no encontrado" });
    }

    const userProgress = await UserProgress.findOne({ userId });
    if (!userProgress) {
      return res.json({
        isUnlocked: node.requiredNodes.length === 0,
        missingNodes: node.requiredNodes
      });
    }

    // Check if user has completed all required nodes
    const completedNodeIds = userProgress.completedNodes.map(n => n.nodeId.toString());
    const requiredNodesMet = node.requiredNodes.every(reqNode => 
      completedNodeIds.includes(reqNode._id.toString())
    );

    const isUnlocked = requiredNodesMet;
    const missingNodes = node.requiredNodes.filter(n => 
      !completedNodeIds.includes(n._id.toString())
    );

    res.json({
      isUnlocked,
      requiredNodesMet,
      missingNodes
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// COMPLETE NODE
// ==============================
exports.completeNode = async (req, res) => {
  try {
    const { nodeId, score } = req.body;
    const userId = req.user.id;

    const node = await LearningNode.findById(nodeId);
    if (!node) {
      return res.status(404).json({ message: "Nodo no encontrado" });
    }

    // Find or create UserProgress for this specific path
    let userProgress = await UserProgress.findOne({ 
      userId, 
      pathId: node.pathId 
    });
    
    if (!userProgress) {
      userProgress = new UserProgress({ 
        userId, 
        pathId: node.pathId,
        xp: 0, 
        level: 1 
      });
    }

    // Check if already completed
    const alreadyCompleted = userProgress.completedNodes.find(n => 
      n.nodeId.toString() === nodeId
    );

    if (!alreadyCompleted) {
      userProgress.completedNodes.push({
        nodeId,
        completedAt: new Date(),
        score: score || 100,
        attempts: 1
      });
    } else {
      // Allow repeat completions - increment attempts and update score
      alreadyCompleted.attempts += 1;
      alreadyCompleted.completedAt = new Date();
      alreadyCompleted.score = score || 100;
    }

    // Award XP every time (even on repeat completions)
    userProgress.xp += node.xpReward;

    // Check level up (every 100 XP = 1 level)
    const newLevel = Math.floor(userProgress.xp / 100) + 1;
    if (newLevel > userProgress.level) {
      userProgress.level = newLevel;
    }

    await userProgress.save();

    // ===== UPDATE GLOBAL USER STATS =====
    const User = require('../models/user.model');
    const user = await User.findById(userId);
    
    if (user) {
      // Award global XP
      user.totalXP += node.xpReward;
      
      // Update global level
      user.level = Math.floor(user.totalXP / 100) + 1;
      
      // Increment completed lessons count (only if not already completed)
      if (!alreadyCompleted) {
        user.completedLessonsCount = (user.completedLessonsCount || 0) + 1;
      }
      
      await user.save();
    }

    // Get unlocked nodes
    const unlockedNodes = await LearningNode.find({
      requiredNodes: { $in: [nodeId] }
    });

    res.json({
      message: alreadyCompleted 
        ? `Nodo completado de nuevo! +${node.xpReward} XP (Intento #${alreadyCompleted.attempts})`
        : "Nodo completado",
      xpEarned: node.xpReward,
      totalXp: userProgress.xp,
      level: userProgress.level,
      totalXP: user?.totalXP || 0,
      isRepeat: !!alreadyCompleted,
      attempts: alreadyCompleted?.attempts || 1,
      unlockedNodes: unlockedNodes.map(n => ({
        id: n._id,
        title: n.title,
        type: n.type
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// CREATE NODE (Admin)
// ==============================
exports.createNode = async (req, res) => {
  try {
    const {
      pathId,
      countryId,
      title,
      description,
      type,
      difficulty,
      xpReward,
      order,
      requiredNodes,
      category,
      level,
      steps,
      servings,
      prepTime,
      cookTime,
      ingredients,
      tools,
      nutrition,
      tips,
      tags,
      isPremium
    } = req.body;

    // Accept either pathId (new) or countryId (legacy)
    const nodePathId = pathId || countryId;
    
    if (!nodePathId || !title || !type || !steps || steps.length === 0) {
      return res.status(400).json({ 
        message: "pathId (or countryId), title, type, y steps son obligatorios" 
      });
    }

    if (!['recipe', 'skill', 'quiz'].includes(type)) {
      return res.status(400).json({ 
        message: "type debe ser: recipe, skill, o quiz" 
      });
    }

    // Check if it's a pathId (new) or countryId (legacy)
    let path = null;
    let resolvedCountryId = countryId || null;
    
    try {
      path = await LearningPath.findById(nodePathId);
    } catch (e) {
      // Not a valid pathId, try as countryId (legacy)
      const country = await Country.findById(nodePathId);
      if (!country) {
        return res.status(404).json({ message: "País o camino no encontrado" });
      }
      resolvedCountryId = nodePathId;  // Use nodePathId as countryId
    }

    if (!path && !resolvedCountryId) {
      return res.status(404).json({ message: "LearningPath o País no encontrado" });
    }

    const node = await LearningNode.create({
      pathId: nodePathId,
      title,
      description: description || '',
      type,
      difficulty: difficulty || 'medium',
      xpReward: xpReward || 50,
      order: order || 0,
      requiredNodes: requiredNodes || [],
      category: category || 'technique',
      level: level || 1,
      steps,
      servings,
      prepTime,
      cookTime,
      ingredients: ingredients || [],
      tools: tools || [],
      nutrition: nutrition || {},
      tips: tips || [],
      tags: tags || [],
      isPremium: isPremium || false
    });

    // Add to path if it exists
    if (path) {
      if (!path.nodes.includes(node._id)) {
        path.nodes.push(node._id);
        await path.save();
      }
    } else if (resolvedCountryId) {
      // Legacy: add to country
      const country = await Country.findById(resolvedCountryId);
      if (country && !country.learningNodes.includes(node._id)) {
        country.learningNodes.push(node._id);
        await country.save();
      }
    }

    res.status(201).json(node);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// UPDATE NODE (Admin)
// ==============================
exports.updateNode = async (req, res) => {
  try {
    const { nodeId } = req.params;
    const updates = req.body;

    const node = await LearningNode.findByIdAndUpdate(nodeId, updates, {
      new: true,
      runValidators: true
    }).populate('requiredNodes').populate('unlocksNodes');

    if (!node) {
      return res.status(404).json({ message: "Nodo no encontrado" });
    }

    res.json(node);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// DELETE NODE (Admin)
// ==============================
exports.deleteNode = async (req, res) => {
  try {
    const { nodeId } = req.params;

    const node = await LearningNode.findByIdAndDelete(nodeId);
    if (!node) {
      return res.status(404).json({ message: "Nodo no encontrado" });
    }

    // Remove from path (new)
    if (node.pathId) {
      await LearningPath.findByIdAndUpdate(
        node.pathId,
        { $pull: { nodes: nodeId } }
      );
    }

    // Remove from country (legacy)
    if (node.countryId) {
      await Country.findByIdAndUpdate(
        node.countryId,
        { $pull: { learningNodes: nodeId } }
      );
    }

    // Remove from any unlock chains
    await LearningNode.updateMany(
      { unlocksNodes: nodeId },
      { $pull: { unlocksNodes: nodeId } }
    );

    res.json({ message: "Nodo eliminado" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// GET NODES BY TYPE
// ==============================
exports.getNodesByType = async (req, res) => {
  try {
    const { countryId, type } = req.params;

    if (!['recipe', 'skill', 'quiz'].includes(type)) {
      return res.status(400).json({ 
        message: "type debe ser: recipe, skill, o quiz" 
      });
    }

    const nodes = await LearningNode.find({
      countryId,
      type
    }).sort({ order: 1 });

    res.json(nodes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// SEARCH NODES
// ==============================
exports.searchNodes = async (req, res) => {
  try {
    const { countryId, query, type } = req.query;

    const searchObj = { countryId };
    
    if (type) {
      searchObj.type = type;
    }

    if (query) {
      searchObj.$or = [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $regex: query, $options: 'i' } }
      ];
    }

    const nodes = await LearningNode.find(searchObj).sort({ order: 1 });

    res.json(nodes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
