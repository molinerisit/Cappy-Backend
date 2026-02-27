const LearningNode = require('../models/LearningNode.model');
const LearningPath = require('../models/LearningPath.model');
const NodeGroup = require('../models/NodeGroup.model');
const Recipe = require('../models/Recipe.model');
const Culture = require('../models/Culture.model');
const RecipeStep = require('../models/RecipeStep.model');
const CultureStep = require('../models/CultureStep.model');
const mongoose = require('mongoose');

const NODE_TYPES = [
  'recipe',
  'explanation',
  'tips',
  'quiz',
  'technique',
  'cultural',
  'challenge',
  'skill'
];

const NODE_STATUS = ['active', 'draft', 'archived'];
const CARD_TYPES = ['text', 'list', 'image', 'video', 'animation', 'quiz', 'timer'];

// Helper: Normalize ID to ObjectId
const normalizeId = (id) => {
  if (!id) return null;
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
};

// Helper: Convert legacy RecipeStep to new format (step with cards)
const convertRecipeStepToNewFormat = (recipeStep, order) => {
  const cards = [];
  
  // Add text card if there's a description
  if (recipeStep.description) {
    cards.push({
      type: 'text',
      data: { text: recipeStep.description }
    });
  }
  
  // Add image card if there's an image
  if (recipeStep.image) {
    cards.push({
      type: 'image',
      data: { imageUrl: recipeStep.image }
    });
  }
  
  // Add timer card if there's a timer
  if (recipeStep.hasTimer && recipeStep.timerDurationSeconds) {
    cards.push({
      type: 'timer',
      data: { 
        duration: recipeStep.timerDurationSeconds,
        autoStart: false 
      }
    });
  }
  
  return {
    _id: recipeStep._id,
    title: recipeStep.title || 'Paso',
    order: order,
    cards: cards
  };
};

// Helper: Convert legacy CultureStep to new format
const convertCultureStepToNewFormat = (cultureStep, order) => {
  const cards = [];
  
  // Add text card if there's a description
  if (cultureStep.description) {
    cards.push({
      type: 'text',
      data: { text: cultureStep.description }
    });
  }
  
  // Add image card if there's an image
  if (cultureStep.image) {
    cards.push({
      type: 'image',
      data: { imageUrl: cultureStep.image }
    });
  }
  
  return {
    _id: cultureStep._id,
    title: cultureStep.title || 'Paso',
    order: order,
    cards: cards
  };
};

const ensurePathExists = async (pathId) => {
  const path = await LearningPath.findById(pathId);
  if (!path) {
    const error = new Error('Path no encontrado');
    error.statusCode = 404;
    throw error;
  }
  return path;
};

const ensureNodeExists = async (nodeId) => {
  const node = await LearningNode.findById(nodeId);
  if (!node) {
    const error = new Error('Nodo no encontrado');
    error.statusCode = 404;
    throw error;
  }
  return node;
};

const listGroupsByPath = async (pathId) => {
  const pathIdObj = normalizeId(pathId);
  console.log(`🔍 [listGroupsByPath] pathId: ${pathId} -> ${pathIdObj}`);
  await ensurePathExists(pathIdObj);
  return NodeGroup.find({ pathId: pathIdObj, isDeleted: false }).sort({ order: 1 });
};

const createGroup = async (pathId, payload) => {
  const pathIdObj = normalizeId(pathId);
  console.log(`✏️ [createGroup] pathId: ${pathId} -> ${pathIdObj}`);
  await ensurePathExists(pathIdObj);
  if (!payload.title) {
    const error = new Error('title es requerido');
    error.statusCode = 400;
    throw error;
  }

  const group = new NodeGroup({
    pathId: pathIdObj,
    title: payload.title,
    order: payload.order ?? 1
  });

  return group.save();
};

const updateGroup = async (groupId, payload) => {
  const group = await NodeGroup.findByIdAndUpdate(groupId, payload, {
    new: true
  });

  if (!group) {
    const error = new Error('Grupo no encontrado');
    error.statusCode = 404;
    throw error;
  }

  return group;
};

const deleteGroup = async (groupId) => {
  const group = await NodeGroup.findByIdAndUpdate(
    groupId,
    { isDeleted: true },
    { new: true }
  );

  if (!group) {
    const error = new Error('Grupo no encontrado');
    error.statusCode = 404;
    throw error;
  }

  return group;
};

const getOrCreateDefaultGroup = async (pathId) => {
  const pathIdObj = normalizeId(pathId);
  console.log(`🔍 [getOrCreateDefaultGroup] pathId: ${pathId} -> ${pathIdObj}`);
  
  let defaultGroup = await NodeGroup.findOne({
    pathId: pathIdObj,
    title: 'General',
    isDeleted: false
  });

  if (!defaultGroup) {
    defaultGroup = await NodeGroup.create({
      pathId: pathIdObj,
      title: 'General',
      order: 1
    });
    console.log(`✅ [getOrCreateDefaultGroup] Created new General group: ${defaultGroup._id}`);
  }

  return defaultGroup;
};

const listNodesByPath = async (pathId) => {
  const pathIdObj = normalizeId(pathId);
  console.log(`🔍 [listNodesByPath] pathId: ${pathId} -> ${pathIdObj}`);
  await ensurePathExists(pathIdObj);
  return LearningNode.find({ pathId: pathIdObj, isDeleted: false })
    .populate('groupId', 'title order')
    .sort({ level: 1, positionIndex: 1 });
};

// NEW: List nodes including recipes/culture as virtual nodes (for admin v2)
const listNodesByPathWithContent = async (pathId) => {
  const pathIdObj = normalizeId(pathId);
  console.log(`\n🔍 [listNodesByPathWithContent] Starting for pathId: ${pathId} (converted to: ${pathIdObj})`);
  
  const path = await ensurePathExists(pathIdObj);
  console.log(`✅ [listNodesByPathWithContent] Path found: ${path._id}, countryId: ${path.countryId}`);
  
  // Get actual learning nodes
  console.log(`🔍 [listNodesByPathWithContent] Querying nodes with: { pathId: "${pathIdObj}", isDeleted: false }`);
  const learningNodes = await LearningNode.find({ pathId: pathIdObj, isDeleted: false })
    .populate('groupId', 'title order')
    .sort({ level: 1, positionIndex: 1 });

  console.log(`📚 [listNodesByPathWithContent] Found ${learningNodes.length} learning nodes`);
  const allNodes  = [...learningNodes];

  // Always include recipes/culture as virtual nodes if path is country-based
  if (path.countryId) {
    // Get existing learning node IDs to avoid duplicates
    const existingIds = new Set(learningNodes.map(n => n._id.toString()));

    // Calculate next available level for virtual nodes
    const maxLevel = learningNodes.length > 0 
      ? Math.max(...learningNodes.map(n => n.level || 1))
      : 0;
    const virtualLevel = maxLevel + 1;

    // Add recipes as virtual nodes
    const recipes = await Recipe.find({ countryId: path.countryId }).sort({ createdAt: 1 });
    console.log(`🍳 Found ${recipes.length} recipes for country ${path.countryId}`);
    
    const recipeVirtualNodes = [];
    for (let index = 0; index < recipes.length; index++) {
      const recipe = recipes[index];
      if (existingIds.has(recipe._id.toString())) continue;
      
      // Use recipe.steps (inline format) - no need to query RecipeSteps collection
      const recipeSteps = recipe.steps || [];
      console.log(`  📝 Recipe "${recipe.title}" has ${recipeSteps.length} inline steps`);
      
      // Convert inline steps to new format (steps with cards)
      const stepsWithCards = recipeSteps.map((step, idx) => {
        const cards = [];
        
        // Add instruction as text card
        if (step.instruction) {
          cards.push({
            type: 'text',
            data: { text: step.instruction }
          });
        }
        
        // Add image card if exists
        if (step.imageUrl) {
          cards.push({
            type: 'image',
            data: { imageUrl: step.imageUrl }
          });
        }
        
        // Add timer if duration exists
        if (step.duration && step.duration > 0) {
          cards.push({
            type: 'timer',
            data: { duration: step.duration, autoStart: false }
          });
        }
        
        return {
          _id: step._id || step.id,
          title: step.title || `Paso ${idx + 1}`,
          order: step.order || idx + 1,
          cards: cards
        };
      });
      
      recipeVirtualNodes.push({
        _id: recipe._id,
        pathId: path._id,
        title: recipe.title,
        description: recipe.description || `Aprende a preparar ${recipe.title}`,
        type: 'recipe',
        level: virtualLevel,
        positionIndex: index + 1,
        xpReward: recipe.xpReward || 50,
        status: 'active',
        isVirtual: true,
        steps: stepsWithCards
      });
    }

    console.log(`✅ Created ${recipeVirtualNodes.length} recipe virtual nodes`);

    // Add culture as virtual nodes
    const cultureItems = await Culture.find({ countryId: path.countryId }).sort({ createdAt: 1 });
    console.log(`🌍 Found ${cultureItems.length} culture items for country ${path.countryId}`);
    
    const cultureVirtualNodes = [];
    for (let index = 0; index < cultureItems.length; index++) {
      const item = cultureItems[index];
      if (existingIds.has(item._id.toString())) continue;
      
      // Use culture.steps (inline format) - no need to query CultureSteps collection
      const cultureSteps = item.steps || [];
      console.log(`  📝 Culture "${item.title}" has ${cultureSteps.length} inline steps`);
      
      // Convert inline steps to new format (steps with cards)
      const stepsWithCards = cultureSteps.map((step, idx) => {
        const cards = [];

        // Add description/content as text card
        const textValue = step.description || step.content;
        if (textValue) {
          cards.push({
            type: 'text',
            data: { text: textValue }
          });
        }

        // Add image card if exists
        const imageValue = step.image || step.imageUrl;
        if (imageValue) {
          cards.push({
            type: 'image',
            data: { imageUrl: imageValue }
          });
        }

        // Add video card if exists
        if (step.videoUrl) {
          cards.push({
            type: 'video',
            data: { videoUrl: step.videoUrl }
          });
        }

        // Add timer if duration exists
        if (step.duration && step.duration > 0) {
          cards.push({
            type: 'timer',
            data: { duration: step.duration }
          });
        }

        return {
          _id: step._id || step.id,
          title: step.title || `Paso ${idx + 1}`,
          order: step.order || idx + 1,
          cards: cards
        };
      });
      
      cultureVirtualNodes.push({
        _id: item._id,
        pathId: path._id,
        title: item.title,
        description: item.description || `Explora ${item.title}`,
        type: 'cultural',
        level: virtualLevel,
        positionIndex: recipeVirtualNodes.length + index + 1,
        xpReward: item.xpReward || 30,
        status: 'active',
        isVirtual: true,
        steps: stepsWithCards
      });
    }

    console.log(`✅ Created ${cultureVirtualNodes.length} culture virtual nodes`);
    allNodes.push(...recipeVirtualNodes, ...cultureVirtualNodes);
  }

  console.log(`📦 Returning total of ${allNodes.length} nodes`);
  return allNodes;
};

const createNode = async (payload) => {
  const {
    pathId,
    groupId,
    title,
    type,
    status,
    level,
    positionIndex,
    xpReward,
    isLockedByDefault,
    steps,
    metadata
  } = payload;

  const pathIdObj = normalizeId(pathId);
  const groupIdObj = normalizeId(groupId);

  console.log(`\n✏️ [createNode] Creating node with payload:`, {
    pathId: pathIdObj,
    groupId: groupIdObj,
    title,
    type,
    status,
    level,
    positionIndex,
    xpReward
    ,isLockedByDefault
  });

  if (!pathIdObj || !title) {
    const error = new Error('pathId y title son requeridos');
    error.statusCode = 400;
    throw error;
  }

  await ensurePathExists(pathIdObj);

  // Si no se proporciona groupId, obtener o crear un grupo por defecto
  let finalGroupId = groupIdObj;
  if (!groupIdObj) {
    let defaultGroup = await NodeGroup.findOne({
      pathId: pathIdObj,
      title: 'General',
      isDeleted: false
    });

    if (!defaultGroup) {
      defaultGroup = new NodeGroup({
        pathId: pathIdObj,
        title: 'General',
        order: 1,
        isDeleted: false
      });
      await defaultGroup.save();
      console.log(`📝 [createNode] Created default group: ${defaultGroup._id}`);
    }
    finalGroupId = defaultGroup._id;
  } else {
    const group = await NodeGroup.findOne({ _id: groupIdObj, isDeleted: false });
    if (!group) {
      const error = new Error('Grupo no encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (group.pathId.toString() != pathIdObj.toString()) {
      const error = new Error('Grupo no pertenece al camino');
      error.statusCode = 400;
      throw error;
    }
  }

  if (!type || !NODE_TYPES.includes(type)) {
    const error = new Error('type inválido');
    error.statusCode = 400;
    throw error;
  }

  if (status && !NODE_STATUS.includes(status)) {
    const error = new Error('status inválido');
    error.statusCode = 400;
    throw error;
  }

  const normalizedLevel = Math.max(1, Number(level ?? 1));
  const normalizedPosition = Math.max(1, Number(positionIndex ?? 1));

  const node = new LearningNode({
    pathId: pathIdObj,
    groupId: finalGroupId,
    title,
    type,
    status: status ?? 'active',
    level: normalizedLevel,
    positionIndex: normalizedPosition,
    xpReward: xpReward ?? 0,
    isLockedByDefault: isLockedByDefault !== false,
    steps: steps ?? [],
    metadata: metadata ?? {},
    isDeleted: false
  });

  const savedNode = await node.save();
  
  console.log(`✅ [createNode] Node saved successfully:`, {
    _id: savedNode._id,
    pathId: savedNode.pathId,
    groupId: savedNode.groupId,
    title: savedNode.title,
    type: savedNode.type
  });

  // IMPORTANTE: Agregar el nodo al array 'nodes' de la ruta
  const updateResult = await LearningPath.findByIdAndUpdate(
    pathIdObj,
    { $addToSet: { nodes: savedNode._id } }
  );
  
  console.log(`✅ [createNode] Path updated with node. Path ID: ${pathIdObj}`);
  
  return savedNode;
};

const updateNode = async (nodeId, payload) => {
  if (payload.type && !NODE_TYPES.includes(payload.type)) {
    const error = new Error('type inválido');
    error.statusCode = 400;
    throw error;
  }

  if (payload.status && !NODE_STATUS.includes(payload.status)) {
    const error = new Error('status inválido');
    error.statusCode = 400;
    throw error;
  }

  const node = await LearningNode.findByIdAndUpdate(nodeId, payload, {
    new: true
  });

  if (!node) {
    const error = new Error('Nodo no encontrado');
    error.statusCode = 404;
    throw error;
  }

  return node;
};

const deleteNode = async (nodeId) => {
  const node = await LearningNode.findByIdAndUpdate(
    nodeId,
    { isDeleted: true, status: 'archived' },
    { new: true }
  );

  if (!node) {
    const error = new Error('Nodo no encontrado');
    error.statusCode = 404;
    throw error;
  }

  // Remover el nodo del array 'nodes' de la ruta
  if (node.pathId) {
    try {
      const pathId = node.pathId.toString ? node.pathId.toString() : node.pathId;
      await LearningPath.findByIdAndUpdate(
        pathId,
        { $pull: { nodes: node._id } }
      );
    } catch (err) {
      console.error(`Error removing node from path ${node.pathId}:`, err);
      // Don't throw - node is already deleted, this is cleanup
    }
  }

  return node;
};

const listNodeLibrary = async (filters) => {
  const query = { isDeleted: false };

  if (filters?.pathId) {
    query.pathId = filters.pathId;
  }

  if (filters?.groupId) {
    query.groupId = filters.groupId;
  }

  if (filters?.type) {
    query.type = filters.type;
  }

  if (filters?.status) {
    query.status = filters.status;
  }

  if (filters?.search) {
    query.title = { $regex: filters.search, $options: 'i' };
  }

  const searchRegex = filters?.search
    ? { $regex: filters.search, $options: 'i' }
    : null;

  const [learningNodes, recipes, cultures] = await Promise.all([
    LearningNode.find(query)
      .populate('pathId', 'title type')
      .populate('groupId', 'title order')
      .sort({ updatedAt: -1 }),
    !filters?.type || filters.type === 'recipe'
      ? Recipe.find(searchRegex ? { title: searchRegex } : {}).sort({
          updatedAt: -1
        })
      : [],
    !filters?.type || filters.type === 'cultural'
      ? Culture.find(searchRegex ? { title: searchRegex } : {}).sort({
          updatedAt: -1
        })
      : []
  ]);

  const recipeItems = recipes.map((recipe) => ({
    _id: recipe._id,
    title: recipe.title,
    type: 'recipe',
    status: recipe.isActive ? 'active' : 'archived',
    pathId: null,
    groupId: null,
    level: 0,
    xpReward: recipe.xpReward ?? 0,
    updatedAt: recipe.updatedAt,
    sourceType: 'recipe',
    isVirtual: true
  }));

  const cultureItems = cultures.map((culture) => ({
    _id: culture._id,
    title: culture.title,
    type: 'cultural',
    status: culture.isActive ? 'active' : 'archived',
    pathId: null,
    groupId: null,
    level: 0,
    xpReward: culture.xpReward ?? 0,
    updatedAt: culture.updatedAt,
    sourceType: 'culture',
    isVirtual: true
  }));

  return [...learningNodes, ...recipeItems, ...cultureItems].sort((a, b) => {
    const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return bDate - aDate;
  });
};

const reorderNodes = async (pathId, updates) => {
  await ensurePathExists(pathId);
  if (!Array.isArray(updates)) {
    const error = new Error('updates debe ser un array');
    error.statusCode = 400;
    throw error;
  }

  for (const update of updates) {
    await LearningNode.findByIdAndUpdate(update.nodeId, {
      level: update.level,
      positionIndex: update.positionIndex
    });
  }

  return listNodesByPath(pathId);
};

const importNode = async ({ targetPathId, nodeId, mode, sourceType }) => {
  await ensurePathExists(targetPathId);

  if (sourceType === 'recipe') {
    const recipe = await Recipe.findById(nodeId);
    if (!recipe) {
      const error = new Error('Receta no encontrada');
      error.statusCode = 404;
      throw error;
    }

    const group = await getOrCreateDefaultGroup(targetPathId);
    const recipeSteps = recipe.steps || [];
    const stepsWithCards = recipeSteps.map((step, idx) => {
      const cards = [];

      if (step.instruction) {
        cards.push({ type: 'text', data: { text: step.instruction } });
      }

      if (step.imageUrl) {
        cards.push({ type: 'image', data: { imageUrl: step.imageUrl } });
      }

      if (step.duration && step.duration > 0) {
        cards.push({ type: 'timer', data: { duration: step.duration } });
      }

      return {
        title: step.title || `Paso ${idx + 1}`,
        order: step.order || idx + 1,
        cards
      };
    });

    const newNode = await LearningNode.create({
      pathId: targetPathId,
      groupId: group._id,
      groupTitle: group.title,
      title: recipe.title,
      description: recipe.description || '',
      type: 'recipe',
      status: 'active',
      level: 1,
      positionIndex: 1,
      xpReward: recipe.xpReward ?? 0,
      servings: recipe.servings,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      ingredients: recipe.ingredients || [],
      tools: recipe.tools || [],
      tips: recipe.tips || [],
      tags: recipe.tags || [],
      media: recipe.imageUrl,
      steps: stepsWithCards,
      referencedRecipes: mode === 'linked' ? [recipe._id] : [],
      isLinked: mode === 'linked'
    });

    await LearningPath.findByIdAndUpdate(targetPathId, {
      $addToSet: { nodes: newNode._id }
    });

    return newNode;
  }

  if (sourceType === 'culture') {
    const culture = await Culture.findById(nodeId);
    if (!culture) {
      const error = new Error('Contenido cultural no encontrado');
      error.statusCode = 404;
      throw error;
    }

    const group = await getOrCreateDefaultGroup(targetPathId);
    const cultureSteps = culture.steps || [];
    const stepsWithCards = cultureSteps.map((step, idx) => {
      const cards = [];
      const textValue = step.description || step.content;
      if (textValue) {
        cards.push({ type: 'text', data: { text: textValue } });
      }
      const imageValue = step.image || step.imageUrl;
      if (imageValue) {
        cards.push({ type: 'image', data: { imageUrl: imageValue } });
      }
      if (step.videoUrl) {
        cards.push({ type: 'video', data: { videoUrl: step.videoUrl } });
      }
      if (step.duration && step.duration > 0) {
        cards.push({ type: 'timer', data: { duration: step.duration } });
      }

      return {
        title: step.title || `Paso ${idx + 1}`,
        order: step.order || idx + 1,
        cards
      };
    });

    const newNode = await LearningNode.create({
      pathId: targetPathId,
      groupId: group._id,
      groupTitle: group.title,
      title: culture.title,
      description: culture.description || '',
      type: 'cultural',
      status: 'active',
      level: 1,
      positionIndex: 1,
      xpReward: culture.xpReward ?? 0,
      tips: culture.tags || [],
      tags: culture.tags || [],
      media: culture.imageUrl,
      steps: stepsWithCards,
      referencedCulture: mode === 'linked' ? [culture._id] : [],
      isLinked: mode === 'linked'
    });

    await LearningPath.findByIdAndUpdate(targetPathId, {
      $addToSet: { nodes: newNode._id }
    });

    return newNode;
  }

  const originalNode = await LearningNode.findById(nodeId);
  if (!originalNode) {
    const error = new Error('Nodo original no encontrado');
    error.statusCode = 404;
    throw error;
  }

  const baseData = {
    ...originalNode.toObject(),
    _id: undefined,
    __v: undefined,
    pathId: targetPathId,
    isDeleted: false,
    createdAt: undefined,
    updatedAt: undefined
  };

  if (mode === 'linked') {
    const linkedNode = new LearningNode({
      ...baseData,
      originalNodeId: originalNode._id,
      isLinked: true
    });

    return linkedNode.save();
  }

  const copyNode = new LearningNode({
    ...baseData,
    originalNodeId: originalNode._id,
    isLinked: false
  });

  return copyNode.save();
};

const archiveNode = async (nodeId) => {
  const node = await LearningNode.findByIdAndUpdate(
    nodeId,
    { status: 'archived' },
    { new: true }
  );

  if (!node) {
    const error = new Error('Nodo no encontrado');
    error.statusCode = 404;
    throw error;
  }

  return node;
};

const duplicateNode = async (nodeId, targetPathId) => {
  const originalNode = await LearningNode.findById(nodeId);
  if (!originalNode) {
    const error = new Error('Nodo original no encontrado');
    error.statusCode = 404;
    throw error;
  }

  const destinationPathId = targetPathId || originalNode.pathId;
  await ensurePathExists(destinationPathId);

  const baseData = {
    ...originalNode.toObject(),
    _id: undefined,
    __v: undefined,
    pathId: destinationPathId,
    originalNodeId: originalNode._id,
    isLinked: false,
    isDeleted: false,
    createdAt: undefined,
    updatedAt: undefined
  };

  const copyNode = new LearningNode(baseData);
  return copyNode.save();
};

const getNodeRelations = async (nodeId) => {
  const node = await ensureNodeExists(nodeId);

  const linkedInstances = await LearningNode.find({
    originalNodeId: node._id,
    isDeleted: false
  })
    .select('title pathId status')
    .populate('pathId', 'title type');

  const referencedBy = await LearningNode.find({
    referencedNodes: node._id,
    isDeleted: false
  })
    .select('title pathId status')
    .populate('pathId', 'title type');

  return {
    nodeId: node._id,
    linkedInstances,
    referencedBy
  };
};

const addStep = async (nodeId, payload) => {
  const node = await ensureNodeExists(nodeId);
  if (!payload?.title) {
    const error = new Error('title es requerido');
    error.statusCode = 400;
    throw error;
  }

  node.steps.push({
    title: payload.title,
    order: payload.order ?? node.steps.length + 1,
    description: payload.description ?? '',
    estimatedTime: payload.estimatedTime ?? null,
    cards: payload.cards ?? []
  });

  await node.save();
  return node;
};

const updateStep = async (nodeId, stepId, payload) => {
  const node = await ensureNodeExists(nodeId);
  const step = node.steps.id(stepId);
  if (!step) {
    const error = new Error('Paso no encontrado');
    error.statusCode = 404;
    throw error;
  }

  if (payload?.title !== undefined) step.title = payload.title;
  if (payload?.order !== undefined) step.order = payload.order;
  if (payload?.description !== undefined) step.description = payload.description;
  if (payload?.estimatedTime !== undefined) {
    step.estimatedTime = payload.estimatedTime;
  }

  await node.save();
  return node;
};

const deleteStep = async (nodeId, stepId) => {
  const node = await ensureNodeExists(nodeId);
  
  // Remove step using $pull operator (more reliable than subdoc.remove())
  const updated = await LearningNode.findByIdAndUpdate(
    nodeId,
    { $pull: { steps: { _id: stepId } } },
    { new: true }
  );

  if (!updated) {
    const error = new Error('Error al eliminar paso');
    error.statusCode = 400;
    throw error;
  }

  return updated;
};

const addCard = async (nodeId, stepId, payload) => {
  const node = await ensureNodeExists(nodeId);
  const step = node.steps.id(stepId);
  if (!step) {
    const error = new Error('Paso no encontrado');
    error.statusCode = 404;
    throw error;
  }

  // Validation: Maximum 6 cards per step
  if (step.cards && step.cards.length >= 6) {
    const error = new Error('Máximo 6 cards por paso');
    error.statusCode = 400;
    throw error;
  }

  if (!payload?.type || !CARD_TYPES.includes(payload.type)) {
    const error = new Error('type de card inválido');
    error.statusCode = 400;
    throw error;
  }

  // Validation: Timer duration must be >= 0
  if (payload.type === 'timer' && payload.data?.duration !== undefined) {
    const duration = payload.data.duration;
    if (typeof duration !== 'number' || duration < 0) {
      const error = new Error('Timer duration debe ser un número >= 0');
      error.statusCode = 400;
      throw error;
    }
  }

  step.cards.push({
    type: payload.type,
    data: payload.data ?? {}
  });

  await node.save();
  return node;
};

const updateCard = async (nodeId, stepId, cardId, payload) => {
  const node = await ensureNodeExists(nodeId);
  const step = node.steps.id(stepId);
  if (!step) {
    const error = new Error('Paso no encontrado');
    error.statusCode = 404;
    throw error;
  }

  const card = step.cards.id(cardId);
  if (!card) {
    const error = new Error('Card no encontrada');
    error.statusCode = 404;
    throw error;
  }

  if (payload?.type) {
    if (!CARD_TYPES.includes(payload.type)) {
      const error = new Error('type de card inválido');
      error.statusCode = 400;
      throw error;
    }
    card.type = payload.type;
  }

  if (payload?.data !== undefined) {
    card.data = payload.data;
  }

  await node.save();
  return node;
};

const deleteCard = async (nodeId, stepId, cardId) => {
  const node = await ensureNodeExists(nodeId);
  
  // Remove card using $pull operator (more reliable than subdoc.remove())
  const updated = await LearningNode.findByIdAndUpdate(
    nodeId,
    { $pull: { 'steps.$[step].cards': { _id: cardId } } },
    { 
      new: true,
      arrayFilters: [{ 'step._id': stepId }]
    }
  );

  if (!updated) {
    const error = new Error('Error al eliminar tarjeta');
    error.statusCode = 400;
    throw error;
  }

  return updated;
};

module.exports = {
  listGroupsByPath,
  createGroup,
  updateGroup,
  deleteGroup,
  listNodesByPath,
  listNodesByPathWithContent,
  createNode,
  updateNode,
  deleteNode,
  listNodeLibrary,
  reorderNodes,
  importNode,
  archiveNode,
  duplicateNode,
  getNodeRelations,
  addStep,
  updateStep,
  deleteStep,
  addCard,
  updateCard,
  deleteCard
};
