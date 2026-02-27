const Country = require("../models/Country.model");
const Recipe = require("../models/Recipe.model");
const Skill = require("../models/Skill.model");
const UserProgress = require("../models/UserProgress.model");
const NodeGroup = require("../models/NodeGroup.model");
const LearningNode = require("../models/LearningNode.model");
const LearningPath = require("../models/LearningPath.model");
const { invalidateCatalogCaches } = require("../services/catalogCache.service");

const toIdString = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.toString) {
    const normalized = value.toString();
    return normalized && normalized !== '[object Object]' ? normalized : null;
  }
  return null;
};

const getUserPremiumAccess = (user) => {
  if (!user) return false;

  const directFlags = [
    user.isPremium,
    user.hasPremium,
    user.premium,
    user.isPro,
    user.hasPro,
    user.pro,
    user.premiumAccess,
    user.hasPremiumAccess,
  ];

  if (directFlags.some((flag) => flag === true)) {
    return true;
  }

  if (user.subscription && typeof user.subscription === 'object') {
    if (user.subscription.isActive === true || user.subscription.active === true) {
      return true;
    }

    const plan = (user.subscription.plan || user.subscription.tier || '').toString().toLowerCase();
    if (plan.includes('premium') || plan.includes('pro')) {
      return true;
    }
  }

  return user.role === 'admin';
};

const getUserUnlockContext = async (user) => {
  const userLevel = Math.max(1, Number(user?.level || 1));
  const hasPremiumAccess = getUserPremiumAccess(user);

  if (!user?._id) {
    return {
      userLevel,
      hasPremiumAccess,
      completedGroupIds: new Set(),
    };
  }

  const progressDocs = await UserProgress.find({ userId: user._id })
    .select('completedNodes.nodeId')
    .lean();

  const completedNodeIds = new Set();

  for (const progress of progressDocs) {
    const completedNodes = Array.isArray(progress?.completedNodes)
      ? progress.completedNodes
      : [];

    for (const completedNode of completedNodes) {
      const nodeId = toIdString(completedNode?.nodeId);
      if (nodeId) {
        completedNodeIds.add(nodeId);
      }
    }
  }

  if (!completedNodeIds.size) {
    return {
      userLevel,
      hasPremiumAccess,
      completedGroupIds: new Set(),
    };
  }

  const completedNodes = await LearningNode.find({
    _id: { $in: Array.from(completedNodeIds) },
    isDeleted: { $ne: true },
  })
    .select('groupId')
    .lean();

  const completedGroupIds = new Set(
    completedNodes
      .map((node) => toIdString(node?.groupId))
      .filter(Boolean)
  );

  return {
    userLevel,
    hasPremiumAccess,
    completedGroupIds,
  };
};

const buildCountryUnlock = (country, unlockContext) => {
  const unlockLevel = Math.max(1, Number(country?.unlockLevel || 1));
  const levelMet = unlockContext.userLevel >= unlockLevel;

  const requiredGroupIds = Array.isArray(country?.requiredGroupIds)
    ? country.requiredGroupIds.map((groupId) => toIdString(groupId)).filter(Boolean)
    : [];

  const missingGroupIds = requiredGroupIds.filter(
    (groupId) => !unlockContext.completedGroupIds.has(groupId)
  );

  const groupsMet = requiredGroupIds.length === 0
    ? true
    : country?.unlockRequiresAnyGroup === true
    ? missingGroupIds.length < requiredGroupIds.length
    : missingGroupIds.length === 0;

  const premiumMet = country?.isPremium ? unlockContext.hasPremiumAccess : true;
  const isUnlocked = levelMet && groupsMet && premiumMet;

  return {
    isUnlocked,
    levelMet,
    groupsMet,
    premiumMet,
    unlockLevel,
    requiredGroupIds,
    missingGroupIds,
    unlockRequiresAnyGroup: country?.unlockRequiresAnyGroup === true,
  };
};

const withCountryUnlock = (country, unlockContext) => ({
  ...country,
  unlock: buildCountryUnlock(country, unlockContext),
});

const ensureCountryUnlockedOrThrow = async (country, user) => {
  const unlockContext = await getUserUnlockContext(user);
  const unlock = buildCountryUnlock(country, unlockContext);

  if (unlock.isUnlocked) {
    return unlock;
  }

  const reason = !unlock.premiumMet
    ? 'PREMIUM_REQUIRED'
    : !unlock.levelMet
    ? 'LEVEL_REQUIRED'
    : 'GROUPS_REQUIRED';

  const error = new Error('País bloqueado para este usuario');
  error.statusCode = 403;
  error.code = reason;
  error.unlock = unlock;
  throw error;
};

// ==============================
// GET ALL COUNTRIES
// ==============================
exports.getAllCountries = async (req, res) => {
  try {
    const unlockContext = await getUserUnlockContext(req.user);

    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);
    const hasPagination = Number.isFinite(page) || Number.isFinite(limit);

    const safePage = Math.max(Number.isFinite(page) ? page : 1, 1);
    const safeLimit = Math.min(Math.max(Number.isFinite(limit) ? limit : 20, 1), 100);
    const skip = (safePage - 1) * safeLimit;

    const countrySelect = [
      'name',
      'code',
      'icon',
      'description',
      'flagUrl',
      'order',
      'isActive',
      'hasRecipes',
      'hasCookingSchool',
      'hasCulture',
      'isPremium',
      'presentationHeadline',
      'presentationSummary',
      'heroImageUrl',
      'iconicDishes',
      'unlockLevel',
      'requiredGroupIds',
      'unlockRequiresAnyGroup',
    ].join(' ');

    if (!hasPagination) {
      const countries = await Country.find({ isActive: true })
        .select(countrySelect)
        .sort({ order: 1, name: 1 })
        .lean();

      return res.json(countries.map((country) => withCountryUnlock(country, unlockContext)));
    }

    const [total, countries] = await Promise.all([
      Country.countDocuments({ isActive: true }),
      Country.find({ isActive: true })
        .select(countrySelect)
        .sort({ order: 1, name: 1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
    ]);

    return res.json({
      data: countries.map((country) => withCountryUnlock(country, unlockContext)),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(Math.ceil(total / safeLimit), 1),
        hasMore: skip + countries.length < total,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// GET COUNTRIES PAGINATED (Admin)
// ==============================
exports.getCountriesPaginated = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const rawLimit = parseInt(req.query.limit, 10) || 20;
    const limit = Math.min(Math.max(rawLimit, 1), 100);
    const skip = (page - 1) * limit;

    const filter = {};
    const status = (req.query.status || 'all').toString().toLowerCase();
    const premium = (req.query.premium || 'all').toString().toLowerCase();
    const search = (req.query.search || '').toString().trim();
    const requestedSortBy = (req.query.sortBy || 'order').toString();
    const requestedSortDir = (req.query.sortDir || 'asc').toString().toLowerCase();

    const allowedSortFields = new Set([
      'order',
      'name',
      'code',
      'isPremium',
      'isActive',
      'createdAt',
      'updatedAt',
    ]);

    const sortBy = allowedSortFields.has(requestedSortBy)
      ? requestedSortBy
      : 'order';
    const sortDirection = requestedSortDir === 'desc' ? -1 : 1;

    const sort = { [sortBy]: sortDirection };
    if (sortBy !== 'name') {
      sort.name = 1;
    }

    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }

    if (premium === 'premium') {
      filter.isPremium = true;
    } else if (premium === 'free') {
      filter.isPremium = false;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }

    const [total, countries] = await Promise.all([
      Country.countDocuments(filter),
      Country.find(filter)
        .select('name code icon description flagUrl order isActive hasRecipes hasCookingSchool hasCulture isPremium presentationHeadline presentationSummary heroImageUrl iconicDishes unlockLevel requiredGroupIds unlockRequiresAnyGroup')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.json({
      data: countries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
        hasMore: skip + countries.length < total,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// GET UNLOCK GROUP OPTIONS (Admin)
// ==============================
exports.getUnlockGroupOptions = async (req, res) => {
  try {
    const { countryId } = req.query;
    const pathType = (req.query.pathType || 'country_recipe').toString();

    const groupFilter = { isDeleted: { $ne: true } };

    if (countryId) {
      const pathFilter = {
        countryId,
        isActive: true,
      };

      if (pathType && pathType !== 'all') {
        pathFilter.type = pathType;
      }

      const paths = await LearningPath.find(pathFilter).select('_id').lean();
      const pathIds = paths.map((path) => path._id);

      if (!pathIds.length) {
        return res.json([]);
      }

      groupFilter.pathId = { $in: pathIds };
    }

    const groups = await NodeGroup.find(groupFilter)
      .populate('pathId', 'title type')
      .sort({ updatedAt: -1, title: 1 })
      .lean();

    const options = groups.map((group) => ({
      id: group._id?.toString(),
      title: group.title || 'Grupo',
      order: group.order || 0,
      pathId: group.pathId?._id?.toString() || null,
      pathTitle: group.pathId?.title || 'Sin camino',
      pathType: group.pathId?.type || 'unknown',
    }));

    res.json(options);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// GET COUNTRY WITH ALL CONTENT
// ==============================
exports.getCountry = async (req, res) => {
  try {
    const { countryId } = req.params;

    const country = await Country.findById(countryId)
      .populate('recipes')
      .populate('skills')
      .populate('lessons');

    if (!country) {
      return res.status(404).json({ message: "País no encontrado" });
    }

    await ensureCountryUnlockedOrThrow(country, req.user);

    res.json(country);
  } catch (error) {
    if (error.statusCode === 403) {
      return res.status(403).json({
        message: error.message,
        code: error.code,
        unlock: error.unlock,
      });
    }

    res.status(500).json({ message: error.message });
  }
};

// ==============================
// GET COUNTRY HUB (unified view)
// ==============================
exports.getCountryHub = async (req, res) => {
  try {
    const { countryId } = req.params;

    const country = await Country.findById(countryId);
    if (!country) {
      return res.status(404).json({ message: "País no encontrado" });
    }

    const unlock = await ensureCountryUnlockedOrThrow(country, req.user);

    const hub = {
      id: country._id,
      name: country.name,
      code: country.code,
      icon: country.icon,
      flagUrl: country.flagUrl,
      isPremium: country.isPremium,
      unlock,
      sections: {}
    };

    // Add recipes section if enabled
    if (country.hasRecipes) {
      const recipes = await Recipe.find({ countryId }).select('_id title difficulty xpReward imageUrl');
      hub.sections.recipes = {
        title: "Recetas",
        description: "Aprende a cocinar recetas paso a paso",
        count: recipes.length,
        items: recipes
      };
    }

    // Add cooking school (skills) section if enabled
    if (country.hasCookingSchool) {
      const skills = await Skill.find({ countryId }).select('_id name category level');
      hub.sections.cookingSchool = {
        title: "Escuela de Cocina",
        description: "Domina habilidades culinarias",
        count: skills.length,
        items: skills
      };
    }

    // Add culture section if enabled
    if (country.hasCulture) {
      const CultureNode = require('../models/CultureNode.model');
      const cultureNodes = await CultureNode.find({ countryId }).select('_id title description xp isLocked');
      hub.sections.culture = {
        title: "Cultura",
        description: "Aprende sobre la cocina local",
        count: cultureNodes.length,
        items: cultureNodes
      };
    }

    res.json(hub);
  } catch (error) {
    if (error.statusCode === 403) {
      return res.status(403).json({
        message: error.message,
        code: error.code,
        unlock: error.unlock,
      });
    }

    res.status(500).json({ message: error.message });
  }
};

// ==============================
// GET COUNTRY SECTIONS
// ==============================
exports.getCountrySections = async (req, res) => {
  try {
    const { countryId } = req.params;

    const country = await Country.findById(countryId);
    if (!country) {
      return res.status(404).json({ message: "País no encontrado" });
    }

    await ensureCountryUnlockedOrThrow(country, req.user);

    const sections = {};

    // Add recipes section if enabled
    if (country.hasRecipes) {
      const recipes = await Recipe.find({ countryId }).select('_id title difficulty xpReward');
      sections.recipes = {
        title: "Recetas",
        description: "Aprende a cocinar recetas paso a paso",
        count: recipes.length,
        items: recipes
      };
    }

    // Add cooking school (skills) section if enabled
    if (country.hasCookingSchool) {
      const skills = await Skill.find({ countryId }).select('_id name category level');
      sections.cookingSchool = {
        title: "Escuela de Cocina",
        description: "Domina habilidades culinarias",
        count: skills.length,
        items: skills
      };
    }

    // Add culture section if enabled
    if (country.hasCulture) {
      // TODO: Populate with existing lessons
      sections.culture = {
        title: "Cultura",
        description: "Aprende sobre la cocina local",
        count: 0,
        items: []
      };
    }

    res.json(sections);
  } catch (error) {
    if (error.statusCode === 403) {
      return res.status(403).json({
        message: error.message,
        code: error.code,
        unlock: error.unlock,
      });
    }

    res.status(500).json({ message: error.message });
  }
};

// ==============================
// GET USER PROGRESS BY COUNTRY
// ==============================
exports.getUserCountryProgress = async (req, res) => {
  try {
    const { countryId } = req.params;
    const userId = req.user.id;

    const country = await Country.findById(countryId);
    if (!country) {
      return res.status(404).json({ message: "País no encontrado" });
    }

    const userProgress = await UserProgress.findOne({ userId });
    if (!userProgress) {
      return res.json({
        completedRecipes: 0,
        learnedSkills: 0,
        totalXp: 0
      });
    }

    // Count recipes from this country
    const countryRecipes = await Recipe.find({ countryId }).select('_id');
    const countryRecipeIds = countryRecipes.map(r => r._id.toString());
    const completedRecipesInCountry = userProgress.completedRecipes.filter(r =>
      countryRecipeIds.includes(r.recipeId.toString())
    ).length;

    // Count skills from this country
    const countrySkills = await Skill.find({ countryId }).select('_id');
    const countrySkillIds = countrySkills.map(s => s._id.toString());
    const learnedSkillsInCountry = userProgress.learnedSkills.filter(s =>
      countrySkillIds.includes(s.skillId.toString())
    ).length;

    res.json({
      completedRecipes: completedRecipesInCountry,
      totalRecipesInCountry: countryRecipes.length,
      learnedSkills: learnedSkillsInCountry,
      totalSkillsInCountry: countrySkills.length,
      totalXp: userProgress.xp,
      level: userProgress.level
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// CREATE COUNTRY (Admin)
// ==============================
exports.createCountry = async (req, res) => {
  try {
    const {
      name,
      code,
      icon,
      description,
      flagUrl,
      presentationHeadline,
      presentationSummary,
      heroImageUrl,
      iconicDishes,
      unlockLevel,
      requiredGroupIds,
      unlockRequiresAnyGroup,
      order,
      hasRecipes,
      hasCookingSchool,
      hasCulture,
      isPremium
    } = req.body;

    if (!name || !code) {
      return res.status(400).json({ 
        message: "name y code son obligatorios" 
      });
    }

    // Check if country code already exists
    const existingCountry = await Country.findOne({ code });
    if (existingCountry) {
      return res.status(400).json({ 
        message: "Country con ese código ya existe" 
      });
    }

    const country = await Country.create({
      name,
      code,
      icon: icon || '🌍',
      description,
      flagUrl,
      presentationHeadline,
      presentationSummary,
      heroImageUrl,
      iconicDishes: Array.isArray(iconicDishes)
        ? iconicDishes
            .map((dish) => String(dish || '').trim())
            .filter(Boolean)
            .slice(0, 6)
        : [],
      unlockLevel: Number.isFinite(Number(unlockLevel))
        ? Math.max(1, Math.floor(Number(unlockLevel)))
        : 1,
      requiredGroupIds: Array.isArray(requiredGroupIds)
        ? requiredGroupIds.map((id) => id?.toString()).filter(Boolean)
        : [],
      unlockRequiresAnyGroup: unlockRequiresAnyGroup === true,
      order: order || 0,
      hasRecipes: hasRecipes !== undefined ? hasRecipes : true,
      hasCookingSchool: hasCookingSchool !== undefined ? hasCookingSchool : false,
      hasCulture: hasCulture !== undefined ? hasCulture : false,
      isActive: true,
      isPremium: isPremium || false,
      recipes: [],
      skills: [],
      lessons: []
    });

    invalidateCatalogCaches();

    res.status(201).json(country);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// UPDATE COUNTRY (Admin)
// ==============================
exports.updateCountry = async (req, res) => {
  try {
    const { countryId } = req.params;
    const updates = { ...req.body };

    if (updates.iconicDishes !== undefined) {
      updates.iconicDishes = Array.isArray(updates.iconicDishes)
        ? updates.iconicDishes
            .map((dish) => String(dish || '').trim())
            .filter(Boolean)
            .slice(0, 6)
        : [];
    }

    if (updates.unlockLevel !== undefined) {
      updates.unlockLevel = Number.isFinite(Number(updates.unlockLevel))
        ? Math.max(1, Math.floor(Number(updates.unlockLevel)))
        : 1;
    }

    if (updates.requiredGroupIds !== undefined) {
      updates.requiredGroupIds = Array.isArray(updates.requiredGroupIds)
        ? updates.requiredGroupIds.map((id) => id?.toString()).filter(Boolean)
        : [];
    }

    if (updates.unlockRequiresAnyGroup !== undefined) {
      updates.unlockRequiresAnyGroup = updates.unlockRequiresAnyGroup === true;
    }

    const country = await Country.findByIdAndUpdate(countryId, updates, {
      new: true,
      runValidators: true
    });

    if (!country) {
      return res.status(404).json({ message: "País no encontrado" });
    }

    invalidateCatalogCaches();

    res.json(country);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// TOGGLE COUNTRY SECTION (Admin)
// ==============================
exports.toggleSection = async (req, res) => {
  try {
    const { countryId } = req.params;
    const { section } = req.body; // 'recipes', 'cookingSchool', 'culture'

    const validSections = ['recipes', 'cookingSchool', 'culture'];
    if (!validSections.includes(section)) {
      return res.status(400).json({ 
        message: "Sección inválida. Debe ser: recipes, cookingSchool, o culture" 
      });
    }

    const fieldMap = {
      recipes: 'hasRecipes',
      cookingSchool: 'hasCookingSchool',
      culture: 'hasCulture'
    };

    const updateObj = {};
    updateObj[fieldMap[section]] = { $not: `$${fieldMap[section]}` };

    const country = await Country.findByIdAndUpdate(
      countryId,
      updateObj,
      { new: true }
    );

    if (!country) {
      return res.status(404).json({ message: "País no encontrado" });
    }

    invalidateCatalogCaches();

    res.json({
      message: `Sección ${section} actualizada`,
      country
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// DELETE COUNTRY (Admin)
// ==============================
exports.deleteCountry = async (req, res) => {
  try {
    const { countryId } = req.params;

    // Delete all associated recipes and skills
    await Recipe.deleteMany({ countryId });
    await Skill.deleteMany({ countryId });

    const country = await Country.findByIdAndDelete(countryId);
    if (!country) {
      return res.status(404).json({ message: "País no encontrado" });
    }

    invalidateCatalogCaches();

    res.json({ message: "País y su contenido eliminado" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
