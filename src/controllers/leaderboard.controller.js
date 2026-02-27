const User = require('../models/user.model');

/**
 * Get global leaderboard (Top 30 users by totalXP)
 * GET /api/leaderboard
 */
exports.getGlobalLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    
    // Get top users by totalXP
    const topUsers = await User
      .find({})
      .sort({ totalXP: -1 }) // Sort descending by XP
      .limit(limit)
      .select('username email totalXP level streak completedLessonsCount avatarIcon avatarUrl profileImage')
      .lean();

    // Format response with rankings
    const leaderboard = topUsers.map((user, index) => ({
      rank: index + 1,
      userId: user._id,
      username: user.username || user.email.split('@')[0],
      totalXP: user.totalXP,
      level: user.level,
      streak: user.streak,
      completedLessons: user.completedLessonsCount || 0,
      avatarIcon: user.avatarIcon || null,
      avatarUrl: user.avatarUrl || user.profileImage || null,
    }));

    res.status(200).json({
      success: true,
      data: leaderboard,
      count: leaderboard.length,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el ranking mundial',
      error: error.message,
    });
  }
};

/**
 * Get user's rank in global leaderboard
 * GET /api/leaderboard/my-rank
 */
exports.getMyRank = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;

    const user = await User.findById(userId)
      .select('totalXP level avatarIcon avatarUrl profileImage')
      .lean();
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    // Count how many users have more XP than current user
    const usersAhead = await User.countDocuments({
      totalXP: { $gt: user.totalXP },
    });

    const myRank = usersAhead + 1;

    // Get total users for percentage calculation
    const totalUsers = await User.countDocuments({});

    res.status(200).json({
      success: true,
      data: {
        rank: myRank,
        totalXP: user.totalXP,
        level: user.level || 1,
        avatarIcon: user.avatarIcon || null,
        avatarUrl: user.avatarUrl || user.profileImage || null,
        totalUsers: totalUsers,
        percentile: totalUsers > 0 ? ((totalUsers - myRank) / totalUsers * 100).toFixed(1) : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching user rank:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tu ranking',
      error: error.message,
    });
  }
};

/**
 * Get leaderboard around user (10 above, user, 10 below)
 * GET /api/leaderboard/around-me
 */
exports.getLeaderboardAroundMe = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;

    const user = await User.findById(userId)
      .select('totalXP username level streak avatarIcon avatarUrl profileImage')
      .lean();
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    // Get users above current user
    const usersAbove = await User
      .find({ 
        totalXP: { $gt: user.totalXP },
      })
      .sort({ totalXP: -1 })
      .limit(10)
      .select('username email totalXP level streak avatarIcon avatarUrl profileImage')
      .lean();

    // Get users below current user
    const usersBelow = await User
      .find({ 
        totalXP: { $lt: user.totalXP },
      })
      .sort({ totalXP: -1 })
      .limit(10)
      .select('username email totalXP level streak avatarIcon avatarUrl profileImage')
      .lean();

    // Calculate rank
    const usersAheadCount = await User.countDocuments({
      totalXP: { $gt: user.totalXP },
    });

    const myRank = usersAheadCount + 1;

    // Combine and format
    const leaderboard = [
      ...usersAbove.reverse(),
      { ...user, _id: userId, isCurrentUser: true },
      ...usersBelow,
    ].map((u, index) => ({
      rank: myRank - usersAbove.length + index,
      userId: u._id,
      username: u.username || (u.email ? u.email.split('@')[0] : 'Usuario'),
      totalXP: u.totalXP,
      level: u.level || 1,
      streak: u.streak || 0,
      isCurrentUser: u.isCurrentUser || false,
      avatarIcon: u.avatarIcon || null,
      avatarUrl: u.avatarUrl || u.profileImage || null,
    }));

    res.status(200).json({
      success: true,
      data: leaderboard,
      myRank: myRank,
    });
  } catch (error) {
    console.error('Error fetching leaderboard around user:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ranking cercano',
      error: error.message,
    });
  }
};
