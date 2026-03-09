const User = require('../../models/user.model');

const listUsers = async (_req, res) => {
  try {
    const users = await User.find()
      .select('_id email username role level totalXP streak avatarIcon avatarUrl createdAt')
      .sort({ createdAt: -1 })
      .lean();

    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId)
      .select('_id email username role level totalXP streak avatarIcon avatarUrl currentPathId createdAt updatedAt')
      .populate('currentPathId', 'title type')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    return res.json(user);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body || {};

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'role debe ser user o admin' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true, runValidators: true }
    )
      .select('_id email username role')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    return res.json({
      message: 'Rol actualizado correctamente',
      user,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  listUsers,
  getUserById,
  updateUserRole,
};
