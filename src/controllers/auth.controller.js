const User = require('../models/user.model');
const LearningPath = require('../models/LearningPath.model');
const UserProgress = require('../models/UserProgress.model');
const UploadAsset = require('../models/UploadAsset.model');
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

const isCloudinaryUrl = (value) => {
  try {
    const parsed = new URL(String(value || '').trim());
    return parsed.protocol === 'https:' && parsed.hostname === 'res.cloudinary.com';
  } catch (_error) {
    return false;
  }
};

exports.register = async (req, res) => {
  try {
    // ✅ validatedBody viene del middleware validate(registerSchema)
    const { email, password } = req.validatedBody;

    // 1️⃣ Verificar que usuario no exista
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'USER_ALREADY_EXISTS',
          message: 'El usuario ya existe con este email'
        }
      });
    }

    // 2️⃣ Hash de contraseña segura (12 rounds)
    const hashedPassword = await bcrypt.hash(password, 12);

    // 3️⃣ Crear usuario
    const user = await User.create({
      email,
      password: hashedPassword,
      role: 'user',
      verified: false, // Requiere verificación de email
    });

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      }
    });

  } catch (error) {
    console.error('❌ Error en register:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error al crear usuario'
      }
    });
  }
};

exports.login = async (req, res) => {
  try {
    // ✅ validatedBody viene del middleware validate(loginSchema)
    const { email, password } = req.validatedBody;

    // 1️⃣ Buscar usuario
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email o contraseña incorrect a'
        }
      });
    }

    // 2️⃣ Validar contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email o contraseña incorrecta'
        }
      });
    }

    // 3️⃣ Generar JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 4️⃣ Respuesta con flags de seguridad
    const response = {
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        forcePasswordChange: user.forcePasswordChange || false,
        isTempPassword: user.isTempPassword || false,
      }
    };

    res.json(response);

  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error al iniciar sesión'
      }
    });
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
      avatarUrl,
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
      avatarUrl,
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

    if (req.body.avatarUrl !== undefined || req.body.avatarAssetId !== undefined) {
      let avatarUrl = req.body.avatarUrl;

      if (!avatarUrl && req.body.avatarAssetId) {
        const uploadAsset = await UploadAsset.findById(req.body.avatarAssetId)
          .select('url')
          .lean();
        if (!uploadAsset?.url) {
          return res.status(404).json({
            message: 'No se encontró el asset de avatar',
          });
        }
        avatarUrl = uploadAsset.url;
      }

      if (avatarUrl === null || avatarUrl === '') {
        updates.avatarUrl = null;
      } else {
        const normalizedAvatarUrl = String(avatarUrl).trim();
        if (!isCloudinaryUrl(normalizedAvatarUrl)) {
          return res.status(400).json({
            message: 'avatarUrl debe ser una URL HTTPS de Cloudinary',
          });
        }
        updates.avatarUrl = normalizedAvatarUrl;
      }
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
      avatarUrl: user.avatarUrl,
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

/**
 * 🔐 Cambiar contraseña (obligatorio en primer login si es admin)
 * PATCH /api/auth/change-password
 * 
 * Body: { currentPassword, newPassword, confirmPassword }
 * - Si usuario es admin con forcePasswordChange=true, puede saltarse currentPassword
 * - Valida que nueva contraseña sea suficientemente fuerte (Joi + zxcvbn)
 * - Actualiza passwordChangedAt y desactiva forcePasswordChange
 */
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Usuario no identificado' }
      });
    }

    // ✅ validatedBody viene del middleware validate(changePasswordSchema)
    const { currentPassword, newPassword } = req.validatedBody;

    // 1️⃣ Obtener usuario actual
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' }
      });
    }

    // 2️⃣ Para usuarios con contraseña normal, currentPassword es obligatoria
    if (!user.isTempPassword && !currentPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CURRENT_PASSWORD_REQUIRED',
          message: 'Debe proporcionar la contraseña actual'
        }
      });
    }

    // 3️⃣ Validar contraseña actual (si NO es primer login con temp password)
    if (!user.isTempPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: 'Contraseña actual incorrecta'
          }
        });
      }
    }

    // 4️⃣ Hashear nueva contraseña (12 rounds)
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 5️⃣ Actualizar usuario:
    // - Nueva contraseña hasheada
    // - Marcar que cambió contraseña
    // - Desactivar forcePasswordChange y isTempPassword
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        forcePasswordChange: false,  // ✅ Desactiva flag
        isTempPassword: false,       // ✅ Ya no es temporal
      },
      { new: true }
    ).select('-password');

    // 6️⃣ Incluir información de fuerza de contraseña (si está disponible)
    const strengthInfo = req.passwordStrength ? {
      score: req.passwordStrength.score,
      maxScore: 4,
      crackTime: req.passwordStrength.crackTime,
    } : null;

    res.status(200).json({
      success: true,
      message: 'Contraseña cambiada exitosamente',
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        passwordChangedAt: updatedUser.passwordChangedAt,
        forcePasswordChange: updatedUser.forcePasswordChange,
      },
      ...(strengthInfo && { passwordStrength: strengthInfo })
    });

  } catch (error) {
    console.error('❌ Error en changePassword:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error al cambiar contraseña'
      }
    });
  }
};
