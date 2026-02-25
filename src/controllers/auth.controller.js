const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword
    });

    res.status(201).json({ message: 'User created' });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, role: user.role });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const { 
      _id, 
      email, 
      role, 
      totalXP, 
      level, 
      streak, 
      completedLessonsCount,
      skillLevel, 
      dietType, 
      timePreference,
      currentPathId,
      lives,
      lifesLocked
    } = req.user;

    res.json({
      id: _id,
      email,
      role,
      totalXP,
      level,
      streak,
      completedLessonsCount,
      skillLevel,
      dietType,
      timePreference,
      currentPathId,
      lives,
      lifesLocked,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Change current learning path (like Duolingo course selection)
 * POST /api/auth/change-path
 */
exports.changeCurrentPath = async (req, res) => {
  try {
    const userId = req.user._id;
    const { pathId } = req.body;

    if (!pathId) {
      return res.status(400).json({
        success: false,
        message: 'pathId es requerido',
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { currentPathId: pathId },
      { new: true }
    ).populate('currentPathId', 'title description');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Camino de aprendizaje cambiado',
      currentPathId: user.currentPathId,
    });
  } catch (error) {
    console.error('Error changing path:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar el camino de aprendizaje',
      error: error.message,
    });
  }
};
