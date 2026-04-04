const mongoose = require('mongoose');
const User         = require('../models/user.model');
const LearningPath = require('../models/LearningPath.model');
const UserProgress = require('../models/UserProgress.model');
const UploadAsset  = require('../models/UploadAsset.model');
const bcrypt       = require('bcrypt');
const jwt          = require('jsonwebtoken');

const ALLOWED_AVATAR_ICONS = new Set([
  '👨‍🍳', '👩‍🍳', '🧑‍🍳', '🍳', '🥘',
  '🍜', '🍕', '🥗', '🌮', '🧁', '🍣', '🥐',
]);

const isCloudinaryUrl = (value) => {
  try {
    const parsed = new URL(String(value || '').trim());
    return parsed.protocol === 'https:' && parsed.hostname === 'res.cloudinary.com';
  } catch {
    return false;
  }
};

// ─────────────────────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { email, password } = req.validatedBody;

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'USER_ALREADY_EXISTS',
          message: 'Ya existe una cuenta con este email',
        },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      email,
      password: hashedPassword,
      role:     'user',
    });

    return res.status(201).json({
      success: true,
      message: 'Cuenta creada exitosamente',
      user: { id: user._id, email: user.email, role: user.role },
    });

  } catch (error) {
    console.error('register error:', { requestId: req.requestId, error: error.message });
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al crear la cuenta' },
    });
  }
};

// ─────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.validatedBody;

    // Siempre el mismo mensaje para user-not-found y wrong-password
    // (previene user enumeration)
    const INVALID_MSG = 'Email o contraseña incorrectos';

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: INVALID_MSG },
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: INVALID_MSG },
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id:                  user._id,
        email:               user.email,
        role:                user.role,
        forcePasswordChange: user.forcePasswordChange || false,
        isTempPassword:      user.isTempPassword      || false,
      },
    });

  } catch (error) {
    console.error('login error:', { requestId: req.requestId, error: error.message });
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al iniciar sesión' },
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET PROFILE
// ─────────────────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const {
      _id, email, role, username, avatarIcon, avatarUrl,
      totalXP, level, streak, completedLessonsCount,
      skillLevel, dietType, timePreference, currentPathId,
      lives, lifesLocked,
    } = req.user;

    let currentPathTitle = null;
    if (currentPathId) {
      const path = await LearningPath.findById(currentPathId)
        .select('title')
        .lean();
      currentPathTitle = path?.title ?? null;
    }

    return res.json({
      id: _id, email, role, username, avatarIcon, avatarUrl,
      totalXP, level, streak, completedLessonsCount,
      skillLevel, dietType, timePreference,
      currentPathId, currentPathTitle, lives, lifesLocked,
    });

  } catch (error) {
    console.error('getProfile error:', { requestId: req.requestId, error: error.message });
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al obtener el perfil' },
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET PROFILE ANALYTICS
// ─────────────────────────────────────────────────────────────
exports.getProfileAnalytics = async (req, res) => {
  try {
    const {
      totalXP = 0, level = 1, streak = 0,
      completedLessonsCount = 0, lastLessonDate = null,
    } = req.user;

    const xpInLevel        = totalXP % 100;
    const xpToNextLevel    = Math.max(0, 100 - xpInLevel);
    const weeklyGoalDays   = 7;

    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);
    const weekStartUtc = new Date(todayUtc);
    weekStartUtc.setUTCDate(todayUtc.getUTCDate() - (weeklyGoalDays - 1));

    const activityAgg = await UserProgress.aggregate([
      { $match: { userId: req.user._id } },
      { $unwind: '$completedNodes' },
      { $match: { 'completedNodes.completedAt': { $gte: weekStartUtc } } },
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

    const activityByDate = new Map(activityAgg.map((i) => [i._id, i.completions]));

    const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    let activeDays = 0;
    const activityLast7Days = [];

    for (let i = 0; i < weeklyGoalDays; i++) {
      const day = new Date(weekStartUtc);
      day.setUTCDate(weekStartUtc.getUTCDate() + i);
      const isoDate    = day.toISOString().slice(0, 10);
      const completions = activityByDate.get(isoDate) || 0;
      if (completions > 0) activeDays++;
      activityLast7Days.push({
        date:        isoDate,
        label:       dayLabels[(day.getUTCDay() + 6) % 7],
        completions,
        active:      completions > 0,
      });
    }

    return res.json({
      xpInLevel, xpToNextLevel, weeklyGoalDays,
      weeklyGoalProgressDays: activeDays,
      weeklyConsistency:      activeDays / weeklyGoalDays,
      activityLast7Days,
      avgXpPerLesson: completedLessonsCount > 0
        ? Math.round(totalXP / completedLessonsCount) : 0,
      masteryScore:   Math.max(0, Math.min(100, (level * 8) + (streak * 3))),
      streak, completedLessonsCount,
      generatedAt:  new Date().toISOString(),
      lastLessonDate,
    });

  } catch (error) {
    console.error('getProfileAnalytics error:', { requestId: req.requestId, error: error.message });
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al calcular métricas' },
    });
  }
};

// ─────────────────────────────────────────────────────────────
// UPDATE PROFILE
// ─────────────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const userId  = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No autorizado' },
      });
    }

    const updates = {};

    if (req.body.username !== undefined) {
      const username = String(req.body.username || '').trim();
      if (username.length < 3 || username.length > 24) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'El nickname debe tener entre 3 y 24 caracteres' },
        });
      }
      updates.username = username;
    }

    if (req.body.avatarIcon !== undefined) {
      const icon = String(req.body.avatarIcon || '').trim();
      if (!ALLOWED_AVATAR_ICONS.has(icon)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Ícono de avatar no permitido' },
        });
      }
      updates.avatarIcon = icon;
    }

    if (req.body.avatarUrl !== undefined || req.body.avatarAssetId !== undefined) {
      let avatarUrl = req.body.avatarUrl;

      if (!avatarUrl && req.body.avatarAssetId) {
        const asset = await UploadAsset.findById(req.body.avatarAssetId)
          .select('url').lean();
        if (!asset?.url) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Asset de avatar no encontrado' },
          });
        }
        avatarUrl = asset.url;
      }

      if (avatarUrl === null || avatarUrl === '') {
        updates.avatarUrl = null;
      } else {
        const normalized = String(avatarUrl).trim();
        if (!isCloudinaryUrl(normalized)) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'avatarUrl debe ser una URL HTTPS de Cloudinary' },
          });
        }
        updates.avatarUrl = normalized;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No hay campos válidos para actualizar' },
      });
    }

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true, runValidators: true,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Usuario no encontrado' },
      });
    }

    return res.json({
      id: user._id, username: user.username, avatarIcon: user.avatarIcon,
      avatarUrl: user.avatarUrl, email: user.email,
      totalXP: user.totalXP, level: user.level,
      streak: user.streak, completedLessonsCount: user.completedLessonsCount,
    });

  } catch (error) {
    console.error('updateProfile error:', { requestId: req.requestId, error: error.message });
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al actualizar el perfil' },
    });
  }
};

// ─────────────────────────────────────────────────────────────
// CHANGE CURRENT PATH
// Fix IDOR: validar que pathId sea ObjectId válido y que el path
// exista, esté activo y sea accesible para el usuario
// ─────────────────────────────────────────────────────────────
exports.changeCurrentPath = async (req, res) => {
  try {
    const userId = req.user._id;
    const { pathId } = req.body;

    // 1. Validar que pathId sea un ObjectId válido
    if (!pathId || !mongoose.Types.ObjectId.isValid(pathId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'pathId inválido' },
      });
    }

    // 2. Verificar que el path existe, está activo y el usuario puede accederlo
    const path = await LearningPath.findOne({
      _id:      pathId,
      isActive: true,
    }).select('_id title isPremium').lean();

    if (!path) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Camino de aprendizaje no encontrado' },
      });
    }

    // 3. Verificar acceso premium
    if (path.isPremium && !req.user.isPremium) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PREMIUM_REQUIRED',
          message: 'Este camino requiere una cuenta premium',
        },
      });
    }

    // 4. Actualizar el path actual del usuario
    await User.updateOne({ _id: userId }, { $set: { currentPathId: pathId } });

    return res.json({
      success: true,
      message: 'Camino de aprendizaje actualizado',
      currentPathId:    path._id,
      currentPathTitle: path.title,
    });

  } catch (error) {
    console.error('changeCurrentPath error:', { requestId: req.requestId, error: error.message });
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al cambiar el camino de aprendizaje' },
    });
  }
};

// ─────────────────────────────────────────────────────────────
// CHANGE PASSWORD
// ─────────────────────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Usuario no identificado' },
      });
    }

    const { currentPassword, newPassword } = req.validatedBody;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Usuario no encontrado' },
      });
    }

    if (!user.isTempPassword && !currentPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'CURRENT_PASSWORD_REQUIRED', message: 'Debe proporcionar la contraseña actual' },
      });
    }

    if (!user.isTempPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_PASSWORD', message: 'Contraseña actual incorrecta' },
        });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const updated = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          password:            hashedPassword,
          passwordChangedAt:   new Date(),
          forcePasswordChange: false,
          isTempPassword:      false,
        },
      },
      { new: true }
    ).select('-password');

    const strengthInfo = req.passwordStrength
      ? {
          score:     req.passwordStrength.score,
          maxScore:  4,
          crackTime: req.passwordStrength.crackTime,
        }
      : null;

    return res.json({
      success: true,
      message: 'Contraseña cambiada exitosamente',
      user: {
        id:                  updated._id,
        email:               updated.email,
        passwordChangedAt:   updated.passwordChangedAt,
        forcePasswordChange: updated.forcePasswordChange,
      },
      ...(strengthInfo && { passwordStrength: strengthInfo }),
    });

  } catch (error) {
    console.error('changePassword error:', { requestId: req.requestId, error: error.message });
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al cambiar la contraseña' },
    });
  }
};
