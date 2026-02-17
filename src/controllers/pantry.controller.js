const Ingredient = require('../models/ingredient.model');

exports.getPantry = async (req, res) => {
  try {
    const ingredients = await Ingredient.find({ user: req.user._id });
    res.json(ingredients);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addIngredient = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Ingredient name is required' });
    }

    const ingredient = await Ingredient.create({
      name: name.trim(),
      user: req.user._id
    });

    res.status(201).json(ingredient);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteIngredient = async (req, res) => {
  try {
    const ingredient = await Ingredient.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!ingredient) {
      return res.status(404).json({ message: 'Ingredient not found' });
    }

    res.json({ message: 'Ingredient removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
