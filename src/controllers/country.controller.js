const Country = require("../models/Country.model");
const Recipe = require("../models/Recipe.model");
const Skill = require("../models/Skill.model");
const UserProgress = require("../models/UserProgress.model");

// ==============================
// GET ALL COUNTRIES
// ==============================
exports.getAllCountries = async (req, res) => {
  try {
    const countries = await Country.find({ isActive: true })
      .select('name code icon flagUrl order hasRecipes hasCookingSchool hasCulture isPremium');

    res.json(countries);
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

    res.json(country);
  } catch (error) {
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
      flagUrl,
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
      flagUrl,
      order: order || 0,
      hasRecipes: hasRecipes !== undefined ? hasRecipes : true,
      hasCookingSchool: hasCookingSchool !== undefined ? hasCookingSchool : true,
      hasCulture: hasCulture !== undefined ? hasCulture : true,
      isActive: true,
      isPremium: isPremium || false,
      recipes: [],
      skills: [],
      lessons: []
    });

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
    const updates = req.body;

    const country = await Country.findByIdAndUpdate(countryId, updates, {
      new: true,
      runValidators: true
    });

    if (!country) {
      return res.status(404).json({ message: "País no encontrado" });
    }

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

    res.json({ message: "País y su contenido eliminado" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
