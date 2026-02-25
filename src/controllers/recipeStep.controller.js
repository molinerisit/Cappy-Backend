const RecipeStep = require('../models/RecipeStep.model');
const UserProgress = require('../models/UserProgress.model');

// Get all steps for a recipe
exports.getStepsByRecipe = async (req, res) => {
  try {
    const { recipeId } = req.params;
    const steps = await RecipeStep.find({ recipeId }).sort({ order: 1 });
    res.json(steps);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Complete a step (with timer validation)
exports.completeStep = async (req, res) => {
  try {
    const { stepId } = req.body;
    const userId = req.user.id;
    const step = await RecipeStep.findById(stepId);
    if (!step) return res.status(404).json({ message: 'Paso no encontrado' });
    // TODO: Validar timer si aplica
    // TODO: Actualizar UserProgress para receta
    res.json({ message: 'Micropaso completado' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Crear step
exports.createStep = async (req, res) => {
  try {
    const step = await RecipeStep.create(req.body);
    res.status(201).json(step);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Editar step
exports.updateStep = async (req, res) => {
  try {
    const { stepId } = req.params;
    const updates = req.body;
    const step = await RecipeStep.findByIdAndUpdate(stepId, updates, { new: true });
    if (!step) return res.status(404).json({ message: 'Paso no encontrado' });
    res.json(step);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Eliminar step
exports.deleteStep = async (req, res) => {
  try {
    const { stepId } = req.params;
    const step = await RecipeStep.findByIdAndDelete(stepId);
    if (!step) return res.status(404).json({ message: 'Paso no encontrado' });
    res.json({ message: 'Paso eliminado' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
