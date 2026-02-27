const User = require('../models/user.model');
const LearningPath = require('../models/LearningPath.model');
const UserProgress = require('../models/UserProgress.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const ALLOWED_AVATAR_ICONS = new Set([
  '👨‍🍳',
  '👩‍🍳',
  '🧑‍🍳',
  '🍳',
  '🥘',
  '🍜',
  '🍕',
  '🥗',
  '🌮',
  '🧁',
  '🍣',
  '🥐',
]);

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
      username,
      avatarIcon,
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

    let currentPathTitle = null;
    if (currentPathId) {
      const currentPath = await LearningPath.findById(currentPathId)
        .select('title')
        .lean();
      currentPathTitle = currentPath?.title || null;
    }

    res.json({
      id: _id,
      email,
      role,
      username,
      avatarIcon,
      totalXP,
      level,
      streak,
      completedLessonsCount,
      skillLevel,
      dietType,
      timePreference,
      currentPathId,
      currentPathTitle,
      lives,
      lifesLocked,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProfileAnalytics = async (req, res) => {
  try {
    const {
      totalXP = 0,
      level = 1,
      streak = 0,
      completedLessonsCount = 0,
      lastLessonDate = null,
    } = req.user;

    const xpInLevel = totalXP % 100;
    const xpToNextLevel = Math.max(0, 100 - xpInLevel);
    const weeklyGoalDays = 7;

    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);
    const weekStartUtc = new Date(todayUtc);
    weekStartUtc.setUTCDate(todayUtc.getUTCDate() - (weeklyGoalDays - 1));

    const activityAgg = await UserProgress.aggregate([
      { $match: { userId: req.user._id } },
      { $unwind: '$completedNodes' },
      {
        $match: {
          'completedNodes.completedAt': { $gte: weekStartUtc },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$completedNodes.completedAt',
              timezone: 'UTC',
            },
          },
          completions: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const activityByDate = new Map(
      activityAgg.map((item) => [item._id, item.completions])
    );

    const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const activityLast7Days = [];
    let activeDays = 0;

    for (let i = 0; i < weeklyGoalDays; i += 1) {
      const day = new Date(weekStartUtc);
      day.setUTCDate(weekStartUtc.getUTCDate() + i);

      const isoDate = day.toISOString().slice(0, 10);
      const completions = activityByDate.get(isoDate) || 0;
      const active = completions > 0;
      if (active) activeDays += 1;

      activityLast7Days.push({
        date: isoDate,
        label: dayLabels[(day.getUTCDay() + 6) % 7],
        completions,
        active,
      });
    }

    const weeklyConsistency = activeDays / weeklyGoalDays;
    const avgXpPerLesson = completedLessonsCount > 0
      ? Math.round(totalXP / completedLessonsCount)
      : 0;
    const masteryScore = Math.max(
      0,
      Math.min(100, (level * 8) + (streak * 3))
    );

    return res.json({
      xpInLevel,
      xpToNextLevel,
      weeklyGoalDays,
      weeklyGoalProgressDays: activeDays,
      weeklyConsistency,
      activityLast7Days,
      avgXpPerLesson,
      masteryScore,
      streak,
      completedLessonsCount,
      generatedAt: new Date().toISOString(),
      lastLessonDate,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    const updates = {};

    if (req.body.username !== undefined) {
      const username = String(req.body.username || '').trim();
      if (username.length < 3 || username.length > 24) {
        return res.status(400).json({
          message: 'El nickname debe tener entre 3 y 24 caracteres',
        });
      }
      updates.username = username;
    }

    if (req.body.avatarIcon !== undefined) {
      const avatarIcon = String(req.body.avatarIcon || '').trim();
      if (!ALLOWED_AVATAR_ICONS.has(avatarIcon)) {
        return res.status(400).json({
          message: 'Ícono de avatar no permitido',
        });
      }
      updates.avatarIcon = avatarIcon;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: 'No hay campos válidos para actualizar',
      });
    }

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    return res.json({
      id: user._id,
      username: user.username,
      avatarIcon: user.avatarIcon,
      email: user.email,
      totalXP: user.totalXP,
      level: user.level,
      streak: user.streak,
      completedLessonsCount: user.completedLessonsCount,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
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
