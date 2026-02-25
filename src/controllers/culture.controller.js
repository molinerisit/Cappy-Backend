const CultureNode = require('../models/CultureNode.model');
const CultureStep = require('../models/CultureStep.model');
const UserProgress = require('../models/UserProgress.model');

// Árbol gamificado
exports.getCultureTree = async (req, res) => {
  try {
    const { countryId } = req.params;
    const nodes = await CultureNode.find({ countryId });
    // TODO: Formatear árbol visual
    res.json(nodes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCultureNode = async (req, res) => {
  try {
    const { nodeId } = req.params;
    const node = await CultureNode.findById(nodeId);
    if (!node) return res.status(404).json({ message: 'Nodo no encontrado' });
    res.json(node);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCultureSteps = async (req, res) => {
  try {
    const { nodeId } = req.params;
    const steps = await CultureStep.find({ cultureNodeId: nodeId });
    res.json(steps);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Progreso
exports.completeCultureNode = async (req, res) => {
  try {
    // TODO: Actualizar UserProgress, sumar XP, desbloqueo
    res.json({ message: 'Nodo cultural completado' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.completeCultureStep = async (req, res) => {
  try {
    // TODO: Actualizar UserProgress, sumar XP, desbloqueo
    res.json({ message: 'Micropaso cultural completado' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin CRUD
exports.createCultureNode = async (req, res) => {
  try {
    const node = await CultureNode.create(req.body);
    res.status(201).json(node);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateCultureNode = async (req, res) => {
  try {
    const { nodeId } = req.params;
    const updates = req.body;
    const node = await CultureNode.findByIdAndUpdate(nodeId, updates, { new: true });
    if (!node) return res.status(404).json({ message: 'Nodo no encontrado' });
    res.json(node);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteCultureNode = async (req, res) => {
  try {
    const { nodeId } = req.params;
    const node = await CultureNode.findByIdAndDelete(nodeId);
    if (!node) return res.status(404).json({ message: 'Nodo no encontrado' });
    res.json({ message: 'Nodo eliminado' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createCultureStep = async (req, res) => {
  try {
    const step = await CultureStep.create(req.body);
    res.status(201).json(step);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateCultureStep = async (req, res) => {
  try {
    const { stepId } = req.params;
    const updates = req.body;
    const step = await CultureStep.findByIdAndUpdate(stepId, updates, { new: true });
    if (!step) return res.status(404).json({ message: 'Micropaso no encontrado' });
    res.json(step);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteCultureStep = async (req, res) => {
  try {
    const { stepId } = req.params;
    const step = await CultureStep.findByIdAndDelete(stepId);
    if (!step) return res.status(404).json({ message: 'Micropaso no encontrado' });
    res.json({ message: 'Micropaso eliminado' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
