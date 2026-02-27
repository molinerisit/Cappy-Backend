const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

module.exports = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (user) {
      req.user = user;
    }

    return next();
  } catch (_) {
    return next();
  }
};
