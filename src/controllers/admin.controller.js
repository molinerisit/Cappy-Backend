const Path = require("../models/Path.model");
const Lesson = require("../models/lesson.model");
const LearningPath = require("../models/LearningPath.model");
const LearningNode = require("../models/LearningNode.model");
const Country = require("../models/Country.model");
const Culture = require("../models/Culture.model");


// =====================================================
// LEARNING PATH OPERATIONS (Admin)
// =====================================================

/**
 * Get all learning paths (Admin)
 */
exports.getAllLearningPaths = async (req, res) => {
  try {
    const paths = await LearningPath.find()
      .populate('nodes', 'title type difficulty xpReward order')
      .populate('countryId', 'name code icon')
      .sort({ type: 1, createdAt: -1 });
    
    res.json(paths);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Create learning path
 */
exports.createLearningPath = async (req, res) => {
  try {
    const { 
      type, 
      countryId, 
      goalType, 
      title, 
      description, 
      icon, 
      order, 
      isPremium, 
      metadata 
    } = req.body;

    // Validation
    if (!type || !['country_recipe', 'country_culture', 'goal'].includes(type)) {
      return res.status(400).json({ 
        message: "type requerido y debe ser: country_recipe, country_culture, o goal" 
      });
    }

    if (!title) {
      return res.status(400).json({ message: "title es requerido" });
    }

    // Type-specific validation
    if ((type === 'country_recipe' || type === 'country_culture') && !countryId) {
      return res.status(400).json({ message: "countryId requerido para paths country" });
    }

    if (type === 'goal' && !goalType) {
      return res.status(400).json({ message: "goalType requerido para paths goal" });
    }

    if (type === 'goal' && !['cooking_school', 'lose_weight', 'gain_muscle', 'become_vegan'].includes(goalType)) {
      return res.status(400).json({ 
        message: "goalType debe ser: cooking_school, lose_weight, gain_muscle, o become_vegan" 
      });
    }

    // Check if country exists (if country path)
    if (countryId) {
      const country = await Country.findById(countryId);
      if (!country) {
        return res.status(404).json({ message: "País no encontrado" });
      }
    }

    const newPath = new LearningPath({
      type,
      countryId: countryId || null,
      goalType: goalType || null,
      title,
      description: description || '',
      icon: icon || '📚',
      order: order || 0,
      isPremium: isPremium || false,
      metadata: metadata || {},
      nodes: [],
      isActive: true
    });

    const savedPath = await newPath.save();
    res.status(201).json(savedPath);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update learning path
 */
exports.updateLearningPath = async (req, res) => {
  try {
    const { pathId } = req.params;
    const updates = req.body;

    const path = await LearningPath.findByIdAndUpdate(pathId, updates, { new: true })
      .populate('nodes');

    if (!path) {
      return res.status(404).json({ message: "Path no encontrado" });
    }

    res.json(path);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete learning path
 */
exports.deleteLearningPath = async (req, res) => {
  try {
    const { pathId } = req.params;

    const path = await LearningPath.findByIdAndDelete(pathId);

    if (!path) {
      return res.status(404).json({ message: "Path no encontrado" });
    }

    // Delete associated nodes
    await LearningNode.deleteMany({ pathId });

    res.json({ message: "Path eliminado", deletedPath: path });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// CREATE PATH (Legacy)
// ==============================
exports.createPath = async (req, res) => {
  try {
    const { name, type, icon, description } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: "Nombre y tipo son obligatorios" });
    }

    if (!["country", "goal"].includes(type)) {
      return res.status(400).json({ message: "Tipo inválido" });
    }

    const existing = await Path.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: "Ya existe un path con ese nombre" });
    }

    const path = await Path.create({
      name,
      type,
      icon,
      description
    });

    res.status(201).json(path);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =====================================================
// LEARNING NODE OPERATIONS (Admin)
// =====================================================

/**
 * Get all nodes for a path (Admin)
 */
exports.getNodesByPath = async (req, res) => {
  try {
    const { pathId } = req.params;

    const nodes = await LearningNode.find({ pathId })
      .populate('requiredNodes', 'title')
      .sort({ order: 1 });

    res.json(nodes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Create learning node
 */
exports.createLearningNode = async (req, res) => {
  try {
    const {
      pathId,
      title,
      description,
      type,
      difficulty,
      xpReward,
      order,
      requiredNodes,
      level,
      category,
      steps,
      servings,
      prepTime,
      cookTime,
      ingredients,
      tools,
      nutrition,
      tips,
      tags,
      isPremium,
      media
    } = req.body;

    // Validation
    if (!pathId || !title) {
      return res.status(400).json({ message: "pathId y title son requeridos" });
    }

    if (!type || !['recipe', 'skill', 'quiz'].includes(type)) {
      return res.status(400).json({ 
        message: "type requerido y debe ser: recipe, skill, o quiz" 
      });
    }

    // Validate difficulty if provided
    if (difficulty && (typeof difficulty !== 'number' || difficulty < 1 || difficulty > 3)) {
      return res.status(400).json({ 
        message: "difficulty debe ser un número entre 1 y 3 (1=fácil, 2=medio, 3=difícil)" 
      });
    }

    // Check if path exists
    const path = await LearningPath.findById(pathId);
    if (!path) {
      return res.status(404).json({ message: "Path no encontrado" });
    }

    const newNode = new LearningNode({
      pathId,
      title,
      description: description || '',
      type,
      difficulty: difficulty || 'medium',
      xpReward: xpReward || 50,
      order: order !== undefined ? order : 0,
      requiredNodes: requiredNodes || [],
      level: level || 1,
      category: category || 'technique',
      steps: steps || [],
      servings: servings || null,
      prepTime: prepTime || null,
      cookTime: cookTime || null,
      ingredients: ingredients || [],
      tools: tools || [],
      nutrition: nutrition || {},
      tips: tips || [],
      tags: tags || [],
      isPremium: isPremium || false,
      media: media || null
    });

    const savedNode = await newNode.save();

    // Add node to path's nodes array
    await LearningPath.findByIdAndUpdate(
      pathId,
      { $push: { nodes: savedNode._id } },
      { new: true }
    );

    res.status(201).json(savedNode);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update learning node
 */
exports.updateLearningNode = async (req, res) => {
  try {
    const { nodeId } = req.params;
    const updates = req.body;

    const node = await LearningNode.findByIdAndUpdate(nodeId, updates, { new: true })
      .populate('requiredNodes', 'title');

    if (!node) {
      return res.status(404).json({ message: "Node no encontrado" });
    }

    res.json(node);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete learning node
 */
exports.deleteLearningNode = async (req, res) => {
  try {
    const { nodeId } = req.params;

    const node = await LearningNode.findByIdAndDelete(nodeId);

    if (!node) {
      return res.status(404).json({ message: "Node no encontrado" });
    }

    // Remove node from path
    await LearningPath.findByIdAndUpdate(
      node.pathId,
      { $pull: { nodes: nodeId } }
    );

    res.json({ message: "Node eliminado", deletedNode: node });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Set required nodes (unlock logic)
 */
exports.setRequiredNodes = async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { requiredNodeIds } = req.body;

    if (!Array.isArray(requiredNodeIds)) {
      return res.status(400).json({ message: "requiredNodeIds debe ser un array" });
    }

    const node = await LearningNode.findByIdAndUpdate(
      nodeId,
      { requiredNodes: requiredNodeIds },
      { new: true }
    ).populate('requiredNodes', 'title');

    if (!node) {
      return res.status(404).json({ message: "Node no encontrado" });
    }

    res.json(node);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Reorder nodes in a path
 */
exports.reorderNodes = async (req, res) => {
  try {
    const { pathId } = req.params;
    const { nodeOrders } = req.body; // Array of { nodeId, order }

    if (!Array.isArray(nodeOrders)) {
      return res.status(400).json({ message: "nodeOrders debe ser un array" });
    }

    // Update each node's order
    for (const { nodeId, order } of nodeOrders) {
      await LearningNode.findByIdAndUpdate(nodeId, { order });
    }

    // Get updated nodes
    const updatedNodes = await LearningNode.find({ pathId }).sort({ order: 1 });

    res.json(updatedNodes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// ==============================
// CREATE LESSON
// ==============================
exports.createLesson = async (req, res) => {
  try {
    const {
      pathId,
      title,
      description,
      language,
      difficulty,
      order,
      xpReward,
      ingredients,
      steps,
      nutrition,
      tips,
      exercises,
      isPremium
    } = req.body;

    if (!pathId || !title || !order) {
      return res.status(400).json({ message: "pathId, title y order son obligatorios" });
    }

    const path = await Path.findById(pathId);
    if (!path) {
      return res.status(404).json({ message: "Path no encontrado" });
    }

    const existingOrder = await Lesson.findOne({ pathId, order });
    if (existingOrder) {
      return res.status(400).json({
        message: "Ya existe una lección con ese orden en este path"
      });
    }

    if (xpReward && xpReward < 10) {
      return res.status(400).json({
        message: "El xpReward mínimo es 10"
      });
    }

    // Validate exercises if provided
    if (exercises && Array.isArray(exercises)) {
      for (const ex of exercises) {
        if (!ex.question || !ex.type || !ex.correctAnswer) {
          return res.status(400).json({
            message: "Cada ejercicio debe tener pregunta, tipo y respuesta correcta"
          });
        }
        if (!['multiple_choice', 'translation'].includes(ex.type)) {
          return res.status(400).json({
            message: "Tipo de ejercicio inválido. Debe ser 'multiple_choice' o 'translation'"
          });
        }
        if (ex.type === 'multiple_choice' && (!ex.options || !Array.isArray(ex.options) || ex.options.length < 2)) {
          return res.status(400).json({
            message: "Los ejercicios de opción múltiple deben tener al menos 2 opciones"
          });
        }
      }
    }

    const lesson = await Lesson.create({
      pathId,
      title,
      description,
      language: language || 'English',
      difficulty: difficulty || 'medium',
      order,
      xpReward: xpReward || 20,
      ingredients: ingredients || [],
      steps: steps || [],
      nutrition: nutrition || {},
      tips: tips || [],
      exercises: exercises || [],
      isPremium: isPremium || false
    });

    res.status(201).json(lesson);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// ==============================
// UPDATE LESSON
// ==============================
exports.updateLesson = async (req, res) => {
  try {
    const lessonId = req.params.id;
    const updates = req.body;

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: "Lección no encontrada" });
    }

    if (updates.order && updates.order !== lesson.order) {
      const existingOrder = await Lesson.findOne({
        pathId: lesson.pathId,
        order: updates.order
      });

      if (existingOrder) {
        return res.status(400).json({
          message: "Ya existe una lección con ese orden en este path"
        });
      }
    }

    if (updates.xpReward && updates.xpReward < 10) {
      return res.status(400).json({
        message: "El xpReward mínimo es 10"
      });
    }

    Object.assign(lesson, updates);
    await lesson.save();

    res.json(lesson);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// ==============================
// DELETE LESSON
// ==============================
exports.deleteLesson = async (req, res) => {
  try {
    const lessonId = req.params.id;

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: "Lección no encontrada" });
    }

    await lesson.deleteOne();

    res.json({ message: "Lección eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// ==============================
// REORDER LESSON
// ==============================
exports.reorderLesson = async (req, res) => {
  try {
    const { lessonId, newOrder } = req.body;

    if (!lessonId || newOrder === undefined) {
      return res.status(400).json({
        message: "lessonId y newOrder son obligatorios"
      });
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: "Lección no encontrada" });
    }

    const existingOrder = await Lesson.findOne({
      pathId: lesson.pathId,
      order: newOrder
    });

    if (existingOrder) {
      // intercambiamos órdenes
      existingOrder.order = lesson.order;
      await existingOrder.save();
    }

    lesson.order = newOrder;
    await lesson.save();

    res.json({ message: "Orden actualizado correctamente" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// ==============================
// GET LESSONS BY PATH (ADMIN VIEW)
// ==============================
exports.getLessonsByPath = async (req, res) => {
  try {
    const { pathId } = req.params;

    const lessons = await Lesson.find({ pathId })
      .sort({ order: 1 });

    res.json(lessons);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// =====================================================
// CULTURE OPERATIONS (Admin)
// =====================================================

/**
 * Get all culture content (Admin)
 */
exports.getAllCulture = async (req, res) => {
  try {
    const culture = await Culture.find()
      .populate('countryId', 'name code icon')
      .sort({ createdAt: -1 });
    
    res.json(culture);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get culture by country
 */
exports.getCultureByCountry = async (req, res) => {
  try {
    const { countryId } = req.params;
    const culture = await Culture.find({ countryId, isActive: true })
      .populate('countryId', 'name code icon')
      .populate('relatedRecipes', 'title imageUrl')
      .sort({ createdAt: -1 });
    
    res.json(culture);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Create culture content
 */
exports.createCulture = async (req, res) => {
  try {
    const {
      countryId,
      title,
      description,
      category,
      difficulty,
      xpReward,
      imageUrl,
      steps,
      culturalSignificance,
      historicalBackground,
      relatedRecipes,
      tags,
      isPremium
    } = req.body;

    // Validation
    if (!countryId || !title) {
      return res.status(400).json({ message: "countryId y title son requeridos" });
    }

    const country = await Country.findById(countryId);
    if (!country) {
      return res.status(404).json({ message: "País no encontrado" });
    }

    const newCulture = new Culture({
      countryId,
      title,
      description: description || '',
      category: category || 'tradition',
      difficulty: difficulty || 'medium',
      xpReward: xpReward || 50,
      imageUrl: imageUrl || '',
      steps: steps || [],
      culturalSignificance: culturalSignificance || '',
      historicalBackground: historicalBackground || '',
      relatedRecipes: relatedRecipes || [],
      tags: tags || [],
      isPremium: isPremium || false,
      isActive: true
    });

    const savedCulture = await newCulture.save();
    await savedCulture.populate(['countryId', 'relatedRecipes']);

    res.status(201).json(savedCulture);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update culture content
 */
exports.updateCulture = async (req, res) => {
  try {
    const { cultureId } = req.params;
    const updates = req.body;

    const culture = await Culture.findByIdAndUpdate(
      cultureId,
      { ...updates, updatedAt: Date.now() },
      { new: true }
    ).populate(['countryId', 'relatedRecipes']);

    if (!culture) {
      return res.status(404).json({ message: "Contenido cultural no encontrado" });
    }

    res.json(culture);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete culture content
 */
exports.deleteCulture = async (req, res) => {
  try {
    const { cultureId } = req.params;

    const culture = await Culture.findByIdAndDelete(cultureId);
    if (!culture) {
      return res.status(404).json({ message: "Contenido cultural no encontrado" });
    }

    res.json({ message: "Contenido cultural eliminado" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Add step to culture
 */
exports.addCultureStep = async (req, res) => {
  try {
    const { cultureId } = req.params;
    const step = req.body;

    if (!step.id || !step.order || !step.title) {
      return res.status(400).json({ message: "id, order, y title son requeridos" });
    }

    const culture = await Culture.findByIdAndUpdate(
      cultureId,
      { $push: { steps: step }, updatedAt: Date.now() },
      { new: true }
    );

    if (!culture) {
      return res.status(404).json({ message: "Contenido cultural no encontrado" });
    }

    res.json(culture);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update culture step
 */
exports.updateCultureStep = async (req, res) => {
  try {
    const { cultureId, stepId } = req.params;
    const stepUpdate = req.body;

    const culture = await Culture.findById(cultureId);
    if (!culture) {
      return res.status(404).json({ message: "Contenido cultural no encontrado" });
    }

    const stepIndex = culture.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) {
      return res.status(404).json({ message: "Paso no encontrado" });
    }

    culture.steps[stepIndex] = { ...culture.steps[stepIndex], ...stepUpdate };
    culture.updatedAt = Date.now();
    const saved = await culture.save();

    res.json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete culture step
 */
exports.deleteCultureStep = async (req, res) => {
  try {
    const { cultureId, stepId } = req.params;

    const culture = await Culture.findByIdAndUpdate(
      cultureId,
      {
        $pull: { steps: { id: stepId } },
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!culture) {
      return res.status(404).json({ message: "Contenido cultural no encontrado" });
    }

    res.json(culture);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
