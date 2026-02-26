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
      timePreference 
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
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.changePath = async (req, res) => {
  try {
    const { pathId } = req.body;
    const userId = req.user._id;

    if (!pathId) {
      return res.status(400).json({ message: 'pathId is required' });
    }

    const UserProgress = require('../models/UserProgress.model');
    const LearningPath = require('../models/LearningPath.model');

    // Verificar que el path existe
    const pathExists = await LearningPath.findById(pathId);
    if (!pathExists) {
      return res.status(404).json({ message: 'Learning path not found' });
    }

    // Crear o actualizar el UserProgress para este path
    let userProgress = await UserProgress.findOne({ userId, pathId });
    
    if (!userProgress) {
      userProgress = await UserProgress.create({
        userId,
        pathId,
        xp: 0,
        level: 1,
        streak: 0
      });
    }

    res.json({ 
      message: 'Path changed successfully',
      pathId,
      userProgress: {
        xp: userProgress.xp,
        level: userProgress.level,
        streak: userProgress.streak
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
