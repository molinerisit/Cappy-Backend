const User = require('../models/user.model');
const Country = require('../models/Country.model');

/**
 * Mark a country as visited/completed via recipe
 * POST /api/countries/mark-visited
 */
exports.markCountryVisited = async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware
    const { countryId } = req.body;

    if (!countryId) {
      return res.status(400).json({
        success: false,
        message: 'countryId es requerido',
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    // Check if country already visited
    const alreadyVisited = user.completedCountries.includes(countryId);

    if (!alreadyVisited) {
      // Add country to completed list
      user.completedCountries.push(countryId);
      await user.save();
    }

    // Get all completed countries with details
    const completedCountriesData = await User.findById(userId)
      .populate('completedCountries', 'name flag code')
      .select('completedCountries')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        message: alreadyVisited ? 'País ya visitado' : 'País marcado como visitado',
        completedCountries: completedCountriesData.completedCountries,
        totalCountriesVisited: completedCountriesData.completedCountries.length,
      },
    });
  } catch (error) {
    console.error('Error marking country visited:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar país como visitado',
      error: error.message,
    });
  }
};

/**
 * Get all visited countries for current user
 * GET /api/countries/my-visited
 */
exports.getMyVisitedCountries = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId)
      .populate('completedCountries', 'name flag code')
      .select('completedCountries')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    // Get all countries count for progress percentage
    const totalCountries = await Country.countDocuments({ isActive: true });
    const visitedCount = user.completedCountries.length;
    const progressPercentage = totalCountries > 0 
      ? ((visitedCount / totalCountries) * 100).toFixed(1)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        completedCountries: user.completedCountries,
        visitedCount: visitedCount,
        totalCountries: totalCountries,
        progressPercentage: parseFloat(progressPercentage),
      },
    });
  } catch (error) {
    console.error('Error fetching visited countries:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener países visitados',
      error: error.message,
    });
  }
};
