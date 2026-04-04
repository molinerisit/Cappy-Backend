/**
 * cho.controller.js
 * Handles all Cho AI assistant endpoints.
 *
 * POST /api/cho/ask         — main ask endpoint (text + optional image)
 * GET  /api/cho/usage       — get remaining daily uses for current user
 * GET  /api/admin/cho/config         — get global config
 * PATCH /api/admin/cho/config        — toggle enabled/disabled
 * GET  /api/admin/cho/logs           — paginated logs
 * GET  /api/admin/cho/stats          — dashboard stats
 */

const ChoConfig  = require('../models/ChoConfig.model');
const ChoLog     = require('../models/ChoLog.model');
const ChoUsage   = require('../models/ChoUsage.model');
const { buildContext } = require('../services/cho/contextBuilder');
const { buildPrompt }  = require('../services/cho/promptBuilder');
const { ask }          = require('../services/cho/aiService');
const usageService     = require('../services/cho/usageService');
const imageService     = require('../services/cho/imageService');

// ── USER ENDPOINTS ──────────────────────────────────────────────────────────

/**
 * POST /api/cho/ask
 * Body (JSON): {
 *   recipeId, recipeName, stepIndex, stepDescription, elapsedTime,
 *   message,
 *   imageBase64 (optional, raw base64),
 *   imageMime   (optional, e.g. 'image/jpeg')
 * }
 */
exports.ask = async (req, res) => {
  try {
    // 1. Check global toggle
    const config = await ChoConfig.get();
    if (!config.isEnabled) {
      return res.status(503).json({
        success: false,
        message: 'Cho está temporalmente desactivado. Volvé en un rato 🍳',
      });
    }

    const user      = req.user;
    const isPremium = user.isPremium ?? false;

    const {
      recipeId, recipeName, stepIndex = 0, stepDescription,
      elapsedTime = 0, message = '',
      imageBase64, imageMime = 'image/jpeg',
    } = req.body;

    if (!message?.trim() && !imageBase64 && !req.file) {
      return res.status(400).json({ success: false, message: 'Enviá un mensaje o una imagen.' });
    }

    const hasImage = !!(imageBase64 || req.file);

    // 2. Usage check
    const usageCheck = await usageService.check(String(user._id), isPremium, hasImage);
    if (!usageCheck.allowed) {
      return res.status(429).json({ success: false, message: usageCheck.reason, remaining: usageCheck.remaining });
    }

    // 3. Build context
    const context = await buildContext(user, {
      recipeId, recipeName, stepIndex, stepDescription, elapsedTime,
      message: message.trim(),
      hasImage,
    });

    // 4. Process image if present
    let processedImage = null;
    let imageMeta = null;
    if (hasImage) {
      try {
        if (req.file) {
          processedImage = await imageService.processFileBuffer(req.file.buffer);
        } else {
          processedImage = await imageService.processBase64Image(imageBase64, imageMime);
        }
        imageMeta = processedImage.meta;
      } catch (imgErr) {
        console.warn('[Cho] Image processing error:', imgErr.message);
        // Degrade gracefully: proceed without image
        processedImage = null;
      }
    }

    // 5. Build prompt
    const prompt = buildPrompt(
      context,
      processedImage?.base64 ?? null,
      processedImage?.mime ?? null,
    );

    // 6. Call AI
    const { text, tokensUsed, usedFallback } = await ask(prompt, hasImage);

    // 7. Record usage
    await usageService.record(String(user._id), hasImage && !!processedImage);

    // 8. Save log (async, don't block response)
    ChoLog.create({
      userId:          user._id,
      recipeId:        recipeId ?? null,
      recipeName:      context.recipe.name,
      stepIndex:       context.recipe.stepIndex,
      stepDescription: context.recipe.stepDescription,
      message:         message.trim() || '[imagen]',
      response:        text,
      hasImage:        hasImage && !!processedImage,
      imageMeta:       imageMeta ?? undefined,
      isPremium,
      elapsedTime,
      usedFallback,
      tokensUsed,
    }).catch(e => console.error('[Cho] Log save error:', e.message));

    // 9. Remaining usage for UI
    const remaining = await usageService.getRemaining(String(user._id), isPremium);

    return res.json({
      success: true,
      data: { response: text, remaining },
    });

  } catch (err) {
    console.error('[Cho] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      message: 'Tuve un problema técnico. Seguí con el paso que tenés en pantalla.',
    });
  }
};

/**
 * GET /api/cho/usage
 * Returns remaining daily uses for the current user.
 */
exports.getUsage = async (req, res) => {
  try {
    const config = await ChoConfig.get();
    if (!config.isEnabled) {
      return res.json({ success: true, data: { isEnabled: false, remaining: { text: 0, images: 0 } } });
    }
    const isPremium = req.user.isPremium ?? false;
    const remaining = await usageService.getRemaining(String(req.user._id), isPremium);
    return res.json({ success: true, data: { isEnabled: true, remaining } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── ADMIN ENDPOINTS ─────────────────────────────────────────────────────────

/**
 * GET /api/admin/cho/config
 */
exports.adminGetConfig = async (req, res) => {
  try {
    const config = await ChoConfig.get();
    return res.json({ success: true, data: config });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/admin/cho/config
 * Body: { isEnabled: boolean }
 */
exports.adminUpdateConfig = async (req, res) => {
  try {
    const { isEnabled } = req.body;
    const config = await ChoConfig.get();
    config.isEnabled = isEnabled;
    config.updatedBy = req.user._id;
    await config.save();
    return res.json({ success: true, data: config });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/admin/cho/logs
 * Query: page, limit, userId, recipeId, hasImage, usedFallback
 */
exports.adminGetLogs = async (req, res) => {
  try {
    const {
      page = 1, limit = 30,
      userId, recipeId, hasImage, usedFallback,
    } = req.query;

    const query = {};
    if (userId)      query.userId = userId;
    if (recipeId)    query.recipeId = recipeId;
    if (hasImage !== undefined)      query.hasImage = hasImage === 'true';
    if (usedFallback !== undefined)  query.usedFallback = usedFallback === 'true';

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      ChoLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('userId', 'username email')
        .lean(),
      ChoLog.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: { logs, total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/admin/cho/stats
 * Returns dashboard metrics.
 */
exports.adminGetStats = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.toISOString().slice(0, 10));
    const last7Start = new Date(todayStart);
    last7Start.setDate(last7Start.getDate() - 6);
    const last30Start = new Date(todayStart);
    last30Start.setDate(last30Start.getDate() - 29);

    const [
      totalLogs,
      todayLogs,
      totalUsers,
      imageRequests,
      fallbackCount,
      premiumCount,
      dailyActivity,
      topRecipes,
      topSteps,
    ] = await Promise.all([
      // Total queries ever
      ChoLog.countDocuments(),

      // Today
      ChoLog.countDocuments({ createdAt: { $gte: todayStart } }),

      // Unique active users (all time)
      ChoLog.distinct('userId').then(a => a.length),

      // Image requests
      ChoLog.countDocuments({ hasImage: true }),

      // Fallback rate
      ChoLog.countDocuments({ usedFallback: true }),

      // Premium queries
      ChoLog.countDocuments({ isPremium: true }),

      // Daily activity last 7 days
      ChoLog.aggregate([
        { $match: { createdAt: { $gte: last7Start } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        }},
        { $sort: { _id: 1 } },
      ]),

      // Most consulted recipes
      ChoLog.aggregate([
        { $match: { recipeId: { $ne: null } } },
        { $group: { _id: '$recipeId', name: { $first: '$recipeName' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),

      // Most asked steps
      ChoLog.aggregate([
        { $group: { _id: '$stepIndex', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const freeCount = totalLogs - premiumCount;

    return res.json({
      success: true,
      data: {
        totalQueries:    totalLogs,
        todayQueries:    todayLogs,
        activeUsers:     totalUsers,
        imageRequests,
        fallbackCount,
        fallbackRate:    totalLogs > 0 ? ((fallbackCount / totalLogs) * 100).toFixed(1) : '0',
        premiumPercent:  totalLogs > 0 ? ((premiumCount / totalLogs) * 100).toFixed(1) : '0',
        freePercent:     totalLogs > 0 ? ((freeCount / totalLogs) * 100).toFixed(1) : '0',
        dailyActivity,
        topRecipes,
        topSteps,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
