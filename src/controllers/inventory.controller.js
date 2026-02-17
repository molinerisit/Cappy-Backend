const UserProgress = require("../models/UserProgress.model");
const Recipe = require("../models/Recipe.model");

// ==============================
// GET USER INVENTORY
// ==============================
exports.getInventory = async (req, res) => {
  try {
    const userId = req.user.id;

    let userProgress = await UserProgress.findOne({ userId });
    if (!userProgress) {
      return res.json({ inventory: [] });
    }

    const inventory = userProgress.inventory || [];

    // Organize by category if needed
    const organized = {
      ingredients: inventory.filter(item => item.type === 'ingredient'),
      tools: inventory.filter(item => item.type === 'tool'),
      pantry: inventory.filter(item => item.type === 'pantry')
    };

    res.json({
      total: inventory.length,
      inventory,
      organized
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// ADD TO INVENTORY
// ==============================
exports.addToInventory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, quantity, type, unit } = req.body;

    if (!name || !type) {
      return res.status(400).json({ 
        message: "name y type son obligatorios" 
      });
    }

    if (!['ingredient', 'tool', 'pantry'].includes(type)) {
      return res.status(400).json({ 
        message: "type debe ser: ingredient, tool, o pantry" 
      });
    }

    let userProgress = await UserProgress.findOne({ userId });
    if (!userProgress) {
      userProgress = new UserProgress({ userId, xp: 0, level: 1 });
    }

    // Check if item already exists
    const existingItem = userProgress.inventory.find(item => 
      item.name.toLowerCase() === name.toLowerCase()
    );

    if (existingItem) {
      existingItem.quantity += quantity || 1;
    } else {
      userProgress.inventory.push({
        name,
        quantity: quantity || 1,
        type,
        unit: unit || 'unit',
        addedAt: new Date()
      });
    }

    await userProgress.save();

    res.json({
      message: "Item añadido al inventario",
      inventory: userProgress.inventory
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// REMOVE FROM INVENTORY
// ==============================
exports.removeFromInventory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemName, quantity } = req.body;

    if (!itemName) {
      return res.status(400).json({ 
        message: "itemName es obligatorio" 
      });
    }

    let userProgress = await UserProgress.findOne({ userId });
    if (!userProgress) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const itemIndex = userProgress.inventory.findIndex(item => 
      item.name.toLowerCase() === itemName.toLowerCase()
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item no encontrado en inventario" });
    }

    const item = userProgress.inventory[itemIndex];

    if (quantity && quantity > 0) {
      item.quantity -= quantity;
      if (item.quantity <= 0) {
        userProgress.inventory.splice(itemIndex, 1);
      }
    } else {
      userProgress.inventory.splice(itemIndex, 1);
    }

    await userProgress.save();

    res.json({
      message: "Item removido del inventario",
      inventory: userProgress.inventory
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// CHECK RECIPE INGREDIENTS
// ==============================
exports.checkRecipeIngredients = async (req, res) => {
  try {
    const userId = req.user.id;
    const { recipeId } = req.params;

    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(404).json({ message: "Receta no encontrada" });
    }

    let userProgress = await UserProgress.findOne({ userId });
    if (!userProgress) {
      userProgress = new UserProgress({ userId, xp: 0, level: 1 });
    }

    const userInventory = userProgress.inventory || [];
    const recipeIngredients = recipe.ingredients || [];

    // Check which ingredients user has
    const ingredientStatus = recipeIngredients.map(recipeIng => {
      const userItem = userInventory.find(item => 
        item.name.toLowerCase() === recipeIng.name.toLowerCase()
      );

      return {
        name: recipeIng.name,
        required: recipeIng.quantity,
        unit: recipeIng.unit,
        userHas: userItem ? userItem.quantity : 0,
        hasEnough: userItem && userItem.quantity >= recipeIng.quantity
      };
    });

    const allIngredientsAvailable = ingredientStatus.every(i => i.hasEnough);
    const missingIngredients = ingredientStatus.filter(i => !i.hasEnough);

    res.json({
      hasAllIngredients: allIngredientsAvailable,
      ingredientStatus,
      missingIngredients
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// USE INGREDIENTS FOR RECIPE
// ==============================
exports.useIngredientsForRecipe = async (req, res) => {
  try {
    const userId = req.user.id;
    const { recipeId } = req.body;

    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(404).json({ message: "Receta no encontrada" });
    }

    let userProgress = await UserProgress.findOne({ userId });
    if (!userProgress) {
      return res.status(400).json({ message: "Usuario no encontrado" });
    }

    const recipeIngredients = recipe.ingredients || [];

    // Check if user has all ingredients
    for (const recipeIng of recipeIngredients) {
      const userItem = userProgress.inventory.find(item => 
        item.name.toLowerCase() === recipeIng.name.toLowerCase()
      );

      if (!userItem || userItem.quantity < recipeIng.quantity) {
        return res.status(400).json({ 
          message: `No tienes suficiente ${recipeIng.name}` 
        });
      }
    }

    // Consume the ingredients
    for (const recipeIng of recipeIngredients) {
      const itemIndex = userProgress.inventory.findIndex(item => 
        item.name.toLowerCase() === recipeIng.name.toLowerCase()
      );

      if (itemIndex !== -1) {
        userProgress.inventory[itemIndex].quantity -= recipeIng.quantity;
        if (userProgress.inventory[itemIndex].quantity <= 0) {
          userProgress.inventory.splice(itemIndex, 1);
        }
      }
    }

    await userProgress.save();

    res.json({
      message: "Ingredientes consumidos",
      remainingInventory: userProgress.inventory
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// CLEAR INVENTORY (Admin/Debug)
// ==============================
exports.clearInventory = async (req, res) => {
  try {
    const userId = req.user.id;

    let userProgress = await UserProgress.findOne({ userId });
    if (!userProgress) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    userProgress.inventory = [];
    await userProgress.save();

    res.json({ message: "Inventario limpiado" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
